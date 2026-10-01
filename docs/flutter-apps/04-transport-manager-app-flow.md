# Transport Manager App — Flutter Design & Flow Guide

> Backend: `backend/services/platform-service/src/routes/transportManager.routes.js`
> Postman: [postman/Transport-Manager-App.postman_collection.json](postman/Transport-Manager-App.postman_collection.json) (23 requests, full localhost URLs)
> Working reference (React Native): `app/src/app/transport/` and `app/src/api/transport.js`

---

## 0. At a glance

| Item | Value |
|---|---|
| Who uses it | The school's **Transport Manager** — a staff account with the role "Transport Manager", created in School Admin → Users |
| Who does NOT use it | **Drivers.** A driver is only a record (name, mobile, licence) on a vehicle and a route. Drivers do not sign in. |
| Login | **`identifier` (email or employee ID) + `password`** |
| Login URL | `POST http://localhost:5000/api/v1/platform/school-portal/auth/transport-login` |
| All other URLs | `http://localhost:5000/api/v1/platform/school-portal/transport-manager/...` |
| Token | One JWT, valid 7 days, no refresh token. `Authorization: Bearer <token>` |
| Screens | Login → **Home** (all routes, today) → **Route** (mark pickup / drop) · **Fleet** · **Profile** |
| Demo login | `transport.demo@example.com` / `Demo@12345` — 2 routes, 16 students, today half picked up (`npm run seed:app-demo` in `backend/services/platform-service`) |

### Scope is deliberately small

```
School admin (web):  Vehicle → Driver → Route → Stops (+pickup/drop time) → Route + Vehicle + Driver → Student + Stop
Transport Manager:   see every route → open a route → mark PICKED UP → mark DROPPED   (daily)
```

The manager **reads** every route, its students and the fleet, and **writes one thing**: a student's pickup / drop status for today or an earlier day (and can undo a wrong tap). They cannot add or edit vehicles, drivers, routes, stops or student assignments — that is the school admin's job on the web.

These are **deliberately NOT in the backend**, so do not design screens for them: GPS / live tracking, trips, SOS, alerts, parent notifications, transport attendance, vehicle maintenance, inspections, reports and profile editing.

---

## 1. Recommended Flutter stack (keep it light)

| Need | Package |
|---|---|
| State | `flutter_riverpod` |
| Routing | `go_router` |
| HTTP | `dio` |
| Token | `flutter_secure_storage` |
| Models | `freezed` + `json_serializable` |
| UI | `url_launcher` (call a driver), `intl` |
| Offline queue (optional) | `hive` or `sqflite` + `connectivity_plus` |

Design for **one-handed, glanceable use**: touch targets of at least 44 dp, high contrast, big text, no deep menus. The manager marks children at the school gate or at a bus stop.

---

## 2. Project structure

```
lib/
├── app/          app.dart · router.dart · env.dart
├── core/         network/ (dio, interceptor, api_exception) · storage/ · theme/
└── features/
    ├── auth/         login_screen · forgot_password_screen · auth_repository
    ├── home/         home_screen (day stepper, totals, route cards)
    ├── route_run/    route_run_screen · student_tile · run_providers · (offline_queue)
    ├── fleet/        fleet_screen (vehicles | drivers)
    └── profile/      profile_screen · change_password_screen
```

---

## 3. Networking

- Base URL: emulator `http://10.0.2.2:5000/api/v1/platform`, real phone `http://<PC-LAN-IP>:5000/api/v1/platform`.
- **Login** returns the token at the **top level**, the same shape as the teacher, student and parent apps:
  ```json
  { "success": true, "message": "Login successful",
    "token": "…",
    "user":   { "id", "employeeId", "name", "email", "phone", "photo", "designation", "department", "status", "role": "TRANSPORT" },
    "manager": { …same fields, without role… },
    "school": { "id", "name", "academicSession", "primaryColor", "branding": { "logo" } } }
  ```
- Every other success: `{ "success": true, "data": … }` (pickup / drop also carry a `message`).
- Errors: `{ "success": false, "message": "…", "code": "TRANSPORT_…" }`. Show `message`; branch on `code`.
- **401** → clear the token, go to Login. **402** → subscription-expired screen. **429** → "Too many attempts, try later".
- Paint the app in `school.primaryColor`.

---

## 4. Auth flow

```
Splash → token? ─ no → Login
           └ yes → GET /transport-manager/me ─ 200 → Home
                                               ├ 401 → Login
                                               └ (me is never 402 — see below)

Login screen: [ email ]  [ password ]  [SIGN IN]      Forgot password?
 → POST /school-portal/auth/transport-login { identifier, password }
 → save token + user + school → Home
```

- `identifier` is trimmed and case-insensitive; the employee ID also works.
- A wrong password and an unknown email give the **same** `401 TRANSPORT_INVALID_CREDENTIALS` → "Invalid email or password".
- `403 TRANSPORT_MANAGER_INACTIVE` → "Your account is not active. Contact the school office."
- `409` "registered at more than one school" → show the message as it is.
- `403 ROLE_MISMATCH` with `suggestedRole` → the login belongs to another role (e.g. a teacher); offer to switch tab.
- Login is limited to 20 attempts per 15 minutes per IP (`429`).

`GET /transport-manager/me` returns `{ data: { user, manager, school } }` — refresh the saved user and school colour from it.

**Sessions end server-side.** The token stops working (401) when the manager logs out, changes or resets the password, deletes the account, is made inactive by the school, or is force-logged-out by an admin. Treat any 401 as "go to Login".

**Subscription expired (402).** `me`, `change-password`, `auth/logout` and `account/delete` keep working so the manager can still sign in and see why; `overview`, `routes`, `fleet` and pickup / drop return 402.

### Forgot password (3 steps, no token)
1. `POST /school-portal/auth/forgot-password { role: "TRANSPORT", identifier }` — an OTP goes by SMS to the staff mobile on record. The answer is always the same 200, whether or not the email exists.
2. `POST /school-portal/auth/verify-reset-otp { role, identifier, otp }` → `data.resetToken`.
3. `POST /school-portal/auth/reset-password { resetToken, newPassword }` → back to Login.

In development the OTP is printed in the platform-service log (no SMS is sent).

---

## 5. Screens

### 5.1 Home — every route for one day
`GET /transport-manager/overview` (optional `?date=YYYY-MM-DD`, defaults to today)

```json
{ "date": "2026-10-01",
  "totals": { "routes": 2, "vehicles": 2, "activeVehicles": 2, "drivers": 2, "activeDrivers": 2,
              "students": 16, "pickedUp": 8, "dropped": 0 },
  "routes": [
    { "id", "routeName", "status",
      "vehicle": { "id", "vehicleNumber", "vehicleType", "capacity" } | null,
      "driver":  { "id", "name", "mobile" } | null,
      "ready": true,
      "totalStops": 3, "totalStudents": 8, "pickedUpCount": 4, "droppedCount": 0 } ] }
```

```
┌─────────────────────────────────────────┐
│ ‹   Today · 1 Oct 2026   ›              │  ← day stepper, never past today
│ [Students 16] [Picked up 8] [Dropped 0] │
│ 2 routes · 2 of 2 vehicles active · …   │
├─────────────────────────────────────────┤
│ 🚌 Route 1 — Demo Nagar               › │
│    MP09DM0101 · Suresh Yadav            │
│    Picked up ▓▓▓▓░░░░ 4/8               │
│    Dropped   ░░░░░░░░ 0/8               │
│    3 stops · 8 students                 │
└─────────────────────────────────────────┘
```
- Tap a card → Route screen for the **same date**.
- `ready: false` → show a "Not ready" badge: the route has no vehicle or no driver, so nothing can be marked on it.
- No routes → empty state "Routes are set up by the school office in the admin panel".
- Pull-to-refresh, and refresh when the screen regains focus.

### 5.2 Route — mark pickup and drop (the main screen)
`GET /transport-manager/routes/:routeId` (optional `?date=`)

```json
{ "date": "2026-10-01",
  "route": { "id", "routeName", "status", "vehicleNumber", "driverName",
             "vehicle": { "id", "vehicleNumber", "vehicleType", "capacity" } | null,
             "driver":  { "id", "name", "mobile" } | null },
  "ready": true,
  "stops": [ { "id", "stopName", "sequenceOrder", "pickupTime": "07:10 AM", "dropTime": "03:40 PM" } ],
  "totalStudents": 8, "pickedUpCount": 4, "droppedCount": 0,
  "students": [
    { "studentId", "name", "admissionNumber", "rollNumber", "className": "Class 10-A",
      "stop": { "id", "stopName", "sequenceOrder" },
      "pickupTime": "07:10 AM", "dropTime": "03:40 PM",
      "pickupStatus": "PENDING | PICKED_UP", "pickedUpAt",
      "dropStatus": "PENDING | DROPPED", "droppedAt" } ] }
```

```
┌─────────────────────────────────────────┐
│ 🚌 MP09DM0101 · 40 seats                │
│ 👤 Suresh Yadav               [ Call ]  │
│ ‹   Today · 1 Oct 2026   ›              │
│ [   Pickup   |    Drop    ]             │  ← segmented toggle
│ Picked up 4 of 8  ▓▓▓▓░░░░              │
│ 🔍 Search student or class              │
├─────────────────────────────────────────┤
│ ① Demo Nagar Gate              07:10 AM │  ← one group per stop, in sequence order
│   Aarav Mehta   Class 10-A  [Picked up ✓ 7:12 AM] │  ← tap to undo
│   Sneha Kulkarni Class 10-A [ Pick up ] │  ← big button
│ ② Sample Chowk                 07:20 AM │
└─────────────────────────────────────────┘
```

**Marking**

| Action | Request |
|---|---|
| Pick up | `POST /transport-manager/students/:studentId/pickup` body `{ "date": "YYYY-MM-DD" }` |
| Drop | `POST /transport-manager/students/:studentId/drop` body `{ "date" }` |
| Undo drop | `DELETE /transport-manager/students/:studentId/drop?date=YYYY-MM-DD` |
| Undo pickup | `DELETE /transport-manager/students/:studentId/pickup?date=YYYY-MM-DD` |

`date` is optional everywhere (defaults to today). `DELETE` takes it in the **query string**. Each call returns the day's row: `{ id, date, studentId, routeId, stopId, pickupStatus, pickedUpAt, dropStatus, droppedAt }` — `data` is `null` when an undo found nothing to undo.

**Rules the UI must mirror**
- `students` is already sorted by stop sequence. Group it under `stops` (show a stop even when nobody rides from it).
- **Drop needs a pickup.** In Drop mode show a disabled "Not picked up" for a child whose `pickupStatus != PICKED_UP` (the server answers `409 TRANSPORT_NOT_PICKED_UP`).
- **Undo in reverse order.** A pickup cannot be undone while the drop stands (`409 TRANSPORT_ALREADY_DROPPED`) — tell the manager to undo the drop first. Ask for confirmation before any undo.
- **Today or earlier only.** A future date is `400`. The day stepper must not go past today.
- **`ready: false`** → disable every button and show "This route needs a vehicle and a driver" (`409 TRANSPORT_ROUTE_NOT_READY`).
- Tapping twice is safe — the server is idempotent ("Already marked as picked up"). Still disable a row while its request is in flight.
- Update the row **optimistically** and roll it back if the call fails. On `404` or `409`, reload the list: the student has left the route, or the route changed.
- **While another day is loading, disable the buttons.** The rows still on screen belong to the previous day, and a tap would be recorded against the new one. Likewise, ignore the reply to a tap if the manager has already moved to another day.
- Show the search box once a route has 6 or more students; filter by name, class, admission number or roll number.
- A student moved to another route during the day keeps the morning's pickup there, so the afternoon drop works on the new route.

### 5.3 Fleet (read-only)
`GET /transport-manager/fleet`

```json
{ "vehicles": [ { "id", "vehicleNumber", "vehicleType", "capacity", "model", "fuelType", "status",
                  "driver": { "id", "name", "mobile" } | null,
                  "route":  { "id", "routeName" } | null } ],
  "drivers":  [ { "id", "name", "mobile", "licenseNumber", "photo", "status",
                  "vehicle": { "id", "vehicleNumber", "capacity" } | null,
                  "route":   { "id", "routeName" } | null } ] }
```
Two tabs — **Vehicles | Drivers** — as cards. A `null` driver / vehicle / route reads "No driver assigned" / "No vehicle assigned" / "Not on a route". A call button dials the driver's mobile. No add or edit buttons.

### 5.4 Profile
- Read-only: name, designation, email, mobile, employee ID, school. "To change these details, contact the school office."
- **Change password**: `PATCH /transport-manager/change-password { currentPassword, newPassword }` (min 8 characters). `401 CURRENT_PASSWORD_INVALID` → "Current password is incorrect". On success **replace the saved token with `data.token`** — the old one is dead.
- **Logout**: `POST /transport-manager/auth/logout`, then clear local storage. It signs the manager out on every device.
- **Delete account**: `POST /transport-manager/account/delete` (body `{}`; a `password`, if sent, must be correct). Removes the app login only — the staff record and the recorded pickups stay with the school. The office re-opens the login by setting a new password in School Admin → Users.

---

## 6. Optional: offline queue
Signal is often poor at a bus stop. If a pickup / drop call fails because there is **no network** (not a 4xx):
1. Save `{studentId, leg, action: mark|undo, date}` locally and show the row as "⏳ syncing".
2. When the network returns, replay the queue **in order**. The endpoints are idempotent, so a replay is safe.
3. On a 4xx during replay, drop the item, show the error on that row and reload the list.

---

## 7. Error codes

| code / status | When | UI |
|---|---|---|
| `TRANSPORT_INVALID_CREDENTIALS` (401) | Wrong email or password | "Invalid email or password" |
| `TRANSPORT_MANAGER_INACTIVE` (403 at login, 401 after) | School made the staff account inactive | "Your account is not active" → Login |
| `TRANSPORT_UNAUTHORIZED` (401) | No / expired / revoked token | Clear token → Login |
| `TRANSPORT_FORBIDDEN` (403) | Token of another role | Clear token → Login |
| `ROLE_MISMATCH` (403) + `suggestedRole` | The login belongs to another role | Offer "Switch to …" |
| 409 "more than one school" | Same login at two schools | Show the message |
| `TRANSPORT_VALIDATION_ERROR` (400) | Missing field, malformed id, bad or future date | Show the message |
| `TRANSPORT_NOT_FOUND` (404) | Route not in this school; student not on transport any more | "No longer on this route" → reload |
| `TRANSPORT_ROUTE_NOT_READY` (409) | Route has no vehicle or driver | Banner; reload |
| `TRANSPORT_NOT_PICKED_UP` (409) | Drop before pickup | "Mark picked up first" |
| `TRANSPORT_ALREADY_DROPPED` (409) | Undo pickup while dropped | "Undo the drop first" |
| `CURRENT_PASSWORD_INVALID` (401) | Change password / delete account | Field error — do **not** log out |
| HTTP 402 | Subscription expired | Subscription-expired screen (profile still works) |
| HTTP 429 | Too many logins / password changes | "Try again later" |

Note the one 401 that must **not** log the user out: `CURRENT_PASSWORD_INVALID`.

---

## 8. Build order
1. Core + Login + splash `me` check + 401 / 402 handling.
2. Home: day stepper, totals, route cards.
3. Route screen: grouped list + pickup, optimistic update.
4. Drop mode + undo + the ordering rules.
5. Fleet.
6. Profile: change password, logout, delete account, forgot password.
7. Search, offline queue.

---

## 9. Test with Postman first
1. In `backend/services/platform-service` run `npm run seed:app-demo` (add `-- --reset` to restore the demo school after testing).
2. Import `postman/Transport-Manager-App.postman_collection.json`.
3. **01 Auth → Login** (demo credentials are filled in). `{{token}}` saves itself.
4. **02 → Overview** saves `{{routeId}}`; **Route run** saves a `{{studentId}}` that is still pending.
5. **03** in order: Mark picked up → Mark dropped → Undo drop → Undo pickup.
6. **04** holds the errors the app must handle; each test checks the expected status and code.

To use your own school instead: School Admin web panel → Transport (vehicle, driver, route with stops, assign both to the route, assign a student) and → Users (add a user with the role **Transport Manager**, email and password).

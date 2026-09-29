# Transport (Driver) App — Flutter Design & Flow Guide

> Backend: `backend/services/platform-service/src/routes/driver.routes.js`
> Postman: [postman/Transport-Driver-App.postman_collection.json](postman/Transport-Driver-App.postman_collection.json) (8 requests, full localhost URLs)

---

## 0. At a glance

| Item | Value |
|---|---|
| Who uses it | Bus/van **drivers**, created by School Admin → Transport → Drivers |
| Login | **`mobile` + `password`** (not email) |
| Login URL | `POST http://localhost:5000/api/v1/platform/school-portal/auth/driver-login` |
| All other URLs | `http://localhost:5000/api/v1/platform/school-portal/driver/...` |
| Token | One JWT, valid 7 days. `Authorization: Bearer <token>` |
| Screens | **Only 4:** Login → Today's Run (student list) → Route & Stops → Profile |

### Scope is deliberately small
The transport module has exactly one flow:

```
Admin: Vehicle → Driver → Route → Stops (+pickup/drop time) → Route + Vehicle + Driver → Student + Stop
Driver app: see my route → see my students → mark PICKED UP → mark DROPPED   (daily)
```

The following are **deliberately NOT in the backend**, so don't design screens for them: GPS/live tracking, trips, SOS, alerts, notifications, OTP, vehicle maintenance, inspections, reports, and profile editing. The driver can change **only one thing**: today's pickup/drop status (plus their own password).

---

## 1. Recommended Flutter stack (keep it light)

| Need | Package |
|---|---|
| State | `flutter_riverpod` |
| Routing | `go_router` (3–4 routes only) |
| HTTP | `dio` |
| Token | `flutter_secure_storage` |
| Models | `freezed` + `json_serializable` |
| UI | `url_launcher` (call school), `intl` |
| Offline queue (optional, recommended) | `hive` or `sqflite` + `connectivity_plus` |

Design for **one-handed, glanceable use**: large touch targets (≥ 56 dp), high contrast, big text, and no deep menus. The driver uses this at a bus stop.

---

## 2. Project structure

```
lib/
├── app/          app.dart · router.dart · env.dart
├── core/         network/ (dio, interceptor, api_exception) · storage/ · theme/
└── features/
    ├── auth/         login_screen · auth_repository
    ├── run/          today_run_screen · student_tile · run_providers · (offline_queue)
    ├── route/        route_screen (stops timeline)
    └── profile/      profile_screen · change_password_screen
```

---

## 3. Networking

- Base URL: emulator `http://10.0.2.2:5000/api/v1/platform`, real phone `http://<PC-LAN-IP>:5000/api/v1/platform`.
- ⚠ **Driver login is different from the other 3 apps**: the token is **inside `data`**.
  ```json
  { "success": true, "message": "Logged in",
    "data": { "token": "…", "driver": {…}, "user": {…}, "school": { "name", "primaryColor", "branding": {"logo"} } } }
  ```
- Errors: `{ success:false, message, code }`. Driver codes start with `TRANSPORT_`.
- **401** → Login. **402** → subscription expired. **429** → rate limited.
- There is no logout endpoint. To log out, delete the token locally.

---

## 4. Auth flow

```
Splash → token? ─ no → Login
           └ yes → GET /driver/me ─ 200 → Today's Run
                                  ├ 401 → Login
                                  └ 402 → Subscription expired

Login screen: [ +91 | mobile number ]  [ password ]  [LOGIN]
 → POST /school-portal/auth/driver-login { mobile, password }
 → save data.token + data.school → Today's Run
```
- Use a numeric keyboard with a 10-digit mask. The backend strips `+91`, spaces and dashes.
- `409` "registered at more than one school" → show the message as it is and ask them to contact the office.
- Wrong mobile or password → `TRANSPORT_INVALID_CREDENTIALS` → "Invalid mobile number or password".

`GET /driver/me` returns:
```json
{ "driver": { "id", "name", "mobile", "licenseNumber", "status",
              "vehicle": { "id", "vehicleNumber", "vehicleType", "capacity" } | null,
              "route":   { "id", "routeName" } | null } }
```

---

## 5. Screens

### 5.1 Today's Run (home — the main screen)
`GET /driver/students` (optional `?date=YYYY-MM-DD`, defaults to today)

Response:
```json
{ "date": "2026-09-29",
  "route": { "id", "routeName", "vehicleNumber", "driverName" },
  "totalStudents": 24, "pickedUpCount": 10, "droppedCount": 0,
  "students": [
    { "studentId", "name", "admissionNumber", "rollNumber", "className": "7-A",
      "stop": { "id", "stopName", "sequenceOrder" },
      "pickupTime": "07:10", "dropTime": "14:20",
      "pickupStatus": "PENDING | PICKED_UP", "pickedUpAt",
      "dropStatus": "PENDING | DROPPED", "droppedAt" } ] }
```

**Layout:**
```
┌─────────────────────────────────────────┐
│ Route 5 · MH12 AB 1234        29 Sep ▾  │  ← date picker (today or past only)
│ [ Morning pickup | Afternoon drop ]     │  ← segmented toggle
│ Picked 10/24  ▓▓▓▓▓░░░░░   Dropped 0/24 │
├─────────────────────────────────────────┤
│ ● Stop 1 · Shivaji Nagar · 07:10        │  ← sticky header per stop (group by stop.sequenceOrder)
│   Aarav Sharma  7-A      [ PICKED UP ✓ ]│
│   Diya Patel    5-B      [  PICK UP  ]  │  ← big button
│ ● Stop 2 · FC Road · 07:18              │
│   …                                     │
└─────────────────────────────────────────┘
```
- The list is already **sorted by stop sequence**. Group it into sections by `stop`.
- **Morning mode:** the button calls `POST /driver/students/:studentId/pickup`.
- **Afternoon mode:** the button calls `POST /driver/students/:studentId/drop`. Disable it (greyed, "Not picked up") while `pickupStatus != PICKED_UP`, because the backend returns `409 TRANSPORT_NOT_PICKED_UP`.
- Body for both: `{ "date": "YYYY-MM-DD" }` (optional, defaults to today). **Future dates are rejected**, so only allow today or earlier in the date picker.
- Tapping twice is safe: the backend is idempotent and replies "Already marked…". Still, disable the button while a request is in flight.
- Update the tile **optimistically** (turn it green at once, roll back on error) so the driver never waits.
- Offer undo for 3 seconds with a SnackBar. Note that the backend has **no un-mark API**, so the undo has to cancel the request *before* it is sent: delay the call by 3 s.
- Pull-to-refresh, and auto-refresh when the app resumes.

### 5.2 Route & Stops
`GET /driver/route` returns the route with vehicle and driver, `totalStops`, `assignedStudents` and `stops[]` (each with `stopName`, `sequenceOrder`, `pickupTime`, `dropTime`).

Show it as a vertical timeline of stops (sequence, name, pickup time / drop time, rider count).

`409 TRANSPORT_ROUTE_NOT_READY` ("No route has been assigned to you yet") → an empty state with a **Call school office** button. The same error can come from `/students`, so handle it on both screens.

### 5.3 Profile
- Read-only: name, mobile, licence no., vehicle (number, type, capacity), route name, school name and logo.
- **Change password**: `PATCH /driver/change-password {currentPassword, newPassword}` (min 8 chars).
- **Logout**: clear the token (there is no server call).

---

## 6. Optional but recommended: offline queue
Buses often lose signal. If a pickup/drop call fails because there is **no network** (not because of a 4xx):
1. Save `{studentId, action: pickup|drop, date}` in a local queue and show the tile as "⏳ syncing".
2. When `connectivity_plus` reports the network is back, replay the queue in order. Because the endpoints are idempotent, replays are safe.
3. On a 4xx during replay, drop the item and show the error on that tile.

---

## 7. Error codes

| code / status | UI |
|---|---|
| `TRANSPORT_INVALID_CREDENTIALS` (401) | "Invalid mobile number or password" |
| 409 + "more than one school" | Show the message and a call-office button |
| `TRANSPORT_ROUTE_NOT_READY` (409) | Empty state "No route assigned yet" |
| `TRANSPORT_NOT_PICKED_UP` (409) | "Mark picked up first" |
| `TRANSPORT_VALIDATION_ERROR` (400) | Show the message (e.g. future date) |
| `TRANSPORT_NOT_FOUND` (404) on pickup/drop | "This student is no longer on your route" → refresh the list |
| `TRANSPORT_FORBIDDEN` (403) | Token is not a driver token → log out |
| `TRANSPORT_DRIVER_INACTIVE` | "Your account is inactive" |
| HTTP 402 | Subscription-expired page |

---

## 8. Build order
1. Core + Login (mobile/password) + splash `me` check.
2. Today's Run list (grouped by stop) + pickup button.
3. Drop mode + the rule that drop needs a pickup first.
4. Route & Stops screen + the "no route" empty state.
5. Profile + change password + logout.
6. Offline queue and optimistic updates.

---

## 9. Test with Postman first
1. In the School Admin web panel → Transport: create a Vehicle, a Driver (with mobile + password) and a Route with stops. Assign the vehicle and driver to the route, then assign at least one student to a stop.
2. Import `postman/Transport-Driver-App.postman_collection.json`.
3. **01 Auth → Login** with that driver's mobile and password. `{{token}}` saves automatically from `data.token`.
4. **03 → Today's students** saves the first `studentId`. Then run **04 → Mark picked up**, then **Mark dropped**. Try the drop first to see the 409.

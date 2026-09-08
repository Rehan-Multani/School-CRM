# Transport APK — Backend API

Backend for the Flutter Transport app — a **driver / conductor / transport-
manager operational** app. Owned by `platform-service` (port `5002`). Built to
the same standard as the Teacher / Student / Parent APKs — layered architecture,
response envelope, tenant isolation, error-code contract, idempotency, audit.

| | Base | Path form |
|---|---|---|
| Direct to platform-service | `http://localhost:5002` | `<path>` as written, **no prefix** |
| Through the api-gateway (`:8080`) | `https://<gateway-host>` | `/api/v1/platform<path>` |

**Route namespace:** the existing *school-admin* transport management keeps
`/school-portal/transport/*` (`requireSchoolAdmin`). The **APK** surface is
**`/school-portal/transport-app/*`** (login at `/school-portal/auth/transport-login`).

---

## 0. Bottom-nav → API map

**5 bottom-nav tabs** — Home · Trips · Students · Alerts · Profile — plus 🔔
top-right. Postman is grouped the same way. Paths under `/school-portal/transport-app`.

| Tab | Screens | Endpoints |
|---|---|---|
| **⌂ App bar** | 🔔 notifications + unread badge · 👤 Me / Logout | `GET /notifications`, `/notifications/unread-count`, `PATCH /notifications/:id/read`, `/notifications/read-all`, `POST /device-tokens` · `GET /me`, `POST /auth/logout` |
| **1 · Home** | Today's trip, vehicle, route, crew, status, next stop, counts, alerts, active SOS, inspection status | `GET /dashboard`, `GET /dashboard/summary` |
| **2 · Trips** | List / history / detail; pre-trip inspection; start / complete / cancel / abort; stop arrive / depart; live location | `GET /trips`, `/trips/history`, `/trips/:id` · `POST /trips` *(mgr)* · `POST /trips/:id/inspection`, `GET /trips/:id/inspection` · `POST /trips/:id/start\|/complete\|/cancel`*(mgr)*`\|/abort` · `GET /trips/:id/stops`, `POST /trips/:id/stops/:stopId/arrive\|/depart` · `POST /trips/:id/location`, `GET /trips/:id/location`, `/trips/:id/location/history` |
| **3 · Students** | Trip roster; board / drop / absent / exception; route students | `GET /trips/:tripId/students`, `/trips/:tripId/students/:studentId/status` · `POST …/board`, `…/drop`, `…/absent`, `…/exception` · `GET /routes/:routeId/students` |
| **4 · Alerts** | Unified alert feed; vehicle issues; SOS | `GET /alerts`, `/alerts/:id`, `PATCH /alerts/:id/read\|/resolve` · `POST /trips/:tripId/issues`, `GET /trips/:tripId/issues` · `POST /sos`, `GET /sos`, `/sos/:id`, `PATCH /sos/:id` |
| **5 · Profile** | Staff profile; assigned vehicle + documents + inspection history; assigned route; settings | `GET /profile`, `PATCH /profile` · `GET /vehicle`, `/vehicle/documents`, `/vehicle/inspection-history` · `GET /route` · `GET /settings`, `PATCH /settings` *(mgr)* · `PATCH /change-password` |

> **Deferred / not in v1** (documented so the app hides them):
> - **Manager reports suite** (`/reports/*`) — raw data is in `Trip` /
>   `TripStudent` / `TransportIncident` / `TransportSOS` + the school-admin
>   transport endpoints; an aggregation layer is a planned follow-up.
> - **Route-deviation detection** — a cron seam exists in
>   `src/cron/transportJobs.js`; needs geofence math + alert cooldown.
> - **Parent live-tracking endpoints** — the Parent APK is unchanged; a
>   read-only `/parent/children/:childId/transport` view is a follow-up.
> - **Refresh tokens / socket.io realtime** — no other portal uses them and the
>   stack has neither; GPS/trip updates are **poll + FCM push**.

---

## 1. Authentication

| | |
|---|---|
| Scheme | `Authorization: Bearer <accessToken>` |
| Identity | a `SchoolUser` with `role:'TRANSPORT'` + `transportRole` (`DRIVER`\|`CONDUCTOR`\|`TRANSPORT_STAFF`\|`TRANSPORT_MANAGER`\|`TRANSPORT_ADMIN`) + `assignedVehicleId` / `assignedRouteId` |
| Token | single JWT, `expiresIn = JWT_EXPIRES_IN` (default `7d`) — **no refresh token** (matches all 8 portals; client re-logs-in on 401) |
| Claims | `sub` = `userId` = `SchoolUser._id`, `schoolId`, `role:"TRANSPORT"`, `transportRole`, `assignedVehicleId`, `assignedRouteId`, `name`, `email` |
| Identity source | server re-derives `schoolId` / `staffId` from the JWT (`utils/tenant.js`); `tripId` / `vehicleId` / `studentId` are authorized server-side and never trusted from the request |
| Role guard | `requireTransport` — role must be `TRANSPORT` (or `SCHOOLADMIN` for oversight) → `enforceSubscriptionAccess` (402 past grace, except the exempt auth/me/profile/change-password paths). `requireTransportRole([...])` gates manager/admin-only ops |

### Flow

```
POST /school-portal/auth/transport-login   (also /school-auth/transport-login)
  { identifier, password }  ->  { token, staff, vehicle, route, school }
        identifier = email | employeeId
POST /school-portal/transport-app/auth/logout   client discards the token
```

Uniform `401 { code:"INVALID_CREDENTIALS" }`; inactive → `403 STAFF_INACTIVE`;
multi-school login → `409`. `loginRateLimiter` on login.

### Provisioning
Transport staff are `SchoolUser`s created via the existing school-admin user
management; set `role:'TRANSPORT'`, `transportRole`, `assignedVehicleId`,
`assignedRouteId`. Seed: every school gets `driver@<school-domain>` / `Driver@123`
(DRIVER) with a vehicle + route + 2 stops + a `StudentTransportAssignment` + a
SCHEDULED trip for today.

---

## 2. Response shape & errors

```jsonc
{ "success": true, "data": { … }, "message": "…" }
{ "success": true, "data": [ … ], "pagination": { "page":1, "limit":20, "total":42, "totalPages":3 } }
{ "success": false, "message": "human readable", "code": "MACHINE_CODE" }
```
Pagination `?page=` `&limit=` (default 20, max 50; location history max 100).
Dates ISO-8601; `date` is `YYYY-MM-DD` (school-local).

**Error codes** — `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_ERROR`
· `RATE_LIMITED` · `INVALID_CREDENTIALS` · `STAFF_INACTIVE` ·
`TRANSPORT_ROLE_REQUIRED` · **`TRIP_ACCESS_DENIED`** · `VEHICLE_ACCESS_DENIED` ·
`ROUTE_ACCESS_DENIED` · `NO_ASSIGNMENT` · **`INVALID_TRIP_TRANSITION`** ·
`TRIP_DATE_INVALID` · `DUPLICATE_TRIP` · `VEHICLE_NOT_AVAILABLE` ·
`INSPECTION_REQUIRED` · `INSPECTION_CRITICAL_FAILURE` · `TRIP_NOT_ACTIVE` ·
`STUDENT_NOT_ON_TRIP` · `ALREADY_BOARDED` · `NOT_BOARDED` ·
`BOARDING_STATE_CONFLICT` · `GPS_INVALID_COORDS` · `GPS_STALE_TIMESTAMP` ·
`GPS_DISABLED` · `SOS_ALREADY_ACTIVE` · `SOS_STATE_CONFLICT` ·
`ALERT_STATE_CONFLICT` · `DUPLICATE_REQUEST`.

Cross-school / unknown ids → **`404`** (never leak existence); visible-but-
forbidden → **`403`**.

---

## 3. Authorization model

`transportAccess.service.js` — `loadContext(req)` caches
`{ schoolId, staffId, transportRole, isManager, assignedVehicleId,
assignedRouteId, settings }`.

| Actor | Trips | Vehicles / Routes | Students | Create/Cancel trip · Settings |
|---|---|---|---|---|
| DRIVER | only where `trip.driverId === me` | only the assigned one | only on an accessible trip | ✗ |
| CONDUCTOR | only where `trip.conductorId === me` | only the assigned one | only on an accessible trip | ✗ |
| TRANSPORT_MANAGER / _ADMIN / SchoolAdmin | any in school | any in school | any in school | ✓ |

- `loadTrip(ctx, tripId)` → `{ _id, schoolId }` match → `404` cross-school; then
  driver/conductor assignment check → `403 TRIP_ACCESS_DENIED`.
- `assertStudentOnTrip` — a `TripStudent {tripId, studentId}` row must exist →
  else `403 STUDENT_NOT_ON_TRIP`.
- Every query is `schoolId`-scoped from the JWT.

---

## 4. Trip state machine

```
SCHEDULED ──▶ INSPECTION_PENDING ──▶ READY ──▶ STARTED ──▶ IN_PROGRESS ──▶ COMPLETED
    │                │                 │           │            │
    └──▶ CANCELLED ◀─┴─────────────────┘           └──▶ ABORTED / FAILED ◀──┘
```

`ALLOWED_TRANSITIONS` (in `src/models/Trip.js`). Any other move → `409
INVALID_TRIP_TRANSITION`. `Trip.isActive` (boolean, synced by a pre-save hook) is
`false` on any terminal status and backs a partial-unique index
`{schoolId, routeId, date, tripType}` — one live trip per slot.

**Start gates** (`POST /trips/:id/start`): assigned driver (or manager) · `date`
== today · not already started/terminal · `Vehicle.status === 'ACTIVE'` ·
`settings.inspectionRequired` ⇒ a PASS inspection (or a manager override).
**Idempotent** — a second start on a STARTED trip returns 200 with current state.

**Inspection** (`POST /trips/:id/inspection`): `{ items:[{key,result,remarks}],
photos?, override?, overrideReason? }`. A `FAIL` on any critical item
(`brakes, tyres, lights, doors, firstAidKit, fireExtinguisher, emergencyExit`)
sets `criticalFailed` and blocks start unless a **manager** passes
`override:true` (audit-logged). Missing items default to `PASS`.

---

## 5. Endpoint reference (selected)

### Trips

| Method | Path | Notes |
|---|---|---|
| GET | `/trips` `?status=&date=&type=&page=` | driver/conductor → own; manager → school |
| GET | `/trips/history` `?from=&to=&page=` | terminal trips only |
| GET | `/trips/:id` | detail: route, vehicle, crew, `stopProgress`, `students[]`, `studentSummary`, `inspection`, `gps{lastAt,staleSeconds}` |
| POST | `/trips` *(mgr)* | `{ routeId, vehicleId?, driverId?, conductorId?, tripType, date?, scheduledStart?, scheduledEnd? }`; rejects a conflicting non-terminal trip for the same vehicle/driver → `409 DUPLICATE_TRIP`; builds `stops[]` + `TripStudent` rows from `RouteStop` + `StudentTransportAssignment`; header `Idempotency-Key` |
| POST | `/trips/:id/start\|/complete\|/abort` | state-machine guarded; `/abort` needs `{reason}` |
| POST | `/trips/:id/cancel` *(mgr)* | SCHEDULED/READY only |
| POST | `/trips/:id/stops/:stopId/arrive` | `{lat?,lng?}`; sets `currentStopId`, computes `delayMin`, STARTED→IN_PROGRESS |
| POST | `/trips/:id/stops/:stopId/depart` | `{lat?,lng?}` |

### GPS  (poll model — no socket/Redis in the stack)

| POST | `/trips/:id/location` | `{ latitude, longitude, accuracy?, speed?, heading?, timestamp? }`. `gpsRateLimiter` (~120/min). Requires `settings.gpsEnabled` (`409 GPS_DISABLED`), an active trip (`409 TRIP_NOT_ACTIVE`), the assigned crew. Validation: lat∈[-90,90], lng∈[-180,180], `accuracy≥0`, `speed≤200`, `|timestamp−now|≤10min` (`400 GPS_INVALID_COORDS` / `GPS_STALE_TIMESTAMP`). An impossible jump (>2 km in <5 s) is **flagged**, not rejected. Writes a `TripLocationPing` (**TTL 6 h**) + `Trip.lastLocation`. |
| GET | `/trips/:id/location` | `{ location, staleSeconds, stale }` — the app shows *"location unavailable / updated N min ago"* when `stale`; never a fake position |
| GET | `/trips/:id/location/history` `?from=&to=&page=` | bounded (`limit ≤ 100`) |

### Students  (all idempotent)

| POST | `/trips/:tripId/students/:studentId/board` | `{stopId?, lat?, lng?}` + `Idempotency-Key`. Trip must be active; student must be on the trip. A repeat call returns 200 with the current state — no second record. `ABSENT → BOARDED` is a correction; `CANCELLED → 409`. Parent notified if `settings.boardingNotify`. |
| POST | `…/drop` | must be `BOARDED` first (`409 NOT_BOARDED`). Parent notified if `settings.dropNotify`. |
| POST | `…/absent` | `{reason}` → status `ABSENT` + a `STUDENT_ABSENT` alert + parent notify (`absentNotify`) + optional class-teacher notify (`notifyClassTeacherOnAbsent`). |
| POST | `…/exception` | `{type, description}` → `TransportIncident` + `MISSED_DROP` alert + parent notify. |

### Alerts · Issues · SOS

| GET | `/alerts` `?status=&type=&severity=&page=` | manager → all; driver → alerts for own trips / assigned vehicle+route / raised-by-me. `meta.unreadOnPage`. |
| PATCH | `/alerts/:id/read` | `ReadReceipt` (`refType:'TRANSPORT_ALERT'`, `userType:'TRANSPORT'`) |
| PATCH | `/alerts/:id/resolve` | manager or the raiser |
| POST | `/trips/:tripId/issues` | `{type(BREAKDOWN\|FLAT_TYRE\|ENGINE\|BRAKE\|GPS\|DOOR\|OTHER), severity, description, photos[], location}` → `TransportIncident` + `VEHICLE_ISSUE` alert. `HIGH`/`CRITICAL` ⇒ immediate manager+admin push. **The trip is NOT auto-completed** — a manager decides. |
| POST | `/sos` | `{tripId?, description, location}`. `sosRateLimiter` (soft — a genuine emergency is never hard-blocked; the anti-duplicate is a code check + partial-unique "one open SOS per trip"). Creates `TransportSOS(ACTIVE)` + a `CRITICAL EMERGENCY` alert; notifies `settings.sosRecipientRoles` (mapped to the `transport` + `school-admin` push audiences). `Idempotency-Key`. |
| PATCH | `/sos/:id` | `{action: acknowledge\|resolve\|cancel}` — transition-validated. Manager acknowledges/resolves; the raiser may cancel while `ACTIVE`. |

### Profile · Vehicle · Settings

| GET/PATCH | `/profile` | update whitelist: `phone`, `photo` (multipart), `emergencyContact` |
| GET | `/vehicle` · `/vehicle/documents` · `/vehicle/inspection-history` | assigned vehicle (manager may pass `?vehicleId=`) |
| GET | `/route` | assigned route + ordered stops (manager may pass `?routeId=`) |
| GET | `/settings` · PATCH `/settings` *(mgr)* | `TransportSettings` — gps/inspection toggles, delay/deviation/stale thresholds, notify toggles, `sosRecipientRoles`, `documentExpiryReminderDays` |

---

## 6. Notification events & deep links

Events (via `notificationService.send`, safe ids only):
`TRIP_STARTED`, `STUDENT_BOARDED`, `STUDENT_DROPPED`, `STUDENT_ABSENT`,
`VEHICLE_ISSUE`, `SOS`, `DOCUMENT_EXPIRY`, `ROUTE_DELAY`, `STALE_GPS`.

Deep links: `SOS` / `VEHICLE_ISSUE` → Alerts → detail; `STUDENT_*` (parent app) →
Trip status; `DOCUMENT_EXPIRY` → Profile → Vehicle Documents; `ROUTE_DELAY` →
Trip detail. `PICKUP` (school-gate) remains a **separate** flow — only the
notification/deep-link layer is shared, not the business logic.

---

## 7. Background jobs (`src/cron/transportJobs.js`, `node-cron` + `CronLock`)

| Job | Cadence | Effect |
|---|---|---|
| `runDocumentExpiryJob` | daily 04:00 | `VehicleDocument` within `documentExpiryReminderDays` → `DOCUMENT_EXPIRY` alert (deduped, 24 h cooldown) |
| `runStaleGpsJob` | every 5 min | active trip, `gpsEnabled`, last ping older than `staleGpsMinutes` → `STALE_GPS` alert (15 min cooldown) |
| `runTripDelayJob` | every 5 min | `IN_PROGRESS` trip past a stop `expectedAt` by `> delayThresholdMin` → `ROUTE_DELAY` alert (20 min cooldown) |

Wired from `src/server.js` → `startTransportCronJobs()`.

---

## 8. Security notes

- Identity from the verified JWT only; `tripId`/`vehicleId`/`studentId`
  authorized server-side; body/query/params never trusted for scoping.
- IDOR/BOLA covered by `test/transport.isolation.test.js`: School-A staff vs
  School-B `tripId`/`routeId` → 404/403; driver create/cancel/settings → 403;
  teacher/student/parent token on a transport route → 403; missing token → 401;
  malformed `tripId` → 400.
- **Idempotency**: `withIdempotency` on trip create/start/board/drop/sos; DB
  guards — `TripStudent {tripId,studentId}` unique, `Trip` partial-unique per
  slot (via `isActive`), one open `TransportSOS` per trip (via `isOpen`),
  `Trip.idempotencyKey` / `FeePayment`-style partial-unique.
- **GPS** is user-supplied — validated (range, timestamp, speed), impossible-jump
  flagged, rate-limited, active-trip + assigned-crew required, TTL-persisted. Not
  claimed spoof-proof; abuse is auditable (`flagged` pings).
- `loginRateLimiter`; `passwordHash` `select:false`, never serialized; no
  tokens / OTPs / credentials logged. Audit on every state-changing op.

## 9. Feature flags
All business thresholds live in `TransportSettings` (per school). Nothing
hardcoded. `TransportSettings.getOrDefault(schoolId)` upserts sensible defaults.

# School CRM — Transport Mobile App (Flutter Developer Handoff)

Companion to [`transport-apk-api.md`](file:///c:/Users/admin/Documents/GitHub/School-CRM/docs/transport-apk-api.md).
All APIs are implemented and live in `platform-service` (`:5002` / Gateway
`/api/v1/platform`). The Transport app **reuses the shared design system** — same
palette, geometry, typography, interceptors, loading patterns.

---

## 📱 Bottom navigation (exactly 5) + App bar

`HOME · TRIPS · STUDENTS · ALERTS · PROFILE` — top-right 🔔 bell on every screen
(not a tab). Do **not** add a 6th tab. Vehicle / route / settings / documents
open from **Profile**; issues and SOS from **Alerts**.

- **Home** — today's trip card (vehicle, route, crew, status), next stop,
  expected/boarded/dropped counts, alerts badge, **active SOS banner**, inspection
  status, quick actions (Inspect · Start · Report issue · SOS).
- **Trips** — list / history; trip detail with stop timeline; pre-trip
  inspection checklist; Start/Complete/Abort; per-stop Arrive/Depart; live map
  (last GPS point).
- **Students** — trip roster grouped by stop; per-student Board / Drop / Absent /
  Exception with one-tap chips; search.
- **Alerts** — unified feed (issue / delay / deviation / absent / SOS / doc
  expiry), read/resolve; Report Vehicle Issue; SOS.
- **Profile** — staff profile, assigned vehicle + documents (expiry flags) +
  inspection history, assigned route + stops, transport settings (read for
  driver, editable for manager), change password, logout.

---

## 🎨 Design System (shared with the other apps)

```dart
class AppColors {
  static const primary       = Color(0xFF2563EB);
  static const presentGreen  = Color(0xFF10B981);  // boarded
  static const absentRed      = Color(0xFFEF4444);  // absent / critical
  static const lateAmber      = Color(0xFFF59E0B);  // delay
  static const scaffoldBg     = Color(0xFFF8FAFC);
  static const cardSurface    = Color(0xFFFFFFFF);
  static const borderSubtle   = Color(0xFFE2E8F0);
  static const textPrimary    = Color(0xFF0F172A);
  static const textSecondary  = Color(0xFF64748B);
}
```
Card radius 16 · button 12 · chip 8 · content padding H16/V12 · elevation 0 with
`borderSubtle`. Skeleton loaders (dashboard, trip card, roster rows, alert rows),
never bare spinners. Every screen: loading / empty / error / retry / success.

---

## ⚡ Implementation requirements

### 1. Auth & session
- `flutter_secure_storage` for `accessToken`, `staffId`, `schoolId` — never
  `SharedPreferences` for the token.
- Dio `AuthInterceptor` attaches `Authorization: Bearer` on every request.
- **No refresh token** — on `401` clear storage → `LoginScreen`.
- `402` → school subscription lapsed; show renew modal (auth/me/profile still work).
- `403 TRIP_ACCESS_DENIED` / `404` on a trip → the trip is not yours / no longer
  exists; pop to the trip list.

### 2. Trip state machine (mirror the server)
Disable buttons that aren't valid for the current status. `Start` is only enabled
after a **PASS inspection** (or a manager override). A `409
INVALID_TRIP_TRANSITION` means your local state is stale — refetch the trip.

### 3. Offline queue (critical for a moving bus)
- **Board / Drop / GPS pings** must be queued locally (Hive/Isar/SQLite) when
  offline and replayed on reconnect.
- Each queued board/drop carries a stable **`Idempotency-Key`** (UUID v4) so a
  replay after a partial send does not double-record. The server returns the
  current state on a duplicate — reconcile, don't error.
- GPS: sample ~every 5–10 s while a trip is `STARTED`/`IN_PROGRESS`; batch-flush
  the queue; drop pings older than 10 min (the server rejects them anyway).

### 4. GPS / live map
- `POST /trips/:id/location` with `{latitude, longitude, accuracy, speed,
  heading, timestamp}`. Respect `gpsRateLimiter` — ~1 ping/sec max.
- The parent/manager view polls `GET /trips/:id/location`. If `stale` is true,
  show **"Location unavailable — updated N min ago"**. **Never** render a fake
  current position.
- There is no socket.io layer — everything is polling + FCM push.

### 5. SOS
- Two-tap confirm → `POST /sos`. Show a persistent banner while `ACTIVE` /
  `ACKNOWLEDGED`. Never block the button on a network error — retry in the
  background with the same `Idempotency-Key`. A `409 SOS_ALREADY_ACTIVE` means one
  is already open — jump to its detail.

### 6. Push notifications & deep links
- On login / FCM refresh → `POST /device-tokens { token }` (role `transport`).
- Deep links: `SOS` / `VEHICLE_ISSUE` → Alerts detail; `ROUTE_DELAY` → Trip
  detail; `DOCUMENT_EXPIRY` → Profile → Vehicle Documents. Re-validate ids on open.

### 7. File uploads
- Inspection / issue photos via multipart (reuses the school-user upload
  pipeline: images only, ≤5 MB, auto-WebP). Never embed storage credentials.

### 8. Performance (low-end Android, poor coverage)
- Home = one `GET /dashboard` call. Paginate every list. `const` widgets,
  `ListView.builder`. Cancel in-flight requests on screen dispose. Do not log
  tokens, coordinates, or student PII.

---

## 🚀 Recommended Flutter project structure

```
lib/
├── core/ (network/ · auth/ · storage/ · offline_queue/ · notifications/ · routing/ · errors/ · widgets/)
├── features/
│   ├── auth/          // transport login, session, change password
│   ├── home/          // dashboard
│   ├── trips/         // list, detail, inspection, lifecycle, stops
│   ├── location/      // GPS sampler + live map
│   ├── students/      // roster, board/drop/absent/exception
│   ├── alerts/        // feed, issues, SOS
│   ├── notifications/
│   └── profile/       // profile, vehicle, documents, route, settings
└── app/
```

Use the project's existing state-management solution. Required states: API /
loading / empty / error / retry / pagination / refresh / **offline-queue** /
trip-status / notification-unread / auth.

---

## ✅ Acceptance

Transport login + role authorization · school isolation · trip lifecycle with a
valid state machine · pre-trip inspection (critical-fail blocks start) · GPS
ingest + validation + stale handling · board/drop/absent **idempotent** ·
vehicle-issue reporting (no auto-complete) · SOS (raise/ack/resolve, one open per
trip) · unified alerts feed with read/resolve · notifications + deep links ·
profile / vehicle / documents / route / settings · secure logout · offline queue
replays without duplicates · skeleton / empty / error / retry states · no mock
data · no fake GPS · no logged secrets · Teacher/Student/Parent navigation
unchanged.

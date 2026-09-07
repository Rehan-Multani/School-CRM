# School CRM — Parent Mobile App (Flutter Developer Handoff)

Companion to [`parent-apk-api.md`](file:///c:/Users/admin/Documents/GitHub/School-CRM/docs/parent-apk-api.md).
All APIs are implemented and live in `platform-service` (`:5002` / Gateway
`/api/v1/platform`). The Parent app **reuses the Teacher & Student design system
verbatim** — same palette, geometry, typography, interceptors, loading
patterns. It must look like the same product.

---

## 📱 Bottom navigation (exactly 5) + App bar

`HOME · ACADEMICS · ATTENDANCE · NOTICES · PROFILE` — top-right 🔔 bell on every
screen (not a tab).

- **Home** — parent header, **Child selector**, today summary, quick actions
  (Fees · Homework · Timetable · Attendance · Exams · Results · Pickup ·
  Transport), pending fees, pending homework, upcoming exams, recent notices,
  important alerts (low attendance).
- **Academics** — hub; lands on Homework, chips for Timetable · Classwork ·
  Study Material · Exams · Results · Academic Progress.
- **Attendance** — overall %, P/A/L tiles, monthly calendar, history.
- **Notices** — school / class notices (read + unread dots) + Events.
- **Profile** — Parent Profile · My Children · Fees & Payments · Payments ·
  Receipts · Pickup · Notification Settings · Security · Logout.

Do **not** add a 6th tab. Fees / Pickup / Transport are **not** bottom tabs.
Transport & 1:1 Communication are **deferred** in v1 — hide their entry points
until the endpoints exist.

---

## 👶 Child selector (the core of the app)

A parent may have multiple children. `POST /auth/parent-login` and `GET /me`
return `children[]`. The app keeps a **`selectedChildId`** (persist locally only
as a UX convenience — never for authorization).

Changing the selected child re-fetches: attendance, homework, timetable, exams,
results, fees, pickup, and class-specific notices. Every child-scoped call is
`/parent/children/:childId/…` and is authorized server-side against the
`ParentStudent` link — a tampered `childId` returns `403 CHILD_ACCESS_DENIED`.

`GET /parent/dashboard/overview` returns a light per-child roll-up (attendance
%, pending fees, pending homework) to render the selector.

---

## 🎨 Design System (identical to Teacher/Student apps)

```dart
class AppColors {
  static const Color primary       = Color(0xFF2563EB); // Blue 600
  static const Color primaryDark   = Color(0xFF1D4ED8);
  static const Color primaryLight  = Color(0xFFEFF6FF);
  static const Color presentGreen  = Color(0xFF10B981);
  static const Color absentRed     = Color(0xFFEF4444);
  static const Color lateAmber     = Color(0xFFF59E0B);
  static const Color scaffoldBg    = Color(0xFFF8FAFC);
  static const Color cardSurface   = Color(0xFFFFFFFF);
  static const Color borderSubtle  = Color(0xFFE2E8F0);
  static const Color textPrimary   = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
}
```

- Per-school theming: `login`/`me` return `school.primaryColor` (+ hue aliases)
  — override `AppColors.primary` at runtime.
- Card radius `16`, button `12`, chip `8`. Content padding
  `EdgeInsets.symmetric(horizontal:16, vertical:12)`. Card elevation `0` with
  `Border.all(color: borderSubtle)`.
- **Skeleton loaders**, not spinners: Dashboard, child cards, homework rows,
  attendance tiles, timetable rows, fee rows, notice rows.
- Every screen: loading / empty / error / retry / success. Offline → clear
  offline state, `No data` for empty, `00` for unavailable numbers, `Last
  updated <time>` on cached read-only views. Never invent data.

---

## ⚡ Implementation requirements

### 1. Auth & session
- `flutter_secure_storage` for `accessToken`, `parentId`, `schoolId` — never
  `SharedPreferences` for the token.
- Dio `AuthInterceptor` attaches `Authorization: Bearer` to every request.
- **No refresh token** (matches all role portals) — on `401` clear secure
  storage and route to `LoginScreen`.
- `402` → school subscription lapsed; show the renew modal (auth / me / profile
  / change-password still work).
- `403 CHILD_ACCESS_DENIED` → the selected child is stale/unlinked; drop it and
  reload `GET /me`.

### 2. Payments (Pay Now)
- `POST /parent/children/:childId/fees/invoices/:id/pay-order` — send an
  `Idempotency-Key` (UUID v4). Response: `{ keyId, orderId, amount, currency }`.
- Open Razorpay checkout with `keyId` + `orderId`. On success, optionally call
  `POST …/fees/payments/verify` (signature only — **advisory**).
- **Never** show "Paid" from the checkout callback. Poll
  `GET …/fees/invoices/:id` / `…/fees/history` until the webhook flips the
  status; show "Payment received — confirming with the bank…" until then.
- Handle: success, failure, cancelled, timeout, app killed mid-payment,
  duplicate tap (same Idempotency-Key), already-paid (`409`), partial payment
  (`{ amount }` ≤ balance).

### 3. Receipts
- `GET …/fees/receipts/:paymentId` — render number, transaction id, date,
  amount, fee-head breakdown. Use the backend receipt data; do not fabricate.

### 4. Push notifications
- On login and on FCM token refresh: `POST /parent/device-tokens { token }`.
- Backend stores `DeviceToken { role:'parent', userId:parentId, schoolId }`.
- Central deep-link handler (payload `type` + resource id) — see
  `parent-apk-api.md §6`. `PICKUP` and `FEE`/`PAYMENT` deep-link **directly** to
  the relevant screen, not via the Profile menu. Re-validate the id on open
  (the server re-checks anyway).

### 5. Performance (low-end Android)
- Home = the single `GET /parent/dashboard?childId=` call + `overview` for the
  selector — never fan out to full lists.
- Paginate every list (`page`, `limit ≤ 50`); `ListView.builder`; `const`
  widgets; cache read-only data with a visible `Last updated`; cancel in-flight
  requests on child switch / screen dispose; image caching + resizing.
- Do not log tokens, OTPs, payment credentials, or child PII.

---

## 🚀 Recommended Flutter project structure

```
lib/
├── core/ (network/ · auth/ · storage/ · notifications/ · routing/ · errors/ · widgets/)
├── features/
│   ├── auth/           // login, session, change password
│   ├── home/           // dashboard, child selector, overview
│   ├── children/       // My Children
│   ├── academics/      // hub
│   ├── homework/  timetable/  classwork/  materials/  exams/  results/
│   ├── attendance/
│   ├── notices/        // + events
│   ├── fees/  payments/  receipts/
│   ├── pickup/         // read-only
│   ├── notifications/
│   └── profile/        // parent profile + settings
└── app/
```

Use the project's existing state-management solution; do not add another.
Required states: API / loading / empty / error / retry / pagination / refresh /
selected-child / notification-unread / auth.

---

## ✅ Acceptance

Auth + change-password · school + linked-children isolation · child switching ·
Home · Academics hub (nothing orphaned) · Attendance · Notices · Fees · **secure
payment (webhook-authoritative, idempotent)** · Receipts · Pickup (read-only) ·
Notifications + deep links · Profile · secure logout · token-expiry handling ·
skeletons · empty/error/retry · pagination · no mock data · no hardcoded ids ·
no logged secrets · parent cannot access another parent's child or another
school · Teacher/Student navigation unchanged (still 5 tabs each).

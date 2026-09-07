# School CRM — Student Mobile App (Flutter Developer Handoff)

Companion to [`student-apk-api.md`](file:///c:/Users/admin/Documents/GitHub/School-CRM/docs/student-apk-api.md).
All APIs are already implemented and live in `platform-service` (`:5002` /
Gateway `/api/v1/platform`). The Student app **reuses the Teacher app's design
system verbatim** — same palette, geometry, typography, interceptors, loading
patterns. It must look like the same product.

---

## 📱 Screens & primary APIs

| Screen | Key backend API |
|---|---|
| **01. Login** — school branding, Student ID / Email, password toggle | `POST /school-portal/auth/student-login` |
| **02. Home / Dashboard** — greeting, Class + Roll, Today's Summary (Attendance % · Homework pending · Next class), Quick Actions, Upcoming, Announcements | `GET /school-portal/student/dashboard`, `GET /today`, `GET /upcoming` |
| **03. Academics hub** — Homework · Classwork · Study Material · Timetable · Exams · Results | see below |
| **04. Homework** — All / Pending / Completed / Overdue tabs, detail, **Submit** (file + remarks) | `GET /homework?status=`, `GET /homework/:id`, `POST /homework/:id/submission` |
| **05. Timetable** — Mon–Sat switcher, current period highlighted | `GET /timetable`, `GET /timetable/day/:day` |
| **06. Attendance** — Overall %, P/A/L/HD tiles, monthly breakdown, day calendar | `GET /attendance/summary`, `GET /attendance/monthly`, `GET /attendance/daily` |
| **07. Exams & Results** — upcoming/ongoing/completed exams, datesheet, subject-wise marks, grade, rank, report card | `GET /exams`, `GET /exams/:id/schedule`, `GET /results`, `GET /results/:examId`, `GET /report-card` |
| **08. Fees** — Total / Paid / Pending, next due, invoice breakdown, payment history (**read-only**) | `GET /fees/summary`, `GET /fees/invoices/:id`, `GET /fees/history` |
| **09. Leave** — list, apply (from/to/reason/type), edit/cancel while pending | `GET /leaves`, `POST /leaves`, `PATCH /leaves/:id`, `POST /leaves/:id/cancel` |
| **10. Notices & Events** — categories, unread dots, event detail | `GET /notices`, `PATCH /notices/:id/read`, `GET /events` |
| **11. Notifications** — top-right 🔔 bell (App bar, every screen), unread badge, mark-all | `GET /notifications`, `GET /notifications/unread-count`, `POST /device-tokens` |
| **12. Profile & Settings** — photo, admission no., class/section/roll, DOB, guardians, documents, notification prefs, password, logout | `GET /profile`, `PATCH /profile`, `GET /academic-info`, `GET /guardians`, `GET /documents`, `GET/PATCH /settings`, `PATCH /change-password` |

**Bottom navigation (exactly 5):** `HOME · HOMEWORK · ATTENDANCE · NOTICES · PROFILE`.

- **Homework** tab = the Academics hub — opens on the homework list; Timetable,
  Classwork, Study Material, Exams and Results are reached from the same screen
  (and via Home quick-actions).
- **Notices** tab also holds **Events**.
- **Fees / Leave / Settings / Documents** open from the **Profile** tab.
- **Notifications** are the top-right 🔔 only — not a tab.
- **Safe Pickup** does not exist in the Student app (teacher-only feature).

---

## 🎨 Design System (identical to the Teacher app)

```dart
class AppColors {
  static const Color primary       = Color(0xFF2563EB); // Blue 600
  static const Color primaryDark   = Color(0xFF1D4ED8); // Blue 700
  static const Color primaryLight  = Color(0xFFEFF6FF); // Blue 50
  static const Color presentGreen  = Color(0xFF10B981);
  static const Color absentRed     = Color(0xFFEF4444);
  static const Color lateAmber     = Color(0xFFF59E0B);
  static const Color halfDayIndigo = Color(0xFF6366F1);
  static const Color scaffoldBg    = Color(0xFFF8FAFC);
  static const Color cardSurface   = Color(0xFFFFFFFF);
  static const Color borderSubtle  = Color(0xFFE2E8F0);
  static const Color textPrimary   = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textDisabled  = Color(0xFF94A3B8);
}
```

- **Per-school theming**: `login`/`me` return `school.primaryColor` (+ hue
  aliases). Override `AppColors.primary` at runtime from that value — same as
  the Teacher app.
- Card radius `16`, button radius `12`, chip radius `8`. Content padding
  `EdgeInsets.symmetric(horizontal: 16, vertical: 12)`. Card elevation `0` with
  `Border.all(color: borderSubtle)`.
- **Skeleton loaders**, not spinners: Dashboard, Homework card, Attendance
  tiles, Timetable rows, Notification rows, Result card. Buttons may use a small
  inline indicator.
- Empty/offline: numeric values render `00`, lists render `No data`. Never
  invent fallback data. Show `Last updated <time>` for cached read-only views
  (timetable, profile, recent notices).

---

## ⚡ Implementation requirements (same interceptor stack as Teacher)

### 1. Auth & JWT
- Storage: `flutter_secure_storage` for `accessToken`, `studentId`, `schoolId`.
  Never `SharedPreferences` for the token.
- Dio `AuthInterceptor` attaches `Authorization: Bearer <accessToken>` to every
  request.
- `401` → clear secure storage, route to `LoginScreen` (there is **no refresh
  token** — re-login).
- `402 PAYMENT_REQUIRED` → the school's subscription lapsed; show the "renew"
  modal (auth / me / profile / change-password still work).
- `403` → show "not allowed"; `404` on a detail screen → "not found / no longer
  available".

### 2. Homework submission
- `POST /homework/:id/submission` is `multipart/form-data`: `file` (PDF, DOCX,
  PPTX, JPG, PNG — max 10 MB) and/or `remarks`.
- Generate a UUID v4 as the `Idempotency-Key` header (retry-safe).
- `409 SUBMISSION_WINDOW_CLOSED` → homework is CLOSED; `409 ALREADY_SUBMITTED`
  → already graded, submission locked.

### 3. Downloads
- Study material & documents: append `?t=<accessToken>` to the returned
  `/uploads/...` URL, or send the `Bearer` header.

### 4. Push notifications
- On login (and on FCM token refresh) call `POST /device-tokens` with `{ token }`.
- Backend stores `DeviceToken { role: 'student', userId: studentId, schoolId }`.
- Deep links (when the notification payload carries a `type` + `refId`):
  `homework` → Homework detail, `result` → Result detail, `notice` → Notice
  detail, `fee` → Fees, `leave` → Leave. Validate the route/id before navigating.

### 5. Performance
- Dashboard = the single compact `GET /dashboard` call; never fetch full
  homework / notices / notifications lists on Home.
- Paginate every list (`page`, `limit ≤ 50`); lazy-load; cancel in-flight
  requests on screen dispose; debounce search.
- Cache read-only data (timetable, profile, recent notices) with a visible
  `Last updated`. Do not present stale results/fees as live.

---

## 🚀 Recommended Flutter project structure

```
lib/
├── core/
│   ├── api/ (api_client.dart · endpoints.dart)
│   ├── theme/ (app_colors.dart · app_theme.dart)
│   └── utils/ (idempotency.dart · secure_storage.dart)
├── features/
│   ├── auth/           // login, session, change password
│   ├── home/           // dashboard, today, upcoming
│   ├── academics/      // hub
│   ├── homework/       // list, detail, submission
│   ├── classwork/
│   ├── materials/
│   ├── timetable/
│   ├── exams/          // exams + datesheet
│   ├── results/        // results + report card
│   ├── attendance/     // summary / monthly / daily
│   ├── fees/           // read-only
│   ├── leave/          // create / edit / cancel
│   ├── notices/        // + events
│   ├── notifications/
│   └── profile/        // profile, documents, settings
└── main.dart
```

---

## ✅ Acceptance

Auth + change-password · dashboard is 100% API-driven (no hardcoded student
data) · all 5 tabs + secondary modules load real data · homework submission
works with idempotency · skeletons everywhere · 401→login, 402→renew modal ·
push token registered · cross-student / cross-school access impossible (see
`test/student.isolation.test.js`). No mock data, no local fake DB.

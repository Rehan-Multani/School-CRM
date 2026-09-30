# Student App — Flutter Design & Flow Guide

> Backend: `backend/services/platform-service/src/routes/student.routes.js`
> Postman: [postman/Student-App.postman_collection.json](postman/Student-App.postman_collection.json) (62 requests, full localhost URLs)

---

## 0. At a glance

| Item | Value |
|---|---|
| Who uses it | Students (login is created by School Admin when admitting the student) |
| Login | `identifier` (login email **or** username **or** admission number) + `password` |
| Login URL | `POST http://localhost:5000/api/v1/platform/school-portal/auth/student-login` |
| All other URLs | `http://localhost:5000/api/v1/platform/school-portal/student/...` |
| Token | One JWT, valid **7 days**, no refresh token. `Authorization: Bearer <token>` |
| Bottom nav | **Home · Academics · Attendance · Notifications · Profile** |
| Nature | Mostly **read-only**. A student can write only: homework submission, leave, profile phone/address/photo, settings, password |

---

## 1. Recommended Flutter stack

| Need | Package |
|---|---|
| State | `flutter_riverpod` |
| Routing | `go_router` (auth redirect + push deep links) |
| HTTP | `dio` (interceptors, multipart for homework submission) |
| Token | `flutter_secure_storage` |
| Models | `freezed` + `json_serializable` |
| Push | `firebase_messaging` + `flutter_local_notifications` |
| Files | `file_picker`, `image_picker`, `url_launcher`, `open_filex`, `path_provider` |
| UI | `table_calendar` (attendance), `fl_chart` (attendance % and result charts), `cached_network_image`, `shimmer` |
| Utils | `intl`, `uuid`, `connectivity_plus` |

---

## 2. Project structure

```
lib/
├── main.dart
├── app/            app.dart · router.dart · env.dart
├── core/
│   ├── network/    dio_client.dart · auth_interceptor.dart · api_exception.dart · paginated.dart
│   ├── storage/    secure_store.dart
│   ├── theme/      school_theme.dart
│   └── widgets/    AppScaffold · ErrorView · EmptyState · StatusChip · FileTile
└── features/
    ├── auth/
    ├── home/
    ├── timetable/
    ├── homework/
    ├── classwork/
    ├── materials/
    ├── attendance/
    ├── exams/          (exams + results + report card)
    ├── fees/
    ├── leave/
    ├── inbox/          (notices, events, notifications)
    └── profile/        (profile, academic info, guardians, documents, settings)
```

---

## 3. Networking layer

### 3.1 Base URL
| Device | Base URL |
|---|---|
| Android emulator | `http://10.0.2.2:5000/api/v1/platform` |
| iOS simulator | `http://localhost:5000/api/v1/platform` |
| Real phone (same Wi-Fi) | `http://<PC-LAN-IP>:5000/api/v1/platform` |

Pass it with `--dart-define=API_BASE=...`.

### 3.2 Envelope
```json
{ "success": true, "data": { } }
{ "success": true, "data": [ ], "pagination": { "page": 1, "limit": 20, "total": 40, "totalPages": 2 } }
{ "success": false, "message": "…", "code": "RESULT_NOT_PUBLISHED" }
```
The login response keeps `token`, `student`, `user` and `school` at the top level.

### 3.3 Interceptor rules
- Attach the Bearer token. **401** → logout to Login. **402** → subscription-expired page. **429** → "Too many attempts".
- Parse errors into `ApiException(message, code)` and branch on `code`.
- The homework submission POST takes an `Idempotency-Key` (a uuid made when the student taps Submit).

---

## 4. Auth & session flow

```
Splash → token? ─ no ─► Login
           └ yes → GET /student/me ─ 200 → theme(school.primaryColor) → Home
                                   ├ 401 → Login
                                   └ 402 → Subscription expired

Login → POST /school-portal/auth/student-login {identifier, password}
      → save token + school → POST /student/device-tokens {token: fcmToken} → Home
```
**Session revocation (2026-09-30):** the token carries a version claim (`tv`). **Logout** revokes every token of the student (all devices), and so does any password change/reset or deactivation by the school — those requests then get **401** → Login. `PATCH /change-password` returns a fresh token in `data.token`; save it, or this device is logged out too. Change password is rate-limited (10 per 15 min → 429).

The login screen hint should read **"Email / Username / Admission No."**, because students often only know their admission number.

`ACCOUNT_NOT_PROVISIONED` → "Your app login has not been created yet. Please contact the school office."

---

## 5. Navigation map

```
BottomNav
├── Home
│   ├── Dashboard ─────────── GET /dashboard
│   ├── Today strip ───────── GET /today           (periods now/next, homework due today)
│   └── Upcoming ──────────── GET /upcoming        (exams, events, due dates)
├── Academics  (grid of tiles)
│   ├── Timetable ─────────── GET /timetable · /timetable/today · /timetable/day/MON
│   ├── Homework ──────────── GET /homework?status=all|pending|completed|overdue → detail → submit
│   ├── Classwork ─────────── GET /classwork → /classwork/:id
│   ├── Study material ────── GET /materials → /materials/:id → /materials/:id/download-url
│   ├── Exams ─────────────── GET /exams · /exams/upcoming → /exams/:id → /exams/:id/schedule
│   ├── Results ───────────── GET /results → /results/:examId → /results/:examId/subjects
│   ├── Report card ───────── GET /report-card
│   └── Fees ──────────────── GET /fees/summary · /fees/pending · /fees/invoices · /fees/history
├── Attendance
│   ├── Summary ring (%) ──── GET /attendance/summary
│   ├── Month calendar ────── GET /attendance/monthly?month=YYYY-MM
│   └── Day list ──────────── GET /attendance/daily?from=&to=
├── Notifications
│   ├── Notifications ─────── GET /notifications (+ unread-count badge)
│   ├── Notices ───────────── GET /notices → detail (auto mark read)
│   └── Events ────────────── GET /events?scope=upcoming|past
└── Profile
    ├── My profile ────────── GET /profile · PATCH /profile (phone, address, photo)
    ├── Academic info ─────── GET /academic-info
    ├── Guardians ─────────── GET /guardians
    ├── Documents ─────────── GET /documents → /documents/:key → /documents/download-url?path=
    ├── Leave ─────────────── GET/POST /leaves · PATCH /leaves/:id · POST /leaves/:id/cancel
    ├── Settings ──────────── GET/PATCH /settings
    ├── Change password ───── PATCH /change-password
    └── Logout ────────────── POST /auth/logout
```

---

## 6. Screen-by-screen spec

### 6.1 Home
- Header: student photo, name, "Class 7-A · Roll 12" and the school logo.
- "Now / Next period" card from `/today`.
- Homework due today, with a count badge that opens the Homework → Pending tab.
- An Upcoming list (exams and events), sorted by date.

### 6.2 Timetable
- Day tabs `MON TUE WED THU FRI SAT`. Select today by default (Sunday → Monday).
- Period card: time, subject, teacher, room.

### 6.3 Homework
- Tabs: **All · Pending · Completed · Overdue** (`?status=`).
- Detail shows the teacher's description and attachments. The submit area has a file picker and a remarks box.
- Submit = `POST /homework/:id/submission`, **multipart**, with the file in field `file` plus `remarks`, and an `Idempotency-Key` header.
  - Either a file **or** remarks is required. Resubmitting replaces the earlier submission.
  - Allowed files: pdf, doc, docx, ppt, pptx, png, jpg, jpeg, max 10 MB.
  - Errors: `SUBMISSION_WINDOW_CLOSED`, `HOMEWORK_NOT_SUBMITTABLE`, `UPLOAD_REJECTED`.

### 6.4 Study material / Documents download
- `GET …/download-url` returns a **short-lived URL**. Fetch it at tap time (don't cache it), then open it with `url_launcher` or download to `path_provider` and `open_filex`.

### 6.5 Attendance
- A top ring chart shows attendance % and counts for Present, Absent, Late, Half-day and Leave.
- `table_calendar` month view: colour each day by status (green P, red A, orange L, yellow HD, blue LV). When the month changes, call `/attendance/monthly?month=YYYY-MM` (`month` is required).

### 6.6 Exams & Results
- Exams list filter: `status=all|upcoming|ongoing|completed`. The exam detail has a date-sheet (`/schedule`).
- Results show only **published** results. Others return `RESULT_NOT_PUBLISHED`, so show "Result not declared yet".
- Report card: an optional `yearId` switches the academic year. Add a subject-wise bar chart with `fl_chart`.

### 6.7 Fees (view only)
- Summary cards: Total, Paid and Due.
- Invoice list with status chips: `PENDING | PARTIALLY_PAID | PAID | OVERDUE`.
- There is **no Pay button in the student app**. Online payment exists only in the Parent app, so show "Ask your parent to pay from the Parent app".

### 6.8 Leave
- Types: `CASUAL | MEDICAL | PAID | UNPAID | OTHER`. Form fields: from, to, reason.
- Edit is allowed only while PENDING (otherwise `LEAVE_NOT_EDITABLE`). Cancel with `POST /leaves/:id/cancel` (otherwise `LEAVE_NOT_CANCELLABLE`).
- A one-day leave has `startDate == endDate`. Max 366 days per request. A request overlapping another PENDING/APPROVED leave is refused with **409 `LEAVE_OVERLAP`**. `documentUrl` must be an `http(s)` or `/uploads/...` link (anything else is stored as empty).

### 6.9 Notifications / Notices / Events
- Bell badge = `/notifications/unread-count`. Refresh it on resume and on each push.
- Opening a notice calls `PATCH /notices/:id/read`. Add a "Mark all read" action.
- FCM: after login and on token refresh, send `POST /device-tokens {token}` (the token must be ≥ 20 chars).

### 6.10 Profile
- The student can edit **only phone and address**, plus the photo (multipart field `photo`, max 5 MB — any other file field is refused). Phone must match `^\+?[0-9\s-]{7,15}$` or be empty. Everything else is read-only, with the note "Contact the school office to change this".

---

## 7. Error codes to handle

| code | UI |
|---|---|
| `INVALID_CREDENTIALS` | "Wrong login ID or password" |
| `ACCOUNT_NOT_PROVISIONED` | "App login not created — contact school" |
| `STUDENT_INACTIVE` | "Account inactive" |
| `NO_ACTIVE_ENROLLMENT` / `NO_ACTIVE_YEAR` | "You are not enrolled in the current session" |
| `RESULT_NOT_PUBLISHED` | "Result not declared yet" |
| `SUBMISSION_WINDOW_CLOSED` / `HOMEWORK_NOT_SUBMITTABLE` / `ALREADY_SUBMITTED` | Disable the submit button with a reason |
| `UPLOAD_REJECTED` | "This file type is not allowed" |
| `LEAVE_NOT_EDITABLE` / `LEAVE_NOT_CANCELLABLE` | Hide the edit/cancel buttons |
| `LEAVE_OVERLAP` | "You already have a leave on these dates" |
| `DOCUMENT_PATH_INVALID` | "Document not available" |
| HTTP 402 | Subscription-expired page |

---

## 8. Build order

1. Core (Dio, storage, router, theme) → Auth (splash, login, me, logout).
2. Home (dashboard, today, upcoming).
3. Timetable → Homework (+ submission upload) → Classwork → Materials.
4. Attendance (summary + calendar).
5. Exams → Results → Report card.
6. Fees (view only).
7. Notices, Events, Notifications and FCM.
8. Profile, Documents, Guardians, Leave, Settings, Change password.

---

## 9. Test with Postman first
1. Import `postman/Student-App.postman_collection.json`.
2. **01 Auth → Login** with a real student's admission number and password. `{{token}}` saves automatically.
3. Run the folders top to bottom. The IDs (`homeworkId`, `examId`, `invoiceId`, …) are captured from the list calls.
4. For **Submit homework**, pick a file in the form-data `file` row before sending.

# Teacher App — Flutter Design & Flow Guide

> Backend: `backend/services/platform-service/src/routes/teacher.routes.js`
> Postman: [postman/Teacher-App.postman_collection.json](postman/Teacher-App.postman_collection.json) (80 requests, full localhost URLs)

---

## 0. At a glance

| Item | Value |
|---|---|
| Who uses it | Teachers of one school (created by School Admin / HR) |
| Login | `identifier` (email or username) + `password` |
| Login URL | `POST http://localhost:5000/api/v1/platform/school-portal/auth/teacher-login` |
| All other URLs | `http://localhost:5000/api/v1/platform/school-portal/teacher/...` |
| Token | One JWT, valid **7 days**, no refresh token. Send `Authorization: Bearer <token>` |
| Bottom nav | **Home · Classes · Attendance · Inbox · Profile** |

---

## 1. Recommended Flutter stack

| Need | Package | Why |
|---|---|---|
| State management | `flutter_riverpod` | Simple, testable, and each feature gets its own providers |
| Routing | `go_router` | Declarative, redirects on auth state, deep links from push |
| HTTP | `dio` | Interceptors (auth header, 401/402 handling), multipart upload, cancel |
| Token storage | `flutter_secure_storage` | Token must NOT go into SharedPreferences |
| Models | `freezed` + `json_serializable` | Immutable models, `fromJson` generated |
| Push | `firebase_messaging` + `flutter_local_notifications` | FCM token → `POST /device-tokens` |
| Files | `file_picker`, `image_picker`, `url_launcher`, `open_filex` | Material upload, profile photo, open download URL |
| Dates | `intl`, `table_calendar` | `YYYY-MM-DD` formatting, attendance calendar |
| Images | `cached_network_image` | School logo, profile photos |
| Misc | `connectivity_plus`, `uuid` | Offline banner, `Idempotency-Key` values |

---

## 2. Project structure (feature-first)

```
lib/
├── main.dart
├── app/
│   ├── app.dart                 # MaterialApp.router + theme from school
│   ├── router.dart              # go_router + auth redirect
│   └── env.dart                 # API base URL per build
├── core/
│   ├── network/
│   │   ├── dio_client.dart      # BaseOptions + interceptors
│   │   ├── auth_interceptor.dart
│   │   ├── api_exception.dart   # {message, code, statusCode}
│   │   └── paginated.dart       # Paginated<T>{data, page, limit, total, totalPages}
│   ├── storage/secure_store.dart
│   ├── theme/school_theme.dart  # builds ThemeData from primaryColor
│   └── widgets/                 # AppScaffold, EmptyState, ErrorView, Shimmer, StatusChip
└── features/
    ├── auth/        (data/ domain/ presentation/)
    ├── home/
    ├── classes/
    ├── attendance/
    ├── timetable/
    ├── homework/
    ├── assignments/
    ├── materials/
    ├── exams/
    ├── leave/
    ├── inbox/       (notices, events, notifications, messages)
    ├── pickup/
    └── profile/
```

Inside each feature: `data/<x>_api.dart` (Dio calls) → `data/<x>_repository.dart` → `presentation/<x>_providers.dart` + screens.

---

## 3. Networking layer

### 3.1 Base URL
The Postman collections use `http://localhost:5000`. On a phone, `localhost` means the phone itself, so the app uses:

| Where the app runs | Base URL |
|---|---|
| Android emulator | `http://10.0.2.2:5000/api/v1/platform` |
| iOS simulator | `http://localhost:5000/api/v1/platform` |
| Real phone (same Wi-Fi) | `http://<your-PC-LAN-IP>:5000/api/v1/platform` |
| Production | `https://<your-domain>/api/v1/platform` |

Pass it with `--dart-define=API_BASE=...` and read it in `env.dart`. For local HTTP on Android, add `android:usesCleartextTraffic="true"` (debug manifest only).

### 3.2 Response envelope (same for every call)
```json
// success
{ "success": true, "data": { ... } }
// list
{ "success": true, "data": [ ... ], "pagination": { "page": 1, "limit": 20, "total": 57, "totalPages": 3 } }
// error
{ "success": false, "message": "Human readable", "code": "SECTION_ACCESS_DENIED" }
```
Login is the one exception: `token`, `teacher`, `user` and `school` are at the **top level**, not inside `data`.

### 3.3 Interceptor rules
1. Add `Authorization: Bearer <token>` to every request except login.
2. **401** → clear the token and send the user to login ("Session expired").
3. **402** → show a full-screen "School subscription expired, contact school office" page. Do not log out.
4. **429** → "Too many attempts, try again in a few minutes" (login allows 20 tries per 15 min).
5. Any other error → throw `ApiException(message, code)` and show `message` in a SnackBar. Branch on `code`, never on the message text.

### 3.4 Idempotency
These POSTs accept an `Idempotency-Key` header: submit attendance, save marks, initiate pickup. Generate one `uuid` **when the user taps Submit**, and reuse it if the request is retried. This stops a double tap on a slow network from saving twice.

### 3.5 Pagination
Lists take `?page=&limit=` (default 20, max 50). Use infinite scroll: load the next page when `page < totalPages`.

---

## 4. Auth & session flow

```
App start (Splash)
  ├─ no token in secure storage ─────────────► Login screen
  └─ token found → GET /teacher/me
        ├─ 200 → save teacher + school → apply theme → Home
        ├─ 401 → clear token → Login
        └─ 402 → Subscription-expired screen

Login screen → POST /school-portal/auth/teacher-login {identifier, password}
  ├─ 200 → store token → store school → register FCM (POST /device-tokens) → Home
  ├─ 401 INVALID_CREDENTIALS → "Wrong email or password"
  └─ 429 → rate-limit message

Profile → Logout → POST /teacher/auth/logout → delete token → Login
```

**Theming:** the login and `me` responses both include `school.primaryColor`, `school.theme` (`light`/`dark`) and `school.branding.logo`. Build `ColorScheme.fromSeed(seedColor: primaryColor)` so the app takes on each school's colour. Cache the school object so the splash screen is already branded.

---

## 5. Navigation map

```
BottomNav
├── Home
│   ├── Dashboard cards  ─────────── GET /dashboard
│   └── Today's periods  ─────────── GET /today-schedule → tap → Schedule detail (GET /schedule/:id)
├── Classes
│   ├── My classes  ──────────────── GET /classes
│   ├── Class → Sections ─────────── GET /classes/:classId/sections
│   ├── Section → Students ───────── GET /sections/:sectionId/students  (search, sort)
│   ├── Student detail ───────────── GET /students/:studentId
│   └── Quick actions per section: Homework · Assignments · Materials · Marks
├── Attendance
│   ├── Pick section + date ─────── GET /attendance/today?sectionId=&date=
│   ├── Mark sheet (P/A/L/HD/LV) ── POST /attendance  → PATCH /attendance/:id → POST /:id/finalize
│   ├── History ──────────────────── GET /attendance/history
│   └── Monthly summary ──────────── GET /attendance/summary?sectionId=&month=
├── Inbox
│   ├── Notices ──────────────────── GET /notices, PATCH /notices/:id/read
│   ├── Events ───────────────────── GET /events?scope=upcoming|past
│   └── Messages ─────────────────── GET /conversations → /conversations/:id/messages
├── Profile
│   ├── My profile / edit / photo ── GET/PATCH /profile
│   ├── Documents ────────────────── GET /documents
│   ├── Timetable (week) ─────────── GET /timetable, /timetable/day/:day
│   ├── My leaves ────────────────── GET/POST /leaves, POST /leaves/:id/cancel
│   ├── Settings (push prefs) ────── GET/PATCH /settings
│   ├── Change password ──────────── PATCH /change-password
│   └── Logout
└── 🔔 (app bar, every tab) ──────── GET /notifications/unread-count → Notifications list
    └── Safe Pickup (FAB or Home card, only if the school has it enabled)
```

---

## 6. Screen-by-screen spec

### 6.1 Login
- Fields: Email/Username and Password (with a show/hide toggle). Button disabled while loading.
- Show the school logo and colour if cached from an earlier login; otherwise use the platform default.

### 6.2 Home
- Greeting + "Class Teacher of 7-A" chip (`isClassTeacher` from `me`).
- Cards from `/dashboard`, for example today's classes and pending attendance. Tapping a pending-attendance card opens Attendance with that section already selected.
- Horizontal timeline of today's periods (`/today-schedule`).
- Pull-to-refresh on every list screen.

### 6.3 Classes → Section → Students
- Only **assigned** classes come back. If a teacher opens a section that isn't theirs, the backend returns 403 `SECTION_ACCESS_DENIED`. Show "You are not assigned to this section".
- Student list: search box (`q`), sort toggle (`rollNumber` / `name`), infinite scroll.

### 6.4 Attendance (the most important flow)
```
Select class/section + date (default today)
   ↓ GET /attendance/today?sectionId=X[&date=]
Sheet loads: each student with a status (defaults to PRESENT)
   ↓ teacher taps status chips  P | A | L | HD | LV   (+ optional note)
[Save]      → POST /attendance  {sectionId, date, records:[{studentId,status,note}]}  + Idempotency-Key
[Edit]      → PATCH /attendance/:attendanceId {records:[...only changed...]}
[Finalize]  → confirm dialog → POST /attendance/:attendanceId/finalize → sheet becomes read-only 🔒
```
- Status values: `PRESENT | ABSENT | LATE | HALF_DAY | LEAVE`.
- Add a "Mark all present" button. You only need to send the changed rows, because unsent students default to PRESENT.
- A locked day returns 409 `ATTENDANCE_FINALIZED`. Show a lock icon and disable editing.
- Show live counts at the top: Present 32 · Absent 3 · Late 1.

### 6.5 Homework / Assignments / Materials
- List → Create/Edit form → Detail → Submissions.
- The form needs Section and Subject pickers. Fill them only with the teacher's own sections and subjects; the backend rejects any others.
- Dates: `dueDate ≥ assignedDate`, format `YYYY-MM-DD`.
- Assignments have `maxMarks` and `status` (`DRAFT | PUBLISHED | CLOSED`). The Submissions screen has a **Grade** bottom sheet (`marksObtained`, `feedback`).
- Material upload is `multipart/form-data` with the file in field `file`, plus `title`, `description`, `sectionId`, `subjectId` and `visibility` (`SECTION | CLASS`). Allowed types: pdf, doc, docx, ppt, pptx, png, jpg, jpeg, max **10 MB**. The server checks the real file content, so a renamed file is rejected. Filter the picker to these extensions, and show an upload progress bar using Dio's `onSendProgress`.
- Profile photo and documents: max **5 MB** each.

### 6.6 Exams & Marks entry
```
Exams list → Exam → My subjects (GET /exams/:id/subjects)
  → choose section → GET /exams/:id/marks?classId=&sectionId=&subjectId=
  → grid: student | marks (numeric keyboard) | attendance (PRESENT/ABSENT/MEDICAL/EXEMPTED) | remarks
  → [Save all] POST /exams/:id/marks {classId, sectionId, subjectId, marksList:[...]} + Idempotency-Key
  → single fix later: PATCH /exams/:id/marks/:markId
```
- Validate `0 ≤ marks ≤ maxMarks` on the client too. Clear the marks field when the student is not PRESENT.
- 409 `EXAM_FINALIZED` → the sheet becomes read-only.

### 6.7 Leave
- Form: type (`CASUAL | MEDICAL | PAID | UNPAID | MATERNITY | PATERNITY | OTHER`), from, to, reason.
- Status chip colours: PENDING amber, APPROVED green, REJECTED red, CANCELLED grey.
- Show Cancel only while the leave is PENDING (otherwise the backend returns `LEAVE_NOT_CANCELLABLE`).

### 6.8 Inbox
- Notices: an unread dot, and opening a notice marks it read. Add "Mark all read".
- Events: Upcoming / Past tabs (`scope`).
- Messages: a chat UI. There are no sockets, so poll every 15 s while the chat is open and refresh on pull. Messages are limited to 4000 chars.

### 6.9 Notifications & Push
- After login, and on every `onTokenRefresh`: `POST /device-tokens {token, platform:"android"}`.
- Bell badge = `GET /notifications/unread-count`. Refresh it on app resume and when a push arrives.
- When a push notification is tapped, route to the matching screen using the payload.

### 6.10 Safe Pickup (hide the entry point if the school hasn't enabled it)
```
Eligible students → tap student → [Send OTP] POST /pickups/initiate {studentId} (+Idempotency-Key)
  → OTP screen (6 boxes) → POST /pickups/:id/verify {otp}   (Resend: POST /:id/resend-otp)
  → Handover screen: pickup person name + relationship dropdown + ☑ "Student handed over"
  → POST /pickups/:id/complete {handoverConfirmed:true, pickupPersonName, pickupPersonRelationship}
  (Cancel is available at any step: POST /:id/cancel)
```
Relationship values: `Parent | Guardian | Relative | Family Friend | Authorized Person | Other`.

### 6.11 Profile
- Editable: name parts, phone, alternateMobile, bloodGroup, maritalStatus, nationality, emergency contact, and address `{line1, city, state, pincode}`. Show every other field read-only.
- Photo: `PATCH /profile` as multipart with the image in field `photo`. The server converts it to webp.

---

## 7. Error codes to handle in the UI

| code | UI |
|---|---|
| `INVALID_CREDENTIALS` | "Wrong email or password" |
| `TEACHER_INACTIVE` | "Your account is inactive, contact the school" |
| `CURRENT_PASSWORD_INVALID` / `PASSWORD_TOO_SHORT` | Inline field error (min 8 chars) |
| `SECTION_ACCESS_DENIED` / `SUBJECT_ACCESS_DENIED` / `STUDENT_ACCESS_DENIED` | "Not assigned to you" |
| `ATTENDANCE_FINALIZED` | Lock the sheet |
| `INVALID_ATTENDANCE_STATUS` / `INVALID_MARKS` | Field error |
| `EXAM_FINALIZED` | Marks sheet read-only |
| `UPLOAD_REJECTED` | "File type not allowed" |
| `LEAVE_NOT_CANCELLABLE` | Hide the cancel button |
| `NO_ACTIVE_YEAR` | "Academic year not set up — contact admin" |
| HTTP 402 | Subscription-expired page |

---

## 8. Build order (suggested milestones)

1. **Core:** Dio client, secure storage, router with auth redirect, school theme, error and empty widgets.
2. **Auth:** Splash → Login → `me` → Logout → Change password.
3. **Home + Classes + Students.**
4. **Attendance** (submit / edit / finalize / history / summary).
5. **Homework → Assignments (+ grading) → Materials (upload).**
6. **Exams & marks entry.**
7. **Inbox:** notices, events, notifications, FCM push, messages.
8. **Leave, Profile, Settings, Timetable.**
9. **Safe Pickup** (behind the school feature flag).
10. Polish: offline banner, shimmer loaders, pull-to-refresh, empty states.

---

## 9. Test with Postman first
1. Import `postman/Teacher-App.postman_collection.json`.
2. Start the backend (gateway on :5000).
3. Put a real teacher's email and password in **01 Auth → Login** and send it. `{{token}}` is saved automatically.
4. Run the folders in order. List calls auto-save `classId`, `sectionId`, `studentId`, `homeworkId`, and so on, so detail calls work straight away.
5. Match each Flutter screen against the Postman response JSON before writing its model.

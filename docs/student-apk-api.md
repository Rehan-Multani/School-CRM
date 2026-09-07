# Student APK — Backend API

Backend for the Flutter Student app. **Every student route is owned by
`platform-service` (port `5002`).** Built to the same standard as the Teacher
APK (`teacher-apk-api.md`) — same layered architecture, response envelope,
tenant isolation, error-code contract.

| | Base | Path form |
|---|---|---|
| Direct to platform-service (dev / debugging) | `http://localhost:5002` | `<path>` as written below, **no prefix** |
| Through the api-gateway (`:8080`, prod ingress) | `https://<gateway-host>` | `/api/v1/platform<path>` — the gateway adds the prefix |

The Postman env (`docs/postman/Student-APK.postman_environment.json`) ships
pointing at `http://localhost:5002`. Examples below omit the prefix.

---

## 0. Bottom-nav → API map

The APK has **5 bottom-nav tabs**. Secondary modules (Fees, Leave, Notices,
Events) open from the Home dashboard / Profile tab. All paths are under
`/school-portal/student` unless noted.

| Tab | Screens | Endpoints |
|---|---|---|
| **⌂ App bar** (every screen) | 🔔 notifications list + unread badge · 👤 quick menu (Me / Profile / Logout) | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `POST /device-tokens` · `GET /me`, `GET /profile`, `POST /auth/logout` |
| **1 · Home** `/dashboard` | Dashboard (greeting, today summary, quick actions, upcoming), **Notices** | `GET /dashboard`, `GET /today`, `GET /upcoming` · `GET /notices(/:id)`, `PATCH /notices/:id/read`, `PATCH /notices/read-all` |
| **2 · Academics** | Homework, Classwork, Study Material, Timetable, Exams, Results | `GET /homework(/pending\|/completed\|/:id)`, `POST /homework/:id/submission` · `GET /classwork(/:id)` · `GET /materials(/:id\|/:id/download-url)` · `GET /timetable(/today\|/day/:day)` · `GET /exams(/upcoming\|/:id\|/:id/schedule)` · `GET /results(/:examId\|/:examId/subjects)`, `GET /report-card` |
| **3 · Attendance** | Overall %, monthly, daily calendar | `GET /attendance/summary`, `GET /attendance/daily`, `GET /attendance/monthly` |
| **4 · Notifications** | Notification centre, Events | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `POST /device-tokens` · `GET /events(/:id)` |
| **5 · Profile** | Profile, Academic info, Guardians, Documents, Settings, Fees, Leave, login/logout | `POST /school-portal/auth/student-login`, `POST …/auth/logout`, `GET /me`, `PATCH /change-password` · `GET /profile`, `PATCH /profile`, `GET /academic-info`, `GET /guardians` · `GET /documents(/:key\|/download-url)` · `GET/PATCH /settings` · `GET /fees/summary\|/pending\|/history\|/invoices\|/invoices/:id` · `GET /leaves(/:id)`, `POST /leaves`, `PATCH /leaves/:id`, `POST /leaves/:id/cancel` |

> **Safe Pickup** is a **teacher-only** feature — it lives in the Teacher APK
> (`Teacher-APK.postman_collection.json` → `📱 Tab 4 · Pickup`) and is
> intentionally absent from the Student APK.

**Deferred / not in this build** (documented so the app hides them):

- **1:1 messaging / chat** — `Communication.schoolMessage` threads are
  staff↔admin only; students get read-only announcements (`/notices`).
- **Online fee payment ("Pay Now")** — fees are read-only. Reuse the existing
  Razorpay flow when this is added; do not build a new payment path.
- **Event registration / RSVP** — `Event` has no registration model; events are
  read-only.
- **Subject-wise attendance** — `StudentAttendance` is section-day only; there
  is no per-period attendance model.

---

## 1. Authentication

| | |
|---|---|
| Scheme | `Authorization: Bearer <accessToken>` |
| Token | single JWT, `expiresIn = JWT_EXPIRES_IN` (default `7d`) — **no refresh token** (matches all 6 other role portals; the Flutter client re-logs-in on 401) |
| Claims | `sub` = `studentId` = `Student._id`, `schoolId`, `role: "STUDENT"`, `name`, `admissionNumber` |
| Identity source | the server re-derives `schoolId` / `studentId` from the JWT on every request (`utils/tenant.js`) — values in the body/query/params are never trusted |
| Role guard | `requireStudent` — role must be exactly `STUDENT`; then `enforceSubscriptionAccess` (402 once the school's subscription lapses past grace, except the exempt `auth` / `me` / `profile` / `change-password` paths) |

### Flow

```
POST /school-portal/auth/student-login          (also /school-auth/student-login)
  { identifier, password }  ->  { token, student, school }
        identifier = account.loginEmail | email | account.username | admissionNumber
  store token (flutter_secure_storage); send it as Bearer on every call
POST /school-portal/student/auth/logout          client discards the token (stateless)
```

Login failures all return the same `401 { code: "INVALID_CREDENTIALS" }` (no
student-exists probing). Inactive account → `403 STUDENT_INACTIVE`. A login
email registered at more than one school → `409`.

### Login provisioning (admin side)

- `POST /school-portal/academic/students/:id/set-password`  (principal)
  `{ newPassword, loginEmail? }` — hashes the password, sets
  `account.accountStatus = ACTIVE`. Mirror of the teacher `set-password` route.
- Seed: the first `Student` of every seeded school gets
  `student@<school-domain>` / `Student@123` + an ACTIVE enrollment and one row
  per screen (homework, published exam + result, pending invoice, notice).

---

## 2. Response shape

```jsonc
// success
{ "success": true, "message": "…", "data": { … } }
// list
{ "success": true, "data": [ … ], "pagination": { "page":1, "limit":20, "total":42, "totalPages":3 } }
// error
{ "success": false, "message": "human readable", "code": "MACHINE_CODE" }
```

Pagination: `?page=` (1-based) `&limit=` (default 20, **max 50**). Dates are
ISO-8601; attendance / leave use `YYYY-MM-DD` (school-local day).

### Error codes (`code`)

`UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_ERROR` · `RATE_LIMITED`
· `INVALID_CREDENTIALS` · `STUDENT_INACTIVE` · `STUDENT_NOT_FOUND` ·
`PASSWORD_TOO_SHORT` · `CURRENT_PASSWORD_INVALID` · `ACCOUNT_NOT_PROVISIONED` ·
`SECTION_ACCESS_DENIED` · `CLASS_ACCESS_DENIED` · `RESOURCE_FORBIDDEN` ·
`NO_ACTIVE_YEAR` · `NO_ACTIVE_ENROLLMENT` · `RESULT_NOT_PUBLISHED` ·
`HOMEWORK_NOT_SUBMITTABLE` · `ALREADY_SUBMITTED` · `SUBMISSION_WINDOW_CLOSED` ·
`DUPLICATE_REQUEST` · `UPLOAD_REJECTED` · `LEAVE_NOT_CANCELLABLE` ·
`LEAVE_NOT_EDITABLE` · `DOCUMENT_PATH_INVALID`

Cross-school / unknown ids return **`404`** (never leak existence); a resource
that *is* visible but the action is not allowed → **`403`**.

---

## 3. Authorization model

A student acts only within the section/class of their **current active
enrollment**, computed once per request and cached
(`studentAccess.service.js` → `req._studentCtx`):

```
student   = Student{ _id: <jwt.studentId>, schoolId: <jwt.schoolId>, status: ACTIVE }
year      = AcademicYear{ schoolId, isCurrent: true }
enrol     = StudentEnrollment{ schoolId, studentId, academicYearId: year._id, status: ACTIVE }
ctx = { schoolId, studentId, currentYearId, classId, sectionId, className,
        sectionName, rollNumber, admissionNumber }
```

| Check | Applies to |
|---|---|
| `studentId === ctx.studentId` | profile, results, fees, leave, documents, submissions |
| `sectionId === ctx.sectionId` | timetable, homework, classwork, section materials, attendance |
| `classId === ctx.classId` | class materials, exams (`Exam.classIds ∋ classId`), exam datesheet |
| audience ∋ `ALL`/`STUDENTS` | notices, events |
| `Exam.status === 'PUBLISHED'` | any result read (`403 RESULT_NOT_PUBLISHED` otherwise) |

Endpoints needing an enrollment (`ctx.sectionId`) return **`409
NO_ACTIVE_ENROLLMENT`** when the student has none for the current year.

---

## 4. Authorization matrix

| Module | Student |
|---|---|
| Dashboard / Home | Read |
| Profile | Read · limited update (`phone`, `address`, photo) |
| Academic info / Guardians | Read |
| Attendance | Read (own entries only) |
| Timetable | Read (own section) |
| Homework | Read · **Submit** (`POST /homework/:id/submission`) |
| Classwork | Read |
| Study Material | Read (section- or class-visible only) |
| Exams | Read |
| Results / Report card | Read (published exams only) |
| Fees | Read (no payment) |
| Leave | Create · Read · Edit while PENDING · Cancel while PENDING |
| Notices | Read · mark read |
| Events | Read |
| Notifications | Read · mark read · register device token |
| Documents | Read own only |
| Settings | Read · update notification prefs |

A student token can never reach a `/school-portal/teacher/*` or admin route —
separate middleware, separate role string.

---

## 5. Endpoint reference

`✱` = requires an active enrollment (`409 NO_ACTIVE_ENROLLMENT` otherwise).
All authenticated routes: `401` no/invalid token, `403` wrong role, `402`
subscription lapsed (non-exempt paths).

### Auth

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| POST | `/school-portal/auth/student-login` | `{ identifier, password }` | `loginRateLimiter`; `200 { token, student, school }`; `401 INVALID_CREDENTIALS`, `403 STUDENT_INACTIVE`, `409` multi-school |
| POST | `/school-portal/student/auth/logout` | — | stateless; always `200` |
| GET | `/school-portal/student/me` | — | `{ student, school }` — identity from token |
| PATCH | `/school-portal/student/change-password` | `{ currentPassword, newPassword }` | `400 PASSWORD_TOO_SHORT` (<8), `401 CURRENT_PASSWORD_INVALID` |

### Home ✱

| GET | `/dashboard` | — | greeting, `todaySummary { attendancePercentage, pendingHomework, nextClass }`, `upcoming { exams, homework }`, `announcements[]` |
| GET | `/today` | — | today's `periods[]` + `currentPeriodId` + `homeworkDueToday[]` |
| GET | `/upcoming` | — | `exams[]`, `events[]`, `homework[]` (≤7d), `announcements[]` |

### Profile

| GET | `/profile` | — | full self DTO (never `passwordHash`) |
| PATCH | `/profile` | multipart or JSON: `phone`, `address`, `photo` (file) | other fields ignored |
| GET | `/academic-info` ✱ | — | class/section/roll/admission/year/enrollment |
| GET | `/guardians` | — | `{ parentName, parentPhone }` only |

### Documents

| GET | `/documents` | — | `[{ key, count, items[] }]` from `Student.documents` |
| GET | `/documents/:key` | — | one group; `404` if the key is not the student's |
| GET | `/documents/download-url?path=` | `path` = one of the student's own stored URLs | `400 DOCUMENT_PATH_INVALID` on `..`/absolute; `403 RESOURCE_FORBIDDEN` if not owned |

### Settings

| GET | `/settings` | — | `{ notificationPrefs, account.loginEmail }` |
| PATCH | `/settings` | `{ notificationPrefs: { homework, exam, fee, … } }` | only known boolean keys accepted |

### Timetable ✱

| GET | `/timetable` | — | `{ days, timetable: { MON: [period], … } }` |
| GET | `/timetable/today` | — | `{ day, periods[], currentPeriodId }` |
| GET | `/timetable/day/:day` | `:day` ∈ MON…SAT | `400` on a bad day |

### Homework ✱

| GET | `/homework` | `?status=all\|pending\|completed\|overdue&page=` | each item merged with the student's own submission status |
| GET | `/homework/pending` · `/homework/completed` | `?page=` | filtered shortcuts |
| GET | `/homework/:id` | — | detail + `submission` object; `404` cross-section/school |
| POST | `/homework/:id/submission` | multipart: `file` (pdf/doc/ppt/img ≤10 MB) + `remarks`; header `Idempotency-Key` | `SUBMITTED`/`LATE`; `409 SUBMISSION_WINDOW_CLOSED` (homework CLOSED), `409 ALREADY_SUBMITTED` (already GRADED) |

### Classwork ✱ (`Assignment` model, PUBLISHED/CLOSED only)

| GET | `/classwork` | `?subjectId=&page=` | read-only |
| GET | `/classwork/:id` | — | detail + attachments |

### Study Material ✱

| GET | `/materials` | `?subjectId=&type=&from=&to=&page=` | `visibility SECTION` → my section, `visibility CLASS` → my class, `status ACTIVE` only |
| GET | `/materials/:id` | — | detail incl. `url` |
| GET | `/materials/:id/download-url` | — | `{ url, fileName, fileType }` |

### Exams ✱

| GET | `/exams` | `?status=upcoming\|ongoing\|completed` | `Exam.classIds ∋ my class`, status ≠ DRAFT/CANCELLED |
| GET | `/exams/upcoming` | — | next ≤10 with `endDate ≥ now` |
| GET | `/exams/:id` | — | `404` if not for my class |
| GET | `/exams/:id/schedule` | — | datesheet: `ExamSchedule` for my class + (my section or null) |

### Results ✱

| GET | `/results` | `?page=` | only rows whose `Exam.status === 'PUBLISHED'` |
| GET | `/results/:examId` | — | subject breakdown, total, %, grade, rank, remarks; `403 RESULT_NOT_PUBLISHED`, `404` cross-school/not-my-class |
| GET | `/results/:examId/subjects` | — | `{ subjects[] }` |
| GET | `/report-card` | `?yearId=` | aggregate over published exams: `aggregatePercentage`, `exams[]` |

### Attendance ✱ (read-only)

| GET | `/attendance/summary` | — | `overall { PRESENT, ABSENT, LATE, HALF_DAY, LEAVE, total, presentPercentage }` + `byMonth[]` |
| GET | `/attendance/daily` | `?from=YYYY-MM-DD&to=YYYY-MM-DD` | `days[{ date, status, note }]` + `summary` |
| GET | `/attendance/monthly` | `?month=YYYY-MM` (required) | `days[]` + `summary`; `400` bad month |

### Fees (read-only)

| GET | `/fees/summary` | — | `{ totalFees, paid, pending, nextDueDate, nextDueAmount, outstandingCount }` |
| GET | `/fees/pending` | — | outstanding invoices |
| GET | `/fees/invoices` | `?status=&page=` | own invoices, `status ≠ DRAFT` |
| GET | `/fees/invoices/:id` | — | fee-head `items[]` + `payments[]`; `404` cross-school |
| GET | `/fees/history` | `?page=` | own `FeePayment` rows |

### Leave

| GET | `/leaves` | `?status=&page=` | own requests only |
| GET | `/leaves/:id` | — | `404` if not the student's |
| POST | `/leaves` | `{ leaveType, startDate, endDate, reason, documentUrl? }` | `201`; validates `YYYY-MM-DD` + order; `studentId` from JWT |
| PATCH | `/leaves/:id` | `{ leaveType?, startDate?, endDate?, reason?, documentUrl? }` | only while `PENDING`; `409 LEAVE_NOT_EDITABLE` |
| POST | `/leaves/:id/cancel` | — | only while `PENDING`; `409 LEAVE_NOT_CANCELLABLE` |

### Notices

| GET | `/notices` | `?category=&page=` | `Announcement` `status PUBLISHED`, `audiences ∋ ALL\|STUDENTS`, within publish/expiry window; `meta.unread` |
| GET | `/notices/:id` | — | `404` if not student-audienced |
| PATCH | `/notices/:id/read` · `/notices/read-all` | — | writes `ReadReceipt` (`refType ANNOUNCEMENT`, `userType STUDENT`) |

### Events

| GET | `/events` | `?scope=upcoming\|past&page=` | `audiences ∋ ALL\|STUDENTS` |
| GET | `/events/:id` | — | `404` if not student-audienced |

### Notifications

| GET | `/notifications` | `?page=` | `notificationRepository.inbox({ role: 'student' })` |
| GET | `/notifications/unread-count` | — | `{ unread }` |
| PATCH | `/notifications/:id/read` · `/notifications/read-all` | — | `ReadReceipt` `refType NOTIFICATION` |
| POST | `/device-tokens` | `{ token }` (FCM, ≥20 chars) | upserts `DeviceToken { role: 'student', userId, schoolId }` |

---

## 6. Security notes

- Identity from the verified JWT only; body/query/params never trusted for
  scoping. Every query filters by `schoolId` + `studentId`/section/class.
- `:id` routes: `validateObjectId` → service ownership re-check → `404`
  cross-school/unknown, `403` visible-but-forbidden.
- IDOR/BOLA covered by `test/student.isolation.test.js`: cross-school
  `examId`/`homeworkId`/`invoiceId`/`noticeId` → 404; another student's
  `leaveId` → 404; `?path=../…` on document download → 400/403; teacher /
  school-admin token on a student route → 403; missing token → 401.
- Login: `loginRateLimiter`, uniform `401`. Submission POST: `Idempotency-Key`
  (`withIdempotency('homework.submit')`).
- Document download URLs are restricted to the student's own stored paths.
- `passwordHash` is `select: false` and never serialized.

---

## 7. Feature flags

`School` has no general per-module flag map today (only
`settings.safePickupEnabled`, not student-relevant). All modules are on; the
dashboard already returns only what has data. `studentAccess.service.js` leaves
an `isModuleEnabled(school, key)` seam for future per-school flags.

# Teacher APK — Backend API

Backend for the Flutter Teacher app. **Every teacher route is owned by
`platform-service` (port `5002`).** Two ways to reach it:

| | Base | Path form |
|---|---|---|
| Direct to platform-service (dev / debugging this service) | `http://localhost:5002` | `<path>` as written below, **no prefix** |
| Through the api-gateway (`:8080`, prod ingress) | `https://<gateway-host>` | `/api/v1/platform<path>` — the gateway adds the prefix and proxies to `:5002` |

The Postman env ships pointing at `http://localhost:5002` (direct). Examples
below omit the prefix; add `/api/v1/platform` only when hitting the gateway.
`GET <base>/school-portal/teacher/dashboard`.

---

## 0. App layout → API map

**App bar** (top-right on every screen) — 🔔 notification icon + 👤 profile icon:

| Icon | Endpoints |
|---|---|
| 🔔 Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `POST /device-tokens` |
| 👤 Profile menu | `GET /me`, `POST /auth/logout`, `GET /profile` (quick view) |

**5 bottom-nav tabs** — the Postman collection is grouped the same way
(`📱 Tab N · …`). Paths under `/school-portal/teacher`.

| Tab | Screens | Endpoints |
|---|---|---|
| **1 · Home** `/teacher/home` | Today at a glance (next period, metric cards, today's schedule) | `GET /dashboard`, `GET /today-schedule` |
| **2 · Classes** `/teacher/classes` | My Classes → roster; Timetable; Homework; Assignments; Study Material; Exams & Marks | `GET /classes`, `GET /classes/:id`, `GET /classes/:id/sections`, `GET /sections/:id/students`, `GET /students/:id` · `GET /timetable`, `GET /timetable/day/:day`, `GET /schedule/:id` · `GET/POST /homework`, `GET/PATCH/DELETE /homework/:id`, `GET /homework/:id/submissions` · `GET/POST /assignments`, `GET/PATCH/DELETE /assignments/:id`, `GET /assignments/:id/submissions`, `PATCH /assignments/:id/submissions/:sid/grade` · `GET/POST /materials`, `GET/PATCH/DELETE /materials/:id` · `GET /exams`, `GET /exams/:id`, `GET /exams/:id/schedule`, `GET /exams/:id/subjects`, `GET /exams/:id/marks`, `POST /exams/:id/marks`, `PATCH /exams/:id/marks/:markId` |
| **3 · Attendance** `/teacher/attendance` | Daily marking, finalize, history, summary, per-student log | `GET /attendance/today`, `POST /attendance` (idempotent), `PATCH /attendance/:id`, `POST /attendance/:id/finalize`, `GET /attendance/history`, `GET /attendance/section/:id`, `GET /attendance/student/:id`, `GET /attendance/summary` |
| **4 · Notices** `/teacher/notices` | School announcements feed (read + mark-read; authoring is admin-side) | `GET /announcements`, `GET /announcements/:id`, `PATCH /announcements/:id/read` |
| **5 · Profile** `/teacher/profile` | Account: sign-in/out & password, profile & documents, leave requests, office messages, **Pickup** | `POST /school-portal/auth/teacher-login`, `POST …/auth/logout`, `GET /me`, `PATCH /change-password` · `GET /profile`, `PATCH /profile`, `GET /documents` · `GET/POST /leaves`, `GET /leaves/:id`, `DELETE /leaves/:id` · `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`, `PATCH /messages/:id/read` · **Pickup** (see below) |

**Pickup is not a tab.** It opens from the **Profile** tab and is shown only
when `GET /me` → `teacher.isClassTeacher === true` (`GET /me` also returns
`teacher.classTeacherSections[]`). It is also the deep-link target for pickup
push notifications. Endpoints: `GET /pickups/eligible-students`,
`POST /pickups/initiate`, `GET /pickups/:id`, `POST /pickups/:id/verify`,
`POST /pickups/:id/resend-otp`, `POST /pickups/:id/complete`,
`POST /pickups/:id/cancel` (full rules in §6).

*Not a tab:* `GET/POST/PATCH/DELETE /school-portal/timetable` and
`POST /school-portal/academic/teachers/:id/set-password` are admin-side
(principal); the app consumes the timetable read-only. Events / Downloads have no
teacher endpoint in this build.

---

## 1. Authentication

| | |
|---|---|
| Scheme | `Authorization: Bearer <accessToken>` |
| Token | single JWT, `expiresIn = JWT_EXPIRES_IN` (default `7d`) — **no refresh token** (matches the other 5 role portals) |
| Claims | `sub` = `teacherId` = `Teacher._id`, `schoolId`, `role: "TEACHER"`, `name`, `email` |
| Identity source | the server re-derives `schoolId` / `teacherId` from the JWT on every request — values in the request body/query/params are never trusted |
| Role guard | `requireTeacher` — role must be exactly `TEACHER`; then `enforceSubscriptionAccess` (402 once the school's subscription lapses past grace, except the exempt auth/profile paths) |

### Flow

```
POST /school-portal/auth/teacher-login           (also /school-auth/teacher-login)
  { identifier, password }  ->  { token, teacher, school }
        identifier = account.loginEmail | email | username | employeeId
  store token; send it as Bearer on every call
POST /school-portal/teacher/auth/logout          client discards the token (stateless)
```

Login failures all return the same `401 { code: "INVALID_CREDENTIALS" }`
(no teacher-exists probing). Inactive account → `403 TEACHER_INACTIVE`. A login
email registered at more than one school → `409` (fix the data; login emails must
be globally unique).

### Login provisioning (admin side)

- Creating/editing a teacher with `account.createLoginAccount = true` and
  `account.password` → password is hashed, `accountStatus = ACTIVE`.
- `POST /school-portal/academic/teachers/:id/set-password`  (principal)
  `{ newPassword, loginEmail? }` — sets/resets the login.
- Seed: the first `Teacher` of every seeded school gets
  `teacher@<school-domain>` / `Teacher@123`.

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
ISO-8601; attendance/leave use `YYYY-MM-DD` strings (school-local day).

### Error codes

`UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_ERROR` · `RATE_LIMITED`
· `INVALID_CREDENTIALS` · `TEACHER_INACTIVE` · `PASSWORD_TOO_SHORT` ·
`CURRENT_PASSWORD_INVALID` · `SECTION_ACCESS_DENIED` · `CLASS_ACCESS_DENIED` ·
`SUBJECT_ACCESS_DENIED` · `STUDENT_ACCESS_DENIED` · `RESOURCE_FORBIDDEN` ·
`NO_ACTIVE_YEAR` · `ATTENDANCE_FINALIZED` · `INVALID_ATTENDANCE_STATUS` ·
`INVALID_MARKS` · `EXAM_FINALIZED` · `UPLOAD_REJECTED` · `LEAVE_NOT_CANCELLABLE`
· `DUPLICATE_REQUEST`

Cross-school / unknown ids return **`404`** (never leak existence) except where a
resource *is* visible but the action is not allowed → `403`.

---

## 3. Authorization model

A teacher may act only within their **assignment graph**, computed once per
request:

- sections where `Section.classTeacherId == teacherId` (class teacher)
- sections where an `ACTIVE SectionSubject.teacherId == teacherId` (subject teacher)
- the classes / subjects / students inside those sections
- resources they authored (`doc.teacherId == teacherId`) — homework, assignments, materials

| Check | Applies to |
|---|---|
| section membership | attendance, roster, homework/assignment/material create, marks |
| subject-in-section | homework/assignment/material create & move, marks write |
| student enrolment | student detail, per-student attendance |
| authored-by | homework/assignment/material update & delete |
| exam overlap | any `/exams/:id/*` — exam.classIds ∩ my classes |

---

## 4. Endpoints

`AUTH` prefix omitted below = `/school-portal/teacher`. All need `requireTeacher`
unless marked *(public)*.

### 01 · Auth & Profile
| Method | Path | Notes |
|---|---|---|
| POST | `/school-portal/auth/teacher-login` *(public, rate-limited)* | `{identifier,password}` → `{token,teacher,school}` |
| POST | `/school-auth/teacher-login` *(public, alias)* | |
| POST | `…/auth/logout` | stateless 200 |
| GET | `…/me` | `{teacher, school{theme,primaryColor,branding}}` |
| PATCH | `…/change-password` | `{currentPassword,newPassword}` (min 8) |
| GET | `…/profile` | full profile + school snapshot |
| PATCH | `…/profile` | multipart; editable: name parts, phone, mobileNumber, alternateMobile, bloodGroup, maritalStatus, nationality, emergencyContact*, address.*; `photo` file. **400** on any protected key (schoolId/role/status/employeeId/account/payroll) |
| GET | `…/documents` | pan / aadhaar / others / qualification certs (URL list) |

### 02 · Home
| GET | `…/dashboard` | `{ stats{classesToday,students,pendingHomework,pendingMarks}, nextClass }` |
| GET | `…/today-schedule` | today's periods (compact) |

### 03 · Classes
| GET | `…/classes` | assigned classes + `sectionCount`, `studentCount` |
| GET | `…/classes/:classId` | class + its visible sections (`isClassTeacher`, `studentCount`) |
| GET | `…/classes/:classId/sections` | |
| GET | `…/sections/:sectionId/students` | `?q= &page &limit(≤50) &sort=rollNumber|name` → `studentLite[]` |
| GET | `…/students/:studentId` | studentLite + current enrolment + `attendancePercent` |

### 04 · Attendance  (section-grained; `YYYY-MM-DD`)
| GET | `…/attendance/today` | `?sectionId=` (`&date=` for any past day) → roster + existing marks |
| POST | `…/attendance` | `{sectionId,date,records:[{studentId,status,note?}]}` · `status ∈ PRESENT ABSENT LATE HALF_DAY LEAVE` · **honours `Idempotency-Key`** · upsert-idempotent on `{school,section,date}` · rejects dup/foreign students, future dates, finalized days |
| PATCH | `…/attendance/:attendanceId` | edit entries (blocked if finalized) |
| POST | `…/attendance/:attendanceId/finalize` | locks the day |
| GET | `…/attendance/history` | `?sectionId= &from= &to= &page &limit` |
| GET | `…/attendance/section/:sectionId` | same as history, section-scoped |
| GET | `…/attendance/student/:studentId` | per-student log + tally |
| GET | `…/attendance/summary` | `?sectionId= &month=YYYY-MM` |

### 05 · Timetable
| GET | `…/timetable` | full week grouped by `MON…SAT` |
| GET | `…/timetable/day/:day` | `MON…SAT` (else 400) |
| GET | `…/schedule/:scheduleId` | one period (must be the teacher's own) |

*Admin-side CRUD* (principal): `GET/POST/PATCH/DELETE /school-portal/timetable[/:id]`
— validates HH:MM times, per-section slot uniqueness, teacher day/period clash.

### 06 · Homework
| GET | `…/homework` | `?status= &classId= &sectionId= &subjectId= &page &limit` |
| POST | `…/homework` | `{sectionId,subjectId,title,description?,assignedDate?,dueDate,attachments?[]}` |
| GET / PATCH / DELETE | `…/homework/:id` | authored-by only for PATCH/DELETE |
| GET | `…/homework/:id/submissions` | roster ⟕ `HomeworkSubmission` |

### 07 · Assignments
| GET | `…/assignments` | list (own) |
| POST | `…/assignments` | `{sectionId,subjectId,title,instructions?,maxMarks(1-1000),dueDate,status?}` |
| GET / PATCH / DELETE | `…/assignments/:id` | authored-by |
| GET | `…/assignments/:id/submissions` | roster ⟕ `AssignmentSubmission` |
| PATCH | `…/assignments/:id/submissions/:submissionId/grade` | `{marksObtained(0-maxMarks),feedback?}` → `INVALID_MARKS` if out of range |

### 08 · Study Material
| GET | `…/materials` | list (own) |
| POST | `…/materials` | **multipart** `file` + `title,sectionId,subjectId,description?,visibility?` · pdf/doc(x)/ppt(x)/png/jpg ≤10 MB · extension **and** magic-byte checked |
| GET / PATCH / DELETE | `…/materials/:id` | authored-by; PATCH can replace the file |

File URLs are `/uploads/teacher-resources/…`; append `?t=<accessToken>` (or send
the Bearer header) — the static mount is auth-gated.

### 09 · Exams & Marks
| GET | `…/exams` | exams whose classes intersect mine |
| GET | `…/exams/:examId` | |
| GET | `…/exams/:examId/schedule` | my invigilations + my subjects' papers |
| GET | `…/exams/:examId/subjects` | subjects I teach in this exam's classes |
| GET | `…/exams/:examId/marks` | `?classId= &sectionId= &subjectId=` → roster + current marks |
| POST | `…/exams/:examId/marks` | `{classId,sectionId,subjectId,marksList:[{studentId,marksObtained,attendanceStatus?,remarks?}]}` · **transaction** (all-or-nothing) · **`Idempotency-Key`** · `INVALID_MARKS` / `EXAM_FINALIZED` (status PUBLISHED/COMPLETED/CANCELLED) / `STUDENT_ACCESS_DENIED` |
| PATCH | `…/exams/:examId/marks/:markId` | single correction (blocked if exam finalized) |

### 10 · Leave
| GET | `…/leaves` | `?status= &page &limit` (own only) |
| POST | `…/leaves` | `{leaveType,startDate,endDate,reason,documentUrl?}` · `leaveType ∈ CASUAL MEDICAL PAID UNPAID MATERNITY PATERNITY OTHER` · `totalDays` auto |
| GET | `…/leaves/:id` | |
| DELETE | `…/leaves/:id` | cancel — only while `PENDING`, else `409 LEAVE_NOT_CANCELLABLE` |

### 11 · Announcements
| GET | `…/announcements` | published, audience ∈ ALL/TEACHERS/STAFF, within publish/expiry window; `isRead` merged; pinned first |
| GET | `…/announcements/:id` | |
| PATCH | `…/announcements/:id/read` | idempotent |

### 12 · Notifications
| GET | `…/notifications` | teacher inbox (broadcast + targeted), `isRead` merged |
| GET | `…/notifications/unread-count` | `{unread}` |
| PATCH | `…/notifications/:id/read` | |
| PATCH | `…/notifications/read-all` | idempotent, `{marked}` |
| POST | `…/device-tokens` | `{token}` → FCM device registration (role `teacher`) |

### 13 · Communication
| GET | `…/conversations` | the teacher's single "School Office" thread `teacher:<teacherId>` |
| GET | `…/conversations/:id/messages` | `?page &limit`; opening marks office replies read |
| POST | `…/conversations/:id/messages` | `{body}` (≤4000) → `direction: IN` |
| PATCH | `…/messages/:id/read` | |

`:id` must equal `teacher:<own teacherId>` — any other value → 404.

---

## 5. Flutter integration notes

- **Auth interceptor** — attach `Authorization: Bearer`; on `401` route to login
  (token expired/invalid, no refresh); on `402` show "subscription expired" and
  route to a blocked screen (auth/profile calls still succeed).
- **Pagination** — `page`/`limit`; stop when `page >= totalPages`.
- **Errors** — switch on `code`, fall back to `message`.
- **Idempotency** — generate a UUID per *user action* for `POST /attendance` and
  `POST /exams/:id/marks`; reuse it on retry. A replay carries
  `Idempotency-Replayed: true` and the **original** response body.
- **Offline attendance** — queue `{sectionId,date,records,idemKey}` locally; on
  reconnect POST with the stored `Idempotency-Key`. Server conflict rules:
  finalized day → `409 ATTENDANCE_FINALIZED` (drop the queued item, refetch);
  otherwise last write wins on the section-day document.
- **Files** — build `<baseUrl><url>?t=<accessToken>` for material/attachment
  downloads.
- **Notifications** — register the FCM token via `POST …/device-tokens` after
  login and on token refresh; pull `/notifications` + `/unread-count` for the
  in-app list; `read` / `read-all` to clear badges.
- **Timezone** — send `date` as the school-local calendar day; the server stores
  it verbatim and rejects future days.

---

## 6. Student Safe Pickup / Parent OTP verification

A controlled child-release flow. Class teacher taps **Pickup** → the registered
guardian mobile gets an OTP (staging = **`123456`**) → teacher verifies it →
teacher **separately** confirms the physical handover. Every step is audited; the
guardian number is never returned unmasked and the OTP is never logged, returned,
or stored in plaintext.

### Two-level feature gate

`effective = School.settings.safePickupEnabled  AND  SchoolClass.safePickupEnabled`
(the student's **current** class). Central resolver:
`safePickupService.isStudentPickupEnabled(schoolId, studentId)`.

| Actor | Endpoint | Auth |
|---|---|---|
| Super Admin | `GET /schools/:id/features` · `PATCH /schools/:id/features {safePickupEnabled}` | `requireSuperAdmin` |
| School Admin | `GET /school-portal/settings/safe-pickup` → `{schoolEnabled, classes[{id,name,sections[],safePickupEnabled}]}` | `requireSchoolAdmin` + `pickup.settings` |
| School Admin | `PATCH /school-portal/settings/safe-pickup {safePickupEnabled}` (school flag) | ″ |
| School Admin | `PATCH /school-portal/academic/classes/:classId/pickup {safePickupEnabled}` | ″ |
| School Admin | `GET /school-portal/pickups/history` `?from&to&classId&sectionId&studentId&teacherId&status&page&limit` (read-only, masked mobile) | `requireSchoolAdmin` + `pickup.history` |

### Teacher pickup API  (all `requireTeacher`, under `/school-portal/teacher`)

**Class-teacher-only surface.** The Pickup bottom-nav tab is shown only when
`GET /school-portal/teacher/me` → `data.teacher.isClassTeacher === true`
(`me` also returns `classTeacherSections: [{ sectionId, classId, className,
sectionName }]`). A subject teacher of a section who is **not** its class teacher
gets an **empty** `eligible-students` list and `403 NOT_CLASS_TEACHER` on
`initiate` — releasing a child is the class teacher's responsibility.

| Method | Path | Notes |
|---|---|---|
| GET | `…/pickups/eligible-students` | `?sectionId&classId&q&page&limit`. Only **class-teacher** sections are considered (`sectionId` must be one of them → else `403 NOT_CLASS_TEACHER`). → roster rows `{ id, name, rollNumber, attendanceStatus, hasGuardianMobile, pickupEnabled, alreadyPickedUpToday, activeSessionId }` |
| POST | `…/pickups/initiate` | `{ studentId }` + optional `Idempotency-Key` header. Checks: teacher **is class teacher of the student's section** (`403 NOT_CLASS_TEACHER`), feature on (both levels), student ACTIVE + not marked ABSENT/LEAVE today + not already picked up today, guardian mobile resolvable, **no active session** (DB partial-unique on `{studentId}` where status∈{PENDING,OTP_SENT,VERIFIED}). Generates+hashes OTP, sets 5-min expiry, sends SMS, → `OTP_SENT`. Resp `{ id, status, maskedMobile:"******1234", otpExpiresAt, otpSecondsRemaining, attemptsRemaining, resendsRemaining }`. **OTP never in the response.** |
| GET | `…/pickups/:pickupSessionId` | session public JSON (tenant + teacher checked; cross → 404, no leak) |
| POST | `…/pickups/:id/verify` | `{ otp }` — expired → `410 PICKUP_SESSION_EXPIRED`; wrong → `400 OTP_INVALID` (`otpAttempts++`); 5th wrong → `429 OTP_ATTEMPTS_EXCEEDED` + session `FAILED`; correct → `VERIFIED`, `otpHash` nulled (one-time). |
| POST | `…/pickups/:id/resend-otp` | cooldown 30s → `429 OTP_RATE_LIMITED`; max 3 resends; new OTP, expiry reset, old OTP dead. |
| POST | `…/pickups/:id/complete` | `{ pickupPersonName?, pickupPersonRelationship?, handoverConfirmed }`. Session must be `VERIFIED`; `handoverConfirmed === true` **required** (`400 HANDOVER_NOT_CONFIRMED`); before verify → `409 PICKUP_NOT_VERIFIED`. → `COMPLETED`. `relationship ∈ Parent|Guardian|Relative|Family Friend|Authorized Person|Other`. |
| POST | `…/pickups/:id/cancel` | any non-terminal → `CANCELLED`, OTP invalidated. |

Status machine: `PENDING → OTP_SENT → VERIFIED → COMPLETED`; side exits
`EXPIRED` / `CANCELLED` / `FAILED`. **OTP verified ≠ child handed over** — final
state is only `COMPLETED` after the teacher's handover confirmation.

### Error codes

`PICKUP_FEATURE_DISABLED` · `CLASS_PICKUP_DISABLED` · `NOT_CLASS_TEACHER` (403) · `STUDENT_ACCESS_DENIED`
(foreign student) · `PARENT_MOBILE_NOT_FOUND` (422) · `PARENT_MOBILE_INVALID`
(422) · `STUDENT_ABSENT` (409) · `STUDENT_ALREADY_PICKED_UP` (409) ·
`PICKUP_ALREADY_ACTIVE` (409) · `PICKUP_SESSION_NOT_FOUND` (404) ·
`PICKUP_SESSION_EXPIRED` (410) · `PICKUP_SESSION_CANCELLED` (409) ·
`OTP_INVALID` (400) · `OTP_ATTEMPTS_EXCEEDED` (429) · `OTP_RATE_LIMITED` (429) ·
`OTP_SEND_FAILED` (502) · `PICKUP_NOT_VERIFIED` (409) ·
`HANDOVER_NOT_CONFIRMED` (400) · `PICKUP_ALREADY_COMPLETED` (409).

### Config (env — see `config/env.js` `safePickup`)

```
SAFE_PICKUP_OTP_MODE=static            # 'random' for production
SAFE_PICKUP_STATIC_OTP=123456
SAFE_PICKUP_OTP_LENGTH=6
SAFE_PICKUP_OTP_EXPIRY_SECONDS=300
SAFE_PICKUP_MAX_ATTEMPTS=5
SAFE_PICKUP_RESEND_COOLDOWN_SECONDS=30
SAFE_PICKUP_MAX_RESENDS=3
SMS_PROVIDER=mock                      # twilio | msg91 | textlocal | sns (not wired yet)
```

`TODO(prod)`: set `SAFE_PICKUP_OTP_MODE=random`, implement a real `SMS_PROVIDER`
(DLT template + sender + delivery monitoring). An SMS failure returns
`502 OTP_SEND_FAILED` and leaves the session `PENDING` — it can **never**
silently verify a pickup.

### Postman

`docs/postman/Safe-Pickup.postman_collection.json` + `.postman_environment.json`
— folders **Super Admin / School Admin / Teacher / Security Tests** (23 requests).
Set `superAdminToken`, `schoolAdminToken`, `accessToken` in the env; run
top-to-bottom. Staging OTP `{{pickupOtp}}` = `123456`.

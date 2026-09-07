# Parent APK — Backend API

Backend for the Flutter Parent app. **Every parent route is owned by
`platform-service` (port `5002`).** Built to the same standard as the Teacher &
Student APKs (`teacher-apk-api.md`, `student-apk-api.md`) — same layered
architecture, response envelope, tenant isolation, error-code contract. It is
the **8th** school-tenant role portal.

| | Base | Path form |
|---|---|---|
| Direct to platform-service (dev / debugging) | `http://localhost:5002` | `<path>` as written below, **no prefix** |
| Through the api-gateway (`:8080`, prod ingress) | `https://<gateway-host>` | `/api/v1/platform<path>` — the gateway adds the prefix |

The Postman env (`docs/postman/Parent-APK.postman_environment.json`) ships
pointing at `http://localhost:5002`. Examples below omit the prefix.

---

## 0. Bottom-nav → API map

**5 bottom-nav tabs** — Home · Academics · Attendance · Notices · Profile —
plus an ⌂ App bar (top-right 🔔 + 👤) on every screen. The Postman collection is
grouped the same way (`📱 Tab N · …`). Parent-level paths are under
`/school-portal/parent`; **child data is under `/school-portal/parent/children/:childId/…`**.

| Tab | Screens | Endpoints |
|---|---|---|
| **⌂ App bar** | 🔔 notification list + unread badge · 👤 quick menu (Me / Profile / Logout) | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `POST /device-tokens` · `GET /me`, `GET /profile`, `POST /auth/logout` |
| **1 · Home** `/parent/home` | Parent header, **Child selector**, today summary, quick actions, pending fees, pending homework, upcoming exams, recent notices, alerts | `GET /parent/dashboard?childId=`, `GET /parent/dashboard/overview` · `GET /parent/children`, `GET /parent/children/:childId` |
| **2 · Academics** | Homework · Timetable · Classwork · Study Material · Exams · Results · Academic Progress | `GET /parent/children/:childId/homework(/:id)` · `…/timetable(/today\|/day/:day)` · `…/classwork(/:id)` · `…/materials(/:id\|/:id/download-url)` · `…/exams(/upcoming\|/:examId\|/:examId/schedule)` · `…/results(/:examId\|/:examId/subjects)` · `…/report-card` (= Academic Progress) |
| **3 · Attendance** | Overall %, monthly, daily calendar | `GET /parent/children/:childId/attendance/summary`, `…/attendance/daily`, `…/attendance/monthly` |
| **4 · Notices** | School / class notices (read + mark-read), Events | `GET /parent/notices(/:id)`, `PATCH /parent/notices/:id/read`, `PATCH /parent/notices/read-all` · `GET /parent/events(/:id)` |
| **5 · Profile** | Parent Profile, My Children, Fees & Payments, Payments, Receipts, Pickup, Notification Settings, Security, Logout | `POST /school-portal/auth/parent-login`, `POST …/auth/logout`, `GET /me`, `PATCH /change-password` · `GET /parent/profile`, `PATCH /parent/profile` · `GET /parent/settings`, `PATCH /parent/settings` · `GET /parent/children(/:childId)` · `GET /parent/children/:childId/fees/summary\|/pending\|/invoices\|/invoices/:id\|/history` · `POST …/fees/invoices/:id/pay-order`, `POST …/fees/payments/verify` · `GET …/fees/receipts(/:paymentId)` · `GET …/pickup(/:sessionId)` |

> **Notifications** = top-right 🔔 only, not a tab.
> **Deferred / not in v1** (documented so the app hides them):
> - **Parent-initiated Safe Pickup** — `StudentPickupSession` is teacher-driven
>   (`teacherId` required, all actors ref `Teacher`). Parents get **read-only**
>   pickup status/history (`GET …/pickup`). A parent "request pickup" flow needs
>   a model rework and is a planned follow-up.
> - **Transport** — `StudentTransportAssignment` / `TransportRoute` / `RouteStop`
>   exist; a read-only parent view is a small follow-up, not built yet.
> - **1:1 parent↔teacher chat** — no chat model for parents. Parents receive
>   read-only announcements (`/parent/notices`), which already fan out to
>   `parent` devices.

---

## 1. Authentication

| | |
|---|---|
| Scheme | `Authorization: Bearer <accessToken>` |
| Token | single JWT, `expiresIn = JWT_EXPIRES_IN` (default `7d`) — **no refresh token** (matches all 7 other role portals; the client re-logs-in on 401) |
| Claims | `sub` = `parentId` = `Parent._id`, `schoolId`, `role: "PARENT"`, `name`, `phone` |
| Identity source | the server re-derives `schoolId` / `parentId` from the JWT on every request (`utils/tenant.js`); `childId` is authorized against the `ParentStudent` link (`parentAccess.service.js`) and never trusted from the request |
| Role guard | `requireParent` — role must be exactly `PARENT`; then `enforceSubscriptionAccess` (402 once the school's subscription lapses past grace, except the exempt `auth` / `me` / `profile` / `change-password` paths) |

### Flow

```
POST /school-portal/auth/parent-login            (also /school-auth/parent-login)
  { identifier, password }  ->  { token, parent, children[], school }
        identifier = phone | email | account.loginEmail
  store token (flutter_secure_storage); send it as Bearer on every call
POST /school-portal/parent/auth/logout           client discards the token (stateless)
```

Login failures all return the same `401 { code: "INVALID_CREDENTIALS" }` (no
parent-exists probing). Inactive account → `403 PARENT_INACTIVE`. A login
registered at more than one school → `409`.

### Provisioning (admin side, principal)

- `POST /school-portal/parents` `{ firstName, lastName?, phone?, email?, address?, children?: [{studentId, relationship, isPrimary}] }`
- `POST /school-portal/parents/:id/children` `{ studentId, relationship, isPrimary }` · `DELETE /school-portal/parents/:id/children/:studentId`
- `POST /school-portal/academic/parents/:id/set-password` `{ newPassword, loginEmail? }` — mirror of the teacher/student set-password routes.
- Seed: every school gets `parent@<school-domain>` / `Parent@123`, linked to that
  school's students (`ParentStudent`), so the app renders real child data on
  first run.

---

## 2. Response shape

```jsonc
{ "success": true, "message": "…", "data": { … } }
{ "success": true, "data": [ … ], "pagination": { "page":1, "limit":20, "total":42, "totalPages":3 } }
{ "success": false, "message": "human readable", "code": "MACHINE_CODE" }
```

Pagination: `?page=` (1-based) `&limit=` (default 20, **max 50**). ISO-8601 dates;
attendance uses `YYYY-MM-DD`.

### Error codes (`code`)

`UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_ERROR` · `RATE_LIMITED`
· `INVALID_CREDENTIALS` · `PARENT_INACTIVE` · `PARENT_NOT_FOUND` ·
`PASSWORD_TOO_SHORT` · `CURRENT_PASSWORD_INVALID` · `NO_LINKED_CHILDREN` ·
**`CHILD_ACCESS_DENIED`** · `CHILD_NOT_FOUND` · `RESOURCE_FORBIDDEN` ·
`NO_ACTIVE_ENROLLMENT` · `RESULT_NOT_PUBLISHED` · `PAYMENTS_NOT_CONFIGURED` ·
`INVOICE_NOT_PAYABLE` · `INVOICE_ALREADY_PAID` · `PAYMENT_AMOUNT_INVALID` ·
`PAYMENT_SIGNATURE_INVALID` · `PAYMENT_GATEWAY_ERROR` · `DUPLICATE_REQUEST` ·
`DOCUMENT_PATH_INVALID`

Cross-school / unknown ids → **`404`**; a resource visible-but-not-yours →
**`403`**.

---

## 3. Authorization model — parent ↔ child

`parentAccess.service.js` is the single IDOR chokepoint. `loadContext(req)`
builds and caches, from the JWT only:

```
parent   = Parent{ _id: jwt.parentId, schoolId: jwt.schoolId, status: ACTIVE }
links    = ParentStudent{ schoolId, parentId, status: 'ACTIVE' }        // the trust anchor
children = each link → { studentId, relationship, isPrimary, name, classId,
             sectionId, className, sectionName, rollNumber, hasEnrollment }
```

**`resolveChild(req, childId)`** is the ONLY way to reach child data:

1. `validateObjectId('childId')` on the route → `400` for a malformed id.
2. `childId` must be one of `ctx.children[].studentId` — i.e. a live
   `ParentStudent` link for **this** parent in **this** school → otherwise
   `403 CHILD_ACCESS_DENIED` (never leaks whether the child exists elsewhere).
3. returns a **student-shaped ctx** (`studentAccessService.buildContext(schoolId,
   childId)`) so the existing `student*.service.js` read methods run unchanged.

For every `childId` request the server does: authenticate parent → resolve
school from JWT → verify the `ParentStudent` link → resolve the child's current
enrollment → return only the authorized fields. Changing `childId` in the URL to
another parent's / another school's student is rejected at step 2/3.

### Authorization matrix

| Module | Parent |
|---|---|
| Dashboard / Children | Read |
| Parent Profile | Read · limited update (`firstName,lastName,phone,email,address,photo`) |
| Homework / Classwork / Study Material / Timetable | Read (child's section/class) |
| Exams / Results / Academic Progress | Read (results gated on `Exam.status==='PUBLISHED'`) |
| Attendance | Read (child's own entries only) |
| Fees | Read |
| Payments | **Create pay-order · verify (advisory)** — reconciliation is webhook-only |
| Receipts | Read (own child's) |
| Pickup | Read-only (teacher-initiated sessions) |
| Notices / Events | Read · mark read |
| Notifications | Read · mark read · register device token |
| Settings | Read · update notification prefs |

A parent token can never reach a teacher / student / admin route — separate
middleware, separate role string.

---

## 4. Endpoint reference

All authenticated routes: `401` no/invalid token, `403` wrong role, `402`
subscription lapsed (non-exempt). Child routes add: `400` malformed `childId`,
`403 CHILD_ACCESS_DENIED` unlinked child, `409 NO_ACTIVE_ENROLLMENT` when the
child has no current-year enrollment (academics/attendance only — fees do not
require one).

### Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/school-portal/auth/parent-login` | `{ identifier, password }` | `loginRateLimiter`; `200 { token, parent, children[], school }` |
| POST | `/school-portal/parent/auth/logout` | — | stateless |
| GET | `/school-portal/parent/me` | — | `{ parent, children[], school }` |
| PATCH | `/school-portal/parent/change-password` | `{ currentPassword, newPassword }` | `400 PASSWORD_TOO_SHORT` (<8), `401 CURRENT_PASSWORD_INVALID` |

### Home

| GET | `/parent/dashboard` | `?childId=` (defaults to the first linked child) | `{ child, todaySummary{attendancePercentage,pendingHomework,nextClass}, pendingFees{amount,nextDueDate}, upcomingExams[], recentNotices[], alerts{lowAttendance} }` |
| GET | `/parent/dashboard/overview` | — | `{ children: [{ childId, name, className, attendancePercentage, pendingHomework, pendingFees }] }` — powers the child selector |

### Children

| GET | `/parent/children` | — | linked children (name, photo, admission, class, section, year, relationship, isPrimary) |
| GET | `/parent/children/:childId` | — | full read-only child profile; `403` if not linked |

### Academics — `/parent/children/:childId/…`

| GET | `/homework` `?status=all\|pending\|completed\|overdue&page=` · `/homework/:id` | merged with the child's own submission status (read-only) |
| GET | `/classwork` `?subjectId=&page=` · `/classwork/:id` | `Assignment` items (PUBLISHED/CLOSED) |
| GET | `/materials` `?subjectId=&type=&from=&to=&page=` · `/materials/:id` · `/materials/:id/download-url` | section- or class-visible ACTIVE material |
| GET | `/timetable` · `/timetable/today` · `/timetable/day/:day` | `:day` ∈ MON…SAT |
| GET | `/exams` `?status=upcoming\|ongoing\|completed` · `/exams/upcoming` · `/exams/:examId` · `/exams/:examId/schedule` | `Exam.classIds ∋ child class` |
| GET | `/results` · `/results/:examId` · `/results/:examId/subjects` | only `Exam.status==='PUBLISHED'`; `403 RESULT_NOT_PUBLISHED` otherwise |
| GET | `/report-card` `?yearId=` | Academic Progress — aggregate over published exams: `aggregatePercentage`, `exams[]` with subject breakdown |

### Attendance — `/parent/children/:childId/…` (read-only)

| GET | `/attendance/summary` | — | `overall{PRESENT,ABSENT,LATE,HALF_DAY,LEAVE,total,presentPercentage}` + `byMonth[]` |
| GET | `/attendance/daily` | `?from=&to=` | day rows + summary |
| GET | `/attendance/monthly` | `?month=YYYY-MM` (required) | day rows + summary; `400` bad month |

### Fees + Payments + Receipts — `/parent/children/:childId/…`

| GET | `/fees/summary` | — | `{ totalFees, paid, pending, nextDueDate, nextDueAmount, outstandingCount }` |
| GET | `/fees/pending` · `/fees/invoices` `?status=&page=` · `/fees/invoices/:id` · `/fees/history` | own invoices / payments; fee-head `items[]` on the detail |
| POST | `/fees/invoices/:id/pay-order` | `{ amount? }` (partial ≤ balance); header `Idempotency-Key` | server computes amount from the invoice; `200 { keyId, orderId, amount, currency, invoiceId, invoiceNumber }`; order `notes = { type:'SCHOOL_FEE', schoolId, parentId, studentId, invoiceId }`. `400 PAYMENTS_NOT_CONFIGURED` / `PAYMENT_AMOUNT_INVALID`, `409 INVOICE_ALREADY_PAID` / `INVOICE_NOT_PAYABLE`, `502 PAYMENT_GATEWAY_ERROR` |
| POST | `/fees/payments/verify` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` | HMAC check only — **advisory** (`{ verified, status:"AWAITING_WEBHOOK" }`); `400 PAYMENT_SIGNATURE_INVALID` |
| GET | `/fees/receipts` `?page=` · `/fees/receipts/:paymentId` | receipt: number, `transactionId`, date, amount, `invoice{items[],status}` |

### Pickup (read-only) — `/parent/children/:childId/…`

| GET | `/pickup` `?page=` | `{ data:[session…], active:session\|null }` — masked mobile, status, timestamps |
| GET | `/pickup/:sessionId` | — | one session; `404` if not this child's |

### Notices / Events

| GET | `/parent/notices` `?category=&page=` | `Announcement` `PUBLISHED`, `audiences ∋ ALL\|PARENTS`, within publish/expiry window; `meta.unread` |
| GET | `/parent/notices/:id` · PATCH `/parent/notices/:id/read` · PATCH `/parent/notices/read-all` | `ReadReceipt` `refType ANNOUNCEMENT`, `userType PARENT` |
| GET | `/parent/events` `?scope=upcoming\|past&page=` · `/parent/events/:id` | `audiences ∋ ALL\|PARENTS` |

### Notifications

| GET | `/parent/notifications` `?page=` · `/parent/notifications/unread-count` | `notificationRepository.inbox({ role:'parent' })` |
| PATCH | `/parent/notifications/:id/read` · `/parent/notifications/read-all` | `ReadReceipt` `refType NOTIFICATION` |
| POST | `/parent/device-tokens` | `{ token }` (FCM, ≥20 chars) | upserts `DeviceToken { role:'parent', userId:parentId, schoolId }` |

### Profile + Settings

| GET | `/parent/profile` · PATCH `/parent/profile` | multipart or JSON: `firstName,lastName,phone,email,address,photo` |
| GET | `/parent/settings` · PATCH `/parent/settings` | `{ notificationPrefs: { homework, attendance, lowAttendance, exam, result, fee, payment, notice, pickup, transport, announcement, communication } }` |

---

## 5. Payment flow (Pay Now)

```
Parent → select child → Fees → outstanding invoice → Pay Now
  POST /parent/children/:childId/fees/invoices/:id/pay-order   (Idempotency-Key)
      server: verify link → invoice payable? → amount = balance (or partial)
              → create Razorpay order, notes.type = 'SCHOOL_FEE'
      → { keyId, orderId, amount, currency }
  open Razorpay checkout with keyId + orderId
  on checkout success → POST /parent/children/:childId/fees/payments/verify   (ADVISORY signature check only)
  ── authoritative path ──
  Razorpay → POST /webhooks/razorpay  (signature-verified, deduped by RazorpayWebhookEvent)
      event payment.captured / order.paid with notes.type === 'SCHOOL_FEE'
      → parentFeePaymentService.reconcileFromRazorpay(entity):
          idempotent on FeePayment.gatewayPaymentId (unique)
          create FeePayment { gateway:'RAZORPAY', gatewayOrderId, gatewayPaymentId, method:'ONLINE' }
          recompute FeeInvoice.paidAmount from ALL completed payments
          FeeInvoice.status → PAID | PARTIALLY_PAID
  → receipt visible at GET /parent/children/:childId/fees/receipts/:paymentId
```

**Never** mark a payment successful from the app callback — the webhook is the
only source of truth. Duplicate webhook delivery, app-killed-mid-payment,
already-paid, and partial payment are all handled: the reconciler is a no-op on
replay and recomputes totals from the full `FeePayment` set.

Requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
When unset, `pay-order` returns `400 PAYMENTS_NOT_CONFIGURED` and the rest of the
Fees module still works read-only.

---

## 6. Notification deep links

Payload carries a `type` + a safe resource id. The app's central handler maps:

| type | opens |
|---|---|
| `HOMEWORK` | Academics → Homework → detail (`/children/:childId/homework/:id`) |
| `ATTENDANCE` / `LOW_ATTENDANCE` | Attendance tab |
| `EXAM` | Academics → Exams → detail |
| `RESULT` | Academics → Results → detail |
| `NOTICE` | Notices → detail |
| `FEE` / `PAYMENT` | Profile → Fees & Payments → invoice / receipt |
| `PICKUP` | Profile → Pickup → session detail (direct, not via Profile menu) |
| `EVENT` | Notices → Events → detail |

Never put sensitive data in the payload — only ids the parent is already
authorized for (re-checked server-side on open).

---

## 7. Security notes

- Identity from the verified JWT only; `childId` authorized via the
  `ParentStudent` link; body/query/params never trusted for scoping.
- `:id` routes: `validateObjectId` → ownership re-check → `404` cross-school,
  `403` visible-but-forbidden.
- IDOR/BOLA covered by `test/parent.isolation.test.js`: parent A vs parent B's
  `childId` on every child-scoped route → 403; a non-linked child in the same
  school → 403; cross-school `childId` → 403; malformed `childId` → 400;
  student/teacher/admin token on a parent route → 403; missing token → 401;
  pay-order for a non-linked child → 403.
- Payments: amount computed server-side; order `notes` carry the identity tuple;
  webhook re-verifies before reconciling; `RazorpayWebhookEvent` +
  `FeePayment.gatewayPaymentId` unique index = double idempotency.
- Pickup read-only; mobile numbers masked by the model.
- `loginRateLimiter`; `passwordHash` `select:false`, never serialized; no
  tokens / OTPs / gateway secrets in logs.

## 8. Feature flags
Low-attendance alert reads `School.settings.lowAttendanceThreshold` if a school
sets it, else a documented default of **75%**. Transport + parent-initiated
pickup are out of v1; `parentAccess` leaves an `isModuleEnabled(school, key)`
seam.

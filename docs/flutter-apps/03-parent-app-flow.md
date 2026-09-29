# Parent App — Flutter Design & Flow Guide

> Backend: `backend/services/platform-service/src/routes/parent.routes.js`
> Postman: [postman/Parent-App.postman_collection.json](postman/Parent-App.postman_collection.json) (56 requests, full localhost URLs)

---

## 0. At a glance

| Item | Value |
|---|---|
| Who uses it | Parents/guardians. One parent account can have **multiple children** |
| Login | `identifier` (phone **or** email) + `password` |
| Login URL | `POST http://localhost:5000/api/v1/platform/school-portal/auth/parent-login` |
| Parent-level URLs | `http://localhost:5000/api/v1/platform/school-portal/parent/...` |
| Child-level URLs | `http://localhost:5000/api/v1/platform/school-portal/parent/children/{childId}/...` |
| Token | One JWT, valid **7 days**, no refresh token. `Authorization: Bearer <token>` |
| Bottom nav | **Home · Academics · Attendance · Notices · Profile** + 🔔 in the app bar |
| Special | **Online fee payment (Razorpay)** — the only app that takes money |

---

## 1. Key design idea: the "Selected child"

Almost every screen shows data for **one child**. Build the app around a global `selectedChildProvider`:

```
Login response → children[]  ─► selectedChild = children[0] (or the last one used, saved locally)
App bar: [ avatar Aarav ▾ ]  → bottom sheet listing all children → tap switches selectedChild
Every child screen watches selectedChild and calls /children/{selectedChild.childId}/...
```
- With one child, hide the switcher (just show the name).
- With zero children the backend returns `NO_LINKED_CHILDREN`. Show "No student is linked to your account — contact the school."
- If a parent opens another family's child, they get `CHILD_ACCESS_DENIED`. The backend enforces this; the app only ever uses ids from `children[]`.

---

## 2. Recommended Flutter stack

| Need | Package |
|---|---|
| State | `flutter_riverpod` (`selectedChildProvider` + family providers keyed by childId) |
| Routing | `go_router` |
| HTTP | `dio` |
| Token | `flutter_secure_storage`. Save the last selected child id in `shared_preferences` (not secret) |
| Models | `freezed` + `json_serializable` |
| Payment | **`razorpay_flutter`** |
| Push | `firebase_messaging` + `flutter_local_notifications` |
| Files | `url_launcher`, `open_filex`, `path_provider`, `printing`/`pdf` (receipt share) |
| UI | `table_calendar`, `fl_chart`, `cached_network_image`, `shimmer` |

---

## 3. Project structure

```
lib/
├── app/            app.dart · router.dart · env.dart
├── core/           network/ · storage/ · theme/ · widgets/
└── features/
    ├── auth/
    ├── children/        selected_child_provider.dart · child_switcher_sheet.dart · child_profile_screen.dart
    ├── home/            overview (all kids) + dashboard (one kid)
    ├── academics/       homework · classwork · materials · timetable · exams · results · report card
    ├── attendance/
    ├── fees/            summary · invoices · pay (razorpay) · receipts · history
    ├── pickup/          safe-pickup history (read-only)
    ├── inbox/           notices · events · notifications
    └── profile/         profile · settings · change password
```

---

## 4. Networking

Same as the other apps:
- Base URL: emulator `http://10.0.2.2:5000/api/v1/platform`, real phone `http://<PC-LAN-IP>:5000/api/v1/platform`.
- Envelope `{success, data, pagination}` / `{success:false, message, code}`. Login keeps `token`, `parent`, `user`, `school` and `children` at the top level.
- **401** → Login. **402** → subscription expired. **429** → rate limited.
- `Idempotency-Key` (uuid) header on **pay-order**. This stops a double tap from creating two Razorpay orders.

---

## 5. Auth & session flow

```
Splash → token? ─ no → Login
           └ yes → GET /parent/me → (school theme) → GET /parent/children → pick selectedChild → Home

Login → POST /school-portal/auth/parent-login {identifier: phone/email, password}
      → save token, school, children[] → POST /parent/device-tokens → Home
```

---

## 6. Navigation map

```
App bar: [Child switcher ▾]                              [🔔 badge]
BottomNav
├── Home
│   ├── All-children overview ── GET /dashboard/overview   (one card per child: attendance %, dues, next exam)
│   └── Selected child dashboard ─ GET /dashboard?childId=
├── Academics  (child)
│   ├── Homework ──────── GET /children/:id/homework?status= → /homework/:hwId
│   ├── Classwork ─────── GET /children/:id/classwork → /classwork/:cwId
│   ├── Materials ─────── GET /children/:id/materials → /:mId → /:mId/download-url
│   ├── Timetable ─────── GET /children/:id/timetable · /today · /day/MON
│   ├── Exams ─────────── GET /children/:id/exams · /exams/upcoming → /exams/:examId → /schedule
│   ├── Results ───────── GET /children/:id/results → /results/:examId → /subjects
│   └── Report card ───── GET /children/:id/report-card
├── Attendance (child)
│   ├── Summary ───────── GET /children/:id/attendance/summary
│   ├── Month calendar ── GET /children/:id/attendance/monthly?month=YYYY-MM
│   └── Daily list ────── GET /children/:id/attendance/daily?from=&to=
├── Notices
│   ├── Notices ───────── GET /notices → detail (mark read)
│   └── Events ────────── GET /events?scope=upcoming|past
└── Profile
    ├── My profile ────── GET/PATCH /profile
    ├── Child profile ─── GET /children/:id
    ├── Fees & Payments ─ (see §7.4)
    ├── Pickup history ── GET /children/:id/pickup → /pickup/:sessionId
    ├── Settings ──────── GET/PATCH /settings
    ├── Change password ─ PATCH /change-password
    └── Logout ────────── POST /auth/logout
🔔 Notifications ──────── GET /notifications · unread-count · PATCH read / read-all
```

---

## 7. Screen-by-screen spec

### 7.1 Home
- **Overview** carousel: one card per child (photo, class, attendance %, amount due, next exam). Tapping a card switches the selected child.
- Selected-child dashboard below it: today's attendance status, homework due, and latest notices.

### 7.2 Academics
- These are the same screens as the Student app, but read-only (a parent cannot submit homework). If you build both apps, share the widgets through a common package (see §9).
- Homework tabs: All · Pending · Completed · Overdue.
- Results: only published results are shown (`RESULT_NOT_PUBLISHED` → "Result not declared yet").

### 7.3 Attendance
- Ring chart (%) plus a month calendar coloured by status (`PRESENT/ABSENT/LATE/HALF_DAY/LEAVE`). The `month` query is required.

### 7.4 Fees & Online Payment (most important flow)

**Screens:** Fee summary → Invoices list → Invoice detail → [Pay Now] → Payment result → Receipt.

```
Invoice detail (status PENDING / PARTIALLY_PAID / OVERDUE, balance > 0)
   │ [Pay Now]  (optional: "Pay part amount" field, ₹)
   ▼
POST /children/:id/fees/invoices/:invoiceId/pay-order   {amount?}   + Idempotency-Key
   ◄ { keyId, orderId, amount (paise), currency, invoiceNumber, studentName }
   ▼
Razorpay checkout (razorpay_flutter):
   options = { key: keyId, order_id: orderId, amount: amount, currency,
               name: school.name, description: invoiceNumber,
               prefill: { contact: parent.phone, email: parent.email } }
   │
   ├─ onPaymentSuccess(r) ─► POST /children/:id/fees/payments/verify
   │        { razorpay_order_id: r.orderId, razorpay_payment_id: r.paymentId, razorpay_signature: r.signature }
   │        → "Payment received, confirming…" → poll GET /fees/invoices/:invoiceId (every 3 s, max ~30 s)
   │          until status/balance changes → Success screen → open Receipt
   ├─ onPaymentError ─► "Payment failed / cancelled" (nothing was charged) → back to invoice
   └─ onExternalWallet ─► same as success path (wait for webhook)
```

**Rules:**
- `amount` in the pay-order body is in **rupees** and optional. Leave it out to pay the full balance; it must be between 1 and the outstanding balance (`PAYMENT_AMOUNT_INVALID`). The `amount` in the response is in **paise**; pass it to Razorpay as it is.
- **The Razorpay webhook is the final truth.** The app's `verify` call is advisory only, so never show "Paid" until the invoice itself says so.
- Hide Pay Now when the status is `PAID` or `CANCELLED`, or when the balance is ≤ 0 (`INVOICE_ALREADY_PAID`, `INVOICE_NOT_PAYABLE`).
- `PAYMENTS_NOT_CONFIGURED` → "Online payment is not enabled by your school. Please pay at the school office." Hide the button from then on.
- `PAYMENT_GATEWAY_ERROR` (502) → "Payment service unavailable, try again".

**Receipts:** `GET /fees/receipts` → `GET /fees/receipts/:paymentId`. Build a receipt view (school logo, receipt no., student, amount, mode, date) with **Share / Download PDF** (`pdf` + `printing`).

### 7.5 Safe Pickup (read-only)
- The parent **receives the OTP** (SMS or push) when a teacher starts a pickup, and tells it to the teacher at the gate. The app does not submit the OTP.
- History list: date, time, teacher, pickup person and relationship, status. Tap for detail.

### 7.6 Notices / Events / Notifications
- Notices: unread dot, mark read on open, "Mark all read".
- Events: Upcoming / Past tabs.
- 🔔 badge from `/notifications/unread-count`. FCM token → `POST /device-tokens {token}` after login and on refresh.
- A push about fees or attendance should switch to the child named in the payload before opening the screen.

### 7.7 Profile & Settings
- Editable: `firstName, lastName, phone, email, address`, plus the photo (multipart `photo`, max 5 MB).
- Settings: notification toggles (`notificationPrefs`).

---

## 8. Error codes to handle

| code | UI |
|---|---|
| `INVALID_CREDENTIALS` | "Wrong phone/email or password" |
| `ACCOUNT_NOT_PROVISIONED` | "Parent login not created yet — contact school" |
| `PARENT_INACTIVE` | "Account inactive" |
| `NO_LINKED_CHILDREN` | Empty state: no child linked |
| `CHILD_ACCESS_DENIED` / `CHILD_NOT_FOUND` | Reset to the first child and refresh |
| `NO_ACTIVE_ENROLLMENT` | "Child not enrolled in the current session" |
| `RESULT_NOT_PUBLISHED` | "Result not declared yet" |
| `PAYMENTS_NOT_CONFIGURED` | Hide Pay Now, show "Pay at school office" |
| `INVOICE_ALREADY_PAID` / `INVOICE_NOT_PAYABLE` | Refresh the invoice and hide Pay Now |
| `PAYMENT_AMOUNT_INVALID` | Field error on the part-payment amount |
| `PAYMENT_SIGNATURE_INVALID` | "Could not verify — we'll update once the bank confirms" |
| `PAYMENT_GATEWAY_ERROR` | "Payment service unavailable, try again" |
| HTTP 402 | Subscription-expired page |

---

## 9. Parent app vs Student app — share code
The child-scoped academics, attendance and fee screens have the same response shapes as the Student app. Only the URL prefix differs:

| Student app | Parent app |
|---|---|
| `/school-portal/student/homework` | `/school-portal/parent/children/{childId}/homework` |
| `/school-portal/student/attendance/monthly` | `/school-portal/parent/children/{childId}/attendance/monthly` |

Make a shared Dart package (`packages/school_core`) with the models and widgets, and give each app its own `PathBuilder` for the prefix.

---

## 10. Build order
1. Core + Auth + **child switcher** (build this first, since every screen depends on it).
2. Home (overview + dashboard).
3. Attendance → Academics (homework, timetable, exams, results).
4. **Fees: invoices → Razorpay pay → verify → receipts** (test with Razorpay *test keys* on the backend).
5. Notices, Events, Notifications and FCM.
6. Pickup history, Profile, Settings.

---

## 11. Test with Postman first
1. Import `postman/Parent-App.postman_collection.json`.
2. **01 Auth → Login** with the parent's phone and password. `{{token}}` **and** `{{childId}}` (first child) save automatically.
3. To test another child: run **02 Children → My children** and copy that child's `childId` into the `childId` collection variable.
4. **07 Fees → Create pay order** needs Razorpay keys in `platform-service/.env`. Without them you'll get `PAYMENTS_NOT_CONFIGURED`, which is correct behaviour.

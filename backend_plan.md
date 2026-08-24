# Backend Plan — Multi-Tenant School Management Platform (MERN)

## Status

The frontend (`frontend/`) is a complete 10-module React app — Student, Teacher, Parent, Principal, School Admin, Accountant, HR, Librarian, Transport, and Super Admin — currently running entirely on mock data (`frontend/src/shared/data/*.js` + per-module `data/mockData.js` / `utils/constants.js`). `backend/` is empty. This document is the design and delivery plan for a real backend.

The `super-admin` module's UI (tenants, subscriptions, licenses, revenue, modules, support) makes the intended product shape explicit: **one platform, many schools** — a multi-tenant SaaS, not a single-school app. The backend is designed multi-tenant from day one accordingly.

**Stack**: Node.js + Express + MongoDB (Mongoose ODM) — MERN, matching the existing React frontend so one person/team can move across both ends without a language switch.

---

## 1. Overview & Goals

- Serve all 10 existing frontend modules with a single multi-tenant REST API.
- Mirror the field names and shapes already established in `frontend/src/shared/data/*.js` (built and reconciled during the earlier frontend-consolidation pass) so that swapping mock imports for API calls is a near 1:1 replacement, not a redesign of every page.
- Replace every module's fake `localStorage`-based login with real JWT authentication and role-based access control.
- Keep tenant data fully isolated so one school can never see another's records — enforced in code, not just convention.
- Ship incrementally: each phase in the roadmap (§6) unblocks a working slice of the frontend, rather than a single big-bang backend release.

---

## 2. High-Level Architecture

```
Client (React/Vite)
   │  JWT bearer token
   ▼
Express API  (routes → controllers → services → models)
   │
   ├── Platform-auth realm   (Super Admin — no tenantId)
   └── Tenant-auth realm     (everyone else — tenantId + role in JWT)
   │
   ▼
MongoDB (single cluster, shared collections, tenantId on every tenant-scoped document)
```

**Layering**: `routes/` (HTTP + validation) → `controllers/` (request/response shaping) → `services/` (business logic) → `models/` (Mongoose schemas). Controllers never touch Mongoose directly — keeps tenant-scoping enforcement centralized in the service layer.

### 2.1 Tenant isolation strategy

**Shared database, shared collections, `tenantId` on every tenant-scoped document** (not a database-per-tenant). Rationale:
- MongoDB handles thousands of tenants cleanly in one collection with a `{ tenantId: 1, ... }` compound index — cheaper to operate than provisioning a DB per school.
- A single Mongoose plugin (`plugins/tenantScope.js`) attaches to every tenant-scoped schema, adding a `tenantId` field (indexed, required) and registering `pre('find' | 'findOne' | 'updateMany' | ...)` hooks that auto-inject `tenantId` from `AsyncLocalStorage`-backed request context — so a controller that forgets to filter by tenant fails closed (returns nothing) rather than leaking cross-tenant data.
- **Future option, not built now**: a "dedicated" tier for enterprise/compliance-sensitive tenants that get their own physical database, reusing the same Mongoose models against a different connection — the schema design doesn't need to change to support this later, only the connection-resolution layer.

### 2.2 Two authentication realms

| Realm | Who | JWT claims | Login endpoint |
|---|---|---|---|
| Platform auth | Super Admin only | `{ sub, role: 'SuperAdmin' }` — **no `tenantId`** | `POST /api/v1/platform/auth/login` |
| Tenant auth | Everyone else (Student, Parent, Teacher, Principal, SchoolAdmin, Accountant, HRManager, Librarian, TransportManager) | `{ sub, role, tenantId, refId }` | `POST /api/v1/auth/login` |

This mirrors the frontend's existing structure exactly — `/super-admin/login` is already a separate page/context from the other 9 modules' logins, so the backend split requires no frontend routing changes, only real auth behind the existing screens.

`refId` in the tenant JWT points at the role-specific profile document (a `Student._id`, `StaffMember._id`, or `Guardian._id`) so a request can resolve "who is this" without a join on every call.

### 2.3 RBAC

Roles (matches the frontend 1:1): `Student`, `Parent`, `Teacher`, `Principal`, `SchoolAdmin`, `Accountant`, `HRManager`, `Librarian`, `TransportManager`, `SuperAdmin`.

Two layers of authorization, both as Express middleware:
1. **Role check** — `requireRole('Teacher', 'Principal')` on a route.
2. **Resource-scope check** — e.g. a `Parent` may only read `Student` documents whose `_id` is in their own `Guardian.children[]`; a `Teacher` may only mark attendance for classes in their own `StaffMember.classes[]`. Implemented as a service-layer check, not just a route guard, so it also applies to nested reads (e.g. a fee report that includes student names).

---

## 3. Data Model

Every "Tenant core" and below collection includes a `tenantId: ObjectId` (ref `Tenant`, indexed) and standard `createdAt`/`updatedAt` timestamps. Field lists below are derived directly from the real shapes already in `frontend/src/shared/data/*.js` and the page-level features found across all 183 frontend page files — this is not a guess at what the app needs, it's a transcription of what it already has.

### 3.1 Platform layer (no `tenantId` — super-admin only)

**`Tenant`** (a school on the platform — the row super-admin's `SchoolsIndex.jsx`/`TenantsIndex.jsx` manage)
`name, shortName, subdomain, logoUrl, address, city, state, pincode, country, phone, email, website, established, affiliation, affiliationNo, academicSession, principalName, status ('active'|'trial'|'suspended'|'cancelled'), plan (ref SubscriptionPlan), planStartedAt, planExpiresAt, studentLimit, staffLimit, storageQuotaMb, enabledModules[] (feature flags — powers super-admin's ModulesIndex.jsx), createdAt`

**`SubscriptionPlan`** — `name, price, billingCycle ('monthly'|'yearly'), studentLimit, staffLimit, storageQuotaMb, features[], isActive` (powers `SubscriptionsIndex.jsx`)

**`Invoice`** — `tenantId, plan, amount, status ('paid'|'due'|'overdue'), issuedAt, paidAt, periodStart, periodEnd` (powers `RevenueIndex.jsx`)

**`License`** — `tenantId, type, key, seats, issuedAt, expiresAt, status` (powers `LicensesIndex.jsx`)

**`SuperAdminUser`** — `name, email, passwordHash, role: 'SuperAdmin', lastLoginAt`

**`SupportTicket`** — `tenantId, raisedBy, subject, description, priority, status, thread: [{ author, message, at }]` (powers `SupportIndex.jsx`)

**`PlatformAuditLog`** — `actor (SuperAdminUser ref), action, targetTenant, details, ip, at` (powers `AuditLogsIndex.jsx`)

**`BackupRecord`** — `tenantId, triggeredBy, status, sizeMb, startedAt, completedAt` (powers `BackupIndex.jsx`)

**`IntegrationConfig`** — `tenantId, provider (e.g. 'sms', 'email', 'payment-gateway'), credentials (encrypted), status` (powers `IntegrationsIndex.jsx`)

**`BroadcastMessage`** — `title, body, audience ('all-tenants'|specific tenantIds[]), sentAt, sentBy` (powers `BroadcastIndex.jsx`)

**`PlatformNotification`** — `recipientTenantId (nullable = all), title, body, read, createdAt`

**`SecuritySession`** — `actorType ('SuperAdmin'|'TenantUser'), actorId, tenantId (nullable), ip, userAgent, loginAt, revokedAt` (powers `SecurityIndex.jsx`, `MonitoringIndex.jsx`)

**`PlatformSetting`** — key/value store for global config (powers `PlatformSettingsIndex.jsx`, `SettingsIndex.jsx`)

### 3.2 Tenant core

**`School`** (one per tenant, the tenant's own view of its profile — maps directly to `shared/data/school.js`)
`tenantId, name, shortName, tagline, address, city, state, pincode, country, phone, email, website, established, affiliation, affiliationNo, academicSession, principalName`

**`AcademicYear`** — `tenantId, label ('2026-2027'), startDate, endDate, isCurrent`

**`ClassSection`** (maps to `shared/data/academicStructure.js`'s `CLASSES`)
`tenantId, name ('Class 10'), section ('A'), stream (nullable — 'Science'|'Commerce'|'Arts'), strength, subjects: [String], classTeacher (ref StaffMember)`

**`Student`** (maps to `shared/data/students.js`)
`tenantId, admissionNo, name, classSection (ref ClassSection), rollNo, photo, dob, gender, phone, email, bloodGroup, address, guardian (ref Guardian), status ('active'|'inactive'|'alumni'), admittedAt`

**`Guardian`** (maps to `shared/data/parents.js`)
`tenantId, name, photo, occupation, email, phone, address, children: [ref Student]`

**`StaffMember`** (maps to `shared/data/staff.js` — covers both Teacher and non-teaching HR-managed staff)
`tenantId, employeeId, name, photo, department, designation, role ('Teacher'|'Non-Teaching'|'Leadership'), classTeacherOf (ref ClassSection, nullable), subjects: [String], classes: [ref ClassSection], email, phone, dob, gender, bloodGroup, address, joiningDate, experience, qualification, emergencyContact { name, relation, phone }, employmentStatus ('active'|'on-leave'|'terminated')`

**`User`** (the actual auth account — decoupled from the profile so one login system serves every role)
`tenantId (nullable for SuperAdmin), role, refId (ref Student|StaffMember|Guardian, nullable for SchoolAdmin-type accounts with no profile doc), username/admissionNo/employeeId, passwordHash, lastLoginAt, mustResetPassword`

### 3.3 Academics

**`Attendance`** — `tenantId, studentId (or staffId), classSection, date, status ('present'|'absent'|'late'|'half-day'|'leave'), remark, markedBy` (powers `StudentAttendance`, `TeacherAttendance`, `ParentAttendance`, `AttendanceMonitoring`, `AttendanceManagement` across 5 modules)

**`Homework`** — `tenantId, classSection, subject, teacher (ref StaffMember), description, dueDate, attachments: [{name, url, size}], submissions: [{ student (ref), submittedAt, status, attachments }]`

**`Timetable`** — `tenantId, classSection, day, periods: [{ period, time, subject, teacher (ref), room, type }]`

**`ExamSchedule`** — `tenantId, examName, classSection, subject, date, startTime, durationMins, maxMarks`

**`ExamResult`** — `tenantId, exam (ref ExamSchedule), student (ref), marksObtained, grade, remarks`

### 3.4 Finance (Accountant module)

**`FeeStructure`** — `tenantId, classSection, academicYear, components: [{ name, amount }], totalAmount`

**`FeeInvoice`** — `tenantId, student (ref), feeStructure (ref), amountDue, amountPaid, dueDate, status ('pending'|'partial'|'paid'|'overdue')`

**`FeePayment`** (a.k.a. Receipt) — `tenantId, invoice (ref), amount, method ('cash'|'card'|'upi'|'bank-transfer'), receiptNo, paidAt, collectedBy (ref StaffMember)` (powers `FeeCollection.jsx`, `ReceiptManagement.jsx`)

**`Installment`** — `tenantId, invoice (ref), installmentNo, amount, dueDate, status` (powers `InstallmentManagement.jsx`)

**`DiscountScholarship`** — `tenantId, student (ref), type, amount/percentage, reason, approvedBy` (powers `DiscountScholarship.jsx`)

**`Refund`** — `tenantId, payment (ref FeePayment), amount, reason, status, processedBy` (powers `RefundManagement.jsx`)

**`LateFeeRule`** — `tenantId, gracePeriodDays, penaltyType ('flat'|'percentage'), penaltyValue` (powers `LateFeeManagement.jsx`)

### 3.5 HR

**`Department`** — `tenantId, name, headOfDept (ref StaffMember)`

**`Designation`** — `tenantId, title, department (ref)`

**`LeaveRequest`** — `tenantId, staff (ref StaffMember), type, startDate, endDate, reason, status ('pending'|'approved'|'rejected'), approvedBy` (also used by `LeaveApproval.jsx` in principal and `LeaveManagement.jsx`/`TeacherLeave.jsx`)

**`PayrollRun`** — `tenantId, month, year, entries: [{ staff (ref), basic, allowances, deductions, netPay, status }]` (powers `PayrollManagement.jsx`)

**`PerformanceReview`** — `tenantId, staff (ref), period, ratings: {...}, reviewer (ref), comments` (powers `PerformanceManagement.jsx`, `TeacherPerformance.jsx`)

**`StaffDocument`** — `tenantId, staff (ref), type, fileUrl, uploadedAt` (powers `DocumentManagement.jsx`)

### 3.6 Library

**`BookCategory`** — `tenantId, name, description`

**`Book`** — `tenantId, isbn, title, author, category (ref), copiesTotal, copiesAvailable, barcode, shelfLocation`

**`BookIssue`** — `tenantId, book (ref), borrower (ref Student|StaffMember), issuedAt, dueDate, returnedAt (nullable), status ('issued'|'returned'|'overdue')`

**`BookReservation`** — `tenantId, book (ref), requestedBy (ref), requestedAt, status`

**`Fine`** — `tenantId, issue (ref BookIssue), amount, reason, paid`

**`LibraryMember`** — `tenantId, person (ref Student|StaffMember), membershipId, joinedAt, status`

### 3.7 Transport

**`Vehicle`** — `tenantId, registrationNo, type, capacity, driver (ref Driver), route (ref Route), status`

**`Driver`** — `tenantId, name, licenseNo, phone, photo, assignedVehicle (ref)`

**`Route`** — `tenantId, name, stops: [ref PickupPoint], vehicle (ref)`

**`PickupPoint`** — `tenantId, name, location {lat, lng}, pickupTime`

**`StudentTransportAssignment`** — `tenantId, student (ref), route (ref), pickupPoint (ref)`

**`VehicleMaintenanceLog`** — `tenantId, vehicle (ref), type, cost, date, notes`

**`FuelLog`** — `tenantId, vehicle (ref), liters, cost, odometer, date`

**`TransportFee`** — `tenantId, student (ref), route (ref), amount, status`

### 3.8 Cross-cutting (shared by many modules)

**`Announcement`** — `tenantId, title, body, audience (roles[] or classSections[]), postedBy, postedAt` (powers every module's `Announcements.jsx`/`Notifications.jsx`)

**`Event`** — `tenantId, title, description, date, location, audience`

**`Message`** / **`Conversation`** — `tenantId, participants: [ref User], messages: [{ sender, body, sentAt, readBy: [] }]`

**`Notification`** — `tenantId, recipient (ref User), title, body, type, read, createdAt`

**`AuditLog`** (tenant-scoped, distinct from `PlatformAuditLog`) — `tenantId, actor (ref User), action, entityType, entityId, before, after, at`

**`Hostel`** / **`RoomAllocation`** — `tenantId, hostelName, rooms: [{ number, capacity }], allocations: [{ student (ref), room, allocatedAt }]`

**`InventoryItem`** — `tenantId, name, category, quantity, unit, reorderLevel`

**`AdmissionApplication`** — `tenantId, applicantName, dob, guardianName, guardianPhone, appliedForClass, status ('pending'|'approved'|'rejected'), documents: []`

**`RolePermission`** — `tenantId, role, permissions: [String]` (powers `RolesAndPermissions.jsx`)

**`Meeting`** — `tenantId, title, attendees: [ref], scheduledAt, notes` (powers `Meetings.jsx`)

---

## 4. API Surface

Convention: `/api/v1/:resource`, standard REST verbs, list endpoints support `?page=&limit=&sort=&search=&filter[field]=` (every `DataTable`-driven page — `EmployeeList`, `BookList`, `VehicleList`, `StudentManagement`, etc. — needs this). All tenant-realm routes require `Authorization: Bearer <JWT>`; tenant scoping is automatic (§2.1), never a query param a client can override.

**Auth**
```
POST   /api/v1/auth/login                 { username, password } → { token, refreshToken, user }
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/platform/auth/login         (super-admin, separate realm)
```

**Academic core**
```
GET    /api/v1/students                    ?classSection=&search=
GET    /api/v1/students/:id
POST   /api/v1/students
PATCH  /api/v1/students/:id
GET    /api/v1/staff                       ?department=&role=
GET    /api/v1/class-sections
GET    /api/v1/guardians/:id/children
```

**Attendance / Homework / Exams**
```
POST   /api/v1/attendance/mark             { classSection, date, entries: [{studentId, status}] }
GET    /api/v1/attendance                  ?studentId=&from=&to=
POST   /api/v1/homework
GET    /api/v1/homework                    ?classSection=&studentId=
POST   /api/v1/homework/:id/submit
GET    /api/v1/timetable/:classSectionId
POST   /api/v1/exams
POST   /api/v1/exams/:id/results
```

**Finance**
```
POST   /api/v1/fees/structures
GET    /api/v1/fees/invoices               ?studentId=&status=
POST   /api/v1/fees/:invoiceId/pay         { amount, method } → generates FeePayment + receipt
POST   /api/v1/fees/:invoiceId/refund
GET    /api/v1/fees/reports/summary
```

**Library**
```
GET    /api/v1/library/books               ?category=&search=
POST   /api/v1/library/issue               { bookId, borrowerId, dueDate }
POST   /api/v1/library/return              { issueId }
POST   /api/v1/library/reservations
GET    /api/v1/library/fines               ?borrowerId=
```

**Transport**
```
GET    /api/v1/transport/vehicles
GET    /api/v1/transport/routes
POST   /api/v1/transport/assignments       { studentId, routeId, pickupPointId }
POST   /api/v1/transport/maintenance-logs
POST   /api/v1/transport/fuel-logs
```

**HR**
```
GET    /api/v1/hr/employees                ?department=&designation=
POST   /api/v1/hr/leave-requests
PATCH  /api/v1/hr/leave-requests/:id/approve
POST   /api/v1/hr/payroll/runs
GET    /api/v1/hr/payroll/runs/:id
```

**Cross-cutting**
```
GET    /api/v1/announcements
POST   /api/v1/announcements
GET    /api/v1/notifications
POST   /api/v1/messages/:conversationId
GET    /api/v1/audit-logs                  ?entityType=&from=&to=
```

**Platform (super-admin only, separate JWT realm)**
```
GET    /api/v1/platform/tenants
POST   /api/v1/platform/tenants                       (onboard a new school)
PATCH  /api/v1/platform/tenants/:id/subscription
GET    /api/v1/platform/revenue/summary
GET    /api/v1/platform/support-tickets
POST   /api/v1/platform/broadcasts
GET    /api/v1/platform/audit-logs
```

---

## 5. Auth & Security

- **Passwords**: bcrypt (cost 12), never returned in any API response.
- **Tokens**: short-lived access JWT (15 min) + long-lived refresh token (7 days, stored hashed, rotated on use).
- **Rate limiting**: `express-rate-limit` on both login endpoints (per-IP + per-username) to blunt credential stuffing.
- **Tenant isolation enforcement**: the Mongoose plugin from §2.1 — this is the single most important security control in the system, since a bug here is a cross-school data leak. Add an automated test (§8) that asserts a JWT for tenant A can never read tenant B's documents, for every collection.
- **Audit logging**: every mutating request on sensitive collections (`FeePayment`, `LeaveRequest` approval, `Student`/`StaffMember` edits, `RolePermission` changes) writes an `AuditLog` entry — this is exactly what the 6+ `AuditLogs.jsx` pages across HR/accountant/librarian/transport/school-admin/principal already render, so it needs to exist from day one of each domain, not bolted on later.
- **CORS**: allow the Vite dev origin (`http://localhost:5173`) and the deployed frontend origin(s) only; credentials mode for cookie-based refresh tokens if chosen over body-based.
- **Input validation**: `zod` or `express-validator` schemas per route, rejecting unknown fields (prevents mass-assignment into e.g. `tenantId` or `role` from a request body).

---

## 6. Delivery Roadmap

Each phase ships a working slice — later phases don't block earlier ones going live.

1. **Scaffolding** — Express app skeleton (`src/{routes,controllers,services,models,middleware,config}`), MongoDB connection via Mongoose, `.env` config (`MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`), centralized error handler, request logger (`morgan`/`pino`), the `tenantScope` plugin skeleton.
2. **Platform layer + auth** — `Tenant`, `SubscriptionPlan`, `SuperAdminUser` models; both login endpoints; RBAC middleware; tenant provisioning endpoint. Unblocks super-admin's `SchoolsIndex`/`TenantsIndex`/`Dashboard`.
3. **Academic core** — `School`, `AcademicYear`, `ClassSection`, `Student`, `Guardian`, `StaffMember`, `User`; seed script (§7) loads the first tenant from `shared/data/*.js`. Unblocks profile/roster pages across all modules.
4. **Academic operations** — `Attendance`, `Homework`, `Timetable`, `ExamSchedule`, `ExamResult`. Unblocks the bulk of Student/Teacher/Parent/Principal/SchoolAdmin dashboards.
5. **Finance domain** — all of §3.4. Unblocks the Accountant module.
6. **HR domain** — all of §3.5. Unblocks the HR module.
7. **Library domain** — all of §3.6. Unblocks the Librarian module.
8. **Transport domain** — all of §3.7. Unblocks the Transport module.
9. **Cross-cutting** — `Announcement`, `Event`, `Message`, `Notification`, tenant `AuditLog`, report/export endpoints. These touch every module's notification bell and reports page.
10. **Platform admin depth** — `Invoice`/`RevenueRecord`, `License`, `SupportTicket`, `BroadcastMessage`, `BackupRecord`, `IntegrationConfig`, `SecuritySession`, `PlatformSetting`. Completes super-admin.
11. **Frontend integration pass** — see §7.

---

## 7. Frontend Integration Plan

- **Shared API client**: create `frontend/src/shared/api/client.js` — a single `axios` instance (already a declared, currently-unused dependency in `frontend/package.json`) with `baseURL` from `import.meta.env.VITE_API_URL`, a request interceptor attaching the stored JWT, and a response interceptor handling 401 → redirect to the relevant module's login. This is the direct payoff of the shared-library consolidation already done this session: one client, all 10 modules import it instead of each rolling its own `fetch` calls.
- **Auth contexts**: each module's `*AuthContext.jsx` (`StudentAuthContext`, `TeacherAuthContext`, …, `SuperAdminAuthContext`) currently fakes `login()` with a `setTimeout` and a hardcoded check against `localStorage`. Replace the body of each `login()` with a call through the shared client to the real endpoint, keeping the same function signature so no page that calls `useXAuth()` needs to change.
- **Data fetching**: replace static imports like `import { MOCK_STUDENTS } from '../../../shared/data/students'` with a fetch through the shared client returning the same shape (`{ id, admissionNo, name, class, section, rollNo, photo, dob, gender, parentName, parentPhone, ... }`) — since the backend model field names in §3 were chosen to match, most consuming components need zero prop-shape changes, only swapping a static import for a `useEffect`/React Query hook.
- **Seed script**: `backend/scripts/seed.js` imports `frontend/src/shared/data/{school,academicStructure,students,staff,parents}.js` directly (they're already plain ESM data files) and inserts them as the first tenant — reusing the name/ID reconciliation work already done (e.g. `STU108902` Aarav Sharma) instead of re-authoring fixtures from scratch.

---

## 8. Testing & Tooling

- **Unit/integration**: Jest + Supertest against an in-memory MongoDB (`mongodb-memory-server`) — no shared test DB, fully parallelizable.
- **Tenant-isolation test suite**: for every tenant-scoped collection, assert a request authenticated as tenant A returns zero results for tenant B's seeded data, and that a direct `_id` lookup across tenants 404s rather than 200s.
- **API collection**: Postman/Thunder Client collection checked into `backend/postman/`, one folder per domain (§4), kept in sync as routes are added.
- **Linting**: ESLint + Prettier matching the frontend's existing config where sensible.

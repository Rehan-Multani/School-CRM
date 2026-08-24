# Application Flow — Every Panel, Who Controls What, and What's Missing

This document maps the entire frontend as it exists today: all 10 role panels, every page in each, who actually controls (writes) each piece of data versus who only views it, which actions are genuinely wired versus cosmetic stubs, and every place one panel's data is supposed to reach another. It is based on a full read-through of all ~185 page files, every routing/sidebar/auth file, and the shared mock-data layer.

**Purpose of this document**: give a ground-truth picture of current behavior so gaps are visible and can be deliberately closed (see §8 "What's missing / to build") rather than discovered by accident later, especially once `backend_plan.md` starts getting implemented.

---

## 1. Architecture Overview

- **10 independent portals**, one per role, each mounted at its own path: `/student`, `/teacher`, `/parent`, `/principal`, `/school-admin`, `/accountant`, `/hr`, `/librarian`, `/transport`, `/super-admin`.
- Each portal has its **own** `AuthContext`, `ThemeContext`, `NotificationContext`, router, sidebar, and (for 9 of the 10) a UI kit that's now shared via `frontend/src/shared/ui/` (re-exported through each module's local `components/ui/*.jsx` — see prior consolidation work). `super-admin` uses Radix UI + `react-hot-toast` instead, a deliberately different, newer stack.
- `frontend/src/App.jsx` mounts **all 9 non-super-admin portals' providers simultaneously** in one nested pyramid, for every route, regardless of which portal is active. `super-admin`'s providers are mounted inline per-route instead (and duplicated once for `/login`, once for `/*`).
- There is **no backend**. Everything is mock data — either static arrays in `data/mockData.js` / `utils/constants.js`, or `useState` seeded from those, or (in a handful of real cross-role cases, see §3) shared `localStorage` keys read by more than one portal.
- **No real authentication anywhere.** Every one of the 10 login forms accepts hardcoded demo credentials, and in the student/teacher/parent portals specifically, the password field isn't even checked — any non-empty value logs you in as the one hardcoded demo identity for that role. There is no password hashing, no token validation, no session expiry, no "wrong password" path that means anything.
- **Identity is unified for the 9 school-facing portals**, not for super-admin. `frontend/src/shared/data/{school,academicStructure,students,staff,parents}.js` is the single canonical source for the school profile, class/section structure, 36-student roster, 22-person staff directory, and 8 parent/guardian records — built and reconciled in an earlier pass specifically so the same "Aarav Sharma / STU108902" (etc.) shows up consistently everywhere. `super-admin` does not participate in this at all (see §7).

---

## 2. Demo Login Credentials (all 10 panels)

| Panel | URL | Username / ID | Password | Validates against |
|---|---|---|---|---|
| Student | `/student/login` | `STU108902` (any non-empty ID actually works) | `password123` (any non-empty value works) | Always resolves to hardcoded `findStudent('STU108902')` |
| Teacher | `/teacher/login` | any non-empty employee ID | any non-empty value | Always resolves to hardcoded `mockTeacher` (Mr. Rajesh Kumar) |
| Parent | `/parent/login` | `rajesh.sharma@gmail.com` (any non-empty value works) | `password123` (any non-empty value works) | Always resolves to hardcoded `MOCK_PARENT` (Rajesh Sharma) |
| Principal | `/principal/login` | `principal` | `principal123` | Real string match (case-insensitive username) |
| School Admin | `/school-admin/login` | `admin` | `admin123` | Real string match |
| Accountant | `/accountant/login` | `accountant` | `accountant123` | Real string match |
| HR | `/hr/login` | `hr` | `hr123` | Real string match |
| Librarian | `/librarian/login` | `librarian` | `lib123` | Real string match, resolves identity via `findStaffByName('Sanjay Kumar')` |
| Transport | `/transport/login` | `transport` | `transport123` | Real string match, resolves identity via `findStaffByName('Manish Dave')` |
| Super Admin | `/super-admin/login` | `superadmin@appzeto.com` | `admin123` + a fake MFA step (`123456`, `000000`, or blank all pass) | Real string match, hardcoded in-component (own island, see §7) |

None of these are validated against a real user database — there isn't one. This is the single biggest gap for any real deployment (see §8).

---

## 3. Cross-Module Real-Time Data Flows (the genuine integrations)

Most of the app is siloed mock data — each page's mutations live in that page's own React state and vanish on refresh. But a specific, deliberate set of features **is** genuinely wired across portals via shared `localStorage` keys (read/written by more than one portal, with a manually-dispatched `storage` event so open tabs update live). These are the parts of the app that actually behave like a connected system today:

| Data | Written by | Read by | localStorage key |
|---|---|---|---|
| **Attendance** | Teacher (`TeacherAttendance` — marks Aarav Sharma / STU108902 only; other students are local-only) | Student (`StudentAttendance`, `StudentDashboard`), Parent (`ParentAttendance`, `ParentDashboard` — only while viewing STU108902) | `school_attendance` |
| **Homework lifecycle** | Teacher (create/publish/evaluate), Student (submit) | Student, Parent (`ParentHomework`, `ParentDashboard` — STU108902 only) | `school_homework` |
| **Exam results (Mathematics only)** | Teacher (`TeacherExamination` "Submit Final" — Aarav Sharma only) | Student (`StudentResults`), Parent (`ParentResults` — STU108902 only) | `school_results` |
| **Student leave requests** | Student (`StudentLeave`), Parent (`ParentLeave`) | Teacher (`TeacherLeave` → "Student Leaves" tab, approves/rejects, writes back) | `school_student_leaves` |
| **Parent↔Teacher messaging** | Student, Teacher, Parent (all three send into the same thread store) | Same three, filtered by `studentId`+`teacherId` | `school_conversations_db` |
| **Notifications (Student/Parent)** | Either portal | **Both** — this is an accidental bug, not a feature (see §8) | `school_notifications` |
| **Teacher's own notifications** | Teacher portal only | Teacher portal only | `teacher_notifications` |

Everything else — fees, transport, hostel, library circulation, timetable, exam schedules (other than the one Mathematics-marks path above), payroll, HR records, all of Accountant/HR/Librarian/Transport's back-office data, all of super-admin — is **not** connected across portals. Each portal's mutations are local `useState`, gone on refresh, invisible to every other portal even when the UI narratively implies a shared record (e.g. a parent "paying a fee" does not reduce what the student portal shows as owed).

---

## 4. Per-Panel Flows

For each panel: who the role is, the navigation structure, and a page-by-page table of **Owner** (who actually controls/writes the data) and **Status** (Real = genuinely mutates state/localStorage and the UI reflects it; Stub = button/form exists but only shows a toast, nothing persists; Read-only = no write action exists on the page at all).

### 4.1 Student Panel (`/student`)

Sidebar groups: Main (Dashboard) · Account (Profile, Downloads, Settings) · Academic (Attendance, Homework, Exams, Results, Academics, Timetable, Leave) · Finance (Fees) · Services (Transport, Hostel, Library) · Communication (Announcements, Events, Notifications, Messages).

| Page | Owner | Status |
|---|---|---|
| Dashboard | — | Read-only overview, all `navigate()` links |
| Profile | Student (self) | Real for text fields (persists to `localStorage['student-user']`); photo/document upload are stubs |
| Attendance | Teacher writes it | Real display of Teacher's marks; calendar grid is decorative/hardcoded; "Download Report" is a stub |
| Homework | Teacher assigns, Student submits | Real (`school_homework`); "Download" attachments are stubs |
| Exams | — | Read-only static schedule; "Download Hall Ticket" is a stub |
| Results | Teacher writes it (Math only) | Real for Math via `school_results`; other subjects static; PDF download is a stub, Print is real (`window.print()`) |
| Academics | — | Read-only syllabus/materials; downloads are stubs |
| Timetable | — | Read-only static |
| Fees | Student (self) | "Pay Online" really flips local installment state, but **not persisted** (lost on refresh) and **not synced** to any other portal's view of the same student's fees |
| Transport | — | Read-only static; "Call Driver" is a real `tel:` link; live map is an explicit disabled placeholder |
| Hostel | — | Read-only static |
| Library | Student (self) | "Renew" really extends due date in memory, lost on refresh |
| Leave | Student (self) | Real — writes `school_student_leaves`, Teacher approves/rejects |
| Announcements | — | Read-only static |
| Events | Student (self) | "Register" is a real in-memory flag flip, no cross-role effect |
| Notifications | Student/Parent (shared bug) | Real mark-read/clear, but shares state with Parent portal (see §8) |
| Messages | Student (self) | Real 3-way chat with Teacher/Parent via `school_conversations_db` |
| Downloads | — | All downloads are stubs |
| Settings | Student (self) | Theme toggle real; password change is a stub |

### 4.2 Teacher Panel (`/teacher`)

Sidebar groups: Main (Dashboard) · Management (My Classes, Attendance, Homework, Examination) · Academic (Academics, Timetable, Student Performance, Leave) · Communication (Messages, Announcements, Events, Notifications) · Account (Profile, Downloads, Settings).

| Page | Owner | Status |
|---|---|---|
| Dashboard | — | Read-only overview |
| Profile | — | Read-only except password tab, which is a stub |
| Classes | — | Read-only roster + student drill-down modal |
| **Attendance** | **Teacher** | Real — the actual write path for `school_attendance` (Aarav Sharma only; other 20 students are local-only, not shared) |
| **Homework** | **Teacher** | Real — full create/publish/delete/evaluate cycle, backed by shared `school_homework` |
| **Examination** | **Teacher** | Real for "Enter Marks" → "Submit Final" (Mathematics, Aarav Sharma only, feeds `school_results`); other students' marks local-only |
| Academics | Teacher (self) | Syllabus chapter-completion toggle is real but in-memory only; "Upload material" and Lesson Plan tab are stubs |
| Timetable | — | Read-only static |
| Performance | — | Read-only; "Export" button has no handler at all |
| Leave (own) | Teacher (self) | **Stub** — "Apply Leave" form never persists (see §8, fragmented leave systems) |
| Leave → "Student Leaves" tab | **Teacher** | Real — approves/rejects, writing back to `school_student_leaves` |
| Messages | Teacher (self) | Real 3-way chat (see §3); two hardcoded Admin/Principal contacts never actually reply |
| Announcements | — | Read-only, no compose action exists at all |
| Events | — | Read-only |
| Notifications | Teacher (self) | Real, isolated to `teacher_notifications` |
| Downloads | — | All stubs |
| Settings | Teacher (self) | Theme toggle real; password change stub |

### 4.3 Parent Panel (`/parent`)

Sidebar groups: Main (Dashboard, My Children) · Academic (Attendance, Homework, Academics, Timetable, Exams, Results, Leave) · Finance (Fees) · Services (Transport, Hostel, Library) · Communication (Messages, Announcements, Events, Notifications) · Account (Student Profile, Downloads, Settings). Unique: an "Active Child" switcher that governs which sibling's data every page displays.

| Page | Owner | Status |
|---|---|---|
| Dashboard | — | Read-only, per-child; homework-pending count has a bug — always shows Aarav's count regardless of which child is selected |
| Children Management / child 
xswitcher | Parent (self) | Real — this is the actual mechanism driving `selectedChildId` |
| Student Profile (child) | — | Explicitly read-only, "managed by administration" banner |
| Attendance | Teacher writes it (Aarav only) | Real for Aarav via `school_attendance`; static fallback for Aanya |
| Homework | Teacher/Student write it (Aarav only) | Real for Aarav via `school_homework`; static fallback for Aanya |
| Academics | — | Read-only static per child |
| Timetable | — | Read-only static; "Today" tab is hardcoded to always show Monday regardless of actual day |
| Exams | — | Read-only static |
| Results | Teacher writes it (Aarav, Math only) | Real for Aarav via `school_results`; static fallback for Aanya |
| Fees | Parent (self) | "Pay Online" really mutates local state but is **not persisted**, **not synced to Student portal's own fee view even for the same child** |
| Transport | — | Read-only; live map is an explicit disabled placeholder |
| Hostel | — | Read-only |
| Library | Parent (self) | "Renew" is a **stub** here (unlike Student's own real renew) |
| Leave | Parent (self) | Real — writes `school_student_leaves`, **not filtered by child** (a leave for either sibling lands in one undifferentiated list) |
| Announcements | — | Read-only, own separate hardcoded array (not shared with Student/Teacher's announcement lists) |
| Events | — | Read-only, own separate hardcoded array; "Calendar" tab is an inert placeholder |
| Notifications | Student/Parent (shared bug) | Real, but shares state with Student portal (see §8) |
| Messages | Parent (self) | Real 3-way chat, filtered to the active child |
| Downloads | — | All stubs |
| Settings | Parent (self) | Theme toggle real; password change stub |

### 4.4 Principal Panel (`/principal`)

Sidebar groups: Main (Dashboard) · Monitoring (Student, Teacher, Academic, Attendance, Examination, Homework) · Management (Leave Approval, Meetings) · Communication (Circulars, Events) · System (Reports, Notifications, Settings).

Principal is a **pure oversight role** — almost nothing here writes data other roles depend on.

| Page | Owner | Status |
|---|---|---|
| Dashboard | — | Read-only KPIs (hardcoded literals, not computed); "Create Circular"/"Schedule Meeting" quick-action modals are stubs; inline leave approve/reject on this page is real but writes to a **separate local state** from the Leave Approval page itself |
| Student Monitoring | — | Read-only directory + analytics |
| Teacher Monitoring | — | Read-only directory + analytics |
| Academic / Attendance / Examination / Homework Monitoring | — | All four are pure read-only aggregation dashboards over independently-seeded numbers, not live rollups from Teacher/School-admin |
| **Leave Approval** | **Principal** | Real — approve/reject mutates local state, appends to a local audit-log clone (own island, not shared with HR's or any other module's audit log) |
| Meetings | Principal (self) | Real — "Schedule New Session" appends to local state |
| Communication (Circulars) | Principal (self) | Real for circular creation (own separate list from School Admin's CommunicationHub); "Direct Messaging" reply is a stub |
| Events | — | Read-only — no create action exists on this page at all (School Admin's equivalent page does have one) |
| Reports | — | Read-only source data, but "Export CSV" is a **real** file download |
| Notifications | Principal (self) | Real mark-read |
| Settings | Principal (self) | Profile save is real (persists to `localStorage['principal-user']`); password change is a stub |

### 4.5 School Admin Panel (`/school-admin`)

Sidebar groups: Main (Dashboard) · Academic (School Config, Academics, Attendance, Exams, Homework Monitor) · People (Student/Teacher Mgmt, Admissions, User Management) · Finance (Fees, HR & Payroll) · Administration (Transport, Hostel, Library, Inventory, Events) · System (Roles & Permissions, Communication, Reports, Audit Logs, Settings).

School Admin is the **broadest write-access role** in the app — most of its 22 pages have real (if session-only) CRUD.

| Page | Owner | Status |
|---|---|---|
| Dashboard | — | Read-only KPIs; quick-actions just navigate |
| School Config | School Admin | Real across all 5 tabs (school info, academic sessions incl. activate/archive, timings, grading, calendar) |
| Academics Management | School Admin | Real "Create Academic Entity" (classes/sections/subjects) and "Assign Teacher"; **Timetable editor is a stub** ("Launch Editor" just toasts) |
| Attendance Management | School Admin | Real status-toggle + bulk-mark, parallel to Teacher's own attendance-marking (separate dataset) |
| Exam Management | School Admin | Real "Create Exam Term", "Assign Invigilator", editable Marks Registry + "Verify & Lock Grades"; **"Publish Results" is a stub** |
| Homework Monitor | — | Read-only |
| **Student Management** | School Admin | Real directory + a genuinely-real bulk "Promotion Planner" (moves a whole class up) and "Graduate Class 12" action |
| **Teacher Management** | School Admin | Real "Allocate Class" action |
| **Admission Management** | School Admin | Real approve/reject/waitlist workflow with auto-generated admission number — **but this does NOT actually add the student into `Student Management`'s roster**; the two are disconnected |
| **User Management** | School Admin | "Create User Account" **is real** (adds a row to the relevant role's local list) but critically **creates no actual login credential** — see §8, this is the biggest single gap: there is no real path from "admin creates a teacher account" to "that teacher can log in." "Reset Password", "Assign Roles/Permissions", and "Bulk Import CSV" are all stubs. |
| Roles & Permissions | School Admin | Real create/delete custom role and real permission-toggle UI, but **"Save Matrix" is a stub and nothing in the app actually reads/enforces this permission matrix** |
| Fee Management | School Admin | Real "Collect Fee Payment" and real refund action, in a dataset **separate from Accountant's own fee-collection pages** |
| HR & Payroll | School Admin | Employee list here is read-only (no add — creation only via User Management); "Release Monthly Salaries" bulk action is real |
| Transport Management | School Admin | Real "Register Vehicle"; Drivers/Routes tabs are view-only |
| Hostel Management | School Admin | Real "Add Room Record" |
| Library Management | School Admin | Real issue/return with genuine stock sync (available copies actually move) — **the most complete circulation logic in the entire app, more complete than the dedicated Librarian module's own BookIssue page** |
| Inventory Management | School Admin | Real "Add Asset Item" |
| Events Management | School Admin | Real "Schedule Campus Event" (unlike Principal's read-only Events page) |
| Communication Hub | School Admin | Real announcement/broadcast-alert logging (separate dataset from Principal's Communication page); chat reply composer is a stub |
| Reports Hub | — | **Every single export button across all 11 report categories is a stub** — no real export exists here at all (contrast with Principal's own Reports page, which does real CSV export) |
| Audit Logs | — | Fully static — none of this module's own real actions (admission approval, payroll release, promotions, etc.) ever write a new row here |
| Settings | School Admin | Theme + notification-preference toggles real; most "Save" buttons are stubs; **"Export JSON Backup" is a real file download** |

### 4.6 Accountant Panel (`/accountant`)

Sidebar groups: Main · Fees · Analysis · System.

| Page | Owner | Status |
|---|---|---|
| Dashboard | — | Read-only, mostly hardcoded stat strings not computed from any dataset |
| **Fee Collection** | Accountant | Fee/discount/late-fine math is real and live, but the **generated receipt is never saved** — it never appears in Receipt Management, never updates the student's balance, and no notification fires |
| Receipt Management | Accountant | Real local table + real "Duplicate Receipt"; "Generate Bulk Receipts" is a stub |
| Installment Management | — | Read-only timeline; "Collect" button is a stub (doesn't even navigate to Fee Collection) |
| Discount / Scholarship | Accountant | Real — new discounts always land as "Pending", nothing auto-approves |
| Late Fee Management | Accountant | Rule list is read display; "Override Mode" toggle is real but doesn't affect any actual calculation |
| Refund Management | Accountant | Real create/approve, but never reconciled back against the original receipt's balance |
| Financial Reports | — | Read-only charts; **real CSV export** |
| Student Financial History | — | Real derived view (filters the module's own arrays by student) — but won't show anything just collected in Fee Collection, per the stub above |
| Notifications | Accountant | Real mark-read; `addNotification` exists on the context but is **never called by any real action** in this module |
| Audit Logs | — | Fully static, disconnected from every real action in this module |
| Settings | Accountant | Profile save real; receipt template + password are stubs |

### 4.7 HR Panel (`/hr`)

Sidebar groups: Main · People · Operations · Analytics · System.

| Page | Owner | Status |
|---|---|---|
| Dashboard | — | Hardcoded stat strings ("35 Staff") that don't match the actual 4-record employee array |
| Employee List | HR | Real filter/deactivate over `MOCK_EMPLOYEES` — **only 4 records**, not the full 22-person shared staff directory |
| Employee Detail | — | Read-only tabbed profile with real cross-referencing of this module's own payroll/attendance/leave/review data |
| **Add/Edit Employee** | HR | **Stub** — the 5-step wizard's final submit never actually adds the employee to the list; it just redirects back after a delay |
| Department Management | HR | Real add/delete |
| Designation Management | HR | Real add/delete |
| Attendance Management | HR | Rebuilds a fresh "everyone present" sheet on every page load — nothing persists between visits; "Monthly Summary" tab shows identical hardcoded numbers for every employee |
| **Leave Management** | HR | Real approve/reject, session-only — **completely separate dataset from Principal's Leave Approval and Teacher's own leave tab** (see §8) |
| Payroll Management | HR | Real bulk "Process Payroll" (flips all rows to Paid) |
| Document Management | HR | "Verify" button is a stub — badge never actually flips; "Download" has no handler |
| Performance Management | HR | Real — add-review form |
| Announcements | HR | Real — own separate list |
| Reports | — | Read-only; real CSV export |
| Audit Logs | — | Fully static, disconnected |
| Notifications | HR | Real mark-read |
| Settings | HR | Profile save real; password stub |

### 4.8 Librarian Panel (`/librarian`)

Sidebar groups: Main · Catalogue · Circulation · Members · System.

| Page | Owner | Status |
|---|---|---|
| Dashboard | — | Genuinely computed stats from the module's own arrays (one of the few modules whose dashboard numbers are real) |
| Book List / Add-Edit Book | Librarian | Real CRUD, session-only |
| Book Detail | — | Read-only with real cross-filtering of issues/reservations |
| Category Management | Librarian | Real add/edit |
| Inventory Management | Librarian | Real stock-adjustment logic |
| **Book Issue** | Librarian | **Stub for persistence** — the confirm step shows a printable slip but never actually decrements the book's available copies or increments the member's issued-book count, despite the wizard enforcing those same limits when selecting book/member |
| Book Return | Librarian | Real — removes from active-loan list, computes/waives fines |
| Book Reservation | Librarian | Real cancel/complete; "Notify Availability" is a stub |
| Fine Management | Librarian | Real collect/waive |
| Member Management | Librarian | Real suspend/activate |
| Reports | — | Read-only; real CSV export |
| Audit Logs | — | Fully static, disconnected |
| Notifications | Librarian | Real mark-read |
| Settings | Librarian | Profile fields are **read-only, no save path exists at all**; circulation/fine rule config is real local state but "Save All Config" is a stub with no downstream effect |

### 4.9 Transport Panel (`/transport`)

Sidebar groups: Main · Fleet · Operations · Service · Finance · Communication · System.

| Page | Owner | Status |
|---|---|---|
| Dashboard | — | Genuinely computed stats (real filters/expiry checks against a fixed reference date) |
| Vehicle / Driver / Route List + Add/Edit | Transport | Real CRUD, session-only |
| Vehicle Detail | — | Read-only with real cross-filtering of maintenance/fuel logs; GPS tab is an explicit static placeholder |
| Pickup Points | Transport | Real add/edit; no real map picker, lat/lng are free-text |
| Student Assignments | Transport | Real — genuine capacity/double-assignment checks against the shared roster; "parent SMS sent" line is a stub, no real notification |
| Maintenance Management | Transport | Real add/complete |
| Fuel Management | Transport | Real add-log |
| **Transport Fee** | — | Explicitly labeled "read-only, collections done by Accountant" — **but no such link actually exists**; this is a stated intent with zero implementation |
| Emergency Management | — | "Report Breakdown" is a full stub — no incident is ever recorded |
| Communication | — | Broadcast form is a full stub — no message is ever logged |
| Reports | — | Read-only; real CSV export |
| Audit Logs | — | Fully static, disconnected |
| Notifications | Transport | Real mark-read |
| Settings | Transport | Both "Update Profile" and "Update Thresholds" are stubs — e.g. the capacity-constraint toggle has no real enforcement in Student Assignments |

### 4.10 Super Admin Panel (`/super-admin`)

Sidebar groups: Platform · Tenant & Storage · Finance & Logs · Operations · Configuration.

This panel is architecturally and narratively **disconnected from the other 9** — see §7 for the full explanation.

| Page | Owner | Status |
|---|---|---|
| Dashboard | — | Read-only stats; "Trigger Backup" and "Global Broadcast" are stubs |
| **Schools (tenant management)** | Super Admin | Real create/suspend/delete/filter — the closest thing to real CRUD in this module, but **memory-only, and its own private copy** (see §7 — other pages don't see schools created here) |
| Subscriptions | Super Admin | Real "Build SaaS Tier"; "Configure Modules" per plan has no handler |
| Licenses | Super Admin | Real generate/suspend |
| Modules (feature flags) | Super Admin | Toggle is real but **shared across all tenants** — selecting a different school in the dropdown doesn't load different flags; "Synchronize" save is a stub |
| Tenants (isolation overview) | — | **Zero interactive elements**, despite the name — pure decorative read-only page |
| Storage | — | Tenant selector is cosmetic — the usage chart doesn't change per tenant; both action buttons are stubs |
| Revenue | Super Admin | Real "Refund" action; "View PDF" has no handler |
| Support | Super Admin | Real ticket selection + "Resolve"; reply composer is a stub |
| Broadcast | — | Full stub, and imports the schools list but never uses it |
| Monitoring | — | Fully fake — hardcoded CPU/RAM numbers that never change; "Refresh" is a spinner-only stub |
| Audit Logs | — | Static, fabricated "412 entries" export claim |
| Backup | Super Admin | Real manual-trigger (appends a row); "Restore" button has no handler at all |
| Security | Super Admin | Real revoke-key / terminate-session |
| Integrations | Super Admin | Real connect/disconnect toggle |
| Platform Settings | — | "Save" is a stub; maintenance-mode toggle is real but has zero effect anywhere else in the app |
| Reports | — | Full stub, no exports work |
| Notifications | — | The one genuinely "live" page — reflects every `addNotification()` call fired by any other page in this module during the session; no mark-all-read control is exposed despite existing on the context |
| Settings (own profile) | — | Stub — edits never actually update the logged-in admin's displayed name |

---

## 5. Cross-Role Dependencies That *Are* Real

- **Attendance / Homework / Exam results (Aarav Sharma only)**: Teacher → Student/Parent, live, via localStorage (§3).
- **Student leave**: Student/Parent → Teacher approval → back to Student/Parent, live (§3).
- **Messaging**: genuine 3-way chat between Student, Teacher, and Parent (§3).
- **Identity consistency**: every school-facing portal (all but super-admin) resolves the same student/staff/parent/school records from `frontend/src/shared/data/`, so names, classes, and relationships are consistent even on pages that don't have live data sync.

## 6. Cross-Role Dependencies That Are *Claimed but Not Wired*

These are places the UI's own copy states or strongly implies a connection to another module, but no such connection exists in code:

- **Transport Fee** page explicitly says fee collection happens in Accountant — no shared record exists.
- **Admissions → Student roster**: approving an admission in School Admin does not add the student to Student Management.
- **User Management → real login**: creating a "teacher" account in School Admin's User Management does not create anything the Teacher login screen can authenticate against.
- **Roles & Permissions**: the permission matrix is fully editable but read/enforced nowhere else in the app.
- **Every module's Audit Logs page**: none of them receive entries from the real actions taken elsewhere in that same module during a session.
- **HR / Principal / Teacher leave management**: three separate, non-interoperating mock datasets for staff leave (not to be confused with the real, shared *student*-leave flow in §3).
- **Fee Collection (Accountant) vs. Student/Parent Fees vs. School Admin Fee Management**: three separate fee datasets for the same students, none reconciled.
- **Library circulation**: School Admin's own Library Management page has a *more complete* real issue/return-with-stock-sync implementation than the dedicated Librarian module's Book Issue page (which is a stub for persistence).

## 7. Super Admin Is a Disconnected Island

Confirmed directly in code: `frontend/src/modules/super-admin/data/mockData.js` defines five fictional tenant schools (St. Xavier's Academy, Greenwood High School, Oakridge International, Beaconhouse School System, Springdales School). `frontend/src/shared/data/school.js` — the school every other one of the 9 portals actually represents — is **Greenfield Public School**. There is no shared ID, no cross-import, and no code path connecting them. Even within the super-admin module itself, `mockSchools` is imported independently by SchoolsIndex, ModulesIndex, StorageIndex, and TenantsIndex, each holding its **own private copy** — so creating a school in one of those pages doesn't appear in the others. Auth is separate too (`localStorage['super_admin_user']`, its own hardcoded credentials, unrelated to the other 9 portals' sessions).

If the product intent (per `backend_plan.md`) is a real multi-tenant SaaS where Greenfield Public School is *one* of the tenants super-admin manages, this island needs to be bridged — today it's presentational only.

---

## 8. What's Missing / To Build

Ranked roughly by how foundational the gap is — earlier items block more of the app.

1. **Real authentication.** Nothing currently validates a real credential; the student/teacher/parent portals don't even check the password field. This is the top prerequisite for `backend_plan.md`'s auth work (§2/§5 of that document already covers the design).
2. **A real "create an account" path.** School Admin's User Management *looks* like it provisions logins but creates no credential at all. There is currently no way, anywhere in the app, for an admin action to result in someone being able to log in as a new teacher/accountant/etc. — every login is pre-seeded and fixed.
3. **Unify the three fee datasets** (Accountant Fee Collection, Student/Parent Fees, School Admin Fee Management) into one source of truth per student, so a payment recorded anywhere is reflected everywhere.
4. **Unify the three staff-leave datasets** (HR, Principal, Teacher-self) — currently a teacher's own leave application goes nowhere, and HR/Principal approve against entirely separate, disconnected lists.
5. **Connect Admissions → Student roster** so an approved application actually becomes a student record other modules see.
6. **Make Audit Logs real** across all six modules that have one (Accountant, HR, Librarian, Transport, School Admin, and Principal's own separate clone) — currently every one of them is static and none receive entries from real actions in the same module.
7. **Fix the Student/Parent notification bug** — they currently share one unscoped `localStorage` key, so clearing notifications in one portal silently clears the other's.
8. **Decide what to do with Timetable creation and "Publish Results"** — both are UI stubs today (School Admin's "Launch Editor" and the Publish Results buttons on both School Admin and Principal). Real timetable data exists nowhere; it's static per portal.
9. **Fix Book Issue's stock sync** in the dedicated Librarian module (School Admin's own Library Management page already does this correctly and can serve as the reference implementation).
10. **Either build or remove the Roles & Permissions enforcement** — right now it's fully editable UI with no effect anywhere.
11. **Bridge or intentionally separate Super Admin's tenant model** from the real school data, depending on whether the product is actually going multi-tenant now (per `backend_plan.md`) or the super-admin module is aspirational/future scope.
12. **Reconcile HR's employee directory** (4 records) with the shared 22-person staff directory (`shared/data/staff.js`) so HR's own dashboard numbers aren't fictional relative to its own data.
13. Numerous smaller stub actions (documented per-panel above) — file downloads, PDF/print generation, email/SMS dispatch, bulk CSV import, password change — are cosmetic across almost every module and can be prioritized once the structural gaps above are addressed.

This list is the natural starting backlog once backend work (per `backend_plan.md`) begins: each gap above corresponds to a real endpoint/data-model decision that the backend plan's domains (§3 of that document) already anticipate.

# End-to-end completeness audit — 2026-10-08

Scope: 5 APK roles (Principal, Teacher, Student, Parent, Transport Manager) + 6 web panels (Super Admin, School Admin, Accountant, Librarian, Principal, HR). Method: every UI call mapped to its route/controller/service, money + attendance + exam math read line by line, full backend vitest run. Read-only; nothing was changed.

Test run: 416 passed, 2 failed, 50 skipped (after re-run with longer timeouts; first run's 32 failures were mongodb-memory-server timeouts under load).
- `appSession.test.js` 2 failures: test expects 4 force-logout roles, code now has 5 (PRINCIPAL added). Stale test, not a product bug.
- `SAFE_PICKUP_OTP_MODE=static` refused in production config check (one suite).

---

## 0. Production entry (`backend/api/index.js`) — BLOCKERS

The cPanel/Passenger entry does not include things that only exist in `platform-service/src/app.js` / `server.js`:
1. **No Razorpay webhook route** (`/webhooks/razorpay` only in `app.js:48`). In prod, subscription activation/renewal and parent fee reconcile via webhook never run.
2. **No subscription cron** (`startSubscriptionCronJobs` only in `server.js:85`): expiry, grace→expired, pending downgrade, reminders, webhook retry never run.
3. **No `TZ=Asia/Kolkata` pin** (`config/timezone.js` imported only by `app.js:1`). On a UTC host, transport pickup marking before 05:30 IST is rejected as "future date"; dashboard "today" is wrong 00:00–05:30 IST.
4. No `securityHeaders` middleware.

---

## 1. Fees / Finance / Payments — BLOCKERS + MAJOR

**Blockers**
- **Fee assignment step has no UI anywhere.** `generateInvoice` (`fee.service.js:702`) throws "No active fee components assigned" unless `StudentFeeAssignment` rows exist; `autoAssignStudentFees` / `createStudentFeeAssignment` are in `client.js` but no page calls them; student creation does not auto-assign. Structure → invoice → collect is unreachable from the web for new students.
- **Three payment paths, one ledger.** Only `feePayment.service.collectPayment` (assignment-based, admin `/fees/collect`) creates `Receipt` + `FinanceTransaction`. Accountant `fee.service.payInvoice` (`:748-796`) and parent Razorpay `reconcileFromRazorpay` (`parentFeePayment.service.js:170-215`) create only `FeePayment`. Also `collectPayment` writes `status:'SUCCESS'` while every accountant aggregation filters `status:'COMPLETED'` → admin-collected money is invisible to accountant dashboard/reports.
- **Receipt/invoice/expense numbers = `countDocuments()+1`** (`fee.repository.js:387-392, 453-458`, `expense.repository.js:64-68`). Not atomic → duplicates; `FeePayment.receiptNumber` has no unique index so duplicates are stored silently; numbers go backwards after deletes. Online receipts are random `RCPT-<base36>`.
- **Overpayment possible**: webhook reconcile never checks amount vs current balance (cash collected while parent is paying → paid 10,000 on a 5,000 invoice). `payInvoice` is a non-atomic read-modify-write (two concurrent 3,000 payments on 5,000 balance both pass).
- **`collectPayment` throws for auto-assigned fees**: dereferences `assignment.academicYearId._id` / `classId._id` (`feePayment.service.js:114-115`), which auto-assigned rows never set.

**Major**
- Installments not modeled: `frequency`/`dueDay` stored, never used; MONTHLY item of 2,000 billed in full per free-text `periodLabel`; "April" vs "Apr" bills twice. Accountant "Installments" page is just the invoice list.
- No late fee / fine engine; `fineAmount: 0` hard-coded; invoice status never becomes OVERDUE (app shows PENDING; dashboard labels it "Overdue Balance").
- No refund / cancel / reversal flow anywhere (`/accountant/refunds` redirects to transactions).
- Transport fee and hostel fee are standalone yearly amounts, never billed into invoices; parent Pay Now never includes them.
- `autoAssignStudentFees` twice doubles every due (no unique index on student+item).
- `createStudentFeeAssignment` writes rows without `enrollmentId`/`feeHeadId` → never picked by `generateInvoice`; charges optional heads to everyone.
- 100% discount: `getPayableAmount` treats `finalAmount 0` as unset.
- `updateStatus` drops ACTIVE after first payment → `generateInvoice` excludes any assignment with a payment.
- Discount model + repo methods are dead code.
- `order.paid` fallback records `order_…` as `gatewayPaymentId` → a later `payment.captured` double-credits.
- Student app fee summary includes CANCELLED invoices (`studentFee.service.js:22-40`); accountant excludes them.

**Calculation/date**
- Manual path no rounding (`1000.3000000000001`), webhook path rounds → paths disagree.
- Percent discount rounds to whole rupees.
- KPIs use server-local day, daily series buckets in UTC; `dateTo` = midnight UTC excludes the whole last day in every list/report.
- Expense totals include REJECTED/PENDING/UNPAID; Net Position overstated.
- No academic-year scoping on dashboard/class-wise/payment-method reports.
- Dashboard: `status: 'PARTIAL'` filter but enum is `PARTIALLY_PAID` → pending-fees KPI omits part-paid invoices; FeePayment summed without status filter (REFUNDED/FAILED counted); uses `createdAt` not `paymentDate`.
- Accountant dues/installments status filter applied after pagination.

---

## 2. School Admin web — BLOCKER + MAJOR

- **BLOCKER (security)** `POST /school-portal/users/seed` (routes:795, `requirePrincipal`) runs `seedStaffUsers` across `School.find({})` → creates ACTIVE staff in every school with `Password@123`. `user.service.js:60` defaults missing password to `Password@123`. HR login builds unescaped RegExp from identifier and falls back cross-school for alias "hr" (`hr.controller.js:44-50`).
- **BLOCKER** Roles & Permissions is cosmetic: 26 of ~445 routes use `requirePermission`, all behind `requireSchoolAdmin`, and it always passes SchoolAdmin; staff middlewares never call it; role dropdown always blank (`toPublicJSON` omits `roleId`).
- MAJOR Events "Cancel/Reinstate" → `PATCH /events/:id/cancel` has no route (controller exists) → 404.
- MAJOR Timetable editor missing (backend CRUD exists, no page); `SectionDetail.jsx` shows "coming soon" for Students/Timetable/Attendance/Exams tabs (web admin and web principal).
- MAJOR No promote / transfer / bulk CSV import; editing year/class overwrites enrollment in place (history lost).
- MAJOR Admissions: `update` never called; Approve disabled until class assigned "via edit" → applications without class can never be approved; legacy `parentPhone '0000000000'` fails validation.
- MAJOR "Send credentials" sends nothing (only stamps `credentialsSentAt`).
- MAJOR Dashboard: staff attendance KPI always 0% (`StaffAttendance.findOne().records` doesn't exist); `weeklyAttendance/monthlyFeeTrend/examPerformance` hard-coded `[]` so charts always empty (web + principal app); hard-coded "+5.4%", 78%/42%/65% bars, "₹0k" for small amounts.
- MINOR Principal can create PRINCIPAL accounts and reset any staff password; impersonation `imp` claim never read; HR/Accountant/Librarian JWTs lack `tv` so password reset doesn't end their sessions; audit log written by only 26 controllers (fee/hostel/transport/student/exam/library/settings write none); library circulation + finance endpoints have no admin UI; duplicate fee route registrations.

---

## 3. HR + Payroll — BLOCKERS

- **BLOCKER** `PayrollManagement.jsx:172` calls `hrApi.disbursePayroll`, which does not exist in `client.js` → TypeError; single-record disburse is dead (only release-all works).
- **BLOCKER** UI sends `month`, backend reads `payload.payrollMonth` (`payroll.service.js:49`) → every payroll stored under the current month; September run in October overwrites October.
- MAJOR No month lock: re-post overwrites PAID records; delete allowed on PAID.
- MAJOR Teacher snapshot reads nested fields that the flat `Teacher` model doesn't have → every teacher shown as "Teacher / Academic", mislabeled STAFF, bank details never auto-filled.
- MAJOR Salary entirely client-typed: no PF/ESI/TDS, no pro-rata, no LOP from attendance/unpaid leave; `HRSettings.absentDeductionPerDay/lateFineAmount` unused; `netSalary` clamps to 0 silently.
- MAJOR Leave: no quota/balance enforcement, no overlap check, `totalDays` from client, no half-day, not written to attendance or payroll. Balance card reads wrong keys → always shows 12/10/15 fallbacks.
- MAJOR Payroll PAID creates no expense `FinanceTransaction` → accountant never sees salaries.
- MINOR Unmarked staff default to PRESENT with fake clock times; payroll report sums CANCELLED/ON_HOLD; months sorted lexically; attendance % denominator = recorded days.

---

## 4. Librarian — mostly complete

Complete: category → book/copies → members → issue (atomic claim, max-books, overdue block) → reservation → return → fine → reports.
- MAJOR Fine PAID never creates `FinanceTransaction`/Receipt → accountant never sees library fines.
- MINOR Grace period bug: fine condition uses due+grace but days counted from due (grace 3, 4 days late → charged 4 days, expected 1). Same logic duplicated client-side.
- MINOR `fulfillReservation` bypasses max-books/overdue checks; `expiresAt` never enforced; lost/damaged uses catalog price not copy price.

---

## 5. Super Admin + Subscription billing

Complete: school create + admin email, plans, assign subscription, Razorpay lifecycle webhooks, 3-tier invoice auto-generation, gate, cron (dev only, see §0), reports, support, FAQ/legal, app version, force logout, login-as. All UI calls have routes.
- MAJOR Plan limits (students/teachers/staff) stored, never enforced; `requireFeature()` used by zero routes → module gating is UI-only.
- MAJOR No GST/tax computation; no local proration.
- MAJOR `deriveState` returns `active` regardless of `currentPeriodEnd` → lost renewal webhook = entitled forever (and no cron in prod).
- MAJOR `adminOverride('force_status')` unreachable; `extend` doesn't clear `cancelAtPeriodEnd`.
- MAJOR Super Admin UI has no invoice pay/refund/cancel, change-plan, override, history screens (routes exist).
- CALC Invoice numbering: string sort breaks at seq 10000, non-atomic; `markPaid` renews from `paidAt` not previous `endsAt` (school loses days); `planEndDate` month overflow (31 Jan +1 → 3 Mar); upgrade/downgrade decided by price only (ignores interval); `stats().totalAmount` sums Refunded/Cancelled; two different "MRR" numbers (dashboard vs reports) can disagree.
- MINOR EXEMPT_PATHS lets expired school POST notifications; manual `POST /billings` still exposed; gender ratio counts all statuses vs ACTIVE total.

---

## 6. APK — Student + Parent

Complete: OTP login (tested), forgot password, force-logout, attendance, timetable, homework submit, exams/results (math verified correct), leaves, notices/events/notifications, profile, parent child-switch via `resolveChild` chokepoint, Pay Now (paise, HMAC, idempotent webhook, partial payment).
- MAJOR No transport screen/API for student or parent (parent cannot see child's route/stop/pickup status; `transport: true` notification pref is never sent).
- MAJOR Online payments bypass Receipt/FinanceTransaction (see §1).
- BLOCKER (release) SMS is mock-only → OTP login cannot work in prod.
- MINOR CANCELLED invoices counted in summary; min-amount mismatch (app ≥₹1, backend >0, Razorpay 502 below 100 paise); fee history shows FAILED/REFUNDED payments.

## 7. APK — Teacher + Principal

Complete: teacher login/dashboard, attendance (locks, future-date guard), homework/assignments + grading, marks (validation, publish lock), timetable, leaves, materials, safe-pickup, office messaging, forgot password. Principal app has full parity with principal web (all 16 modules).
- BLOCKER Principal forgot-password impossible: app offers PRINCIPAL, backend `PASSWORD_RESET_ROLES` lacks it → 400. Web principal forgot-password is a fake setTimeout.
- MAJOR Dashboard charts permanently empty (see §2).
- MAJOR Homework "Pending Eval"/GRADED never progresses: no homework-grade endpoint; `evaluatedCount` only set by admin manual payload.
- MAJOR Meetings: create does not invite/notify anyone; no meeting route in teacher/student/parent app.
- MINOR No parent chat anywhere; principal cannot see teacher office threads.
- CALC Exam results: ABSENT in all subjects → PASS with 0%; missing marks row treated as PRESENT 0 (calculating early fails everyone); EXEMPTED still adds maxMarks; ranks skip numbers for FAIL and no tie handling; `passingMarks 0` falls back to 33; grading scheme hard-coded; no "calculated before publish" check.

## 8. APK — Transport Manager

Complete: login, overview/day stepper, route run, mark pickup/drop/undo, fleet, profile; admin web vehicle→driver→route→stops→assign→yearly fee→Daily Status; safe-pickup end to end across admin/principal/teacher/parent.
- BLOCKER (prod) timezone pin missing (see §0).
- MAJOR Parent has no transport surface; transport fee not billed (see §1).
- MAJOR Dead old-module UI: web student portal `StudentTransport.jsx` renders hard-coded mock bus data + "GPS tracking" text; landing site still advertises Live GPS Bus Tracking.
- MINOR Orphan driver API (no client); capacity check non-atomic (last-seat race); stop times not validated against order; mid-day route move leaves daily-status row pointing at old route; admin transport routes lack `requirePermission`.

---

## 9. Test coverage gaps (backend/**/*.test.js, 56 files)

No tests at all for: fee heads/structures/assignments/invoices/payInvoice/collectPayment/receipt numbering, accountant dashboard/reports, expenses, Razorpay signature verify + every webhook event, billing (invoice numbering, markPaid, refund), all 7 cron jobs, changePlan/override, plan limits, school create → admin login, dashboard KPI math, exams calculate/publish/rank logic, admissions approval, students CRUD, users/roles/requirePermission, events, communication, inventory, library (entire module), HR/payroll/leave/staff attendance (entire module), audit logs, settings/branding, timetable, meetings, principal (effectively zero), transport admin daily-status + capacity race. No frontend tests.

## 10. Fix status (updated 2026-10-08, same day)

**Done — Phase 1 (production + security)**
- `backend/api/index.js`: timezone pin, security headers, mutation rate limit, raw-body Razorpay webhook (all URL prefixes), 1mb JSON, JWT-gated uploads, subscription cron started after DB connect.
- `POST /school-portal/users/seed` removed (route, controller, client fn). HR login: regex escaped, cross-school alias fallback removed. `user.service` no longer defaults a missing password to `Password@123`.
- PRINCIPAL added to OTP password-reset roles; web Principal login now has the real 3-step OTP reset (was a fake setTimeout).
- Stale force-logout test updated for 5 app roles.

**Done — Phase 2 (fee ledger)**
- New `services/feeLedger.service.js`: single `recordPayment` used by accountant payInvoice, admin assignment collect, and the parent Razorpay webhook. Always writes FeePayment (COMPLETED) + Receipt + FinanceTransaction; atomic balance guard (no overpayment / double collection); gateway excess stored as `overpaidAmount` for refund; compensation on failure.
- `models/Counter.js`: atomic per-school sequences for receipt / invoice / expense numbers (seeded from existing max). Unique partial indexes on `FeePayment.receiptNumber` and `StudentFeeAssignment (student, item)`.
- Students are auto-assigned the class fee structure on creation and on class/year change; `generateInvoice` self-heals students with no assignments; bills remaining per assignment; 2-dp rounding; percent discount rounds to paise; 100% discount honoured.
- Dashboard: `PARTIALLY_PAID` enum, COMPLETED-only sums by paymentDate, staff attendance from per-employee rows, real weekly attendance / monthly fee / exam performance charts. Reports: completed payments only. Accountant + finance `dateTo` now includes the whole day.
- New test `test/fee.ledger.test.js` (9 cases) — passes.

**Done — Phase 3 (broken buttons / calculations)**
- Events cancel/reinstate route registered.
- HR: `disbursePayroll` client fn, `payrollMonth` field honoured, PAID month lock (create/delete), teacher snapshot reads flat Teacher fields + correct employeeType, leave balance card keys, server-side `totalDays` + overlap check.
- Exams: missing marks block calculation; ABSENT = failed subject; EXEMPTED/MEDICAL excluded from max; `passingMarks 0` honoured; dense competition ranks; publish requires calculated results.
- Library: grace-period fine counts from end of grace (server + client preview); `fulfillReservation` applies max-books/overdue checks.
- School-admin dashboard: hardcoded trend/progress values replaced with real ratios.

**Done — Phase 4 (ledger linkage)**
- New `services/ledgerLinkage.service.js`. Payroll PAID (create, status PATCH, release-all) → one `Expense` row (category Salary, EXP-number) + FinanceTransaction EXPENSE, idempotent per payroll. Library fine PAID (on return, or later via fine PATCH) → FinanceTransaction INCOME (category Library Fines), idempotent per issue.
- Accountant transactions now union FeePayment + other INCOME ledger rows (`OTHER_INCOME`, with detail view) + expenses, so salaries and fines are visible; salary rows also feed the accountant expense totals. Test `test/ledger.linkage.test.js`.

**Done — Phase 5 (2026-10-08, same day)**
- Fees: `models/FeeSettings.js` + `services/feeSchedule.service.js` — per-school late-fee policy (NONE/FLAT/PER_DAY, grace days, cap), daily cron 01:30 + manual "Apply late fees now" (admin + accountant), invoices flip to OVERDUE with a "Late Fee" line; installment schedule (`POST /fees/invoices/schedule`, accountant `/invoices/schedule`): structure item `amount` is per period, MONTHLY ×12 / QUARTERLY ×4 / HALF_YEARLY ×2 / YEARLY ×1 across the academic year, idempotent, supplementary invoice for components added mid-year; transport route / hostel bed assignment creates a YEARLY fee component (`StudentFeeAssignment.source` TRANSPORT|HOSTEL) that invoices and the schedule bill; refund / cancel (`POST /fees/payments/:id/refund`, accountant `/receipts/:id/refund`): partial or full, overpaid portion first, invoice balance reopened, receipt VOID on full, "Fee Refunds" / "Fee Payment Reversal" expense rows. Web: schedule buttons, Fee Policy settings tab (admin + accountant), installment/late-fee columns, Refund/Cancel actions + VOID receipts, /refunds page. Tests: fee.schedule (6), fee.refund (3).
- Students: `services/studentLifecycle.service.js` — year-end promotion wizard (old enrollment PROMOTED, new ACTIVE, roll numbers, capacity check, next-year fees auto-assigned), transfer / withdraw with TC (blocked by pending fees unless forced, reactivate, printable TC), CSV import (template, dry run, per-row results). Admissions edit modal + approve fix. Test: student.lifecycle (14).
- Timetable: `PUT /school-portal/timetable/sections/:sectionId` grid save with teacher-clash 409; admin editor page + nav; read-only grid in admin + principal SectionDetail. Test: timetable.admin (6).
- Super Admin: `services/planLimits.service.js` enforced on student/teacher/staff creation (403 PLAN_LIMIT_REACHED) + usage endpoints and "used/limit" on Schools list; GST (`PlatformSetting.taxPercent`, plan override, subtotal/tax/total on invoices + print); invoice actions (view, mark paid, cancel, refund) and subscription actions (change plan now/at period end, override extend/grace/force status, history). Test: subscription.plan-limits-tax.
- App: parent + student Transport screen (route, stop, driver call, today's pickup/drop, history) via `services/studentTransport.service.js`. Test: parent.transport (7).
- Roles & Permissions page removed (backend never enforced it). Leftovers fixed: saveMarks passingMarks 0, web student mock transport page, landing GPS copy.

**Still open / decisions**
- Roles & Permissions backend enforcement (page removed instead).
- `requireFeature` module gating still unused.
- Accountant collection KPIs are gross (refunds appear as expenses, not netted from collection).
- Subscription tier-3 local invoices show plan price + GST, which may differ from what Razorpay actually captured if the Razorpay plan was created without tax.

## 10a. Original suggested fix order

1. `api/index.js`: mount webhook, start cron, import timezone, add security headers.
2. Fee: auto-assign on enrollment (or an assignment UI); unify the 3 payment paths into one that writes FeePayment + Receipt + FinanceTransaction atomically with a counter-based receipt number; fix SUCCESS/COMPLETED; amount-vs-balance check in reconcile; dashboard `PARTIALLY_PAID`.
3. Security: remove/restrict `users/seed`; fix HR login regex + cross-school fallback; drop `Password@123` default; add PRINCIPAL to password reset.
4. HR payroll: add `disbursePayroll` client fn; send `payrollMonth`; month lock.
5. Events cancel route; homework grade endpoint; meetings notify; dashboard charts aggregation.
6. Decide scope: installments/late fee, promote/transfer, timetable editor, roles enforcement, parent transport screen, transport/hostel fee billing, GST on subscription invoices.

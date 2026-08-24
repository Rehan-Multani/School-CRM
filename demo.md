# 🏫 Greenfield Public School Management System — Client Demo Script & Manual Walkthrough

A comprehensive step-by-step guide to conducting a live frontend demonstration of the School Management System across all 10 role portals.

---

## 🌟 Demo Overview & Key Value Propositions

| Highlight | Description |
| :--- | :--- |
| **10 Dedicated Role Portals** | Student, Teacher, Parent, School Admin, Principal, Accountant, HR, Librarian, Transport, Super Admin. |
| **Real-Time Cross-Module Coordination** | Actions in one portal (e.g. paying fees, admitting students, entering marks, issuing books) instantly update all related portals and ledgers. |
| **Universal Single Sign-On** | Central login (`/login`) supporting Email, Mobile, Student ID, or Employee ID with role auto-detection. |
| **Global Demo Switcher** | Floating bottom bar allowing 1-click jumps between all 10 role dashboards with active identity sync. |
| **Official Document Exports** | Printable Report Cards, Fee Receipts, Payslips, Student ID Cards, and 11 CSV/JSON export categories. |

---

## 🚀 Step 0: Starting the Application

Open your terminal in the `frontend` folder and run:
```bash
cd frontend
npm run dev
```
Open **`http://localhost:5173/login`** in your browser.

> [!TIP]
> Use the **Floating Demo Bar** at the bottom of the screen at any time to instantly switch roles without re-typing passwords!

---

## 🎭 Scenario 1: Universal Login & Role Switcher (FRD §6 & §27)

### Goal: Demonstrate multi-identifier login and 1-click role jumping.

1. **Visit `/login`**:
   - Point out the clean institutional interface with school affiliation details.
   - Show the quick **1-Click Demo Login Chips** for all 10 roles at the bottom of the login card.
2. **Test Multi-Identifier Login**:
   - **Student Login**: Username: `STU108902` | Password: `password123` *(Redirects to Student Portal)*.
   - **Teacher Login**: Username: `rajesh.kumar@greenfield.edu` | Password: `password123` *(Redirects to Teacher Portal)*.
   - **School Admin Login**: Username: `admin@greenfield.edu` | Password: `password123` *(Redirects to Admin Portal)*.
3. **Demonstrate Forgot Password (OTP Verification)**:
   - Click **"Forgot Password?"**. Enter email `aarav.sharma@greenfield.edu`.
   - Click **"Send Verification Code"** → Enter OTP `749201` → Set new password → Verify successful reset.
4. **Demonstrate Unified Demo Bar**:
   - Notice the floating bottom toolbar. Click any role icon (e.g., **Accountant**, **Librarian**, **Super Admin**) to jump straight to that dashboard.

---

## 🎭 Scenario 2: Admission Approval to Active Student Roster (FRD §7)

### Goal: Show how approving an applicant auto-generates credentials and populates all school modules.

1. **In School Admin Portal** (`/school-admin/admissions`):
   - Navigate to **Admissions → Pending Review** tab.
   - Click **"Review"** on candidate **"Rohan Sen"** (applying for Class 10).
   - Review uploaded documents (TC, Birth Certificate, Marksheets).
   - Click **"Approve Admission & Create Record"**.
2. **Observe the Propagation**:
   - Notice that an official Student ID (`STUxxxx`) and Admission Number (`ADM-2026-xxxx`) are generated.
   - Click **"ID Card"** to preview and print Rohan's official ID badge.
3. **Verify in Other Portals**:
   - Go to **School Admin → Students Directory** (`/school-admin/students`) → Rohan is now listed as an active enrolled student.
   - Switch to **Teacher Portal → Attendance** (`/teacher/attendance`) → Rohan is automatically on the class roll-call.
   - Switch to **Accountant Portal → Fee Collection** (`/accountant/fee-collection`) → Rohan now has an institutional tuition ledger account.

---

## 🎭 Scenario 3: Fee Payment, Online Gateway & Receipt Issuance (FRD §11)

### Goal: Demonstrate tuition fee collection with real-time balance deductions and printable receipts.

1. **In Student / Parent Portal** (`/student/fees` or `/parent/fees`):
   - View the **Tuition Fee Installments** breakdown.
   - Click **"Pay Online"** on an unpaid term installment.
   - Choose **UPI / Net Banking / Card** → Click **"Confirm & Pay"**.
   - Notice the instant success state and click **"View Receipt"** to view the formatted institutional fee receipt.
2. **Verify in Accountant Portal** (`/accountant/receipts`):
   - Switch to **Accountant** using the demo bar.
   - Navigate to **Receipts Management**.
   - Notice the new receipt (`RCT-2026-xxxx`) is listed with timestamp, payment channel, and student info.
   - Click **"Print PDF"** to display the official printable receipt with school header and signatures.
3. **Counter Collection Desk**:
   - Navigate to **Accountant → Fee Collection Desk** (`/accountant/fee-collection`).
   - Select any student (e.g. *Diya Patel* or *Kabir Verma*).
   - Collect partial or full cash/cheque fee → Click **"Collect & Issue Official Receipt"** → Watch dues update instantly.

---

## 🎭 Scenario 4: Teacher Grading & Official Report Cards (FRD §10)

### Goal: Show end-to-end examination management from teacher marks entry to published student report cards.

1. **In Teacher Portal** (`/teacher/examination`):
   - Navigate to **Enter & Verify Marks** tab.
   - Select **Unit Test 1** and subject **Mathematics**.
   - Update scores for students (e.g. *Aarav Sharma: 48/50*, *Diya Patel: 47/50*).
   - Click **"Submit Final Evaluations"**.
2. **In School Admin Portal** (`/school-admin/exams`):
   - Switch to **School Admin → Exam Management**.
   - Under **Marks Verification Registry**, review the scores submitted by subject faculty.
   - Click **"Publish Results"** on Unit Test 1.
3. **Verify in Student & Parent Portals** (`/student/results` or `/parent/results`):
   - Switch to **Student** or **Parent** portal.
   - Notice the published results banner, GPA calculation (**9.6 GPA / 94.5%**), class rank, and faculty remarks.
   - Click **"Print Official Report Card"** to generate the CBSE-standard formatted report card.

---

## 🎭 Scenario 5: Attendance Roll-Call & Staff Leave Hierarchy (FRD §9, §16)

### Goal: Demonstrate daily student roll-calls and two-tier faculty leave approvals.

1. **In Teacher Portal** (`/teacher/attendance`):
   - Mark students as **Present**, **Late**, **Absent**, or **Half Day**.
   - Click **"Save & Publish"**.
   - Switch to **Student → Attendance** (`/student/attendance`) → The calendar reflects the updated status.
2. **Faculty Leave Application & Principal Approval**:
   - In **Teacher Portal → Leave** (`/teacher/leave`), click **"Apply Faculty Leave"**.
   - Select *Casual Leave*, choose dates, enter reason, and click **"Submit Application"**.
   - Switch to **Principal Portal → Leave Approvals** (`/principal/leave`).
   - Click **"Approve"** on the teacher's request.
   - Switch back to **Teacher Portal → Leave Balance** → Notice the casual leave days balance has been deducted.

---

## 🎭 Scenario 6: Library Circulation & Real-Time Stock Tracking (FRD §12)

### Goal: Show book issuing, stock count decrements, and return check-ins.

1. **In Librarian Portal** (`/librarian/issue`):
   - Follow the 3-step wizard:
     - **Step 1**: Select student member (*Aarav Sharma*).
     - **Step 2**: Select book (*"Advanced Calculus - Vol II"*, Available: 5 copies).
     - **Step 3**: Set return due date → Click **"Issue Book & Print Circulation Slip"**.
   - The available stock drops from 5 to 4 copies.
2. **Verify in Student Library** (`/student/library`):
   - Switch to **Student Portal → Library** → The newly issued book appears under **Active Loans** with return due date.
3. **Return Check-In** (`/librarian/return`):
   - Switch to **Librarian → Return Book Desk**.
   - Click **"Check In"** on the loan → Inspect condition → Complete check-in.
   - The catalog stock increments back to 5 copies.

---

## 🎭 Scenario 7: Transport Fleet Route Allocations (FRD §13)

### Goal: Show student bus route assignments and live vehicle details.

1. **In Transport Portal** (`/transport/assignments`):
   - Select unassigned student (*Diya Patel*).
   - Assign route **"RT-002: Dwarka - Janakpuri Express"** and pickup stop **"Dwarka Mor Metro Station"**.
   - Click **"Confirm Route Allocation"**.
2. **Verify on Student & Parent Portals** (`/student/transport` or `/parent/transport`):
   - The student and parent dashboards now display assigned Vehicle No (`DL-01-CD-5678`), Driver Name (`Jaspreet Singh`), contact number, pickup time (`07:35 AM`), and full route stop sequence.

---

## 🎭 Scenario 8: Institutional Reports Hub & Data Exports (FRD §21, §28)

### Goal: Demonstrate comprehensive Excel, CSV, JSON, and printable exports across all 11 school categories.

1. **In School Admin Portal** (`/school-admin/reports`):
   - Click any report category (e.g. **Fee Collection**, **Student Directory**, **Exam Results**, **Payroll**, **Transport**, or **Inventory**).
   - View the live interactive preview table.
   - Click **"Download CSV / Excel"** → Generates and downloads real `.csv` file.
   - Click **"Export JSON"** → Downloads structured `.json` data.
   - Click **"Print Official PDF Document"** → Opens formal printable preview with institutional letterhead.

---

## 🎭 Scenario 9: Super Admin SaaS Multi-Tenant Matrix (FRD §23)

### Goal: Demonstrate dynamic feature toggling per school domain.

1. **In Super Admin Portal** (`/super-admin/modules`):
   - Select school tenant **Greenfield Public School (`SCH-2026-09`)**.
   - Toggle modular features ON or OFF (e.g., *Hostel*, *Transport*, *Library*, *Inventory*).
   - Click **"Synchronize Tenant Features"**.
   - Show how the SaaS tier enables or disables feature modules dynamically per school boundary.

---

## 💡 Quick Demo Cheatsheet (Default Credentials)

| Role | Username / ID | Password | Key Dashboard Page |
| :--- | :--- | :--- | :--- |
| **Student** | `STU108902` | `password123` | `/student/dashboard` |
| **Teacher** | `rajesh.kumar@greenfield.edu` | `password123` | `/teacher/dashboard` |
| **Parent** | `parent@greenfield.edu` | `password123` | `/parent/dashboard` |
| **School Admin** | `admin@greenfield.edu` | `password123` | `/school-admin/dashboard` |
| **Principal** | `principal@greenfield.edu` | `password123` | `/principal/dashboard` |
| **Accountant** | `accountant@greenfield.edu` | `password123` | `/accountant/dashboard` |
| **HR** | `hr@greenfield.edu` | `password123` | `/hr/dashboard` |
| **Librarian** | `librarian@greenfield.edu` | `password123` | `/librarian/dashboard` |
| **Transport** | `transport@greenfield.edu` | `password123` | `/transport/dashboard` |
| **Super Admin** | `superadmin@greenfield.edu` | `password123` | `/super-admin/dashboard` |

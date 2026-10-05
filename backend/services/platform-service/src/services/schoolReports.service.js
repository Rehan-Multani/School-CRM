import { schoolReportsRepository } from '../repositories/schoolReports.repository.js';

// A missing value is shown as a dash — never as an invented placeholder.
const EMPTY = '—';

const text = (value) => {
  const str = value === null || value === undefined ? '' : String(value).trim();
  return str || EMPTY;
};
const money = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;
const date = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : EMPTY);
const personName = (person) => text(`${person?.firstName || ''} ${person?.lastName || ''}`);
const shortId = (prefix, doc) => `${prefix}-${doc._id.toString().slice(-4).toUpperCase()}`;

// "10 - A" from the student's enrollment, or a dash when they have none.
function classLabel(enrollments, student) {
  const enrollment = enrollments?.get(String(student?._id || student || ''));
  if (!enrollment?.className) return EMPTY;
  return enrollment.sectionName ? `${enrollment.className} - ${enrollment.sectionName}` : enrollment.className;
}

export const schoolReportsService = {
  async getReportsSummary(schoolId) {
    if (!schoolId) throw new Error('School ID is required');
    return schoolReportsRepository.getSummary(schoolId);
  },

  async getCategoryReport(schoolId, category = 'students', query = {}) {
    if (!schoolId) throw new Error('School ID is required');

    switch (category) {
      case 'students': {
        const { items, total, page, limit, enrollments } = await schoolReportsRepository.getStudentsReport(schoolId, query);
        const rows = items.map((s) => ({
          'Admission No': text(s.admissionNumber),
          'Student Name': personName(s),
          'Class & Section': classLabel(enrollments, s),
          'Roll Number': text(enrollments.get(String(s._id))?.rollNumber),
          'Gender': text(s.gender),
          'Parent Name': text(s.parentName),
          'Contact Phone': text(s.parentPhone || s.phone),
          'Status': s.status || 'ACTIVE',
        }));
        return { data: rows, total, page, limit };
      }

      case 'fees': {
        const { items, total, page, limit, stats, enrollments } = await schoolReportsRepository.getFeePaymentsReport(schoolId, query);
        const rows = items.map((p) => ({
          'Receipt No': p.receiptNumber || shortId('REC', p),
          'Student Name': personName(p.studentId),
          'Class': classLabel(enrollments, p.studentId),
          'Amount Paid': money(p.amount),
          'Payment Mode': text(p.paymentMethod || p.paymentMode),
          'Payment Date': date(p.paymentDate || p.createdAt),
          'Status': p.status || 'COMPLETED',
        }));
        return { data: rows, total, page, limit, stats };
      }

      case 'fee_dues': {
        const { items, total, page, limit, stats, enrollments } = await schoolReportsRepository.getFeeDuesReport(schoolId, query);
        const rows = items.map((inv) => ({
          'Invoice No': inv.invoiceNumber || shortId('INV', inv),
          'Student Name': personName(inv.studentId),
          'Class': classLabel(enrollments, inv.studentId),
          'Parent Phone': text(inv.studentId?.parentPhone || inv.studentId?.phone),
          'Total Fee': money(inv.totalAmount),
          'Paid Amount': money(inv.paidAmount),
          'Pending Due': money(inv.balanceAmount ?? inv.totalAmount),
          'Due Date': date(inv.dueDate),
          'Status': inv.status || 'PENDING',
        }));
        return { data: rows, total, page, limit, stats };
      }

      case 'attendance': {
        const { items, total, page, limit } = await schoolReportsRepository.getStaffAttendanceReport(schoolId, query);
        const rows = items.map((day) => {
          // Holidays are not working days, so they don't count against attendance.
          const working = day.marked - day.holiday;
          const attended = day.present + day.halfDay * 0.5;
          return {
            'Date': date(day._id),
            'Staff Marked': day.marked,
            'Present': day.present,
            'Absent': day.absent,
            'On Leave': day.onLeave,
            'Half Day': day.halfDay,
            'Attendance %': working > 0 ? `${Math.round((attended / working) * 100)}%` : EMPTY,
          };
        });
        return { data: rows, total, page, limit };
      }

      case 'reviews': {
        const { items, total, page, limit, stats } = await schoolReportsRepository.getPerformanceReviewsReport(schoolId, query);
        const rows = items.map((r) => ({
          'Employee ID': text(r.employeeId),
          'Employee Name': text(r.employeeName),
          'Department': text(r.department),
          'Designation': text(r.designation),
          'Review Period': text(r.reviewPeriod),
          'Rating': r.rating ? `${r.rating} / 5` : EMPTY,
          'Strengths': text(r.strengths),
          'Reviewer': text(r.reviewerName),
          'Review Date': date(r.reviewDate),
          'Status': r.status || 'SUBMITTED',
        }));
        return { data: rows, total, page, limit, stats };
      }

      case 'payroll': {
        const { items, total, page, limit, stats } = await schoolReportsRepository.getPayrollReport(schoolId, query);
        const rows = items.map((pay) => ({
          'Employee ID': text(pay.employeeId),
          'Employee Name': text(pay.employeeName),
          'Role': text(pay.employeeRole),
          'Department': text(pay.department),
          'Payroll Month': text(pay.payrollMonth),
          'Gross Pay': money(pay.grossEarnings),
          'Deductions': money(pay.totalDeductions),
          'Net Pay': money(pay.netSalary),
          'Status': pay.paymentStatus || 'PROCESSED',
        }));
        return { data: rows, total, page, limit, stats };
      }

      case 'hostel': {
        const { items, total, page, limit, enrollments } = await schoolReportsRepository.getHostelReport(schoolId, query);
        const rows = items.map((a) => ({
          'Resident Name': personName(a.studentId),
          'Class': classLabel(enrollments, a.studentId),
          'Hostel': text(a.hostelId?.name),
          'Room No': text(a.roomId?.roomNumber),
          'Floor': text(a.roomId?.floorNumber),
          'Bed': text(a.bedId?.bedCode),
          'Yearly Fee': money(a.yearlyFeeAmount),
          'Allotted On': date(a.createdAt),
          'Status': a.status || 'ACTIVE',
        }));
        return { data: rows, total, page, limit };
      }

      case 'transport': {
        const { items, total, page, limit, enrollments } = await schoolReportsRepository.getTransportReport(schoolId, query);
        const rows = items.map((a) => ({
          'Student Name': personName(a.studentId),
          'Class': classLabel(enrollments, a.studentId),
          'Route': text(a.routeId?.routeName),
          'Stop': text(a.stopId?.stopName),
          'Pickup Time': text(a.stopId?.pickupTime),
          'Drop Time': text(a.stopId?.dropTime),
          'Yearly Fee': money(a.yearlyFeeAmount),
          'Status': a.status || 'ACTIVE',
        }));
        return { data: rows, total, page, limit };
      }

      case 'library': {
        const { items, total, page, limit, stats } = await schoolReportsRepository.getLibraryReport(schoolId, query);
        const rows = items.map((b) => ({
          'Book Code': b.bookCode || shortId('BK', b),
          'Title': text(b.title),
          'Author': text(b.author),
          'Category': text(b.category),
          'Total Copies': b.totalCopies || 0,
          'Available': b.availableCopies || 0,
          'Issued': Math.max(0, (b.totalCopies || 0) - (b.availableCopies || 0)),
          'Rack': text(b.rackNumber),
          'Shelf': text(b.shelfNumber),
        }));
        return { data: rows, total, page, limit, stats };
      }

      case 'staff': {
        const { items, total, page, limit } = await schoolReportsRepository.getStaffDirectoryReport(schoolId, query);
        const rows = items.map((s) => ({
          'Employee ID': text(s.employeeId),
          'Staff Name': text(s.name),
          'Role': text(s.role),
          'Designation': text(s.designation),
          'Department': text(s.department),
          'Email Address': text(s.email),
          'Contact Phone': text(s.phone),
          'Status': s.status || 'ACTIVE',
        }));
        return { data: rows, total, page, limit };
      }

      case 'exams': {
        const { items, total, page, limit } = await schoolReportsRepository.getExamsReport(schoolId, query);
        const rows = items.map((e) => ({
          'Exam Name': text(e.name),
          'Exam Type': text(e.examType).replace(/_/g, ' '),
          'Start Date': date(e.startDate),
          'End Date': date(e.endDate),
          'Classes': e.classIds?.length || 0,
          'Status': e.status || 'DRAFT',
        }));
        return { data: rows, total, page, limit };
      }

      case 'homework': {
        const { items, total, page, limit } = await schoolReportsRepository.getHomeworkReport(schoolId, query);
        const rows = items.map((h) => ({
          'Title': text(h.title),
          'Class / Section': text(`${h.className || ''} ${h.sectionName || ''}`),
          'Subject': text(h.subjectName),
          'Assigned By': text(h.teacherName),
          'Assigned': date(h.assignedDate),
          'Due': date(h.dueDate),
          'Submission %':
            h.totalStudents > 0 ? `${Math.round(((h.submittedCount || 0) / h.totalStudents) * 100)}%` : EMPTY,
          'Pending Eval': Math.max(0, (h.submittedCount || 0) - (h.evaluatedCount || 0)),
          'Status': h.status || 'ASSIGNED',
        }));
        return { data: rows, total, page, limit };
      }

      case 'support': {
        const { items, total, page, limit } = await schoolReportsRepository.getSupportReport(schoolId, query);
        const rows = items.map((t) => ({
          'Ticket No': text(t.ticketNo),
          'Subject': text(t.subject),
          'Category': text(t.category),
          'Priority': text(t.priority),
          'Raised By': text(t.createdByName),
          'Created Date': date(t.createdAt),
          'Status': t.status || 'Open',
        }));
        return { data: rows, total, page, limit };
      }

      default:
        return { data: [], total: 0, page: 1, limit: 50 };
    }
  },
};

import { schoolReportsRepository } from '../repositories/schoolReports.repository.js';

export const schoolReportsService = {
  async getReportsSummary(schoolId) {
    if (!schoolId) throw new Error('School ID is required');
    return schoolReportsRepository.getSummary(schoolId);
  },

  async getCategoryReport(schoolId, category = 'students', query = {}) {
    if (!schoolId) throw new Error('School ID is required');

    switch (category) {
      case 'students': {
        const { items, total, page, limit } = await schoolReportsRepository.getStudentsReport(schoolId, query);
        const rows = items.map((s) => ({
          'Admission No': s.admissionNumber || `ADM-${s._id.toString().slice(-4).toUpperCase()}`,
          'Student Name': `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student',
          'Class & Section': `${s.className || '10'} - ${s.sectionName || 'A'}`,
          'Roll Number': s.rollNumber || 'N/A',
          'Gender': s.gender || 'Not Specified',
          'Guardian Name': s.guardianName || 'Parent',
          'Contact Phone': s.guardianPhone || s.phone || 'N/A',
          'Status': s.status || 'ACTIVE',
        }));
        return { data: rows, total, page, limit };
      }

      case 'fees': {
        const { items, total, page, limit, stats } = await schoolReportsRepository.getFeePaymentsReport(schoolId, query);
        const rows = items.map((p) => ({
          'Receipt No': p.receiptNumber || `REC-${p._id.toString().slice(-4).toUpperCase()}`,
          'Student Name': p.studentId ? `${p.studentId.firstName} ${p.studentId.lastName}` : 'Student',
          'Class': p.studentId?.className ? `${p.studentId.className} - ${p.studentId.sectionName || 'A'}` : 'N/A',
          'Amount Paid': `₹${(p.amount || 0).toLocaleString('en-IN')}`,
          'Payment Mode': p.paymentMethod || 'ONLINE',
          'Transaction Date': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : 'N/A',
          'Status': p.status || 'SUCCESS',
        }));
        return { data: rows, total, page, limit, stats };
      }

      case 'fee_dues': {
        const { items, total, page, limit, stats } = await schoolReportsRepository.getFeeDuesReport(schoolId, query);
        const rows = items.map((inv) => ({
          'Invoice No': inv.invoiceNumber || `INV-${inv._id.toString().slice(-4).toUpperCase()}`,
          'Student Name': inv.studentId ? `${inv.studentId.firstName} ${inv.studentId.lastName}` : 'Student',
          'Class': inv.studentId?.className ? `${inv.studentId.className} - ${inv.studentId.sectionName || 'A'}` : 'N/A',
          'Total Fee': `₹${(inv.totalAmount || 0).toLocaleString('en-IN')}`,
          'Paid Amount': `₹${(inv.paidAmount || 0).toLocaleString('en-IN')}`,
          'Pending Due': `₹${(inv.balanceAmount || inv.totalAmount || 0).toLocaleString('en-IN')}`,
          'Due Date': inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : 'N/A',
          'Status': inv.status || 'PENDING',
        }));
        return { data: rows, total, page, limit, stats };
      }

      case 'attendance': {
        const { items, total, page, limit } = await schoolReportsRepository.getStaffAttendanceReport(schoolId, query);
        const rows = items.map((att) => ({
          'Date': att.date,
          'Total Staff': att.totalEmployees || att.records?.length || 0,
          'Present Count': att.presentCount || att.records?.filter((r) => r.status === 'PRESENT').length || 0,
          'Absent Count': att.absentCount || att.records?.filter((r) => r.status !== 'PRESENT').length || 0,
          'Attendance %': att.totalEmployees ? `${Math.round(((att.presentCount || 0) / att.totalEmployees) * 100)}%` : '0%',
        }));
        return { data: rows, total, page, limit };
      }

      case 'reviews': {
        const { items, total, page, limit, stats } = await schoolReportsRepository.getPerformanceReviewsReport(schoolId, query);
        const rows = items.map((r) => ({
          'Employee ID': r.employeeId || 'EMP',
          'Employee Name': r.employeeName || 'Staff Member',
          'Department': r.department || 'General',
          'Designation': r.designation || 'Staff',
          'Review Period': r.reviewPeriod || 'Annual',
          'Rating': `${r.rating || 5} / 5 Stars`,
          'Strengths': r.strengths || 'N/A',
          'Reviewer': r.reviewerName || 'HR Admin',
          'Review Date': r.reviewDate ? new Date(r.reviewDate).toLocaleDateString('en-IN') : 'N/A',
          'Status': r.status || 'SUBMITTED',
        }));
        return { data: rows, total, page, limit, stats };
      }

      case 'payroll': {
        const { items, total, page, limit, stats } = await schoolReportsRepository.getPayrollReport(schoolId, query);
        const rows = items.map((pay) => ({
          'Employee Name': pay.employeeName || 'Employee',
          'Employee ID': pay.employeeId || 'EMP',
          'Role / Dept': `${pay.employeeRole || 'STAFF'} (${pay.department || 'General'})`,
          'Payroll Month': pay.payrollMonth || 'Current',
          'Gross Pay': `₹${(pay.grossEarnings || 0).toLocaleString('en-IN')}`,
          'Deductions': `₹${(pay.totalDeductions || 0).toLocaleString('en-IN')}`,
          'Net Disbursed': `₹${(pay.netSalary || 0).toLocaleString('en-IN')}`,
          'Status': pay.paymentStatus || 'PROCESSED',
        }));
        return { data: rows, total, page, limit, stats };
      }

      case 'hostel': {
        const { items, total, page, limit } = await schoolReportsRepository.getHostelReport(schoolId, query);
        const rows = items.map((a) => ({
          'Resident Name': a.studentId ? `${a.studentId.firstName} ${a.studentId.lastName}` : 'Resident',
          'Class': a.studentId?.className || 'N/A',
          'Hostel Building': a.hostelId?.name || 'Hostel',
          'Room No': a.roomId?.roomNumber || 'N/A',
          'Bed Code': a.bedId?.bedCode || 'N/A',
          'Monthly Fee': `₹${(a.monthlyFee || 0).toLocaleString('en-IN')}`,
          'Check-in Date': a.allocationDate ? new Date(a.allocationDate).toLocaleDateString('en-IN') : 'N/A',
          'Status': a.status || 'ACTIVE',
        }));
        return { data: rows, total, page, limit };
      }

      case 'transport': {
        const { items, total, page, limit } = await schoolReportsRepository.getTransportReport(schoolId, query);
        const rows = items.map((a) => ({
          'Student Name': a.studentId ? `${a.studentId.firstName} ${a.studentId.lastName}` : 'Student',
          'Class': a.studentId?.className || 'N/A',
          'Route': a.routeId?.routeCode || a.routeId?.routeName || 'N/A',
          'Pickup Stop': a.pickupStopId?.stopName || 'N/A',
          'Pickup Time': a.pickupStopId?.pickupTime || 'N/A',
          'Monthly Fee': `₹${(a.monthlyFee || 0).toLocaleString('en-IN')}`,
          'Status': a.status || 'ACTIVE',
        }));
        return { data: rows, total, page, limit };
      }

      case 'library': {
        const { items, total, page, limit, stats } = await schoolReportsRepository.getLibraryReport(schoolId, query);
        const rows = items.map((b) => ({
          'Book Code': b.bookCode || `BK-${b._id.toString().slice(-4).toUpperCase()}`,
          'Title': b.title,
          'Author': b.author,
          'Category': b.category || 'GENERAL',
          'Total Copies': b.totalCopies || 0,
          'Available Copies': b.availableCopies || 0,
          'Issued Copies': Math.max(0, (b.totalCopies || 0) - (b.availableCopies || 0)),
          'Rack & Shelf': `${b.rackNumber || 'N/A'} / Shelf ${b.shelfNumber || 'N/A'}`,
        }));
        return { data: rows, total, page, limit, stats };
      }

      case 'staff': {
        const { items, total, page, limit } = await schoolReportsRepository.getStaffDirectoryReport(schoolId, query);
        const rows = items.map((s) => ({
          'Staff Name': s.fullName || 'Staff Member',
          'Role': s.role || 'STAFF',
          'Designation': s.designation || 'Staff',
          'Department': s.department || 'General',
          'Email Address': s.email || 'N/A',
          'Contact Phone': s.phone || 'N/A',
          'Status': s.status || 'ACTIVE',
        }));
        return { data: rows, total, page, limit };
      }

      case 'exams': {
        const { items, total, page, limit } = await schoolReportsRepository.getExamsReport(schoolId, query);
        const rows = items.map((e) => ({
          'Exam Name': e.name || e.title || 'Exam',
          'Term / Code': e.term || e.examCode || 'TERM-1',
          'Start Date': e.startDate ? new Date(e.startDate).toLocaleDateString('en-IN') : 'N/A',
          'End Date': e.endDate ? new Date(e.endDate).toLocaleDateString('en-IN') : 'N/A',
          'Status': e.status || 'SCHEDULED',
        }));
        return { data: rows, total, page, limit };
      }

      case 'support': {
        const { items, total, page, limit } = await schoolReportsRepository.getSupportReport(schoolId, query);
        const rows = items.map((t) => ({
          'Ticket Code': t.ticketCode || `TCK-${t._id.toString().slice(-4).toUpperCase()}`,
          'Subject': t.subject || 'Support Ticket',
          'Priority': t.priority || 'NORMAL',
          'Category': t.category || 'GENERAL',
          'Created Date': t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : 'N/A',
          'Status': t.status || 'OPEN',
        }));
        return { data: rows, total, page, limit };
      }

      default:
        return { data: [], total: 0, page: 1, limit: 50 };
    }
  },
};

import { Router } from 'express';
import { loginRateLimiter } from '../middleware/loginRateLimiter.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import {
  getServiceInfo,
  healthCheck,
  notFound,
} from '../controllers/platform.controller.js';
import {
  getLegalDocuments,
  updateLegalDocuments,
} from '../controllers/legal.controller.js';
import {
  createSchoolTicket,
  createTicket,
  getSchoolTicket,
  getTicket,
  listSchoolTickets,
  listTickets,
  replySchoolTicket,
  replyTicket,
  updateTicketStatus,
} from '../controllers/support.controller.js';
import {
  createSchool,
  deleteSchool,
  listSchools,
  resetSchoolLogin,
  schoolAdminForgotPassword,
  schoolAdminLogin,
  schoolAdminResetPassword,
  schoolBranding,
  schoolThemePublic,
  schoolPortalChangePassword,
  schoolPortalConfig,
  schoolPortalMe,
  schoolPortalPlans,
  schoolPortalSettings,
  schoolPortalUpdateBranding,
  schoolPortalUpdateConfig,
  schoolPortalUpdateEmail,
  schoolPortalUpdateTheme,
  schoolSelectPlan,
  updateSchool,
  updateSchoolStatus,
} from '../controllers/school.controller.js';
import {
  createPlan,
  deletePlan,
  listPlans,
  updatePlan,
} from '../controllers/subscription.controller.js';
import {
  inboxNotifications,
  listNotifications,
  listSchoolNotifications,
  registerDevice,
  sendNotification,
  sendSchoolNotification,
  sendLibraryNotification,
} from '../controllers/notification.controller.js';
import {
  cancelInvoice,
  createInvoice,
  createRazorpayOrder,
  getInvoice,
  getPaymentGateway,
  listInvoices,
  markInvoicePaid,
  refundInvoice,
  verifyRazorpayPayment,
} from '../controllers/billing.controller.js';
import {
  getReportSummary,
  listInvoiceReports,
  listNotificationReports,
  listSchoolReports,
  listSubscriptionReports,
} from '../controllers/report.controller.js';
import {
  activateAcademicYear,
  addClassToYear,
  addSectionSubject,
  archiveAcademicYear,
  unarchiveAcademicYear,
  completeAcademicYear,
  createAcademicYear,
  createClass,
  createSection,
  createSubject,
  createTeacher,
  deleteAcademicYear,
  deleteClass,
  deleteSection,
  deleteSectionSubject,
  deleteSubject,
  getAcademicYear,
  getClass,
  getSection,
  getTeacher,
  listAcademicYears,
  listClasses,
  listAllSectionSubjects,
  listSectionSubjects,
  createSectionSubjectDirect,
  listSections,
  listSubjects,
  listTeachers,
  listYearClasses,
  removeClassFromYear,
  seedClasses,
  setCurrentAcademicYear,
  updateAcademicYear,
  updateClass,
  updateSection,
  updateSectionSubject,
  updateSubject,
  updateTeacher,
  updateTeacherStatus,
  deleteTeacher,
} from '../controllers/academic.controller.js';
import {
  createStudent,
  deleteStudent,
  getStudent,
  listStudents,
  updateStudent,
  updateStudentStatus,
} from '../controllers/student.controller.js';
import {
  addStructureItem,
  autoAssignStudentFees,
  createFeeHead,
  createFeeStructure,
  deleteFeeHead,
  deleteFeeStructure,
  deleteStructureItem,
  generateFeeInvoice,
  getFeeHead,
  getFeeInvoice,
  getFeePayment,
  getFeeStructure,
  listFeeHeads,
  listFeeInvoices,
  listFeePayments,
  listFeeStructures,
  listStructureItems,
  listStudentAssignments,
  payFeeInvoice,
  seedDefaultFeeHeads,
  updateFeeHead,
  updateFeeStructure,
  updateStructureItem,
  updateStudentAssignment,
} from '../controllers/fee.controller.js';
import {
  changeUserPassword,
  createUser,
  deleteUser,
  getUser,
  listUsers,
  seedUsers,
  sendUserCredentials,
  updateUser,
  updateUserStatus,
} from '../controllers/user.controller.js';
import {
  createPayroll,
  deletePayroll,
  getEligibleEmployees,
  getPayroll,
  listPayrolls,
  releaseAllPayrolls,
  updatePayrollStatus,
} from '../controllers/payroll.controller.js';
import {
  getAttendanceReport,
  getDailyAttendance,
  getMonthlySummary,
  markAllStatus,
  saveDailyAttendance,
  updateSingleStatus,
} from '../controllers/staffAttendance.controller.js';
import {
  librarianLogin,
  getLibrarianProfile,
  updateLibrarianProfile,
  getLibrarySettings,
  updateLibrarySettings,
  getLibraryStats,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAuthors,
  getPublishers,
  listBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  listBookCopies,
  createBookCopy,
  updateBookCopy,
  deleteBookCopy,
  listIssues,
  issueBook,
  returnBook,
  renewBook,
  updateFineStatus,
  getEligibleBorrowers,
  getNotificationRecipients,
  listReservations,
  createReservation,
  approveReservation,
  rejectReservation,
  cancelReservation,
  fulfillReservation,
  listTransactions,
  getReportData,
} from '../controllers/library.controller.js';
import {
  addExamSubject,
  calculateResults,
  createExam,
  createScheduleEntry,
  deleteExam,
  deleteExamSubject,
  deleteScheduleEntry,
  getExam,
  getExamStats,
  getStudentReportCard,
  listExams,
  listExamSubjects,
  listMarksSheet,
  listResults,
  listSchedule,
  saveMarks,
  seedExamSubjects,
  updateExam,
  updateExamSubject,
  updateScheduleEntry,
} from '../controllers/exam.controller.js';
import {
  allocateStudent,
  checkoutStudent,
  createComplaint,
  createHostel,
  createOuting,
  createRoom,
  deleteHostel,
  deleteRoom,
  getBedVisualizer,
  getEligibleHostelEntities,
  getHostel,
  getHostelAttendance,
  getHostelDashboard,
  getRoom,
  listAllocations,
  listBeds,
  listComplaints,
  listHostels,
  listOutings,
  listRooms,
  saveHostelAttendance,
  seedDemoHostelData,
  transferStudent,
  updateComplaint,
  updateHostel,
  updateOutingStatus,
  updateRoom,
} from '../controllers/hostel.controller.js';
import {
  assignTransportStudent,
  createMaintenance,
  createRoute,
  createStop,
  createTransportIncident,
  createVehicle,
  deleteRoute,
  deleteStop,
  deleteVehicle,
  discontinueTransportAssignment,
  getEligibleTransportEntities,
  getRoute,
  getTransportAttendance,
  getTransportDashboard,
  getVehicle,
  listMaintenance,
  listRoutes,
  listStops,
  listTransportAssignments,
  listTransportIncidents,
  listVehicles,
  saveTransportAttendance,
  seedDemoTransportData,
  updateRoute,
  updateStop,
  updateTransportIncident,
  updateVehicle,
} from '../controllers/transport.controller.js';
import { getSchoolAdminDashboardSummary } from '../controllers/schoolDashboard.controller.js';
import { getSchoolReportsSummary, getCategoryReportData } from '../controllers/schoolReports.controller.js';
import {
  listEvents,
  getEventStats,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/event.controller.js';
import {
  listHomework,
  getHomeworkStats,
  getHomeworkMonitor,
  getHomework,
  createHomework,
  updateHomework,
  deleteHomework,
} from '../controllers/homework.controller.js';
import {
  listMeetings,
  getMeeting,
  createMeeting,
  updateMeeting,
  updateMeetingStatus,
  deleteMeeting,
} from '../controllers/meeting.controller.js';
import {
  listAdmissions,
  getAdmissionStats,
  getAdmission,
  createAdmission,
  updateAdmission,
  updateAdmissionStatus,
  approveAdmission,
  deleteAdmission,
} from '../controllers/admission.controller.js';
import {
  listAssetCategories,
  createAssetCategory,
  updateAssetCategory,
  deleteAssetCategory,
  getInventoryStats,
  listStockMovements,
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  recordAssetMovement,
} from '../controllers/inventory.controller.js';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js';
import { requireSchoolAdmin } from '../middleware/requireSchoolAdmin.js';
import { requireLibrarian } from '../middleware/requireLibrarian.js';
import { requireHR } from '../middleware/requireHR.js';
import { requirePrincipal } from '../middleware/requirePrincipal.js';
import { requireAccountant } from '../middleware/requireAccountant.js';
import {
  principalLogin,
  getPrincipalProfile,
  updatePrincipalProfile,
  changePrincipalPassword,
} from '../controllers/principal.controller.js';
import {
  accountantLogin,
  getAccountantProfile,
  updateAccountantProfile,
  changeAccountantPassword,
  getAccountantDashboard,
  listAccountantAcademicYears,
  listAccountantClasses,
  listAccountantSections,
  searchAccountantStudents,
  getAccountantStudent,
  getStudentFeeProfile,
  accountantGenerateInvoice,
  accountantCollectPayment,
  listAccountantFeeStructures,
  getAccountantFeeStructure,
  listAccountantInstallments,
  listAccountantDues,
  getAccountantStudentDueHistory,
  listAccountantExpenses,
  getAccountantExpense,
  createAccountantExpense,
  updateAccountantExpense,
  updateAccountantExpenseStatus,
  deleteAccountantExpense,
  listAccountantExpenseCategories,
  listAccountantReceipts,
  getAccountantReceipt,
  listAccountantInvoices,
  getAccountantInvoice,
  listAccountantTransactions,
  getAccountantTransaction,
  listAccountantNotifications,
  getAccountantReport,
  getAccountantSettings,
  updateAccountantSettings,
} from '../controllers/accountant.controller.js';
import {
  hrLogin,
  getHRDashboard,
  listEmployees as hrListEmployees,
  getEmployee as hrGetEmployee,
  createEmployee as hrCreateEmployee,
  updateEmployee as hrUpdateEmployee,
  updateEmployeeStatus as hrUpdateEmployeeStatus,
  approveEmployee as hrApproveEmployee,
  rejectEmployee as hrRejectEmployee,
  deleteEmployee as hrDeleteEmployee,
  listDepartments as hrListDepartments,
  createDepartment as hrCreateDepartment,
  updateDepartment as hrUpdateDepartment,
  deleteDepartment as hrDeleteDepartment,
  listDesignations as hrListDesignations,
  createDesignation as hrCreateDesignation,
  updateDesignation as hrUpdateDesignation,
  deleteDesignation as hrDeleteDesignation,
  getHRAttendance,
  saveHRAttendance,
  updateSingleAttendance,
  markAllHRAttendance,
  getHRMonthlyAttendance,
  getHRAttendanceReport,
  listLeaveRequests,
  createLeaveRequest,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveBalance,
  listHRPayrolls,
  getHREligiblePayrollEmployees,
  createHRPayroll,
  getHRPayroll,
  updateHRPayrollStatus,
  releaseAllHRPayrolls,
  deleteHRPayroll,
  listPerformanceReviews,
  createPerformanceReview,
  getPerformanceReview,
  updatePerformanceReview,
  deletePerformanceReview,
  listHRDocuments,
  uploadHRDocument,
  verifyHRDocument,
  deleteHRDocument,
  getHRSettings,
  updateHRSettings,
  getHRReportData,
  listAnnouncements as hrListAnnouncements,
  createAnnouncement as hrCreateAnnouncement,
  deleteAnnouncement as hrDeleteAnnouncement,
  getHRProfile,
  updateHRProfile,
  changeHRPassword,
  getHRNotifications,
  getHRSalarySlip,
} from '../controllers/hr.controller.js';
import { assertSchoolAccess } from '../middleware/assertSchoolAccess.js';
import { uploadStudentFiles, convertStudentImages } from '../middleware/uploadStudentPhoto.js';
import { convertTeacherImages, uploadTeacherFiles } from '../middleware/uploadTeacherPhoto.js';
import { convertSchoolUserImages, uploadSchoolUserFiles } from '../middleware/uploadSchoolUser.js';

const router = Router();

router.get('/health', healthCheck);
router.get('/schools', requireSuperAdmin, listSchools);
router.post('/schools', requireSuperAdmin, createSchool);
router.put('/schools/:id', requireSuperAdmin, updateSchool);
router.patch('/schools/:id/status', requireSuperAdmin, updateSchoolStatus);
router.post('/schools/:id/reset-login', requireSuperAdmin, resetSchoolLogin);
router.delete('/schools/:id', requireSuperAdmin, deleteSchool);
router.get('/school-auth/branding', schoolBranding);
router.get('/school-theme/:schoolId', schoolThemePublic);
router.post('/school-auth/login', schoolAdminLogin);
router.post('/school-auth/librarian-login', loginRateLimiter, librarianLogin);
router.post('/school-portal/auth/librarian-login', loginRateLimiter, librarianLogin);
router.post('/school-auth/hr-login', hrLogin);
router.post('/school-portal/auth/hr-login', hrLogin);
router.post('/school-auth/principal-login', loginRateLimiter, principalLogin);
router.post('/school-portal/auth/principal-login', loginRateLimiter, principalLogin);
router.get('/school-portal/principal/me', requirePrincipal, getPrincipalProfile);
router.patch('/school-portal/principal/profile', requirePrincipal, uploadSchoolUserFiles, convertSchoolUserImages, updatePrincipalProfile);
router.patch('/school-portal/principal/password', requirePrincipal, changePrincipalPassword);
router.post('/school-auth/accountant-login', loginRateLimiter, accountantLogin);
router.post('/school-portal/auth/accountant-login', loginRateLimiter, accountantLogin);
router.get('/school-portal/accountant/profile', requireAccountant, getAccountantProfile);
router.patch('/school-portal/accountant/profile', requireAccountant, uploadSchoolUserFiles, convertSchoolUserImages, updateAccountantProfile);
router.patch('/school-portal/accountant/password', requireAccountant, changeAccountantPassword);

// ----- Accountant Portal (all behind requireAccountant) -----
router.get('/school-portal/accountant/dashboard', requireAccountant, getAccountantDashboard);

router.get('/school-portal/accountant/academic-years', requireAccountant, listAccountantAcademicYears);
router.get('/school-portal/accountant/classes', requireAccountant, listAccountantClasses);
router.get('/school-portal/accountant/sections', requireAccountant, listAccountantSections);
router.get('/school-portal/accountant/students', requireAccountant, searchAccountantStudents);
router.get('/school-portal/accountant/students/:id', requireAccountant, getAccountantStudent);

router.get('/school-portal/accountant/fees/students/:studentId/profile', requireAccountant, getStudentFeeProfile);
router.post('/school-portal/accountant/fees/invoices/generate', requireAccountant, accountantGenerateInvoice);
router.post('/school-portal/accountant/fees/invoices/:invoiceId/pay', requireAccountant, accountantCollectPayment);

router.get('/school-portal/accountant/fee-structures', requireAccountant, listAccountantFeeStructures);
router.get('/school-portal/accountant/fee-structures/:id', requireAccountant, getAccountantFeeStructure);

router.get('/school-portal/accountant/installments', requireAccountant, listAccountantInstallments);

router.get('/school-portal/accountant/dues', requireAccountant, listAccountantDues);
router.get('/school-portal/accountant/dues/:studentId/history', requireAccountant, getAccountantStudentDueHistory);

router.get('/school-portal/accountant/expenses/categories', requireAccountant, listAccountantExpenseCategories);
router.get('/school-portal/accountant/expenses', requireAccountant, listAccountantExpenses);
router.post('/school-portal/accountant/expenses', requireAccountant, uploadSchoolUserFiles, convertSchoolUserImages, createAccountantExpense);
router.get('/school-portal/accountant/expenses/:id', requireAccountant, getAccountantExpense);
router.patch('/school-portal/accountant/expenses/:id', requireAccountant, uploadSchoolUserFiles, convertSchoolUserImages, updateAccountantExpense);
router.patch('/school-portal/accountant/expenses/:id/status', requireAccountant, updateAccountantExpenseStatus);
router.delete('/school-portal/accountant/expenses/:id', requireAccountant, deleteAccountantExpense);

router.get('/school-portal/accountant/receipts', requireAccountant, listAccountantReceipts);
router.get('/school-portal/accountant/receipts/:id', requireAccountant, getAccountantReceipt);
router.get('/school-portal/accountant/invoices', requireAccountant, listAccountantInvoices);
router.get('/school-portal/accountant/invoices/:id', requireAccountant, getAccountantInvoice);

router.get('/school-portal/accountant/transactions', requireAccountant, listAccountantTransactions);
router.get('/school-portal/accountant/transactions/:id', requireAccountant, getAccountantTransaction);

router.get('/school-portal/accountant/notifications', requireAccountant, listAccountantNotifications);

router.get('/school-portal/accountant/reports/:category', requireAccountant, getAccountantReport);

router.get('/school-portal/accountant/settings', requireAccountant, getAccountantSettings);
router.patch('/school-portal/accountant/settings', requireAccountant, updateAccountantSettings);
router.post('/school-auth/forgot-password', schoolAdminForgotPassword);
router.post('/school-auth/reset-password', schoolAdminResetPassword);
router.get('/school-portal/dashboard/summary', requirePrincipal, getSchoolAdminDashboardSummary);
router.get('/school-portal/reports/summary', requirePrincipal, getSchoolReportsSummary);
router.get('/school-portal/reports/data', requirePrincipal, getCategoryReportData);
router.get('/school-portal/me', requireSchoolAdmin, schoolPortalMe);
router.get('/school-portal/plans', requireSchoolAdmin, schoolPortalPlans);
router.post('/school-portal/select-plan', requireSchoolAdmin, schoolSelectPlan);
router.get('/school-portal/config', requireSchoolAdmin, schoolPortalConfig);
router.patch('/school-portal/config', requireSchoolAdmin, schoolPortalUpdateConfig);
router.get('/school-portal/settings', requireSchoolAdmin, schoolPortalSettings);
router.patch('/school-portal/settings/theme', requireSchoolAdmin, schoolPortalUpdateTheme);
router.patch('/school-portal/settings/branding', requireSchoolAdmin, schoolPortalUpdateBranding);
router.patch('/school-portal/settings/password', requireSchoolAdmin, schoolPortalChangePassword);
router.patch('/school-portal/settings/email', requireSchoolAdmin, schoolPortalUpdateEmail);
router.get('/school-portal/notifications', requirePrincipal, listSchoolNotifications);
router.post('/school-portal/notifications', requirePrincipal, sendSchoolNotification);
router.get('/school-portal/academic/years', requirePrincipal, listAcademicYears);
router.post('/school-portal/academic/years', requirePrincipal, createAcademicYear);
router.get('/school-portal/academic/years/:id', requirePrincipal, getAcademicYear);
router.patch('/school-portal/academic/years/:id', requirePrincipal, updateAcademicYear);
router.delete('/school-portal/academic/years/:id', requirePrincipal, deleteAcademicYear);
router.post('/school-portal/academic/years/:id/activate', requirePrincipal, activateAcademicYear);
router.post('/school-portal/academic/years/:id/set-current', requirePrincipal, setCurrentAcademicYear);
router.post('/school-portal/academic/years/:id/archive', requirePrincipal, archiveAcademicYear);
router.post('/school-portal/academic/years/:id/unarchive', requirePrincipal, unarchiveAcademicYear);
router.post('/school-portal/academic/years/:id/complete', requirePrincipal, completeAcademicYear);
router.get('/school-portal/academic/years/:yearId/classes', requirePrincipal, listYearClasses);
router.post('/school-portal/academic/years/:yearId/classes', requirePrincipal, addClassToYear);
router.delete('/school-portal/academic/years/:yearId/classes/:classId', requirePrincipal, removeClassFromYear);
router.get('/school-portal/academic/classes', requirePrincipal, listClasses);
router.post('/school-portal/academic/classes', requirePrincipal, createClass);
router.post('/school-portal/academic/classes/seed', requirePrincipal, seedClasses);
router.get('/school-portal/academic/classes/:id', requirePrincipal, getClass);
router.patch('/school-portal/academic/classes/:id', requirePrincipal, updateClass);
router.delete('/school-portal/academic/classes/:id', requirePrincipal, deleteClass);
router.get('/school-portal/academic/sections', requirePrincipal, listSections);
router.post('/school-portal/academic/sections', requirePrincipal, createSection);
router.get('/school-portal/academic/sections/:id', requirePrincipal, getSection);
router.patch('/school-portal/academic/sections/:id', requirePrincipal, updateSection);
router.delete('/school-portal/academic/sections/:id', requirePrincipal, deleteSection);
router.get('/school-portal/academic/subjects', requirePrincipal, listSubjects);
router.post('/school-portal/academic/subjects', requirePrincipal, createSubject);
router.patch('/school-portal/academic/subjects/:id', requirePrincipal, updateSubject);
router.delete('/school-portal/academic/subjects/:id', requirePrincipal, deleteSubject);
router.get('/school-portal/academic/section-subjects', requirePrincipal, listAllSectionSubjects);
router.post('/school-portal/academic/section-subjects', requirePrincipal, createSectionSubjectDirect);
router.get('/school-portal/academic/sections/:sectionId/subjects', requirePrincipal, listSectionSubjects);
router.post('/school-portal/academic/sections/:sectionId/subjects', requirePrincipal, addSectionSubject);
router.patch('/school-portal/academic/section-subjects/:id', requirePrincipal, updateSectionSubject);
router.delete('/school-portal/academic/section-subjects/:id', requirePrincipal, deleteSectionSubject);
router.get('/school-portal/academic/teachers', requirePrincipal, listTeachers);
router.post('/school-portal/academic/teachers', requirePrincipal, uploadTeacherFiles, convertTeacherImages, createTeacher);
router.get('/school-portal/academic/teachers/:id', requirePrincipal, getTeacher);
router.patch('/school-portal/academic/teachers/:id', requirePrincipal, uploadTeacherFiles, convertTeacherImages, updateTeacher);
router.patch('/school-portal/academic/teachers/:id/status', requirePrincipal, updateTeacherStatus);
router.delete('/school-portal/academic/teachers/:id', requirePrincipal, deleteTeacher);
router.get('/school-portal/students', requirePrincipal, listStudents);
router.post('/school-portal/students', requirePrincipal, uploadStudentFiles, convertStudentImages, createStudent);
router.get('/school-portal/students/:id', requirePrincipal, getStudent);
router.patch('/school-portal/students/:id', requirePrincipal, uploadStudentFiles, convertStudentImages, updateStudent);
router.patch('/school-portal/students/:id/status', requirePrincipal, updateStudentStatus);
router.delete('/school-portal/students/:id', requirePrincipal, deleteStudent);

// School User Management Routes (Teachers, Librarians, HR, Accountants, Transport)
router.get('/school-portal/users', requirePrincipal, listUsers);
router.post('/school-portal/users', requirePrincipal, uploadSchoolUserFiles, convertSchoolUserImages, createUser);
router.post('/school-portal/users/seed', requirePrincipal, seedUsers);
router.get('/school-portal/users/:id', requirePrincipal, getUser);
router.patch('/school-portal/users/:id', requirePrincipal, uploadSchoolUserFiles, convertSchoolUserImages, updateUser);
router.patch('/school-portal/users/:id/status', requirePrincipal, updateUserStatus);
router.patch('/school-portal/users/:id/password', requirePrincipal, changeUserPassword);
router.post('/school-portal/users/:id/send-credentials', requirePrincipal, sendUserCredentials);
router.delete('/school-portal/users/:id', requirePrincipal, deleteUser);

// Fee Management Routes
router.get('/school-portal/fees/heads', requireSchoolAdmin, listFeeHeads);
router.post('/school-portal/fees/heads', requireSchoolAdmin, createFeeHead);
router.post('/school-portal/fees/heads/seed', requireSchoolAdmin, seedDefaultFeeHeads);
router.get('/school-portal/fees/heads/:id', requireSchoolAdmin, getFeeHead);
router.patch('/school-portal/fees/heads/:id', requireSchoolAdmin, updateFeeHead);
router.delete('/school-portal/fees/heads/:id', requireSchoolAdmin, deleteFeeHead);

router.get('/school-portal/fees/structures', requireSchoolAdmin, listFeeStructures);
router.post('/school-portal/fees/structures', requireSchoolAdmin, createFeeStructure);
router.get('/school-portal/fees/structures/:id', requireSchoolAdmin, getFeeStructure);
router.patch('/school-portal/fees/structures/:id', requireSchoolAdmin, updateFeeStructure);
router.delete('/school-portal/fees/structures/:id', requireSchoolAdmin, deleteFeeStructure);

router.get('/school-portal/fees/structures/:structureId/items', requireSchoolAdmin, listStructureItems);
router.post('/school-portal/fees/structures/:structureId/items', requireSchoolAdmin, addStructureItem);
router.patch('/school-portal/fees/items/:id', requireSchoolAdmin, updateStructureItem);
router.delete('/school-portal/fees/items/:id', requireSchoolAdmin, deleteStructureItem);

router.get('/school-portal/fees/students/:studentId/assignments', requireSchoolAdmin, listStudentAssignments);
router.post('/school-portal/fees/students/:studentId/auto-assign', requireSchoolAdmin, autoAssignStudentFees);
router.patch('/school-portal/fees/assignments/:id', requireSchoolAdmin, updateStudentAssignment);

router.get('/school-portal/fees/invoices', requireSchoolAdmin, listFeeInvoices);
router.post('/school-portal/fees/invoices/generate', requireSchoolAdmin, generateFeeInvoice);
router.get('/school-portal/fees/invoices/:id', requireSchoolAdmin, getFeeInvoice);
router.post('/school-portal/fees/invoices/:invoiceId/pay', requireSchoolAdmin, payFeeInvoice);

router.get('/school-portal/fees/payments', requireSchoolAdmin, listFeePayments);
router.get('/school-portal/fees/payments/:id', requireSchoolAdmin, getFeePayment);

// Payroll & HR Endpoints
router.get('/school-portal/payroll/employees', requireSchoolAdmin, getEligibleEmployees);
router.get('/school-portal/payroll', requireSchoolAdmin, listPayrolls);
router.post('/school-portal/payroll', requireSchoolAdmin, createPayroll);
router.post('/school-portal/payroll/release', requireSchoolAdmin, releaseAllPayrolls);
router.get('/school-portal/payroll/:id', requireSchoolAdmin, getPayroll);
router.patch('/school-portal/payroll/:id/status', requireSchoolAdmin, updatePayrollStatus);
router.delete('/school-portal/payroll/:id', requireSchoolAdmin, deletePayroll);

// Staff Attendance Endpoints
router.get('/school-portal/attendance/staff', requireSchoolAdmin, getDailyAttendance);
router.get('/school-portal/attendance/staff/report', requireSchoolAdmin, getAttendanceReport);
router.post('/school-portal/attendance/staff', requireSchoolAdmin, saveDailyAttendance);
router.patch('/school-portal/attendance/staff/:employeeRefId', requireSchoolAdmin, updateSingleStatus);
router.post('/school-portal/attendance/staff/mark-all', requireSchoolAdmin, markAllStatus);
router.get('/school-portal/attendance/staff/monthly', requireSchoolAdmin, getMonthlySummary);

// Library Management Endpoints (accessible by School Admin & Librarian)
router.get('/school-portal/profile', requireLibrarian, getLibrarianProfile);
router.patch('/school-portal/profile', requireLibrarian, updateLibrarianProfile);
router.get('/school-portal/library/settings', requireLibrarian, getLibrarySettings);
router.patch('/school-portal/library/settings', requireLibrarian, updateLibrarySettings);
router.get('/school-portal/library/stats', requireLibrarian, getLibraryStats);
router.get('/school-portal/library/categories', requireLibrarian, getCategories);
router.post('/school-portal/library/categories', requireLibrarian, createCategory);
router.patch('/school-portal/library/categories/:id', requireLibrarian, validateObjectId(), updateCategory);
router.delete('/school-portal/library/categories/:id', requireLibrarian, validateObjectId(), deleteCategory);
router.get('/school-portal/library/authors', requireLibrarian, getAuthors);
router.get('/school-portal/library/publishers', requireLibrarian, getPublishers);
router.get('/school-portal/library/borrowers', requireLibrarian, getEligibleBorrowers);
router.get('/school-portal/library/notification-recipients', requireLibrarian, getNotificationRecipients);
router.post('/school-portal/library/notifications', requireLibrarian, sendLibraryNotification);

router.get('/school-portal/library/books', requireLibrarian, listBooks);
router.post('/school-portal/library/books', requireLibrarian, createBook);
router.get('/school-portal/library/books/:id', requireLibrarian, validateObjectId(), getBook);
router.patch('/school-portal/library/books/:id', requireLibrarian, validateObjectId(), updateBook);
router.delete('/school-portal/library/books/:id', requireLibrarian, validateObjectId(), deleteBook);

router.get('/school-portal/library/copies', requireLibrarian, listBookCopies);
router.post('/school-portal/library/copies', requireLibrarian, createBookCopy);
router.patch('/school-portal/library/copies/:id', requireLibrarian, validateObjectId(), updateBookCopy);
router.delete('/school-portal/library/copies/:id', requireLibrarian, validateObjectId(), deleteBookCopy);

router.get('/school-portal/library/issues', requireLibrarian, listIssues);
router.post('/school-portal/library/issues', requireLibrarian, issueBook);
router.post('/school-portal/library/issues/:id/return', requireLibrarian, validateObjectId(), returnBook);
router.post('/school-portal/library/issues/:id/renew', requireLibrarian, validateObjectId(), renewBook);
router.patch('/school-portal/library/issues/:id/fine', requireLibrarian, validateObjectId(), updateFineStatus);

router.get('/school-portal/library/reservations', requireLibrarian, listReservations);
router.post('/school-portal/library/reservations', requireLibrarian, createReservation);
router.patch('/school-portal/library/reservations/:id/approve', requireLibrarian, validateObjectId(), approveReservation);
router.patch('/school-portal/library/reservations/:id/reject', requireLibrarian, validateObjectId(), rejectReservation);
router.patch('/school-portal/library/reservations/:id/cancel', requireLibrarian, validateObjectId(), cancelReservation);
router.post('/school-portal/library/reservations/:id/fulfill', requireLibrarian, validateObjectId(), fulfillReservation);

router.get('/school-portal/library/transactions', requireLibrarian, listTransactions);
router.get('/school-portal/library/reports/:category', requireLibrarian, getReportData);

// Examination & Terms Endpoints
router.get('/school-portal/exams/stats', requirePrincipal, getExamStats);
router.get('/school-portal/exams', requirePrincipal, listExams);
router.post('/school-portal/exams', requirePrincipal, createExam);
router.get('/school-portal/exams/:id', requirePrincipal, getExam);
router.patch('/school-portal/exams/:id', requirePrincipal, updateExam);
router.delete('/school-portal/exams/:id', requirePrincipal, deleteExam);

// Exam Subjects
router.get('/school-portal/exams/:examId/subjects', requirePrincipal, listExamSubjects);
router.post('/school-portal/exams/:examId/subjects/seed', requirePrincipal, seedExamSubjects);
router.post('/school-portal/exams/:examId/subjects', requirePrincipal, addExamSubject);
router.patch('/school-portal/exams/:examId/subjects/:id', requirePrincipal, updateExamSubject);
router.delete('/school-portal/exams/:examId/subjects/:id', requirePrincipal, deleteExamSubject);

// Exam Schedule (Timetable)
router.get('/school-portal/exams/:examId/schedule', requirePrincipal, listSchedule);
router.post('/school-portal/exams/:examId/schedule', requirePrincipal, createScheduleEntry);
router.patch('/school-portal/exams/:examId/schedule/:id', requirePrincipal, updateScheduleEntry);
router.delete('/school-portal/exams/:examId/schedule/:id', requirePrincipal, deleteScheduleEntry);

// Marks Entry & Result Calculation
router.get('/school-portal/exams/:examId/marks', requirePrincipal, listMarksSheet);
router.post('/school-portal/exams/:examId/marks', requirePrincipal, saveMarks);
router.post('/school-portal/exams/:examId/results/calculate', requirePrincipal, calculateResults);
router.get('/school-portal/exams/:examId/results', requirePrincipal, listResults);
router.get('/school-portal/exams/:examId/results/:studentId', requirePrincipal, getStudentReportCard);

// Hostel Management Endpoints
router.get('/school-portal/hostel/dashboard', requireSchoolAdmin, getHostelDashboard);
router.post('/school-portal/hostel/seed-demo', requireSchoolAdmin, seedDemoHostelData);
router.get('/school-portal/hostel/eligible-entities', requireSchoolAdmin, getEligibleHostelEntities);

router.get('/school-portal/hostel/hostels', requireSchoolAdmin, listHostels);
router.post('/school-portal/hostel/hostels', requireSchoolAdmin, createHostel);
router.get('/school-portal/hostel/hostels/:id', requireSchoolAdmin, getHostel);
router.patch('/school-portal/hostel/hostels/:id', requireSchoolAdmin, updateHostel);
router.delete('/school-portal/hostel/hostels/:id', requireSchoolAdmin, deleteHostel);

router.get('/school-portal/hostel/rooms', requireSchoolAdmin, listRooms);
router.post('/school-portal/hostel/rooms', requireSchoolAdmin, createRoom);
router.get('/school-portal/hostel/rooms/:id', requireSchoolAdmin, getRoom);
router.patch('/school-portal/hostel/rooms/:id', requireSchoolAdmin, updateRoom);
router.delete('/school-portal/hostel/rooms/:id', requireSchoolAdmin, deleteRoom);

router.get('/school-portal/hostel/beds', requireSchoolAdmin, listBeds);
router.get('/school-portal/hostel/beds/visualizer', requireSchoolAdmin, getBedVisualizer);

router.get('/school-portal/hostel/allocations', requireSchoolAdmin, listAllocations);
router.post('/school-portal/hostel/allocations', requireSchoolAdmin, allocateStudent);
router.post('/school-portal/hostel/allocations/:id/transfer', requireSchoolAdmin, transferStudent);
router.post('/school-portal/hostel/allocations/:id/checkout', requireSchoolAdmin, checkoutStudent);

router.get('/school-portal/hostel/attendance/:hostelId', requireSchoolAdmin, getHostelAttendance);
router.post('/school-portal/hostel/attendance/:hostelId', requireSchoolAdmin, saveHostelAttendance);

router.get('/school-portal/hostel/outings', requireSchoolAdmin, listOutings);
router.post('/school-portal/hostel/outings', requireSchoolAdmin, createOuting);
router.patch('/school-portal/hostel/outings/:id/status', requireSchoolAdmin, updateOutingStatus);

router.get('/school-portal/hostel/complaints', requireSchoolAdmin, listComplaints);
router.post('/school-portal/hostel/complaints', requireSchoolAdmin, createComplaint);
router.patch('/school-portal/hostel/complaints/:id', requireSchoolAdmin, updateComplaint);

// Transport Management Endpoints
router.get('/school-portal/transport/dashboard', requireSchoolAdmin, getTransportDashboard);
router.post('/school-portal/transport/seed-demo', requireSchoolAdmin, seedDemoTransportData);
router.get('/school-portal/transport/eligible-entities', requireSchoolAdmin, getEligibleTransportEntities);

router.get('/school-portal/transport/vehicles', requireSchoolAdmin, listVehicles);
router.post('/school-portal/transport/vehicles', requireSchoolAdmin, createVehicle);
router.get('/school-portal/transport/vehicles/:id', requireSchoolAdmin, getVehicle);
router.patch('/school-portal/transport/vehicles/:id', requireSchoolAdmin, updateVehicle);
router.delete('/school-portal/transport/vehicles/:id', requireSchoolAdmin, deleteVehicle);

router.get('/school-portal/transport/routes', requireSchoolAdmin, listRoutes);
router.post('/school-portal/transport/routes', requireSchoolAdmin, createRoute);
router.get('/school-portal/transport/routes/:id', requireSchoolAdmin, getRoute);
router.patch('/school-portal/transport/routes/:id', requireSchoolAdmin, updateRoute);
router.delete('/school-portal/transport/routes/:id', requireSchoolAdmin, deleteRoute);

router.get('/school-portal/transport/routes/:routeId/stops', requireSchoolAdmin, listStops);
router.post('/school-portal/transport/routes/:routeId/stops', requireSchoolAdmin, createStop);
router.patch('/school-portal/transport/stops/:id', requireSchoolAdmin, updateStop);
router.delete('/school-portal/transport/stops/:id', requireSchoolAdmin, deleteStop);

router.get('/school-portal/transport/assignments', requireSchoolAdmin, listTransportAssignments);
router.post('/school-portal/transport/assignments', requireSchoolAdmin, assignTransportStudent);
router.post('/school-portal/transport/assignments/:id/discontinue', requireSchoolAdmin, discontinueTransportAssignment);

router.get('/school-portal/transport/attendance/:routeId', requireSchoolAdmin, getTransportAttendance);
router.post('/school-portal/transport/attendance/:routeId', requireSchoolAdmin, saveTransportAttendance);

router.get('/school-portal/transport/maintenance', requireSchoolAdmin, listMaintenance);
router.post('/school-portal/transport/maintenance', requireSchoolAdmin, createMaintenance);

router.get('/school-portal/transport/incidents', requireSchoolAdmin, listTransportIncidents);
router.post('/school-portal/transport/incidents', requireSchoolAdmin, createTransportIncident);
router.patch('/school-portal/transport/incidents/:id', requireSchoolAdmin, updateTransportIncident);

// ==========================================
// HR Management Endpoints (accessible by School Admin & HR)
// ==========================================
router.get('/school-portal/hr/dashboard', requireHR, getHRDashboard);
router.get('/school-portal/hr/settings', requireHR, getHRSettings);
router.patch('/school-portal/hr/settings', requireHR, updateHRSettings);
router.get('/school-portal/hr/documents', requireHR, listHRDocuments);
router.post('/school-portal/hr/documents/upload', requireHR, uploadSchoolUserFiles, convertSchoolUserImages, uploadHRDocument);
router.patch('/school-portal/hr/documents/:id/verify', requireHR, verifyHRDocument);
router.delete('/school-portal/hr/documents/:id', requireHR, deleteHRDocument);
// Announcements
router.get('/school-portal/hr/announcements', requireHR, hrListAnnouncements);
router.post('/school-portal/hr/announcements', requireHR, hrCreateAnnouncement);
router.delete('/school-portal/hr/announcements/:id', requireHR, hrDeleteAnnouncement);

// HR Notifications
router.get('/school-portal/hr/notifications', requireHR, getHRNotifications);

// HR Profile & Credentials
router.get('/school-portal/hr/profile', requireHR, getHRProfile);
router.patch('/school-portal/hr/profile', requireHR, uploadSchoolUserFiles, convertSchoolUserImages, updateHRProfile);
router.patch('/school-portal/hr/password', requireHR, changeHRPassword);

// Employees
router.get('/school-portal/hr/employees', requireHR, hrListEmployees);
router.post('/school-portal/hr/employees', requireHR, uploadSchoolUserFiles, convertSchoolUserImages, hrCreateEmployee);
router.get('/school-portal/hr/employees/:id', requireHR, hrGetEmployee);
router.patch('/school-portal/hr/employees/:id', requireHR, uploadSchoolUserFiles, convertSchoolUserImages, hrUpdateEmployee);
router.patch('/school-portal/hr/employees/:id/status', requireHR, hrUpdateEmployeeStatus);
router.patch('/school-portal/hr/employees/:id/approve', requireHR, hrApproveEmployee);
router.patch('/school-portal/hr/employees/:id/reject', requireHR, hrRejectEmployee);
router.delete('/school-portal/hr/employees/:id', requireHR, hrDeleteEmployee);

// Departments
router.get('/school-portal/hr/departments', requireHR, hrListDepartments);
router.post('/school-portal/hr/departments', requireHR, hrCreateDepartment);
router.patch('/school-portal/hr/departments/:id', requireHR, hrUpdateDepartment);
router.delete('/school-portal/hr/departments/:id', requireHR, hrDeleteDepartment);

// Designations
router.get('/school-portal/hr/designations', requireHR, hrListDesignations);
router.post('/school-portal/hr/designations', requireHR, hrCreateDesignation);
router.patch('/school-portal/hr/designations/:id', requireHR, hrUpdateDesignation);
router.delete('/school-portal/hr/designations/:id', requireHR, hrDeleteDesignation);

// Attendance (Static routes BEFORE dynamic routes)
router.get('/school-portal/hr/attendance/monthly', requireHR, getHRMonthlyAttendance);
router.get('/school-portal/hr/attendance/report', requireHR, getHRAttendanceReport);
router.post('/school-portal/hr/attendance/mark-all', requireHR, markAllHRAttendance);
router.get('/school-portal/hr/attendance', requireHR, getHRAttendance);
router.post('/school-portal/hr/attendance', requireHR, saveHRAttendance);
router.patch('/school-portal/hr/attendance/:id', requireHR, updateSingleAttendance);

// Leave Management (Static routes BEFORE dynamic routes)
router.get('/school-portal/hr/leave/balance/:empId', requireHR, getLeaveBalance);
router.get('/school-portal/hr/leave', requireHR, listLeaveRequests);
router.post('/school-portal/hr/leave', requireHR, createLeaveRequest);
router.patch('/school-portal/hr/leave/:id/approve', requireHR, approveLeave);
router.patch('/school-portal/hr/leave/:id/reject', requireHR, rejectLeave);
router.patch('/school-portal/hr/leave/:id/cancel', requireHR, cancelLeave);

// Payroll (Static routes BEFORE dynamic routes)
router.get('/school-portal/hr/payroll/employees', requireHR, getHREligiblePayrollEmployees);
router.post('/school-portal/hr/payroll/release', requireHR, releaseAllHRPayrolls);
router.get('/school-portal/hr/payroll', requireHR, listHRPayrolls);
router.post('/school-portal/hr/payroll', requireHR, createHRPayroll);
router.get('/school-portal/hr/payroll/:id', requireHR, getHRPayroll);
router.get('/school-portal/hr/payroll/:id/slip', requireHR, getHRSalarySlip);
router.patch('/school-portal/hr/payroll/:id/status', requireHR, updateHRPayrollStatus);
router.delete('/school-portal/hr/payroll/:id', requireHR, deleteHRPayroll);

// Performance Reviews (Static routes BEFORE dynamic routes)
router.get('/school-portal/hr/performance', requireHR, listPerformanceReviews);
router.post('/school-portal/hr/performance', requireHR, createPerformanceReview);
router.get('/school-portal/hr/performance/:id', requireHR, getPerformanceReview);
router.patch('/school-portal/hr/performance/:id', requireHR, updatePerformanceReview);
router.delete('/school-portal/hr/performance/:id', requireHR, deletePerformanceReview);

// Reports
router.get('/school-portal/hr/reports/:category', requireHR, getHRReportData);

// ==========================================================================
// EVENTS — school-admin writes; principal + school-admin read (requirePrincipal
// already lets SCHOOLADMIN through). Static routes before :id.
// ==========================================================================
router.get('/school-portal/events/stats', requirePrincipal, getEventStats);
router.get('/school-portal/events', requirePrincipal, listEvents);
router.get('/school-portal/events/:id', requirePrincipal, getEvent);
router.post('/school-portal/events', requireSchoolAdmin, createEvent);
router.patch('/school-portal/events/:id', requireSchoolAdmin, updateEvent);
router.delete('/school-portal/events/:id', requireSchoolAdmin, deleteEvent);

// ==========================================================================
// HOMEWORK — school-admin writes; principal + school-admin read/monitor.
// ==========================================================================
router.get('/school-portal/homework/stats', requirePrincipal, getHomeworkStats);
router.get('/school-portal/homework/monitor', requirePrincipal, getHomeworkMonitor);
router.get('/school-portal/homework', requirePrincipal, listHomework);
router.get('/school-portal/homework/:id', requirePrincipal, getHomework);
router.post('/school-portal/homework', requireSchoolAdmin, createHomework);
router.patch('/school-portal/homework/:id', requireSchoolAdmin, updateHomework);
router.delete('/school-portal/homework/:id', requireSchoolAdmin, deleteHomework);

// ==========================================================================
// MEETINGS — principal only. Static routes before :id.
// ==========================================================================
router.get('/school-portal/principal/meetings', requirePrincipal, listMeetings);
router.post('/school-portal/principal/meetings', requirePrincipal, createMeeting);
router.get('/school-portal/principal/meetings/:id', requirePrincipal, getMeeting);
router.patch('/school-portal/principal/meetings/:id/status', requirePrincipal, updateMeetingStatus);
router.patch('/school-portal/principal/meetings/:id', requirePrincipal, updateMeeting);
router.delete('/school-portal/principal/meetings/:id', requirePrincipal, deleteMeeting);

// ==========================================================================
// ADMISSIONS — school-admin. Static routes before :id.
// ==========================================================================
router.get('/school-portal/admissions/stats', requireSchoolAdmin, getAdmissionStats);
router.get('/school-portal/admissions', requireSchoolAdmin, listAdmissions);
router.post('/school-portal/admissions', requireSchoolAdmin, createAdmission);
router.get('/school-portal/admissions/:id', requireSchoolAdmin, getAdmission);
router.post('/school-portal/admissions/:id/approve', requireSchoolAdmin, approveAdmission);
router.patch('/school-portal/admissions/:id/status', requireSchoolAdmin, updateAdmissionStatus);
router.patch('/school-portal/admissions/:id', requireSchoolAdmin, updateAdmission);
router.delete('/school-portal/admissions/:id', requireSchoolAdmin, deleteAdmission);

// ==========================================================================
// INVENTORY / SCHOOL ASSETS — school-admin. Static routes before :id.
// ==========================================================================
router.get('/school-portal/inventory/stats', requireSchoolAdmin, getInventoryStats);
router.get('/school-portal/inventory/movements', requireSchoolAdmin, listStockMovements);
router.get('/school-portal/inventory/categories', requireSchoolAdmin, listAssetCategories);
router.post('/school-portal/inventory/categories', requireSchoolAdmin, createAssetCategory);
router.patch('/school-portal/inventory/categories/:id', requireSchoolAdmin, updateAssetCategory);
router.delete('/school-portal/inventory/categories/:id', requireSchoolAdmin, deleteAssetCategory);
router.get('/school-portal/inventory/assets', requireSchoolAdmin, listAssets);
router.post('/school-portal/inventory/assets', requireSchoolAdmin, createAsset);
router.get('/school-portal/inventory/assets/:id', requireSchoolAdmin, getAsset);
router.post('/school-portal/inventory/assets/:id/movement', requireSchoolAdmin, recordAssetMovement);
router.patch('/school-portal/inventory/assets/:id', requireSchoolAdmin, updateAsset);
router.delete('/school-portal/inventory/assets/:id', requireSchoolAdmin, deleteAsset);

router.get('/subscriptions', requireSuperAdmin, listPlans);
router.post('/subscriptions', requireSuperAdmin, createPlan);
router.put('/subscriptions/:id', requireSuperAdmin, updatePlan);
router.delete('/subscriptions/:id', requireSuperAdmin, deletePlan);
router.post('/device-tokens', registerDevice);
router.get('/notifications/inbox', inboxNotifications);
router.get('/notifications', requireSuperAdmin, listNotifications);
router.post('/notifications', requireSuperAdmin, sendNotification);
router.get('/billings', requireSuperAdmin, listInvoices);
router.post('/billings', requireSuperAdmin, createInvoice);
router.get('/billings/gateway', requireSuperAdmin, getPaymentGateway);
router.get('/billings/:id', requireSuperAdmin, getInvoice);
router.post('/billings/:id/razorpay-order', requireSuperAdmin, createRazorpayOrder);
router.post('/billings/:id/razorpay-verify', requireSuperAdmin, verifyRazorpayPayment);
router.patch('/billings/:id/pay', requireSuperAdmin, markInvoicePaid);
router.patch('/billings/:id/refund', requireSuperAdmin, refundInvoice);
router.patch('/billings/:id/cancel', requireSuperAdmin, cancelInvoice);
router.get('/privacy-policy', getLegalDocuments);
router.put('/privacy-policy', requireSuperAdmin, updateLegalDocuments);
router.get('/reports', requireSuperAdmin, getReportSummary);
router.get('/reports/schools', requireSuperAdmin, listSchoolReports);
router.get('/reports/subscriptions', requireSuperAdmin, listSubscriptionReports);
router.get('/reports/invoices', requireSuperAdmin, listInvoiceReports);
router.get('/reports/notifications', requireSuperAdmin, listNotificationReports);
router.get('/support/tickets', requireSuperAdmin, listTickets);
router.post('/support/tickets', requireSuperAdmin, createTicket);
router.get('/support/tickets/:id', requireSuperAdmin, getTicket);
router.post('/support/tickets/:id/replies', requireSuperAdmin, replyTicket);
router.patch('/support/tickets/:id/status', requireSuperAdmin, updateTicketStatus);
router.get('/support/school/:schoolId/tickets', requireSchoolAdmin, assertSchoolAccess, listSchoolTickets);
router.post('/support/school/:schoolId/tickets', requireSchoolAdmin, assertSchoolAccess, createSchoolTicket);
router.get('/support/school/:schoolId/tickets/:id', requireSchoolAdmin, assertSchoolAccess, getSchoolTicket);
router.post('/support/school/:schoolId/tickets/:id/replies', requireSchoolAdmin, assertSchoolAccess, replySchoolTicket);
router.get('/', getServiceInfo);
router.use(notFound);

export default router;

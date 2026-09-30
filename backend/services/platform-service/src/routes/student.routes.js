/**
 * Student APK API surface.
 *
 * Mounted from platformRoutes.js (`router.use(studentApkRoutes)`), so every path
 * here is reached at `/api/v1/platform/...` through the api-gateway, exactly
 * like the other role portals. Sibling of teacher.routes.js — same conventions
 * (one Express Router, static paths before `:param`, `requireStudent` on every
 * authenticated route, `enforceSubscriptionAccess` folded into that guard).
 *
 * Bottom nav: HOME · ACADEMICS · ATTENDANCE · NOTIFICATIONS · PROFILE.
 */
import { Router } from 'express';
import { loginRateLimiter, changePasswordRateLimiter } from '../middleware/loginRateLimiter.js';
import { studentDeleteAccount } from '../controllers/appAccount.controller.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { requireStudent } from '../middleware/requireStudent.js';
import { withIdempotency } from '../middleware/idempotency.js';
import { uploadStudentSelfPhoto, convertStudentImages } from '../middleware/uploadStudentPhoto.js';
import { uploadMaterialFile, verifyMaterialFile } from '../middleware/uploadTeacherResource.js';

import {
  studentLogin,
  studentLogout,
  studentMe,
  studentChangePassword,
  getStudentProfile,
  updateStudentProfile,
  getStudentAcademicInfo,
  getStudentGuardians,
  getStudentDocuments,
  getStudentDocumentGroup,
  getStudentDocumentDownloadUrl,
  getStudentSettings,
  updateStudentSettings,
} from '../controllers/student/studentAuth.controller.js';
import {
  getStudentDashboard,
  getStudentToday,
  getStudentUpcoming,
} from '../controllers/student/studentHome.controller.js';
import {
  getTimetableWeek,
  getTimetableDay,
  getTimetableToday,
  listClasswork,
  getClasswork,
} from '../controllers/student/studentAcademics.controller.js';
import {
  listHomework,
  listPendingHomework,
  listCompletedHomework,
  getHomework,
  submitHomework,
  listMaterials,
  getMaterial,
  getMaterialDownloadUrl,
} from '../controllers/student/studentWork.controller.js';
import {
  getAttendanceSummary,
  getAttendanceDaily,
  getAttendanceMonthly,
} from '../controllers/student/studentAttendance.controller.js';
import {
  listExams,
  listUpcomingExams,
  getExam,
  getExamSchedule,
  listResults,
  getResult,
  getSubjectResults,
  getReportCard,
} from '../controllers/student/studentExams.controller.js';
import {
  getFeeSummary,
  getPendingFees,
  listFeeInvoices,
  getFeeInvoice,
  getFeeHistory,
} from '../controllers/student/studentFees.controller.js';
import {
  listLeaves,
  getLeave,
  applyLeave,
  updateLeave,
  cancelLeave,
} from '../controllers/student/studentLeave.controller.js';
import {
  listNotices,
  getNotice,
  markNoticeRead,
  markAllNoticesRead,
  listEvents,
  getEvent,
  listNotifications,
  getNotificationsUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  registerDevice,
} from '../controllers/student/studentInbox.controller.js';

const router = Router();
const oid = (p) => validateObjectId(p);
const S = '/school-portal/student';

// ============================ 01 · AUTH ============================
router.post('/school-portal/auth/student-login', loginRateLimiter, studentLogin);
router.post('/school-auth/student-login', loginRateLimiter, studentLogin);
router.post(`${S}/auth/logout`, requireStudent, studentLogout);
router.get(`${S}/me`, requireStudent, studentMe);
router.patch(`${S}/change-password`, requireStudent, changePasswordRateLimiter, studentChangePassword);
router.post(`${S}/account/delete`, requireStudent, changePasswordRateLimiter, studentDeleteAccount);

// ============================ 02 · HOME ============================
router.get(`${S}/dashboard`, requireStudent, getStudentDashboard);
router.get(`${S}/today`, requireStudent, getStudentToday);
router.get(`${S}/upcoming`, requireStudent, getStudentUpcoming);

// ============================ 03 · PROFILE ============================
router.get(`${S}/profile`, requireStudent, getStudentProfile);
router.patch(`${S}/profile`, requireStudent, uploadStudentSelfPhoto, convertStudentImages, updateStudentProfile);
router.get(`${S}/academic-info`, requireStudent, getStudentAcademicInfo);
router.get(`${S}/guardians`, requireStudent, getStudentGuardians);

// ============================ 04 · DOCUMENTS ============================
router.get(`${S}/documents`, requireStudent, getStudentDocuments);
router.get(`${S}/documents/download-url`, requireStudent, getStudentDocumentDownloadUrl);
router.get(`${S}/documents/:key`, requireStudent, getStudentDocumentGroup);

// ============================ 05 · SETTINGS ============================
router.get(`${S}/settings`, requireStudent, getStudentSettings);
router.patch(`${S}/settings`, requireStudent, updateStudentSettings);

// ============================ 06 · TIMETABLE ============================
router.get(`${S}/timetable`, requireStudent, getTimetableWeek);
router.get(`${S}/timetable/today`, requireStudent, getTimetableToday);
router.get(`${S}/timetable/day/:day`, requireStudent, getTimetableDay);

// ============================ 07 · HOMEWORK ============================
router.get(`${S}/homework`, requireStudent, listHomework);
router.get(`${S}/homework/pending`, requireStudent, listPendingHomework);
router.get(`${S}/homework/completed`, requireStudent, listCompletedHomework);
router.get(`${S}/homework/:id`, requireStudent, oid('id'), getHomework);
router.post(
  `${S}/homework/:id/submission`,
  requireStudent,
  oid('id'),
  withIdempotency('homework.submit'),
  uploadMaterialFile,
  verifyMaterialFile,
  submitHomework
);

// ============================ 08 · CLASSWORK ============================
router.get(`${S}/classwork`, requireStudent, listClasswork);
router.get(`${S}/classwork/:id`, requireStudent, oid('id'), getClasswork);

// ============================ 09 · STUDY MATERIAL ============================
router.get(`${S}/materials`, requireStudent, listMaterials);
router.get(`${S}/materials/:id`, requireStudent, oid('id'), getMaterial);
router.get(`${S}/materials/:id/download-url`, requireStudent, oid('id'), getMaterialDownloadUrl);

// ============================ 10 · ATTENDANCE ============================
router.get(`${S}/attendance/summary`, requireStudent, getAttendanceSummary);
router.get(`${S}/attendance/daily`, requireStudent, getAttendanceDaily);
router.get(`${S}/attendance/monthly`, requireStudent, getAttendanceMonthly);

// ============================ 11 · EXAMS ============================
router.get(`${S}/exams`, requireStudent, listExams);
router.get(`${S}/exams/upcoming`, requireStudent, listUpcomingExams);
router.get(`${S}/exams/:examId`, requireStudent, oid('examId'), getExam);
router.get(`${S}/exams/:examId/schedule`, requireStudent, oid('examId'), getExamSchedule);

// ============================ 12 · RESULTS ============================
router.get(`${S}/results`, requireStudent, listResults);
router.get(`${S}/report-card`, requireStudent, getReportCard);
router.get(`${S}/results/:examId`, requireStudent, oid('examId'), getResult);
router.get(`${S}/results/:examId/subjects`, requireStudent, oid('examId'), getSubjectResults);

// ============================ 13 · FEES ============================
router.get(`${S}/fees/summary`, requireStudent, getFeeSummary);
router.get(`${S}/fees/pending`, requireStudent, getPendingFees);
router.get(`${S}/fees/history`, requireStudent, getFeeHistory);
router.get(`${S}/fees/invoices`, requireStudent, listFeeInvoices);
router.get(`${S}/fees/invoices/:id`, requireStudent, oid('id'), getFeeInvoice);

// ============================ 14 · LEAVE ============================
router.get(`${S}/leaves`, requireStudent, listLeaves);
router.post(`${S}/leaves`, requireStudent, applyLeave);
router.get(`${S}/leaves/:id`, requireStudent, oid('id'), getLeave);
router.patch(`${S}/leaves/:id`, requireStudent, oid('id'), updateLeave);
router.post(`${S}/leaves/:id/cancel`, requireStudent, oid('id'), cancelLeave);

// ============================ 15 · NOTICES ============================
router.get(`${S}/notices`, requireStudent, listNotices);
router.patch(`${S}/notices/read-all`, requireStudent, markAllNoticesRead);
router.get(`${S}/notices/:id`, requireStudent, oid('id'), getNotice);
router.patch(`${S}/notices/:id/read`, requireStudent, oid('id'), markNoticeRead);

// ============================ 16 · EVENTS ============================
router.get(`${S}/events`, requireStudent, listEvents);
router.get(`${S}/events/:id`, requireStudent, oid('id'), getEvent);

// ============================ 17 · NOTIFICATIONS ============================
router.get(`${S}/notifications`, requireStudent, listNotifications);
router.get(`${S}/notifications/unread-count`, requireStudent, getNotificationsUnreadCount);
router.patch(`${S}/notifications/read-all`, requireStudent, markAllNotificationsRead);
router.patch(`${S}/notifications/:id/read`, requireStudent, oid('id'), markNotificationRead);
router.post(`${S}/device-tokens`, requireStudent, registerDevice);

export default router;

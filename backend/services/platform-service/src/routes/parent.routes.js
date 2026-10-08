/**
 * Parent APK API surface.
 *
 * Mounted from platformRoutes.js (`router.use(parentApkRoutes)`), reached at
 * `/api/v1/platform/...` through the api-gateway like every other role portal.
 * Sibling of teacher.routes.js / student.routes.js — one Express Router, same
 * conventions. `requireParent` on every authenticated route; child data is
 * authorized by parentAccess.resolveChild against the ParentStudent link.
 *
 * Bottom nav: HOME · ACADEMICS · ATTENDANCE · NOTICES · PROFILE  (+ 🔔 top-right).
 * Fees / Payments / Receipts / Pickup / Settings open from the Profile tab.
 */
import { Router } from 'express';
import { loginRateLimiter, changePasswordRateLimiter } from '../middleware/loginRateLimiter.js';
import { parentDeleteAccount } from '../controllers/appAccount.controller.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { requireParent } from '../middleware/requireParent.js';
import { withIdempotency } from '../middleware/idempotency.js';
import { uploadStudentFiles, convertStudentImages } from '../middleware/uploadStudentPhoto.js';

import {
  parentLogin,
  parentLogout,
  parentMe,
  parentChangePassword,
  getParentProfile,
  updateParentProfile,
  getParentSettings,
  updateParentSettings,
  listChildren,
  getChild,
} from '../controllers/parent/parentAuth.controller.js';
import { getDashboard, getOverview } from '../controllers/parent/parentHome.controller.js';
import {
  listHomework,
  getHomework,
  listClasswork,
  getClasswork,
  listMaterials,
  getMaterial,
  getMaterialDownloadUrl,
  getTimetableWeek,
  getTimetableToday,
  getTimetableDay,
  listExams,
  listUpcomingExams,
  getExam,
  getExamSchedule,
  listResults,
  getResult,
  getSubjectResults,
  getReportCard,
} from '../controllers/parent/parentAcademics.controller.js';
import { getSummary as attnSummary, getDaily as attnDaily, getMonthly as attnMonthly } from '../controllers/parent/parentAttendance.controller.js';
import {
  getSummary as feeSummary,
  getPending as feePending,
  listInvoices as feeInvoices,
  getInvoice as feeInvoice,
  getHistory as feeHistory,
  createPayOrder,
  verifyPayment,
  listReceipts,
  getReceipt,
} from '../controllers/parent/parentFees.controller.js';
import { listPickup, getPickup } from '../controllers/parent/parentPickup.controller.js';
import { getTransport, getTransportHistory } from '../controllers/parent/parentTransport.controller.js';
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
} from '../controllers/parent/parentInbox.controller.js';

const router = Router();
const oid = (p) => validateObjectId(p);
const P = '/school-portal/parent';
const C = `${P}/children/:childId`;
const child = oid('childId');

// ============================ 01 · AUTH ============================
router.post('/school-portal/auth/parent-login', loginRateLimiter, parentLogin);
router.post('/school-auth/parent-login', loginRateLimiter, parentLogin);
router.post(`${P}/auth/logout`, requireParent, parentLogout);
router.get(`${P}/me`, requireParent, parentMe);
router.patch(`${P}/change-password`, requireParent, changePasswordRateLimiter, parentChangePassword);
router.post(`${P}/account/delete`, requireParent, changePasswordRateLimiter, parentDeleteAccount);

// ============================ 02 · PROFILE + SETTINGS ============================
router.get(`${P}/profile`, requireParent, getParentProfile);
router.patch(`${P}/profile`, requireParent, uploadStudentFiles, convertStudentImages, updateParentProfile);
router.get(`${P}/settings`, requireParent, getParentSettings);
router.patch(`${P}/settings`, requireParent, updateParentSettings);

// ============================ 03 · CHILDREN ============================
router.get(`${P}/children`, requireParent, listChildren);

// ============================ 04 · HOME ============================
router.get(`${P}/dashboard/overview`, requireParent, getOverview);
router.get(`${P}/dashboard`, requireParent, getDashboard);

// ============================ 05 · ACADEMICS (child-scoped) ============================
router.get(`${C}/homework`, requireParent, child, listHomework);
router.get(`${C}/homework/:id`, requireParent, child, oid('id'), getHomework);
router.get(`${C}/classwork`, requireParent, child, listClasswork);
router.get(`${C}/classwork/:id`, requireParent, child, oid('id'), getClasswork);
router.get(`${C}/materials`, requireParent, child, listMaterials);
router.get(`${C}/materials/:id`, requireParent, child, oid('id'), getMaterial);
router.get(`${C}/materials/:id/download-url`, requireParent, child, oid('id'), getMaterialDownloadUrl);
router.get(`${C}/timetable`, requireParent, child, getTimetableWeek);
router.get(`${C}/timetable/today`, requireParent, child, getTimetableToday);
router.get(`${C}/timetable/day/:day`, requireParent, child, getTimetableDay);
router.get(`${C}/exams`, requireParent, child, listExams);
router.get(`${C}/exams/upcoming`, requireParent, child, listUpcomingExams);
router.get(`${C}/exams/:examId`, requireParent, child, oid('examId'), getExam);
router.get(`${C}/exams/:examId/schedule`, requireParent, child, oid('examId'), getExamSchedule);
router.get(`${C}/results`, requireParent, child, listResults);
router.get(`${C}/report-card`, requireParent, child, getReportCard);
router.get(`${C}/results/:examId`, requireParent, child, oid('examId'), getResult);
router.get(`${C}/results/:examId/subjects`, requireParent, child, oid('examId'), getSubjectResults);

// ============================ 06 · ATTENDANCE (child-scoped) ============================
router.get(`${C}/attendance/summary`, requireParent, child, attnSummary);
router.get(`${C}/attendance/daily`, requireParent, child, attnDaily);
router.get(`${C}/attendance/monthly`, requireParent, child, attnMonthly);

// ============================ 07 · FEES / PAYMENTS / RECEIPTS (child-scoped) ============================
router.get(`${C}/fees/summary`, requireParent, child, feeSummary);
router.get(`${C}/fees/pending`, requireParent, child, feePending);
router.get(`${C}/fees/history`, requireParent, child, feeHistory);
router.get(`${C}/fees/invoices`, requireParent, child, feeInvoices);
router.get(`${C}/fees/invoices/:id`, requireParent, child, oid('id'), feeInvoice);
router.post(`${C}/fees/invoices/:id/pay-order`, requireParent, child, oid('id'), withIdempotency('parent.fee.pay-order'), createPayOrder);
router.post(`${C}/fees/payments/verify`, requireParent, child, verifyPayment);
router.get(`${C}/fees/receipts`, requireParent, child, listReceipts);
router.get(`${C}/fees/receipts/:paymentId`, requireParent, child, oid('paymentId'), getReceipt);

// ============================ 08 · PICKUP (read-only, child-scoped) ============================
router.get(`${C}/pickup`, requireParent, child, listPickup);
router.get(`${C}/pickup/:sessionId`, requireParent, child, oid('sessionId'), getPickup);

// ============================ 08b · TRANSPORT (read-only, child-scoped) ============================
router.get(`${C}/transport`, requireParent, child, getTransport);
router.get(`${C}/transport/history`, requireParent, child, getTransportHistory);

// ============================ 09 · NOTICES ============================
router.get(`${P}/notices`, requireParent, listNotices);
router.patch(`${P}/notices/read-all`, requireParent, markAllNoticesRead);
router.get(`${P}/notices/:id`, requireParent, oid('id'), getNotice);
router.patch(`${P}/notices/:id/read`, requireParent, oid('id'), markNoticeRead);

// ============================ 10 · EVENTS ============================
router.get(`${P}/events`, requireParent, listEvents);
router.get(`${P}/events/:id`, requireParent, oid('id'), getEvent);

// ============================ 11 · NOTIFICATIONS ============================
router.get(`${P}/notifications`, requireParent, listNotifications);
router.get(`${P}/notifications/unread-count`, requireParent, getNotificationsUnreadCount);
router.patch(`${P}/notifications/read-all`, requireParent, markAllNotificationsRead);
router.patch(`${P}/notifications/:id/read`, requireParent, oid('id'), markNotificationRead);
router.post(`${P}/device-tokens`, requireParent, registerDevice);

// ---- child profile detail LAST so it can't shadow /children/:childId/<sub> paths ----
router.get(`${P}/children/:childId`, requireParent, child, getChild);

export default router;

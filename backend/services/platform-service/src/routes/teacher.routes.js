/**
 * Teacher APK API surface.
 *
 * Mounted from platformRoutes.js (`router.use(teacherApkRoutes)`), so every path
 * here is reached at `/api/v1/platform/...` through the api-gateway, exactly
 * like the other role portals. Kept in its own file because it is ~70 routes;
 * still one Express Router, same conventions (static paths before `:param`).
 */
import { Router } from 'express';
import { loginRateLimiter } from '../middleware/loginRateLimiter.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { requireTeacher } from '../middleware/requireTeacher.js';
import { uploadTeacherFiles, convertTeacherImages } from '../middleware/uploadTeacherPhoto.js';

import {
  teacherLogin,
  teacherLogout,
  teacherMe,
  teacherChangePassword,
  getTeacherProfile,
  updateTeacherProfile,
  getTeacherDocuments,
} from '../controllers/teacher/teacherAuth.controller.js';
import {
  getTeacherDashboard,
  getTeacherTodaySchedule,
  getTeacherTimetable,
  getTeacherTimetableDay,
  getTeacherScheduleEntry,
} from '../controllers/teacher/teacherHome.controller.js';
import {
  listTeacherClasses,
  getTeacherClass,
  getTeacherClassSections,
  getTeacherSectionStudents,
  getTeacherStudent,
} from '../controllers/teacher/teacherAcademics.controller.js';
import {
  getAttendanceToday,
  submitAttendance,
  patchAttendance,
  finalizeAttendance,
  getAttendanceHistory,
  getSectionAttendance,
  getStudentAttendance,
  getAttendanceSummary,
} from '../controllers/teacher/teacherAttendance.controller.js';
import { withIdempotency } from '../middleware/idempotency.js';
import { pickupRateLimiter } from '../middleware/pickupRateLimiter.js';
import { uploadMaterialFile, verifyMaterialFile } from '../middleware/uploadTeacherResource.js';
import {
  listEligibleStudents,
  initiatePickup,
  getPickupSession,
  verifyPickupOtp,
  resendPickupOtp,
  completePickup,
  cancelPickup,
} from '../controllers/teacher/teacherPickup.controller.js';
import {
  listHomework,
  getHomework,
  createHomework,
  updateHomework,
  deleteHomework,
  getHomeworkSubmissions,
  listAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  gradeAssignmentSubmission,
  listMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from '../controllers/teacher/teacherWork.controller.js';
import {
  listExams,
  getExam,
  getExamSchedule,
  getExamSubjects,
  getExamMarks,
  saveExamMarks,
  patchExamMark,
} from '../controllers/teacher/teacherExams.controller.js';
import {
  applyLeave,
  listLeaves,
  getLeave,
  cancelLeave,
  listAnnouncements,
  getAnnouncement,
  readAnnouncement,
  listNotifications,
  notificationsUnreadCount,
  readNotification,
  readAllNotifications,
  registerTeacherDevice,
  listConversations,
  getConversationMessages,
  postConversationMessage,
  readConversationMessage,
} from '../controllers/teacher/teacherInbox.controller.js';

const router = Router();
const oid = (p) => validateObjectId(p);

// ============================ 01 · AUTH ============================
router.post('/school-auth/teacher-login', loginRateLimiter, teacherLogin);
router.post('/school-portal/auth/teacher-login', loginRateLimiter, teacherLogin);
router.post('/school-portal/teacher/auth/logout', requireTeacher, teacherLogout);
router.get('/school-portal/teacher/me', requireTeacher, teacherMe);
router.patch('/school-portal/teacher/change-password', requireTeacher, teacherChangePassword);

// ============================ 14 · PROFILE ============================
router.get('/school-portal/teacher/profile', requireTeacher, getTeacherProfile);
router.patch(
  '/school-portal/teacher/profile',
  requireTeacher,
  uploadTeacherFiles,
  convertTeacherImages,
  updateTeacherProfile
);
router.get('/school-portal/teacher/documents', requireTeacher, getTeacherDocuments);

// ============================ 02 · HOME ============================
router.get('/school-portal/teacher/dashboard', requireTeacher, getTeacherDashboard);
router.get('/school-portal/teacher/today-schedule', requireTeacher, getTeacherTodaySchedule);

// ============================ 03 · CLASSES ============================
router.get('/school-portal/teacher/classes', requireTeacher, listTeacherClasses);
router.get('/school-portal/teacher/classes/:classId', requireTeacher, oid('classId'), getTeacherClass);
router.get('/school-portal/teacher/classes/:classId/sections', requireTeacher, oid('classId'), getTeacherClassSections);
router.get('/school-portal/teacher/sections/:sectionId/students', requireTeacher, oid('sectionId'), getTeacherSectionStudents);
router.get('/school-portal/teacher/students/:studentId', requireTeacher, oid('studentId'), getTeacherStudent);

// ============================ 04 · ATTENDANCE ============================
router.get('/school-portal/teacher/attendance/today', requireTeacher, getAttendanceToday);
router.get('/school-portal/teacher/attendance/history', requireTeacher, getAttendanceHistory);
router.get('/school-portal/teacher/attendance/summary', requireTeacher, getAttendanceSummary);
router.get('/school-portal/teacher/attendance/section/:sectionId', requireTeacher, oid('sectionId'), getSectionAttendance);
router.get('/school-portal/teacher/attendance/student/:studentId', requireTeacher, oid('studentId'), getStudentAttendance);
router.post('/school-portal/teacher/attendance', requireTeacher, withIdempotency('attendance.submit'), submitAttendance);
router.patch('/school-portal/teacher/attendance/:attendanceId', requireTeacher, oid('attendanceId'), patchAttendance);
router.post('/school-portal/teacher/attendance/:attendanceId/finalize', requireTeacher, oid('attendanceId'), finalizeAttendance);

// ============================ 05 · TIMETABLE ============================
router.get('/school-portal/teacher/timetable', requireTeacher, getTeacherTimetable);
router.get('/school-portal/teacher/timetable/day/:day', requireTeacher, getTeacherTimetableDay);
router.get('/school-portal/teacher/schedule/:scheduleId', requireTeacher, oid('scheduleId'), getTeacherScheduleEntry);

// ============================ 06 · HOMEWORK ============================
router.get('/school-portal/teacher/homework', requireTeacher, listHomework);
router.post('/school-portal/teacher/homework', requireTeacher, createHomework);
router.get('/school-portal/teacher/homework/:id', requireTeacher, oid('id'), getHomework);
router.patch('/school-portal/teacher/homework/:id', requireTeacher, oid('id'), updateHomework);
router.delete('/school-portal/teacher/homework/:id', requireTeacher, oid('id'), deleteHomework);
router.get('/school-portal/teacher/homework/:id/submissions', requireTeacher, oid('id'), getHomeworkSubmissions);

// ============================ 07 · ASSIGNMENTS ============================
router.get('/school-portal/teacher/assignments', requireTeacher, listAssignments);
router.post('/school-portal/teacher/assignments', requireTeacher, createAssignment);
router.get('/school-portal/teacher/assignments/:id', requireTeacher, oid('id'), getAssignment);
router.patch('/school-portal/teacher/assignments/:id', requireTeacher, oid('id'), updateAssignment);
router.delete('/school-portal/teacher/assignments/:id', requireTeacher, oid('id'), deleteAssignment);
router.get('/school-portal/teacher/assignments/:id/submissions', requireTeacher, oid('id'), getAssignmentSubmissions);
router.patch(
  '/school-portal/teacher/assignments/:id/submissions/:submissionId/grade',
  requireTeacher,
  oid('id'),
  oid('submissionId'),
  gradeAssignmentSubmission
);

// ============================ 09 · EXAMS & MARKS ============================
router.get('/school-portal/teacher/exams', requireTeacher, listExams);
router.get('/school-portal/teacher/exams/:examId', requireTeacher, oid('examId'), getExam);
router.get('/school-portal/teacher/exams/:examId/schedule', requireTeacher, oid('examId'), getExamSchedule);
router.get('/school-portal/teacher/exams/:examId/subjects', requireTeacher, oid('examId'), getExamSubjects);
router.get('/school-portal/teacher/exams/:examId/marks', requireTeacher, oid('examId'), getExamMarks);
router.post('/school-portal/teacher/exams/:examId/marks', requireTeacher, oid('examId'), withIdempotency('exam.marks.submit'), saveExamMarks);
router.patch('/school-portal/teacher/exams/:examId/marks/:markId', requireTeacher, oid('examId'), oid('markId'), patchExamMark);

// ============================ 08 · STUDY MATERIAL ============================
router.get('/school-portal/teacher/materials', requireTeacher, listMaterials);
router.post('/school-portal/teacher/materials', requireTeacher, uploadMaterialFile, verifyMaterialFile, createMaterial);
router.get('/school-portal/teacher/materials/:id', requireTeacher, oid('id'), getMaterial);
router.patch('/school-portal/teacher/materials/:id', requireTeacher, oid('id'), uploadMaterialFile, verifyMaterialFile, updateMaterial);
router.delete('/school-portal/teacher/materials/:id', requireTeacher, oid('id'), deleteMaterial);

// ============================ 10 · LEAVE ============================
router.get('/school-portal/teacher/leaves', requireTeacher, listLeaves);
router.post('/school-portal/teacher/leaves', requireTeacher, applyLeave);
router.get('/school-portal/teacher/leaves/:id', requireTeacher, oid('id'), getLeave);
router.delete('/school-portal/teacher/leaves/:id', requireTeacher, oid('id'), cancelLeave);

// ============================ 11 · ANNOUNCEMENTS ============================
router.get('/school-portal/teacher/announcements', requireTeacher, listAnnouncements);
router.get('/school-portal/teacher/announcements/:id', requireTeacher, oid('id'), getAnnouncement);
router.patch('/school-portal/teacher/announcements/:id/read', requireTeacher, oid('id'), readAnnouncement);

// ============================ 12 · NOTIFICATIONS ============================
router.get('/school-portal/teacher/notifications', requireTeacher, listNotifications);
router.get('/school-portal/teacher/notifications/unread-count', requireTeacher, notificationsUnreadCount);
router.patch('/school-portal/teacher/notifications/read-all', requireTeacher, readAllNotifications);
router.patch('/school-portal/teacher/notifications/:id/read', requireTeacher, oid('id'), readNotification);
router.post('/school-portal/teacher/device-tokens', requireTeacher, registerTeacherDevice);

// ============================ 15 · SAFE PICKUP ============================
router.get('/school-portal/teacher/pickups/eligible-students', requireTeacher, listEligibleStudents);
router.post('/school-portal/teacher/pickups/initiate', requireTeacher, pickupRateLimiter, initiatePickup);
router.get('/school-portal/teacher/pickups/:pickupSessionId', requireTeacher, oid('pickupSessionId'), getPickupSession);
router.post('/school-portal/teacher/pickups/:pickupSessionId/verify', requireTeacher, oid('pickupSessionId'), pickupRateLimiter, verifyPickupOtp);
router.post('/school-portal/teacher/pickups/:pickupSessionId/resend-otp', requireTeacher, oid('pickupSessionId'), pickupRateLimiter, resendPickupOtp);
router.post('/school-portal/teacher/pickups/:pickupSessionId/complete', requireTeacher, oid('pickupSessionId'), completePickup);
router.post('/school-portal/teacher/pickups/:pickupSessionId/cancel', requireTeacher, oid('pickupSessionId'), cancelPickup);

// ============================ 13 · COMMUNICATION ============================
router.get('/school-portal/teacher/conversations', requireTeacher, listConversations);
router.get('/school-portal/teacher/conversations/:id/messages', requireTeacher, getConversationMessages);
router.post('/school-portal/teacher/conversations/:id/messages', requireTeacher, postConversationMessage);
router.patch('/school-portal/teacher/messages/:id/read', requireTeacher, oid('id'), readConversationMessage);

export default router;

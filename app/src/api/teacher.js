// Every Teacher APK endpoint in one place. Backend: platform-service
// routes/teacher.routes.js — contract doc: docs/flutter-apps/01-teacher-app-flow.md.
// List calls resolve to the raw envelope `{ data, pagination }`; the rest to `data`.

import { api, newIdempotencyKey, request, upload } from './client';

const P = '/school-portal/teacher';
const data = (p) => p.then((r) => r.data);
const id = (v) => encodeURIComponent(String(v));

export const teacherApi = {
  // ---- account ----
  changePassword: (currentPassword, newPassword) =>
    api.patch(`${P}/change-password`, { currentPassword, newPassword }),
  profile: () => data(api.get(`${P}/profile`)),
  updateProfile: (body) => data(api.patch(`${P}/profile`, body)),
  uploadPhoto: (formData) => upload(`${P}/profile`, formData, { method: 'PATCH' }).then((r) => r.data),
  documents: () => data(api.get(`${P}/documents`)),
  settings: () => data(api.get(`${P}/settings`)),
  updateSettings: (notificationPrefs) => data(api.patch(`${P}/settings`, { notificationPrefs })),

  // ---- home ----
  dashboard: () => data(api.get(`${P}/dashboard`)),
  todaySchedule: () => data(api.get(`${P}/today-schedule`)),
  timetable: () => data(api.get(`${P}/timetable`)),
  scheduleEntry: (scheduleId) => data(api.get(`${P}/schedule/${id(scheduleId)}`)),

  // ---- classes ----
  classes: () => data(api.get(`${P}/classes`)),
  teachingSlots: () => data(api.get(`${P}/teaching-slots`)),
  classSections: (classId) => data(api.get(`${P}/classes/${id(classId)}/sections`)),
  sectionStudents: (sectionId, params) => api.get(`${P}/sections/${id(sectionId)}/students`, params),
  student: (studentId) => data(api.get(`${P}/students/${id(studentId)}`)),

  // ---- attendance ----
  attendanceSheet: (sectionId, date) => data(api.get(`${P}/attendance/today`, { sectionId, date })),
  submitAttendance: (body, key = newIdempotencyKey()) =>
    data(api.post(`${P}/attendance`, body, { 'Idempotency-Key': key })),
  patchAttendance: (attendanceId, records) =>
    data(api.patch(`${P}/attendance/${id(attendanceId)}`, { records })),
  finalizeAttendance: (attendanceId) => data(api.post(`${P}/attendance/${id(attendanceId)}/finalize`)),
  attendanceHistory: (params) => api.get(`${P}/attendance/history`, params),
  attendanceSummary: (sectionId, month) => data(api.get(`${P}/attendance/summary`, { sectionId, month })),
  studentAttendance: (studentId) => data(api.get(`${P}/attendance/student/${id(studentId)}`)),

  // ---- homework ----
  homeworkList: (params) => api.get(`${P}/homework`, params),
  homework: (hwId) => data(api.get(`${P}/homework/${id(hwId)}`)),
  createHomework: (body) => data(api.post(`${P}/homework`, body)),
  updateHomework: (hwId, body) => data(api.patch(`${P}/homework/${id(hwId)}`, body)),
  deleteHomework: (hwId) => api.delete(`${P}/homework/${id(hwId)}`),
  homeworkSubmissions: (hwId) => data(api.get(`${P}/homework/${id(hwId)}/submissions`)),

  // ---- assignments ----
  assignmentList: (params) => api.get(`${P}/assignments`, params),
  assignment: (aId) => data(api.get(`${P}/assignments/${id(aId)}`)),
  createAssignment: (body) => data(api.post(`${P}/assignments`, body)),
  updateAssignment: (aId, body) => data(api.patch(`${P}/assignments/${id(aId)}`, body)),
  deleteAssignment: (aId) => api.delete(`${P}/assignments/${id(aId)}`),
  assignmentSubmissions: (aId) => data(api.get(`${P}/assignments/${id(aId)}/submissions`)),
  gradeSubmission: (aId, submissionId, body) =>
    data(api.patch(`${P}/assignments/${id(aId)}/submissions/${id(submissionId)}/grade`, body)),

  // ---- materials ----
  materialList: (params) => api.get(`${P}/materials`, params),
  createMaterial: (formData, onProgress) => upload(`${P}/materials`, formData, { onProgress }).then((r) => r.data),
  deleteMaterial: (mId) => api.delete(`${P}/materials/${id(mId)}`),

  // ---- exams ----
  exams: () => data(api.get(`${P}/exams`)),
  exam: (examId) => data(api.get(`${P}/exams/${id(examId)}`)),
  examSubjects: (examId) => data(api.get(`${P}/exams/${id(examId)}/subjects`)),
  marksSheet: (examId, params) => data(api.get(`${P}/exams/${id(examId)}/marks`, params)),
  saveMarks: (examId, body, key = newIdempotencyKey()) =>
    data(api.post(`${P}/exams/${id(examId)}/marks`, body, { 'Idempotency-Key': key })),

  // ---- leave ----
  leaves: (params) => api.get(`${P}/leaves`, params),
  applyLeave: (body) => data(api.post(`${P}/leaves`, body)),
  cancelLeave: (leaveId) => api.post(`${P}/leaves/${id(leaveId)}/cancel`),

  // ---- inbox ----
  notices: (params) => api.get(`${P}/notices`, params),
  notice: (noticeId) => data(api.get(`${P}/notices/${id(noticeId)}`)),
  markNoticeRead: (noticeId) => api.patch(`${P}/notices/${id(noticeId)}/read`),
  markAllNoticesRead: () => api.patch(`${P}/notices/read-all`),
  events: (params) => api.get(`${P}/events`, params),
  notifications: (params) => api.get(`${P}/notifications`, params),
  unreadCount: () => data(api.get(`${P}/notifications/unread-count`)),
  markNotificationRead: (nId) => api.patch(`${P}/notifications/${id(nId)}/read`),
  markAllNotificationsRead: () => api.patch(`${P}/notifications/read-all`),
  registerDevice: (token, platform) => api.post(`${P}/device-tokens`, { token, platform }),
  conversations: () => data(api.get(`${P}/conversations`)),
  messages: (conversationId, params) => api.get(`${P}/conversations/${id(conversationId)}/messages`, params),
  sendMessage: (conversationId, body) => data(api.post(`${P}/conversations/${id(conversationId)}/messages`, { body })),

  // ---- safe pickup ----
  pickupStudents: (params) => api.get(`${P}/pickups/eligible-students`, params),
  initiatePickup: (studentId, key = newIdempotencyKey()) =>
    data(api.post(`${P}/pickups/initiate`, { studentId }, { 'Idempotency-Key': key })),
  pickupSession: (sessionId) => data(api.get(`${P}/pickups/${id(sessionId)}`)),
  verifyPickup: (sessionId, otp) => data(api.post(`${P}/pickups/${id(sessionId)}/verify`, { otp })),
  resendPickupOtp: (sessionId) => data(api.post(`${P}/pickups/${id(sessionId)}/resend-otp`)),
  completePickup: (sessionId, body) => data(api.post(`${P}/pickups/${id(sessionId)}/complete`, body)),
  cancelPickup: (sessionId) => data(api.post(`${P}/pickups/${id(sessionId)}/cancel`)),
};

// Re-exported so screens can hold one key per Submit tap and reuse it on retry.
export { newIdempotencyKey, request };

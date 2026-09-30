// Every Student APK endpoint in one place. Backend: platform-service
// routes/student.routes.js — contract doc: docs/flutter-apps/02-student-app-flow.md.
// List calls resolve to the raw envelope `{ data, pagination }`; the rest to `data`.
// Identity is never sent: the backend derives student/school/section from the token.

import { api, newIdempotencyKey, upload } from './client';

const P = '/school-portal/student';
const data = (p) => p.then((r) => r.data);
const id = (v) => encodeURIComponent(String(v));

export const studentApi = {
  // ---- account ----
  changePassword: (currentPassword, newPassword) =>
    api.patch(`${P}/change-password`, { currentPassword, newPassword }),
  profile: () => data(api.get(`${P}/profile`)),
  updateProfile: (body) => data(api.patch(`${P}/profile`, body)),
  uploadPhoto: (formData) => upload(`${P}/profile`, formData, { method: 'PATCH' }).then((r) => r.data),
  academicInfo: () => data(api.get(`${P}/academic-info`)),
  guardians: () => data(api.get(`${P}/guardians`)),
  documents: () => data(api.get(`${P}/documents`)),
  documentUrl: (path) => data(api.get(`${P}/documents/download-url`, { path })),
  settings: () => data(api.get(`${P}/settings`)),
  updateSettings: (notificationPrefs) => data(api.patch(`${P}/settings`, { notificationPrefs })),

  // ---- home ----
  dashboard: () => data(api.get(`${P}/dashboard`)),
  today: () => data(api.get(`${P}/today`)),
  upcoming: () => data(api.get(`${P}/upcoming`)),

  // ---- timetable ----
  timetable: () => data(api.get(`${P}/timetable`)),

  // ---- homework ----
  homeworkList: (params) => api.get(`${P}/homework`, params),
  homework: (hwId) => data(api.get(`${P}/homework/${id(hwId)}`)),
  // multipart: `file` (optional) + `remarks`; one Idempotency-Key per Submit tap.
  submitHomework: (hwId, formData, { key = newIdempotencyKey(), onProgress } = {}) =>
    upload(`${P}/homework/${id(hwId)}/submission`, formData, { onProgress, headers: { 'Idempotency-Key': key } }).then(
      (r) => r.data,
    ),

  // ---- classwork ----
  classworkList: (params) => api.get(`${P}/classwork`, params),
  classwork: (cwId) => data(api.get(`${P}/classwork/${id(cwId)}`)),

  // ---- study material ----
  materialList: (params) => api.get(`${P}/materials`, params),
  // Short-lived: fetch at tap time, never cache (doc §6.4).
  materialUrl: (mId) => data(api.get(`${P}/materials/${id(mId)}/download-url`)),

  // ---- attendance ----
  attendanceSummary: () => data(api.get(`${P}/attendance/summary`)),
  attendanceMonthly: (month) => data(api.get(`${P}/attendance/monthly`, { month })),

  // ---- exams & results ----
  exams: (params) => api.get(`${P}/exams`, params),
  exam: (examId) => data(api.get(`${P}/exams/${id(examId)}`)),
  examSchedule: (examId) => data(api.get(`${P}/exams/${id(examId)}/schedule`)),
  results: (params) => api.get(`${P}/results`, params),
  result: (examId) => data(api.get(`${P}/results/${id(examId)}`)),
  reportCard: () => data(api.get(`${P}/report-card`)),

  // ---- fees (view only — payment lives in the Parent app) ----
  feeSummary: () => data(api.get(`${P}/fees/summary`)),
  pendingFees: () => data(api.get(`${P}/fees/pending`)),
  invoices: (params) => api.get(`${P}/fees/invoices`, params),
  invoice: (invId) => data(api.get(`${P}/fees/invoices/${id(invId)}`)),
  feeHistory: (params) => api.get(`${P}/fees/history`, params),

  // ---- leave ----
  leaves: (params) => api.get(`${P}/leaves`, params),
  leave: (leaveId) => data(api.get(`${P}/leaves/${id(leaveId)}`)),
  applyLeave: (body) => data(api.post(`${P}/leaves`, body)),
  updateLeave: (leaveId, body) => data(api.patch(`${P}/leaves/${id(leaveId)}`, body)),
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
};

export { newIdempotencyKey };

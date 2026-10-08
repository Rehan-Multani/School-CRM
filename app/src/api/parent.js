// Every Parent APK endpoint in one place. Backend: platform-service
// routes/parent.routes.js — contract doc: docs/flutter-apps/03-parent-app-flow.md.
// List calls resolve to the raw envelope `{ data, pagination }`; the rest to `data`.
//
// Two levels: `parentApi` (the parent's own account, notices, notifications) and
// `childApi(childId)` — the child-scoped reads, with the SAME method names as
// `studentApi` so the shared student screens work unchanged (see PortalScope).
// The backend re-checks the parent↔child link on every call (CHILD_ACCESS_DENIED).

import { api, newIdempotencyKey, upload } from './client';

const P = '/school-portal/parent';
const data = (p) => p.then((r) => r.data);
const id = (v) => encodeURIComponent(String(v));

export const parentApi = {
  // ---- account ----
  changePassword: (currentPassword, newPassword) =>
    api.patch(`${P}/change-password`, { currentPassword, newPassword }),
  profile: () => data(api.get(`${P}/profile`)),
  updateProfile: (body) => data(api.patch(`${P}/profile`, body)),
  uploadPhoto: (formData) => upload(`${P}/profile`, formData, { method: 'PATCH' }).then((r) => r.data),
  settings: () => data(api.get(`${P}/settings`)),
  updateSettings: (notificationPrefs) => data(api.patch(`${P}/settings`, { notificationPrefs })),

  // ---- children & home ----
  children: () => data(api.get(`${P}/children`)),
  overview: () => data(api.get(`${P}/dashboard/overview`)),
  dashboard: (childId) => data(api.get(`${P}/dashboard`, { childId })),

  // ---- inbox (parent-level, not per child) ----
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

/** Child-scoped API. Method names mirror `studentApi` (read side). */
export function childApi(childId) {
  const C = `${P}/children/${id(childId)}`;
  return {
    childProfile: () => data(api.get(C)),

    // ---- timetable ----
    timetable: () => data(api.get(`${C}/timetable`)),

    // ---- homework / classwork / material (read-only for a parent) ----
    homeworkList: (params) => api.get(`${C}/homework`, params),
    homework: (hwId) => data(api.get(`${C}/homework/${id(hwId)}`)),
    classworkList: (params) => api.get(`${C}/classwork`, params),
    classwork: (cwId) => data(api.get(`${C}/classwork/${id(cwId)}`)),
    materialList: (params) => api.get(`${C}/materials`, params),
    materialUrl: (mId) => data(api.get(`${C}/materials/${id(mId)}/download-url`)),

    // ---- attendance ----
    attendanceSummary: () => data(api.get(`${C}/attendance/summary`)),
    attendanceMonthly: (month) => data(api.get(`${C}/attendance/monthly`, { month })),

    // ---- transport (read-only: route, stop, today's pickup/drop) ----
    transport: () => data(api.get(`${C}/transport`)),
    transportHistory: (params) => api.get(`${C}/transport/history`, params),

    // ---- exams & results ----
    exams: (params) => api.get(`${C}/exams`, params),
    exam: (examId) => data(api.get(`${C}/exams/${id(examId)}`)),
    examSchedule: (examId) => data(api.get(`${C}/exams/${id(examId)}/schedule`)),
    results: (params) => api.get(`${C}/results`, params),
    result: (examId) => data(api.get(`${C}/results/${id(examId)}`)),
    reportCard: () => data(api.get(`${C}/report-card`)),

    // ---- fees ----
    feeSummary: () => data(api.get(`${C}/fees/summary`)),
    pendingFees: () => data(api.get(`${C}/fees/pending`)),
    invoices: (params) => api.get(`${C}/fees/invoices`, params),
    invoice: (invId) => data(api.get(`${C}/fees/invoices/${id(invId)}`)),
    feeHistory: (params) => api.get(`${C}/fees/history`, params),
    // `amount` is rupees and optional (omit = full balance). One Idempotency-Key
    // per Pay tap so a double tap can't create two Razorpay orders.
    payOrder: (invId, amount, key = newIdempotencyKey()) =>
      data(api.post(`${C}/fees/invoices/${id(invId)}/pay-order`, amount ? { amount } : {}, { 'Idempotency-Key': key })),
    // Advisory only — the invoice turns PAID when Razorpay's webhook lands.
    verifyPayment: (body) => data(api.post(`${C}/fees/payments/verify`, body)),
    receipts: (params) => api.get(`${C}/fees/receipts`, params),
    receipt: (paymentId) => data(api.get(`${C}/fees/receipts/${id(paymentId)}`)),

    // ---- safe pickup (read-only history) ----
    pickups: (params) => api.get(`${C}/pickup`, params),
    pickup: (sessionId) => data(api.get(`${C}/pickup/${id(sessionId)}`)),

    // Notice detail is parent-level, but the shared notice screen reads it from the scope.
    notice: parentApi.notice,
    markNoticeRead: parentApi.markNoticeRead,
  };
}

export { newIdempotencyKey };

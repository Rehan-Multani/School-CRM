// Principal app: dashboard, notifications, meetings, reports, safe pickup.
// All are /school-portal routes shared with the web panel; they answer with the web's
// plain JSON, so each method here returns the body as-is and the screens unwrap it:
//   dashboard.summary        -> { data: { kpi, charts, recentActivities } }
//   notifications.list/send  -> { data | data[], firebaseConfigured, message }
//   meetings.list            -> { data: [], stats: { TOTAL, SCHEDULED, COMPLETED, CANCELLED } }
//   reports.summary          -> { data: {...counts} }; reports.data -> { data: [rows], total, stats }
//   safePickup.*             -> { success, data, pagination } (settings: { data: { schoolEnabled, classes, academicYears } })
import { api } from '../client';

const SP = '/school-portal/principal/safe-pickup';
const MEET = '/school-portal/principal/meetings';

export const principalMiscApi = {
  // Dashboard
  dashboardSummary: () => api.get('/school-portal/dashboard/summary'),

  // Notifications: the platform inbox (notices addressed to principals) + school push notifications
  inbox: () => api.get('/notifications/inbox'),
  notifications: () => api.get('/school-portal/notifications'),
  sendNotification: (payload) => api.post('/school-portal/notifications', payload),

  // Meetings
  meetings: (params) => api.get(MEET, params),
  meeting: (id) => api.get(`${MEET}/${id}`),
  createMeeting: (payload) => api.post(MEET, payload),
  updateMeeting: (id, payload) => api.patch(`${MEET}/${id}`, payload),
  setMeetingStatus: (id, status, minutes) => api.patch(`${MEET}/${id}/status`, { status, minutes }),
  deleteMeeting: (id) => api.delete(`${MEET}/${id}`),

  // Reports
  reportsSummary: () => api.get('/school-portal/reports/summary'),
  reportData: (category, params) => api.get('/school-portal/reports/data', { category, ...params }),

  // Safe pickup
  safePickupSettings: () => api.get(`${SP}/settings`),
  safePickupStudents: (params) => api.get(`${SP}/students`, params),
  sendSafePickupOtp: (studentId) => api.post(`${SP}/send-otp`, { studentId }),
  verifySafePickupOtp: (sessionId, otp) => api.post(`${SP}/verify-otp`, { sessionId, otp }),
  safePickupHistory: (params) => api.get(`${SP}/history`, params),
};

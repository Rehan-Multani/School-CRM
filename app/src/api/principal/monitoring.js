// Principal monitoring: attendance, homework, fees, leave approval, events.
// Mirrors the web's principalAttendanceApi / principalHomeworkApi / principalReportApi /
// principalHrApi (leave) / principalEventApi. Responses keep the web shapes:
//   events + homework lists -> { data, pagination }, leaves -> { data, total, page, limit, stats },
//   reports/data -> { data, total, stats }, everything else -> { data }.
import { api } from '../client';

const SP = '/school-portal';

const clean = (params) => {
  const out = {};
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  });
  return out;
};

export const principalMonitoringApi = {
  // ---- attendance ----
  studentMonitor: (date) => api.get(`${SP}/attendance/students/monitor`, clean({ date })),
  studentReport: (from, to) => api.get(`${SP}/attendance/students/report`, clean({ from, to })),
  staffAttendance: (params) => api.get(`${SP}/reports/data`, clean({ category: 'attendance', ...params })),

  // ---- homework ----
  homeworkList: (params) => api.get(`${SP}/homework`, clean(params)),
  homeworkStats: (params) => api.get(`${SP}/homework/stats`, clean(params)),
  homeworkMonitor: (params) => api.get(`${SP}/homework/monitor`, clean(params)),
  homeworkGet: (id) => api.get(`${SP}/homework/${id}`),

  // ---- fees ----
  feeSummary: () => api.get(`${SP}/reports/summary`),
  feeReport: (category, params) => api.get(`${SP}/reports/data`, clean({ category, ...params })),

  // ---- leave ----
  leaves: (params) => api.get(`${SP}/hr/leave`, clean(params)),
  employees: (params) => api.get(`${SP}/hr/employees`, clean(params)),
  leaveBalance: (empId) => api.get(`${SP}/hr/leave/balance/${empId}`),
  createLeave: (body) => api.post(`${SP}/hr/leave`, body),
  approveLeave: (id) => api.patch(`${SP}/hr/leave/${id}/approve`),
  rejectLeave: (id, reason) => api.patch(`${SP}/hr/leave/${id}/reject`, { reason }),
  cancelLeave: (id) => api.patch(`${SP}/hr/leave/${id}/cancel`),

  // ---- events ----
  events: (params) => api.get(`${SP}/events`, clean(params)),
  eventStats: () => api.get(`${SP}/events/stats`),
  event: (id) => api.get(`${SP}/events/${id}`),
};

import { api, request } from './client';

// Transport Manager app (backend transportManager.routes.js). The manager
// reads every route, its riders and the fleet, and writes one thing: a child's
// pickup / drop for today or an earlier day (plus undoing a wrong tap).
const P = '/school-portal/transport-manager';

export const transportApi = {
  me: () => api.get(`${P}/me`).then((r) => r.data),
  changePassword: (currentPassword, newPassword) => api.patch(`${P}/change-password`, { currentPassword, newPassword }),
  // The shared any-role route (not under the manager prefix).
  registerDevice: (token) => api.post('/device-tokens', { token }),

  // `date` is YYYY-MM-DD; omitted = today on the server.
  overview: (date) => api.get(`${P}/overview`, { date }).then((r) => r.data),
  route: (routeId, date) => api.get(`${P}/routes/${routeId}`, { date }).then((r) => r.data),
  fleet: () => api.get(`${P}/fleet`).then((r) => r.data),

  // `leg` is 'pickup' | 'drop'. Marking twice is safe — the backend is idempotent.
  mark: (studentId, leg, date) => api.post(`${P}/students/${studentId}/${leg}`, { date }).then((r) => r.data),
  undo: (studentId, leg, date) =>
    request(`${P}/students/${studentId}/${leg}`, { method: 'DELETE', params: { date } }).then((r) => r.data),
};

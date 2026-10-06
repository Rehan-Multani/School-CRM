// Principal app: account + session calls. Backend: platform-service
// controllers/principal.controller.js. Everything else the Principal does is a
// /school-portal route shared with the web panel (requirePrincipal) and lives in
// api/principal/<area>.js — one file per feature area.
//
// Those routes answer with the web's plain JSON (not the `{ success, data }`
// envelope the other app roles use), so each area file unwraps its own responses.

import { api, upload } from './client';

const P = '/school-portal/principal';

export const principalApi = {
  me: () => api.get(`${P}/me`),
  // `res.data.token`: the password change ends the old token, the reply carries a fresh one
  // (ChangePasswordScreen swaps it in).
  changePassword: (currentPassword, newPassword) =>
    api.patch(`${P}/password`, { currentPassword, newPassword }).then((r) => ({ ...r, data: { token: r.token } })),
  updateProfile: (body) => api.patch(`${P}/profile`, body),
  uploadPhoto: (formData) => upload(`${P}/profile`, formData, { method: 'PATCH' }),
  // The shared any-role route (not under the principal prefix).
  registerDevice: (token) => api.post('/device-tokens', { token }),
  // Notices addressed to principals (super-admin / school pushes).
  inbox: () => api.get('/notifications/inbox'),
};

// Principal: students, teachers, staff (SchoolUser accounts), parent logins.
// These /school-portal routes answer with the web panel's JSON, not the app's
// `{ success, data }` envelope for every endpoint: lists below return
// `{ data, pagination?, stats? }`, single records `{ data }`.

import { api, upload } from '../client';

const SP = '/school-portal';

const clean = (params) => {
  const out = {};
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  });
  return out;
};

export const principalPeopleApi = {
  // ---- reference data for the pickers
  years: () => api.get(`${SP}/academic/years`, { limit: 100 }),
  classes: () => api.get(`${SP}/academic/classes`, { limit: 100 }),
  sections: () => api.get(`${SP}/academic/sections`, {}),
  yearClasses: (yearId) => api.get(`${SP}/academic/years/${yearId}/classes`),
  departments: () => api.get(`${SP}/hr/departments`),
  designations: () => api.get(`${SP}/hr/designations`),

  // ---- students (paged: `{ data, pagination, stats }`)
  students: (params) => api.get(`${SP}/students`, clean(params)),
  student: (id) => api.get(`${SP}/students/${id}`),
  createStudent: (formData) => upload(`${SP}/students`, formData, { method: 'POST' }),
  updateStudent: (id, formData) => upload(`${SP}/students/${id}`, formData, { method: 'PATCH' }),
  setStudentStatus: (id, status) => api.patch(`${SP}/students/${id}/status`, { status }),
  deleteStudent: (id) => api.delete(`${SP}/students/${id}`),
  setStudentPassword: (id, newPassword, loginEmail) =>
    api.post(`${SP}/academic/students/${id}/set-password`, clean({ newPassword, loginEmail })),

  // ---- parent logins (parent record + child link + password)
  createParent: (body) => api.post(`${SP}/parents`, body),
  linkParentChild: (parentId, body) => api.post(`${SP}/parents/${parentId}/children`, body),
  unlinkParentChild: (parentId, studentId) => api.delete(`${SP}/parents/${parentId}/children/${studentId}`),
  setParentPassword: (id, newPassword, loginEmail) =>
    api.post(`${SP}/academic/parents/${id}/set-password`, clean({ newPassword, loginEmail })),

  // ---- teachers (not paged: `{ data: [...] }`, server filters `search` + `status`)
  teachers: (params) => api.get(`${SP}/academic/teachers`, clean(params)),
  teacher: (id) => api.get(`${SP}/academic/teachers/${id}`),
  createTeacher: (formData) => upload(`${SP}/academic/teachers`, formData, { method: 'POST' }),
  updateTeacher: (id, formData) => upload(`${SP}/academic/teachers/${id}`, formData, { method: 'PATCH' }),
  setTeacherStatus: (id, status) => api.patch(`${SP}/academic/teachers/${id}/status`, { status }),
  setTeacherPassword: (id, newPassword, loginEmail) =>
    api.post(`${SP}/academic/teachers/${id}/set-password`, clean({ newPassword, loginEmail })),
  deleteTeacher: (id) => api.delete(`${SP}/academic/teachers/${id}`),
  approveEmployee: (id) => api.patch(`${SP}/hr/employees/${id}/approve`),

  // ---- staff = SchoolUser accounts (paged: `{ data, stats, pagination }`)
  users: (params) => api.get(`${SP}/users`, clean(params)),
  user: (id) => api.get(`${SP}/users/${id}`),
  createUser: (formData) => upload(`${SP}/users`, formData, { method: 'POST' }),
  updateUser: (id, formData) => upload(`${SP}/users/${id}`, formData, { method: 'PATCH' }),
  setUserStatus: (id, status) => api.patch(`${SP}/users/${id}/status`, { status }),
  changeUserPassword: (id, password) => api.patch(`${SP}/users/${id}/password`, { password }),
  sendUserCredentials: (id) => api.post(`${SP}/users/${id}/send-credentials`),
  deleteUser: (id) => api.delete(`${SP}/users/${id}`),
};

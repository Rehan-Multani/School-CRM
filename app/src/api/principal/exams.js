// Principal -> Exams. Same /school-portal/exams* routes the web panel uses
// (requirePrincipal). Responses are the web shapes: `{ success, data, message? }`,
// lists add `pagination`. Each call returns the whole body so screens can read
// `message` / `pagination`.

import { api, newIdempotencyKey } from '../client';

const E = '/school-portal/exams';
const A = '/school-portal/academic';
const id = (v) => encodeURIComponent(String(v));

export const principalExamsApi = {
  // exams
  stats: () => api.get(`${E}/stats`),
  list: (params) => api.get(E, params),
  get: (examId) => api.get(`${E}/${id(examId)}`),
  create: (body) => api.post(E, body),
  update: (examId, body) => api.patch(`${E}/${id(examId)}`, body),
  remove: (examId) => api.delete(`${E}/${id(examId)}`),

  // exam subjects
  subjects: (examId, params) => api.get(`${E}/${id(examId)}/subjects`, params),
  seedSubjects: (examId) => api.post(`${E}/${id(examId)}/subjects/seed`),
  addSubject: (examId, body) => api.post(`${E}/${id(examId)}/subjects`, body),
  updateSubject: (examId, subId, body) => api.patch(`${E}/${id(examId)}/subjects/${id(subId)}`, body),
  deleteSubject: (examId, subId) => api.delete(`${E}/${id(examId)}/subjects/${id(subId)}`),

  // schedule
  schedule: (examId, params) => api.get(`${E}/${id(examId)}/schedule`, params),
  createSlot: (examId, body) => api.post(`${E}/${id(examId)}/schedule`, body),
  updateSlot: (examId, slotId, body) => api.patch(`${E}/${id(examId)}/schedule/${id(slotId)}`, body),
  deleteSlot: (examId, slotId) => api.delete(`${E}/${id(examId)}/schedule/${id(slotId)}`),

  // marks
  marksSheet: (examId, params) => api.get(`${E}/${id(examId)}/marks`, params),
  saveMarks: (examId, body, key = newIdempotencyKey()) =>
    api.post(`${E}/${id(examId)}/marks`, body, { 'Idempotency-Key': key }),

  // results
  calculateResults: (examId, body) => api.post(`${E}/${id(examId)}/results/calculate`, body),
  results: (examId, params) => api.get(`${E}/${id(examId)}/results`, params),
  reportCard: (examId, studentId) => api.get(`${E}/${id(examId)}/results/${id(studentId)}`),

  // reference data (academic setup) used by the pickers
  years: () => api.get(`${A}/years`, { limit: 100 }),
  yearClasses: (yearId) => api.get(`${A}/years/${id(yearId)}/classes`),
  sections: (classId) => api.get(`${A}/sections`, { classId, limit: 50 }),
  masterSubjects: () => api.get(`${A}/subjects`, { limit: 100 }),
};

export { newIdempotencyKey };

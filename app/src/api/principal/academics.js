// Principal -> Academics (years, classes, sections, subjects, subject
// assignments, class teachers). Mirrors the web `principalAcademicApi`. The
// backend answers `{ success, data, ... }`; list calls here return the `data`
// array and single-record calls return the record. Writes return the raw body.

import { api } from '../client';

const A = '/school-portal/academic';
const list = (r) => (Array.isArray(r?.data) ? r.data : []);
const one = (r) => r?.data ?? null;

export const principalAcademicsApi = {
  // Academic years
  years: (params) => api.get(`${A}/years`, params).then(list),
  getYear: (id) => api.get(`${A}/years/${id}`).then(one),
  createYear: (body) => api.post(`${A}/years`, body),
  updateYear: (id, body) => api.patch(`${A}/years/${id}`, body),
  activateYear: (id) => api.post(`${A}/years/${id}/activate`),
  setCurrentYear: (id) => api.post(`${A}/years/${id}/set-current`),
  archiveYear: (id) => api.post(`${A}/years/${id}/archive`),
  unarchiveYear: (id) => api.post(`${A}/years/${id}/unarchive`),
  completeYear: (id) => api.post(`${A}/years/${id}/complete`),
  deleteYear: (id) => api.delete(`${A}/years/${id}`),
  yearClasses: (yearId) => api.get(`${A}/years/${yearId}/classes`).then(list),
  addClassToYear: (yearId, classId) => api.post(`${A}/years/${yearId}/classes`, { classId }),
  removeClassFromYear: (yearId, classId) => api.delete(`${A}/years/${yearId}/classes/${classId}`),

  // Classes
  classes: (params) => api.get(`${A}/classes`, params).then(list),
  getClass: (id) => api.get(`${A}/classes/${id}`).then(one),
  createClass: (body) => api.post(`${A}/classes`, body),
  updateClass: (id, body) => api.patch(`${A}/classes/${id}`, body),
  deleteClass: (id) => api.delete(`${A}/classes/${id}`),
  seedClasses: () => api.post(`${A}/classes/seed`),

  // Sections
  sections: (params) => api.get(`${A}/sections`, params).then(list),
  getSection: (id) => api.get(`${A}/sections/${id}`).then(one),
  createSection: (body) => api.post(`${A}/sections`, body),
  updateSection: (id, body) => api.patch(`${A}/sections/${id}`, body),
  deleteSection: (id) => api.delete(`${A}/sections/${id}`),

  // Subjects
  subjects: (params) => api.get(`${A}/subjects`, params).then(list),
  createSubject: (body) => api.post(`${A}/subjects`, body),
  updateSubject: (id, body) => api.patch(`${A}/subjects/${id}`, body),
  deleteSubject: (id) => api.delete(`${A}/subjects/${id}`),

  // Section subjects (subject assignments)
  allSectionSubjects: (params) => api.get(`${A}/section-subjects`, params).then(list),
  sectionSubjects: (sectionId) => api.get(`${A}/sections/${sectionId}/subjects`).then(list),
  addSectionSubject: (sectionId, body) => api.post(`${A}/sections/${sectionId}/subjects`, body),
  updateSectionSubject: (id, body) => api.patch(`${A}/section-subjects/${id}`, body),
  deleteSectionSubject: (id) => api.delete(`${A}/section-subjects/${id}`),

  // Teachers (read-only here: pickers for class teacher / subject teacher)
  teachers: (params) => api.get(`${A}/teachers`, params).then(list),
};

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('super_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('super_admin_refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const { data } = await refreshClient.post('/platform/auth/refresh', { refreshToken });
  if (!data?.token) {
    throw new Error('Unable to refresh session');
  }

  localStorage.setItem('super_admin_token', data.token);
  if (data.refreshToken) {
    localStorage.setItem('super_admin_refresh_token', data.refreshToken);
  }
  if (data.user) {
    const current = JSON.parse(localStorage.getItem('super_admin_user') || '{}');
    localStorage.setItem('super_admin_user', JSON.stringify({ ...current, ...data.user }));
  }
  return data.token;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const url = original.url || '';

    if (
      status !== 401 ||
      original._retry ||
      url.includes('/platform/auth/login') ||
      url.includes('/platform/auth/refresh') ||
      url.includes('/platform/school-auth/')
    ) {
      throw error;
    }

    original._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const token = await refreshPromise;
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${token}`;
      return apiClient(original);
    } catch {
      localStorage.removeItem('super_admin_token');
      localStorage.removeItem('super_admin_refresh_token');
      throw error;
    }
  }
);

// Public (no-auth) brand theme lookup shared by every role portal + login screens.
// `school` is a school slug, code, or Mongo _id.
export const schoolThemeApi = {
  get: (school) =>
    apiClient
      .get(`/platform/school-theme/${encodeURIComponent(school)}`)
      .then((res) => res.data?.data || null),
};

export const platformAuthApi = {
  login: (email, password) =>
    apiClient.post('/platform/auth/login', { email, password }).then((res) => res.data),
  me: () => apiClient.get('/platform/auth/me').then((res) => res.data),
  updateProfile: (payload) => apiClient.patch('/platform/auth/profile', payload).then((res) => res.data),
  changePassword: (payload) => apiClient.patch('/platform/auth/password', payload).then((res) => res.data),
};

export const schoolAdminAuthApi = {
  login: (email, password) =>
    apiClient.post('/platform/school-auth/login', { email, password }).then((res) => res.data),
  forgotPassword: (email) =>
    apiClient.post('/platform/school-auth/forgot-password', { email }).then((res) => res.data),
  resetPassword: (token, password) =>
    apiClient.post('/platform/school-auth/reset-password', { token, password }).then((res) => res.data),
  branding: (email) =>
    apiClient.get('/platform/school-auth/branding', { params: { email } }).then((res) => res.data),
};

const schoolAdminClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

schoolAdminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('school_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function studentRequestConfig(payload) {
  if (payload instanceof FormData) {
    return {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
  }
  return undefined;
}

export const schoolPortalApi = {
  dashboardSummary: () => schoolAdminClient.get('/platform/school-portal/dashboard/summary').then((res) => res.data),
  reportsSummary: () => schoolAdminClient.get('/platform/school-portal/reports/summary').then((res) => res.data),
  reportData: (category, params) =>
    schoolAdminClient.get('/platform/school-portal/reports/data', { params: { category, ...params } }).then((res) => res.data),
  me: () => schoolAdminClient.get('/platform/school-portal/me').then((res) => res.data),
  plans: () => schoolAdminClient.get('/platform/school-portal/plans').then((res) => res.data),
  selectPlan: (planId) =>
    schoolAdminClient.post('/platform/school-portal/select-plan', { planId }).then((res) => res.data),
  config: () => schoolAdminClient.get('/platform/school-portal/config').then((res) => res.data),
  updateConfig: (payload) =>
    schoolAdminClient.patch('/platform/school-portal/config', payload).then((res) => res.data),
  settings: () => schoolAdminClient.get('/platform/school-portal/settings').then((res) => res.data),
  updateTheme: (payload) =>
    schoolAdminClient
      .patch(
        '/platform/school-portal/settings/theme',
        typeof payload === 'string' ? { theme: payload } : payload
      )
      .then((res) => res.data),
  updateBranding: (payload) =>
    schoolAdminClient.patch('/platform/school-portal/settings/branding', payload).then((res) => res.data),
  changePassword: (payload) =>
    schoolAdminClient.patch('/platform/school-portal/settings/password', payload).then((res) => res.data),
  updateEmailSettings: (payload) =>
    schoolAdminClient.patch('/platform/school-portal/settings/email', payload).then((res) => res.data),
  notifications: () => schoolAdminClient.get('/platform/school-portal/notifications').then((res) => res.data),
  sendNotification: (payload) =>
    schoolAdminClient.post('/platform/school-portal/notifications', payload).then((res) => res.data),
  students: (params) => schoolAdminClient.get('/platform/school-portal/students', { params }).then((res) => res.data),
  getStudent: (id) => schoolAdminClient.get(`/platform/school-portal/students/${id}`).then((res) => res.data),
  createStudent: (payload) =>
    schoolAdminClient.post('/platform/school-portal/students', payload, studentRequestConfig(payload)).then((res) => res.data),
  updateStudent: (id, payload) =>
    schoolAdminClient.patch(`/platform/school-portal/students/${id}`, payload, studentRequestConfig(payload)).then((res) => res.data),
  updateStudentStatus: (id, status) =>
    schoolAdminClient.patch(`/platform/school-portal/students/${id}/status`, { status }).then((res) => res.data),
  deleteStudent: (id) => schoolAdminClient.delete(`/platform/school-portal/students/${id}`).then((res) => res.data),
};

export const schoolUserApi = {
  list: (params) => schoolAdminClient.get('/platform/school-portal/users', { params }).then((res) => res.data),
  get: (id) => schoolAdminClient.get(`/platform/school-portal/users/${id}`).then((res) => res.data),
  create: (payload) =>
    schoolAdminClient.post('/platform/school-portal/users', payload, studentRequestConfig(payload)).then((res) => res.data),
  update: (id, payload) =>
    schoolAdminClient.patch(`/platform/school-portal/users/${id}`, payload, studentRequestConfig(payload)).then((res) => res.data),
  updateStatus: (id, status) =>
    schoolAdminClient.patch(`/platform/school-portal/users/${id}/status`, { status }).then((res) => res.data),
  changePassword: (id, password) =>
    schoolAdminClient.patch(`/platform/school-portal/users/${id}/password`, { password }).then((res) => res.data),
  sendCredentials: (id) =>
    schoolAdminClient.post(`/platform/school-portal/users/${id}/send-credentials`).then((res) => res.data),
  delete: (id) => schoolAdminClient.delete(`/platform/school-portal/users/${id}`).then((res) => res.data),
  seed: () => schoolAdminClient.post('/platform/school-portal/users/seed').then((res) => res.data),
};

export const payrollPortalApi = {
  list: (params) => schoolAdminClient.get('/platform/school-portal/payroll', { params }).then((r) => r.data),
  employees: () => schoolAdminClient.get('/platform/school-portal/payroll/employees').then((r) => r.data),
  get: (id) => schoolAdminClient.get(`/platform/school-portal/payroll/${id}`).then((r) => r.data),
  create: (payload) => schoolAdminClient.post('/platform/school-portal/payroll', payload).then((r) => r.data),
  updateStatus: (id, status, payload = {}) =>
    schoolAdminClient.patch(`/platform/school-portal/payroll/${id}/status`, { status, ...payload }).then((r) => r.data),
  releaseAll: (month) => schoolAdminClient.post('/platform/school-portal/payroll/release', { month }).then((r) => r.data),
  delete: (id) => schoolAdminClient.delete(`/platform/school-portal/payroll/${id}`).then((r) => r.data),
};

export const staffAttendanceApi = {
  getDaily: (date, params = {}) =>
    schoolAdminClient.get('/platform/school-portal/attendance/staff', { params: { date, ...params } }).then((r) => r.data),
  getReport: (params = {}) =>
    schoolAdminClient.get('/platform/school-portal/attendance/staff/report', { params }).then((r) => r.data),
  saveDaily: (payload) =>
    schoolAdminClient.post('/platform/school-portal/attendance/staff', payload).then((r) => r.data),
  updateSingle: (employeeRefId, payload) =>
    schoolAdminClient.patch(`/platform/school-portal/attendance/staff/${employeeRefId}`, payload).then((r) => r.data),
  markAll: (payload) =>
    schoolAdminClient.post('/platform/school-portal/attendance/staff/mark-all', payload).then((r) => r.data),
  getMonthly: (params = {}) =>
    schoolAdminClient.get('/platform/school-portal/attendance/staff/monthly', { params }).then((r) => r.data),
};

export const academicPortalApi = {
  years: (params) => schoolAdminClient.get('/platform/school-portal/academic/years', { params }).then((r) => r.data),
  getYear: (id) => schoolAdminClient.get(`/platform/school-portal/academic/years/${id}`).then((r) => r.data),
  createYear: (payload) => schoolAdminClient.post('/platform/school-portal/academic/years', payload).then((r) => r.data),
  updateYear: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/academic/years/${id}`, payload).then((r) => r.data),
  activateYear: (id) => schoolAdminClient.post(`/platform/school-portal/academic/years/${id}/activate`).then((r) => r.data),
  setCurrentYear: (id) => schoolAdminClient.post(`/platform/school-portal/academic/years/${id}/set-current`).then((r) => r.data),
  archiveYear: (id) => schoolAdminClient.post(`/platform/school-portal/academic/years/${id}/archive`).then((r) => r.data),
  unarchiveYear: (id) => schoolAdminClient.post(`/platform/school-portal/academic/years/${id}/unarchive`).then((r) => r.data),
  completeYear: (id) => schoolAdminClient.post(`/platform/school-portal/academic/years/${id}/complete`).then((r) => r.data),
  deleteYear: (id) => schoolAdminClient.delete(`/platform/school-portal/academic/years/${id}`).then((r) => r.data),
  yearClasses: (yearId) => schoolAdminClient.get(`/platform/school-portal/academic/years/${yearId}/classes`).then((r) => r.data),
  addClassToYear: (yearId, classId) =>
    schoolAdminClient.post(`/platform/school-portal/academic/years/${yearId}/classes`, { classId }).then((r) => r.data),
  removeClassFromYear: (yearId, classId) =>
    schoolAdminClient.delete(`/platform/school-portal/academic/years/${yearId}/classes/${classId}`).then((r) => r.data),
  classes: (params) => schoolAdminClient.get('/platform/school-portal/academic/classes', { params }).then((r) => r.data),
  getClass: (id) => schoolAdminClient.get(`/platform/school-portal/academic/classes/${id}`).then((r) => r.data),
  createClass: (payload) => schoolAdminClient.post('/platform/school-portal/academic/classes', payload).then((r) => r.data),
  updateClass: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/academic/classes/${id}`, payload).then((r) => r.data),
  deleteClass: (id) => schoolAdminClient.delete(`/platform/school-portal/academic/classes/${id}`).then((r) => r.data),
  seedClasses: () => schoolAdminClient.post('/platform/school-portal/academic/classes/seed').then((r) => r.data),
  sections: (params) => schoolAdminClient.get('/platform/school-portal/academic/sections', { params }).then((r) => r.data),
  getSection: (id) => schoolAdminClient.get(`/platform/school-portal/academic/sections/${id}`).then((r) => r.data),
  createSection: (payload) => schoolAdminClient.post('/platform/school-portal/academic/sections', payload).then((r) => r.data),
  updateSection: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/academic/sections/${id}`, payload).then((r) => r.data),
  deleteSection: (id) => schoolAdminClient.delete(`/platform/school-portal/academic/sections/${id}`).then((r) => r.data),
  subjects: (params) => schoolAdminClient.get('/platform/school-portal/academic/subjects', { params }).then((r) => r.data),
  createSubject: (payload) => schoolAdminClient.post('/platform/school-portal/academic/subjects', payload).then((r) => r.data),
  updateSubject: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/academic/subjects/${id}`, payload).then((r) => r.data),
  deleteSubject: (id) => schoolAdminClient.delete(`/platform/school-portal/academic/subjects/${id}`).then((r) => r.data),
  allSectionSubjects: (params) =>
    schoolAdminClient.get('/platform/school-portal/academic/section-subjects', { params }).then((r) => r.data),
  createSectionSubject: (payload) =>
    schoolAdminClient.post('/platform/school-portal/academic/section-subjects', payload).then((r) => r.data),
  sectionSubjects: (sectionId) =>
    schoolAdminClient.get(`/platform/school-portal/academic/sections/${sectionId}/subjects`).then((r) => r.data),
  addSectionSubject: (sectionId, payload) =>
    schoolAdminClient.post(`/platform/school-portal/academic/sections/${sectionId}/subjects`, payload).then((r) => r.data),
  updateSectionSubject: (id, payload) =>
    schoolAdminClient.patch(`/platform/school-portal/academic/section-subjects/${id}`, payload).then((r) => r.data),
  deleteSectionSubject: (id) =>
    schoolAdminClient.delete(`/platform/school-portal/academic/section-subjects/${id}`).then((r) => r.data),
  teachers: (params) => schoolAdminClient.get('/platform/school-portal/academic/teachers', { params }).then((r) => r.data),
  getTeacher: (id) => schoolAdminClient.get(`/platform/school-portal/academic/teachers/${id}`).then((r) => r.data),
  createTeacher: (payload) =>
    schoolAdminClient.post('/platform/school-portal/academic/teachers', payload, studentRequestConfig(payload)).then((r) => r.data),
  updateTeacher: (id, payload) =>
    schoolAdminClient.patch(`/platform/school-portal/academic/teachers/${id}`, payload, studentRequestConfig(payload)).then((r) => r.data),
  updateTeacherStatus: (id, status) =>
    schoolAdminClient.patch(`/platform/school-portal/academic/teachers/${id}/status`, { status }).then((r) => r.data),
  deleteTeacher: (id) => schoolAdminClient.delete(`/platform/school-portal/academic/teachers/${id}`).then((r) => r.data),
};

export const feePortalApi = {
  // Fee Heads
  heads: (params) => schoolAdminClient.get('/platform/school-portal/fees/heads', { params }).then((r) => r.data),
  getHead: (id) => schoolAdminClient.get(`/platform/school-portal/fees/heads/${id}`).then((r) => r.data),
  createHead: (payload) => schoolAdminClient.post('/platform/school-portal/fees/heads', payload).then((r) => r.data),
  updateHead: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/fees/heads/${id}`, payload).then((r) => r.data),
  deleteHead: (id) => schoolAdminClient.delete(`/platform/school-portal/fees/heads/${id}`).then((r) => r.data),
  seedDefaultHeads: () => schoolAdminClient.post('/platform/school-portal/fees/heads/seed').then((r) => r.data),

  // Fee Structures
  structures: (params) => schoolAdminClient.get('/platform/school-portal/fees/structures', { params }).then((r) => r.data),
  getStructure: (id) => schoolAdminClient.get(`/platform/school-portal/fees/structures/${id}`).then((r) => r.data),
  createStructure: (payload) => schoolAdminClient.post('/platform/school-portal/fees/structures', payload).then((r) => r.data),
  updateStructure: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/fees/structures/${id}`, payload).then((r) => r.data),
  deleteStructure: (id) => schoolAdminClient.delete(`/platform/school-portal/fees/structures/${id}`).then((r) => r.data),

  // Fee Structure Items
  structureItems: (structureId) => schoolAdminClient.get(`/platform/school-portal/fees/structures/${structureId}/items`).then((r) => r.data),
  addStructureItem: (structureId, payload) => schoolAdminClient.post(`/platform/school-portal/fees/structures/${structureId}/items`, payload).then((r) => r.data),
  updateStructureItem: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/fees/items/${id}`, payload).then((r) => r.data),
  deleteStructureItem: (id) => schoolAdminClient.delete(`/platform/school-portal/fees/items/${id}`).then((r) => r.data),

  // Student Fee Assignments
  studentAssignments: (studentId) => schoolAdminClient.get(`/platform/school-portal/fees/students/${studentId}/assignments`).then((r) => r.data),
  autoAssignStudentFees: (studentId, payload) => schoolAdminClient.post(`/platform/school-portal/fees/students/${studentId}/auto-assign`, payload).then((r) => r.data),
  updateStudentAssignment: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/fees/assignments/${id}`, payload).then((r) => r.data),

  // Invoices & Payments
  invoices: (params) => schoolAdminClient.get('/platform/school-portal/fees/invoices', { params }).then((r) => r.data),
  getInvoice: (id) => schoolAdminClient.get(`/platform/school-portal/fees/invoices/${id}`).then((r) => r.data),
  generateInvoice: (payload) => schoolAdminClient.post('/platform/school-portal/fees/invoices/generate', payload).then((r) => r.data),
  payInvoice: (invoiceId, payload) => schoolAdminClient.post(`/platform/school-portal/fees/invoices/${invoiceId}/pay`, payload).then((r) => r.data),
  payments: (params) => schoolAdminClient.get('/platform/school-portal/fees/payments', { params }).then((r) => r.data),
  getPayment: (id) => schoolAdminClient.get(`/platform/school-portal/fees/payments/${id}`).then((r) => r.data),
};

export const platformLegalApi = {
  get: () => apiClient.get('/platform/privacy-policy').then((res) => res.data),
  update: (payload) => apiClient.put('/platform/privacy-policy', payload).then((res) => res.data),
};

export const platformSchoolApi = {
  list: (params) => apiClient.get('/platform/schools', { params }).then((res) => res.data),
  create: (payload) => apiClient.post('/platform/schools', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/platform/schools/${id}`, payload).then((res) => res.data),
  updateStatus: (id, status) =>
    apiClient.patch(`/platform/schools/${id}/status`, { status }).then((res) => res.data),
  resetLogin: (id) => apiClient.post(`/platform/schools/${id}/reset-login`).then((res) => res.data),
  remove: (id) => apiClient.delete(`/platform/schools/${id}`).then((res) => res.data),
};

export const platformSubscriptionApi = {
  list: () => apiClient.get('/platform/subscriptions').then((res) => res.data),
  create: (payload) => apiClient.post('/platform/subscriptions', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/platform/subscriptions/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/platform/subscriptions/${id}`).then((res) => res.data),
};

export const platformBillingApi = {
  list: (params) => apiClient.get('/platform/billings', { params }).then((res) => res.data),
  create: (payload) => apiClient.post('/platform/billings', payload).then((res) => res.data),
  get: (id) => apiClient.get(`/platform/billings/${id}`).then((res) => res.data),
  gateway: () => apiClient.get('/platform/billings/gateway').then((res) => res.data),
  createRazorpayOrder: (id) =>
    apiClient.post(`/platform/billings/${id}/razorpay-order`).then((res) => res.data),
  verifyRazorpay: (id, payload) =>
    apiClient.post(`/platform/billings/${id}/razorpay-verify`, payload).then((res) => res.data),
  markPaid: (id, payload) =>
    apiClient.patch(`/platform/billings/${id}/pay`, payload).then((res) => res.data),
  refund: (id) => apiClient.patch(`/platform/billings/${id}/refund`).then((res) => res.data),
  cancel: (id) => apiClient.patch(`/platform/billings/${id}/cancel`).then((res) => res.data),
};

export const platformNotificationApi = {
  list: () => apiClient.get('/platform/notifications').then((res) => res.data),
  send: (payload) => apiClient.post('/platform/notifications', payload).then((res) => res.data),
  inbox: (params) => apiClient.get('/platform/notifications/inbox', { params }).then((res) => res.data),
  registerDevice: (payload) => apiClient.post('/platform/device-tokens', payload).then((res) => res.data),
};

export const platformSupportApi = {
  list: (params) => apiClient.get('/platform/support/tickets', { params }).then((res) => res.data),
  get: (id) => apiClient.get(`/platform/support/tickets/${id}`).then((res) => res.data),
  create: (payload) => apiClient.post('/platform/support/tickets', payload).then((res) => res.data),
  reply: (id, payload) =>
    apiClient.post(`/platform/support/tickets/${id}/replies`, payload).then((res) => res.data),
  updateStatus: (id, status) =>
    apiClient.patch(`/platform/support/tickets/${id}/status`, { status }).then((res) => res.data),
};

export const schoolSupportApi = {
  list: (schoolId, params) =>
    schoolAdminClient.get(`/platform/support/school/${schoolId}/tickets`, { params }).then((res) => res.data),
  get: (schoolId, id) =>
    schoolAdminClient.get(`/platform/support/school/${schoolId}/tickets/${id}`).then((res) => res.data),
  create: (schoolId, payload) =>
    schoolAdminClient.post(`/platform/support/school/${schoolId}/tickets`, payload).then((res) => res.data),
  reply: (schoolId, id, payload) =>
    schoolAdminClient
      .post(`/platform/support/school/${schoolId}/tickets/${id}/replies`, payload)
      .then((res) => res.data),
};

export const platformReportApi = {
  summary: (params) => apiClient.get('/platform/reports', { params }).then((res) => res.data),
  schools: (params) => apiClient.get('/platform/reports/schools', { params }).then((res) => res.data),
  subscriptions: (params) => apiClient.get('/platform/reports/subscriptions', { params }).then((res) => res.data),
  invoices: (params) => apiClient.get('/platform/reports/invoices', { params }).then((res) => res.data),
  notifications: (params) => apiClient.get('/platform/reports/notifications', { params }).then((res) => res.data),
};

const librarianClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

librarianClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('librarian_token') || localStorage.getItem('school_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const librarianAuthApi = {
  login: (credentials) => apiClient.post('/platform/school-portal/auth/librarian-login', credentials).then((r) => r.data),
};

export const librarianApi = {
  // Settings
  settings: () => librarianClient.get('/platform/school-portal/library/settings').then((r) => r.data),
  updateSettings: (payload) => librarianClient.patch('/platform/school-portal/library/settings', payload).then((r) => r.data),

  // Stats & Aggregations
  stats: () => librarianClient.get('/platform/school-portal/library/stats').then((r) => r.data),
  categories: () => librarianClient.get('/platform/school-portal/library/categories').then((r) => r.data),
  createCategory: (payload) => librarianClient.post('/platform/school-portal/library/categories', payload).then((r) => r.data),
  updateCategory: (id, payload) => librarianClient.patch(`/platform/school-portal/library/categories/${id}`, payload).then((r) => r.data),
  deleteCategory: (id) => librarianClient.delete(`/platform/school-portal/library/categories/${id}`).then((r) => r.data),
  authors: () => librarianClient.get('/platform/school-portal/library/authors').then((r) => r.data),
  publishers: () => librarianClient.get('/platform/school-portal/library/publishers').then((r) => r.data),
  borrowers: (params) => librarianClient.get('/platform/school-portal/library/borrowers', { params }).then((r) => r.data),
  notificationRecipients: () => librarianClient.get('/platform/school-portal/library/notification-recipients').then((r) => r.data),
  sendNotification: (payload) => librarianClient.post('/platform/school-portal/library/notifications', payload).then((r) => r.data),

  // Books Catalog
  books: (params) => librarianClient.get('/platform/school-portal/library/books', { params }).then((r) => r.data),
  getBook: (id) => librarianClient.get(`/platform/school-portal/library/books/${id}`).then((r) => r.data),
  createBook: (payload) => librarianClient.post('/platform/school-portal/library/books', payload).then((r) => r.data),
  updateBook: (id, payload) => librarianClient.patch(`/platform/school-portal/library/books/${id}`, payload).then((r) => r.data),
  deleteBook: (id) => librarianClient.delete(`/platform/school-portal/library/books/${id}`).then((r) => r.data),

  // Physical Book Copies
  copies: (params) => librarianClient.get('/platform/school-portal/library/copies', { params }).then((r) => r.data),
  createCopy: (payload) => librarianClient.post('/platform/school-portal/library/copies', payload).then((r) => r.data),
  updateCopy: (id, payload) => librarianClient.patch(`/platform/school-portal/library/copies/${id}`, payload).then((r) => r.data),
  deleteCopy: (id) => librarianClient.delete(`/platform/school-portal/library/copies/${id}`).then((r) => r.data),

  // Circulation (Issues/Returns/Renewals)
  issues: (params) => librarianClient.get('/platform/school-portal/library/issues', { params }).then((r) => r.data),
  issueBook: (payload) => librarianClient.post('/platform/school-portal/library/issues', payload).then((r) => r.data),
  returnBook: (id, payload) => librarianClient.post(`/platform/school-portal/library/issues/${id}/return`, payload).then((r) => r.data),
  renewBook: (id, payload) => librarianClient.post(`/platform/school-portal/library/issues/${id}/renew`, payload).then((r) => r.data),
  updateFineStatus: (id, fineStatus) => librarianClient.patch(`/platform/school-portal/library/issues/${id}/fine`, { fineStatus }).then((r) => r.data),

  // Profile
  getProfile: () => librarianClient.get('/platform/school-portal/profile').then((r) => r.data),
  updateProfile: (payload) => librarianClient.patch('/platform/school-portal/profile', payload).then((r) => r.data),

  // Reservations
  reservations: (params) => librarianClient.get('/platform/school-portal/library/reservations', { params }).then((r) => r.data),
  createReservation: (payload) => librarianClient.post('/platform/school-portal/library/reservations', payload).then((r) => r.data),
  approveReservation: (id) => librarianClient.patch(`/platform/school-portal/library/reservations/${id}/approve`).then((r) => r.data),
  rejectReservation: (id, reason) => librarianClient.patch(`/platform/school-portal/library/reservations/${id}/reject`, { reason }).then((r) => r.data),
  cancelReservation: (id) => librarianClient.patch(`/platform/school-portal/library/reservations/${id}/cancel`).then((r) => r.data),
  fulfillReservation: (id, payload) => librarianClient.post(`/platform/school-portal/library/reservations/${id}/fulfill`, payload).then((r) => r.data),

  // Transactions Audit Trail
  transactions: (params) => librarianClient.get('/platform/school-portal/library/transactions', { params }).then((r) => r.data),

  // Reports
  report: (category, params) => librarianClient.get(`/platform/school-portal/library/reports/${category}`, { params }).then((r) => r.data),
};

export const libraryPortalApi = librarianApi;

const hrClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

hrClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('hr_token') || localStorage.getItem('school_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const hrAuthApi = {
  login: (credentials) => apiClient.post('/platform/school-portal/auth/hr-login', credentials).then((r) => r.data),
};

export const hrApi = {
  // Dashboard & Settings
  dashboard: () => hrClient.get('/platform/school-portal/hr/dashboard').then((r) => r.data),
  settings: () => hrClient.get('/platform/school-portal/hr/settings').then((r) => r.data),
  updateSettings: (payload) => hrClient.patch('/platform/school-portal/hr/settings', payload).then((r) => r.data),

  // Employees
  employees: (params) => hrClient.get('/platform/school-portal/hr/employees', { params }).then((r) => r.data),
  getEmployee: (id) => hrClient.get(`/platform/school-portal/hr/employees/${id}`).then((r) => r.data),
  createEmployee: (payload) =>
    hrClient.post('/platform/school-portal/hr/employees', payload, studentRequestConfig(payload)).then((r) => r.data),
  updateEmployee: (id, payload) =>
    hrClient.patch(`/platform/school-portal/hr/employees/${id}`, payload, studentRequestConfig(payload)).then((r) => r.data),
  updateEmployeeStatus: (id, status) => hrClient.patch(`/platform/school-portal/hr/employees/${id}/status`, { status }).then((r) => r.data),
  approveEmployee: (id) => hrClient.patch(`/platform/school-portal/hr/employees/${id}/approve`).then((r) => r.data),
  rejectEmployee: (id, reason) => hrClient.patch(`/platform/school-portal/hr/employees/${id}/reject`, { reason }).then((r) => r.data),
  deleteEmployee: (id) => hrClient.delete(`/platform/school-portal/hr/employees/${id}`).then((r) => r.data),

  // Departments
  departments: (params) => hrClient.get('/platform/school-portal/hr/departments', { params }).then((r) => r.data),
  createDepartment: (payload) => hrClient.post('/platform/school-portal/hr/departments', payload).then((r) => r.data),
  updateDepartment: (id, payload) => hrClient.patch(`/platform/school-portal/hr/departments/${id}`, payload).then((r) => r.data),
  deleteDepartment: (id) => hrClient.delete(`/platform/school-portal/hr/departments/${id}`).then((r) => r.data),

  // Designations
  designations: (params) => hrClient.get('/platform/school-portal/hr/designations', { params }).then((r) => r.data),
  createDesignation: (payload) => hrClient.post('/platform/school-portal/hr/designations', payload).then((r) => r.data),
  updateDesignation: (id, payload) => hrClient.patch(`/platform/school-portal/hr/designations/${id}`, payload).then((r) => r.data),
  deleteDesignation: (id) => hrClient.delete(`/platform/school-portal/hr/designations/${id}`).then((r) => r.data),

  // Attendance
  attendance: (params) => hrClient.get('/platform/school-portal/hr/attendance', { params }).then((r) => r.data),
  saveAttendance: (payload) => hrClient.post('/platform/school-portal/hr/attendance', payload).then((r) => r.data),
  updateSingleAttendance: (id, payload) => hrClient.patch(`/platform/school-portal/hr/attendance/${id}`, payload).then((r) => r.data),
  markAllAttendance: (payload) => hrClient.post('/platform/school-portal/hr/attendance/mark-all', payload).then((r) => r.data),
  monthlyAttendance: (params) => hrClient.get('/platform/school-portal/hr/attendance/monthly', { params }).then((r) => r.data),
  attendanceReport: (params) => hrClient.get('/platform/school-portal/hr/attendance/report', { params }).then((r) => r.data),

  // Leave Management
  leaves: (params) => hrClient.get('/platform/school-portal/hr/leave', { params }).then((r) => r.data),
  createLeave: (payload) => hrClient.post('/platform/school-portal/hr/leave', payload).then((r) => r.data),
  approveLeave: (id) => hrClient.patch(`/platform/school-portal/hr/leave/${id}/approve`).then((r) => r.data),
  rejectLeave: (id, reason) => hrClient.patch(`/platform/school-portal/hr/leave/${id}/reject`, { reason }).then((r) => r.data),
  cancelLeave: (id) => hrClient.patch(`/platform/school-portal/hr/leave/${id}/cancel`).then((r) => r.data),
  leaveBalance: (empId) => hrClient.get(`/platform/school-portal/hr/leave/balance/${empId}`).then((r) => r.data),

  // Payroll
  payrolls: (params) => hrClient.get('/platform/school-portal/hr/payroll', { params }).then((r) => r.data),
  payrollEmployees: () => hrClient.get('/platform/school-portal/hr/payroll/employees').then((r) => r.data),
  createPayroll: (payload) => hrClient.post('/platform/school-portal/hr/payroll', payload).then((r) => r.data),
  getPayroll: (id) => hrClient.get(`/platform/school-portal/hr/payroll/${id}`).then((r) => r.data),
  getSalarySlip: (id) => hrClient.get(`/platform/school-portal/hr/payroll/${id}/slip`).then((r) => r.data),
  updatePayrollStatus: (id, status, payload = {}) => hrClient.patch(`/platform/school-portal/hr/payroll/${id}/status`, { status, ...payload }).then((r) => r.data),
  releaseAllPayrolls: (month) => hrClient.post('/platform/school-portal/hr/payroll/release', { month }).then((r) => r.data),
  deletePayroll: (id) => hrClient.delete(`/platform/school-portal/hr/payroll/${id}`).then((r) => r.data),

  // Performance Reviews
  reviews: (params) => hrClient.get('/platform/school-portal/hr/performance', { params }).then((r) => r.data),
  createReview: (payload) => hrClient.post('/platform/school-portal/hr/performance', payload).then((r) => r.data),
  getReview: (id) => hrClient.get(`/platform/school-portal/hr/performance/${id}`).then((r) => r.data),
  updateReview: (id, payload) => hrClient.patch(`/platform/school-portal/hr/performance/${id}`, payload).then((r) => r.data),
  deleteReview: (id) => hrClient.delete(`/platform/school-portal/hr/performance/${id}`).then((r) => r.data),

  // Documents & Announcements
  documents: (params) => hrClient.get('/platform/school-portal/hr/documents', { params }).then((r) => r.data),
  uploadDocument: (formData) =>
    hrClient
      .post('/platform/school-portal/hr/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  verifyDocument: (id, status) =>
    hrClient.patch(`/platform/school-portal/hr/documents/${id}/verify`, { status }).then((r) => r.data),
  deleteDocument: (id) => hrClient.delete(`/platform/school-portal/hr/documents/${id}`).then((r) => r.data),
  announcements: () => hrClient.get('/platform/school-portal/hr/announcements').then((r) => r.data),
  createAnnouncement: (payload) => hrClient.post('/platform/school-portal/hr/announcements', payload).then((r) => r.data),
  deleteAnnouncement: (id) => hrClient.delete(`/platform/school-portal/hr/announcements/${id}`).then((r) => r.data),

  // Notifications
  notifications: () => hrClient.get('/platform/school-portal/hr/notifications').then((r) => r.data),

  // Profile & Credentials
  profile: () => hrClient.get('/platform/school-portal/hr/profile').then((r) => r.data),
  updateProfile: (payload) =>
    hrClient.patch('/platform/school-portal/hr/profile', payload, studentRequestConfig(payload)).then((r) => r.data),
  changePassword: (payload) => hrClient.patch('/platform/school-portal/hr/password', payload).then((r) => r.data),

  // Reports
  report: (category, params) => hrClient.get(`/platform/school-portal/hr/reports/${category}`, { params }).then((r) => r.data),
};

export const hrPortalApi = hrApi;

const principalClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

principalClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('principal_token') || localStorage.getItem('school_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const principalAuthApi = {
  login: (credentials) => apiClient.post('/platform/school-portal/auth/principal-login', credentials).then((r) => r.data),
  me: () => principalClient.get('/platform/school-portal/principal/me').then((r) => r.data),
  updateProfile: (payload) =>
    principalClient.patch('/platform/school-portal/principal/profile', payload, studentRequestConfig(payload)).then((r) => r.data),
  changePassword: (payload) => principalClient.patch('/platform/school-portal/principal/password', payload).then((r) => r.data),
};

export const principalAcademicApi = {
  years: (params) => principalClient.get('/platform/school-portal/academic/years', { params }).then((r) => r.data),
  getYear: (id) => principalClient.get(`/platform/school-portal/academic/years/${id}`).then((r) => r.data),
  createYear: (payload) => principalClient.post('/platform/school-portal/academic/years', payload).then((r) => r.data),
  updateYear: (id, payload) => principalClient.patch(`/platform/school-portal/academic/years/${id}`, payload).then((r) => r.data),
  activateYear: (id) => principalClient.post(`/platform/school-portal/academic/years/${id}/activate`).then((r) => r.data),
  setCurrentYear: (id) => principalClient.post(`/platform/school-portal/academic/years/${id}/set-current`).then((r) => r.data),
  archiveYear: (id) => principalClient.post(`/platform/school-portal/academic/years/${id}/archive`).then((r) => r.data),
  unarchiveYear: (id) => principalClient.post(`/platform/school-portal/academic/years/${id}/unarchive`).then((r) => r.data),
  completeYear: (id) => principalClient.post(`/platform/school-portal/academic/years/${id}/complete`).then((r) => r.data),
  deleteYear: (id) => principalClient.delete(`/platform/school-portal/academic/years/${id}`).then((r) => r.data),
  yearClasses: (yearId) => principalClient.get(`/platform/school-portal/academic/years/${yearId}/classes`).then((r) => r.data),
  addClassToYear: (yearId, classId) =>
    principalClient.post(`/platform/school-portal/academic/years/${yearId}/classes`, { classId }).then((r) => r.data),
  removeClassFromYear: (yearId, classId) =>
    principalClient.delete(`/platform/school-portal/academic/years/${yearId}/classes/${classId}`).then((r) => r.data),
  classes: (params) => principalClient.get('/platform/school-portal/academic/classes', { params }).then((r) => r.data),
  getClass: (id) => principalClient.get(`/platform/school-portal/academic/classes/${id}`).then((r) => r.data),
  createClass: (payload) => principalClient.post('/platform/school-portal/academic/classes', payload).then((r) => r.data),
  updateClass: (id, payload) => principalClient.patch(`/platform/school-portal/academic/classes/${id}`, payload).then((r) => r.data),
  deleteClass: (id) => principalClient.delete(`/platform/school-portal/academic/classes/${id}`).then((r) => r.data),
  seedClasses: () => principalClient.post('/platform/school-portal/academic/classes/seed').then((r) => r.data),
  sections: (params) => principalClient.get('/platform/school-portal/academic/sections', { params }).then((r) => r.data),
  getSection: (id) => principalClient.get(`/platform/school-portal/academic/sections/${id}`).then((r) => r.data),
  createSection: (payload) => principalClient.post('/platform/school-portal/academic/sections', payload).then((r) => r.data),
  updateSection: (id, payload) => principalClient.patch(`/platform/school-portal/academic/sections/${id}`, payload).then((r) => r.data),
  deleteSection: (id) => principalClient.delete(`/platform/school-portal/academic/sections/${id}`).then((r) => r.data),
  subjects: (params) => principalClient.get('/platform/school-portal/academic/subjects', { params }).then((r) => r.data),
  createSubject: (payload) => principalClient.post('/platform/school-portal/academic/subjects', payload).then((r) => r.data),
  updateSubject: (id, payload) => principalClient.patch(`/platform/school-portal/academic/subjects/${id}`, payload).then((r) => r.data),
  deleteSubject: (id) => principalClient.delete(`/platform/school-portal/academic/subjects/${id}`).then((r) => r.data),
  allSectionSubjects: (params) =>
    principalClient.get('/platform/school-portal/academic/section-subjects', { params }).then((r) => r.data),
  createSectionSubject: (payload) =>
    principalClient.post('/platform/school-portal/academic/section-subjects', payload).then((r) => r.data),
  sectionSubjects: (sectionId) =>
    principalClient.get(`/platform/school-portal/academic/sections/${sectionId}/subjects`).then((r) => r.data),
  addSectionSubject: (sectionId, payload) =>
    principalClient.post(`/platform/school-portal/academic/sections/${sectionId}/subjects`, payload).then((r) => r.data),
  updateSectionSubject: (id, payload) =>
    principalClient.patch(`/platform/school-portal/academic/section-subjects/${id}`, payload).then((r) => r.data),
  deleteSectionSubject: (id) =>
    principalClient.delete(`/platform/school-portal/academic/section-subjects/${id}`).then((r) => r.data),
  teachers: (params) => principalClient.get('/platform/school-portal/academic/teachers', { params }).then((r) => r.data),
  getTeacher: (id) => principalClient.get(`/platform/school-portal/academic/teachers/${id}`).then((r) => r.data),
  createTeacher: (payload) =>
    principalClient.post('/platform/school-portal/academic/teachers', payload, studentRequestConfig(payload)).then((r) => r.data),
  updateTeacher: (id, payload) =>
    principalClient.patch(`/platform/school-portal/academic/teachers/${id}`, payload, studentRequestConfig(payload)).then((r) => r.data),
  updateTeacherStatus: (id, status) =>
    principalClient.patch(`/platform/school-portal/academic/teachers/${id}/status`, { status }).then((r) => r.data),
  deleteTeacher: (id) => principalClient.delete(`/platform/school-portal/academic/teachers/${id}`).then((r) => r.data),
};

export const principalStudentApi = {
  students: (params) => principalClient.get('/platform/school-portal/students', { params }).then((res) => res.data),
  getStudent: (id) => principalClient.get(`/platform/school-portal/students/${id}`).then((res) => res.data),
  createStudent: (payload) =>
    principalClient.post('/platform/school-portal/students', payload, studentRequestConfig(payload)).then((res) => res.data),
  updateStudent: (id, payload) =>
    principalClient.patch(`/platform/school-portal/students/${id}`, payload, studentRequestConfig(payload)).then((res) => res.data),
  updateStudentStatus: (id, status) =>
    principalClient.patch(`/platform/school-portal/students/${id}/status`, { status }).then((res) => res.data),
  deleteStudent: (id) => principalClient.delete(`/platform/school-portal/students/${id}`).then((res) => res.data),
};

export const principalUserApi = {
  list: (params) => principalClient.get('/platform/school-portal/users', { params }).then((res) => res.data),
  get: (id) => principalClient.get(`/platform/school-portal/users/${id}`).then((res) => res.data),
  create: (payload) =>
    principalClient.post('/platform/school-portal/users', payload, studentRequestConfig(payload)).then((res) => res.data),
  update: (id, payload) =>
    principalClient.patch(`/platform/school-portal/users/${id}`, payload, studentRequestConfig(payload)).then((res) => res.data),
  updateStatus: (id, status) =>
    principalClient.patch(`/platform/school-portal/users/${id}/status`, { status }).then((res) => res.data),
  changePassword: (id, password) =>
    principalClient.patch(`/platform/school-portal/users/${id}/password`, { password }).then((res) => res.data),
  sendCredentials: (id) =>
    principalClient.post(`/platform/school-portal/users/${id}/send-credentials`).then((res) => res.data),
  delete: (id) => principalClient.delete(`/platform/school-portal/users/${id}`).then((res) => res.data),
};

export const principalNotificationApi = {
  list: () => principalClient.get('/platform/school-portal/notifications').then((res) => res.data),
  send: (payload) => principalClient.post('/platform/school-portal/notifications', payload).then((res) => res.data),
};

export const principalExamApi = {
  // Exams
  stats: () => principalClient.get('/platform/school-portal/exams/stats').then((r) => r.data),
  exams: (params) => principalClient.get('/platform/school-portal/exams', { params }).then((r) => r.data),
  getExam: (id) => principalClient.get(`/platform/school-portal/exams/${id}`).then((r) => r.data),
  createExam: (payload) => principalClient.post('/platform/school-portal/exams', payload).then((r) => r.data),
  updateExam: (id, payload) => principalClient.patch(`/platform/school-portal/exams/${id}`, payload).then((r) => r.data),
  deleteExam: (id) => principalClient.delete(`/platform/school-portal/exams/${id}`).then((r) => r.data),

  // Exam Subjects
  subjects: (examId, params) => principalClient.get(`/platform/school-portal/exams/${examId}/subjects`, { params }).then((r) => r.data),
  seedSubjects: (examId) => principalClient.post(`/platform/school-portal/exams/${examId}/subjects/seed`).then((r) => r.data),
  addSubject: (examId, payload) => principalClient.post(`/platform/school-portal/exams/${examId}/subjects`, payload).then((r) => r.data),
  updateSubject: (examId, id, payload) => principalClient.patch(`/platform/school-portal/exams/${examId}/subjects/${id}`, payload).then((r) => r.data),
  deleteSubject: (examId, id) => principalClient.delete(`/platform/school-portal/exams/${examId}/subjects/${id}`).then((r) => r.data),

  // Exam Schedule
  schedule: (examId, params) => principalClient.get(`/platform/school-portal/exams/${examId}/schedule`, { params }).then((r) => r.data),
  createScheduleEntry: (examId, payload) => principalClient.post(`/platform/school-portal/exams/${examId}/schedule`, payload).then((r) => r.data),
  updateScheduleEntry: (examId, id, payload) => principalClient.patch(`/platform/school-portal/exams/${examId}/schedule/${id}`, payload).then((r) => r.data),
  deleteScheduleEntry: (examId, id) => principalClient.delete(`/platform/school-portal/exams/${examId}/schedule/${id}`).then((r) => r.data),

  // Marks Entry
  marksSheet: (examId, params) => principalClient.get(`/platform/school-portal/exams/${examId}/marks`, { params }).then((r) => r.data),
  saveMarks: (examId, payload) => principalClient.post(`/platform/school-portal/exams/${examId}/marks`, payload).then((r) => r.data),

  // Results & Report Cards
  calculateResults: (examId, payload) => principalClient.post(`/platform/school-portal/exams/${examId}/results/calculate`, payload).then((r) => r.data),
  results: (examId, params) => principalClient.get(`/platform/school-portal/exams/${examId}/results`, { params }).then((r) => r.data),
  reportCard: (examId, studentId) => principalClient.get(`/platform/school-portal/exams/${examId}/results/${studentId}`).then((r) => r.data),
};

export const principalDashboardApi = {
  summary: () => principalClient.get('/platform/school-portal/dashboard/summary').then((res) => res.data),
};

export const principalReportApi = {
  summary: () => principalClient.get('/platform/school-portal/reports/summary').then((res) => res.data),
  data: (category, params) =>
    principalClient.get('/platform/school-portal/reports/data', { params: { category, ...params } }).then((res) => res.data),
};

export const principalHrApi = {
  departments: (params) => principalClient.get('/platform/school-portal/hr/departments', { params }).then((r) => r.data),
  designations: (params) => principalClient.get('/platform/school-portal/hr/designations', { params }).then((r) => r.data),
  approveEmployee: (id) => principalClient.patch(`/platform/school-portal/hr/employees/${id}/approve`).then((r) => r.data),
  employees: (params) => principalClient.get('/platform/school-portal/hr/employees', { params }).then((r) => r.data),

  // Leave Management
  leaves: (params) => principalClient.get('/platform/school-portal/hr/leave', { params }).then((r) => r.data),
  createLeave: (payload) => principalClient.post('/platform/school-portal/hr/leave', payload).then((r) => r.data),
  approveLeave: (id) => principalClient.patch(`/platform/school-portal/hr/leave/${id}/approve`).then((r) => r.data),
  rejectLeave: (id, reason) => principalClient.patch(`/platform/school-portal/hr/leave/${id}/reject`, { reason }).then((r) => r.data),
  cancelLeave: (id) => principalClient.patch(`/platform/school-portal/hr/leave/${id}/cancel`).then((r) => r.data),
  leaveBalance: (empId) => principalClient.get(`/platform/school-portal/hr/leave/balance/${empId}`).then((r) => r.data),
};

export const examPortalApi = {
  // Exams
  stats: () => schoolAdminClient.get('/platform/school-portal/exams/stats').then((r) => r.data),
  exams: (params) => schoolAdminClient.get('/platform/school-portal/exams', { params }).then((r) => r.data),
  getExam: (id) => schoolAdminClient.get(`/platform/school-portal/exams/${id}`).then((r) => r.data),
  createExam: (payload) => schoolAdminClient.post('/platform/school-portal/exams', payload).then((r) => r.data),
  updateExam: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/exams/${id}`, payload).then((r) => r.data),
  deleteExam: (id) => schoolAdminClient.delete(`/platform/school-portal/exams/${id}`).then((r) => r.data),

  // Exam Subjects
  subjects: (examId, params) => schoolAdminClient.get(`/platform/school-portal/exams/${examId}/subjects`, { params }).then((r) => r.data),
  seedSubjects: (examId) => schoolAdminClient.post(`/platform/school-portal/exams/${examId}/subjects/seed`).then((r) => r.data),
  addSubject: (examId, payload) => schoolAdminClient.post(`/platform/school-portal/exams/${examId}/subjects`, payload).then((r) => r.data),
  updateSubject: (examId, id, payload) => schoolAdminClient.patch(`/platform/school-portal/exams/${examId}/subjects/${id}`, payload).then((r) => r.data),
  deleteSubject: (examId, id) => schoolAdminClient.delete(`/platform/school-portal/exams/${examId}/subjects/${id}`).then((r) => r.data),

  // Exam Schedule
  schedule: (examId, params) => schoolAdminClient.get(`/platform/school-portal/exams/${examId}/schedule`, { params }).then((r) => r.data),
  createScheduleEntry: (examId, payload) => schoolAdminClient.post(`/platform/school-portal/exams/${examId}/schedule`, payload).then((r) => r.data),
  updateScheduleEntry: (examId, id, payload) => schoolAdminClient.patch(`/platform/school-portal/exams/${examId}/schedule/${id}`, payload).then((r) => r.data),
  deleteScheduleEntry: (examId, id) => schoolAdminClient.delete(`/platform/school-portal/exams/${examId}/schedule/${id}`).then((r) => r.data),

  // Marks Entry
  marksSheet: (examId, params) => schoolAdminClient.get(`/platform/school-portal/exams/${examId}/marks`, { params }).then((r) => r.data),
  saveMarks: (examId, payload) => schoolAdminClient.post(`/platform/school-portal/exams/${examId}/marks`, payload).then((r) => r.data),

  // Results & Report Cards
  calculateResults: (examId, payload) => schoolAdminClient.post(`/platform/school-portal/exams/${examId}/results/calculate`, payload).then((r) => r.data),
  results: (examId, params) => schoolAdminClient.get(`/platform/school-portal/exams/${examId}/results`, { params }).then((r) => r.data),
  reportCard: (examId, studentId) => schoolAdminClient.get(`/platform/school-portal/exams/${examId}/results/${studentId}`).then((r) => r.data),
};

export const hostelPortalApi = {
  // Dashboard & Helpers
  dashboard: () => schoolAdminClient.get('/platform/school-portal/hostel/dashboard').then((r) => r.data),
  seedDemo: () => schoolAdminClient.post('/platform/school-portal/hostel/seed-demo').then((r) => r.data),
  eligibleEntities: () => schoolAdminClient.get('/platform/school-portal/hostel/eligible-entities').then((r) => r.data),

  // Hostels
  hostels: (params) => schoolAdminClient.get('/platform/school-portal/hostel/hostels', { params }).then((r) => r.data),
  getHostel: (id) => schoolAdminClient.get(`/platform/school-portal/hostel/hostels/${id}`).then((r) => r.data),
  createHostel: (payload) => schoolAdminClient.post('/platform/school-portal/hostel/hostels', payload).then((r) => r.data),
  updateHostel: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/hostel/hostels/${id}`, payload).then((r) => r.data),
  deleteHostel: (id) => schoolAdminClient.delete(`/platform/school-portal/hostel/hostels/${id}`).then((r) => r.data),

  // Rooms
  rooms: (params) => schoolAdminClient.get('/platform/school-portal/hostel/rooms', { params }).then((r) => r.data),
  getRoom: (id) => schoolAdminClient.get(`/platform/school-portal/hostel/rooms/${id}`).then((r) => r.data),
  createRoom: (payload) => schoolAdminClient.post('/platform/school-portal/hostel/rooms', payload).then((r) => r.data),
  updateRoom: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/hostel/rooms/${id}`, payload).then((r) => r.data),
  deleteRoom: (id) => schoolAdminClient.delete(`/platform/school-portal/hostel/rooms/${id}`).then((r) => r.data),

  // Beds & Visualizer
  beds: (params) => schoolAdminClient.get('/platform/school-portal/hostel/beds', { params }).then((r) => r.data),
  bedVisualizer: (params) => schoolAdminClient.get('/platform/school-portal/hostel/beds/visualizer', { params }).then((r) => r.data),

  // Allocations & Vacate
  allocations: (params) => schoolAdminClient.get('/platform/school-portal/hostel/allocations', { params }).then((r) => r.data),
  allocateStudent: (payload) => schoolAdminClient.post('/platform/school-portal/hostel/allocations', payload).then((r) => r.data),
  transferStudent: (id, payload) => schoolAdminClient.post(`/platform/school-portal/hostel/allocations/${id}/transfer`, payload).then((r) => r.data),
  checkoutStudent: (id, payload) => schoolAdminClient.post(`/platform/school-portal/hostel/allocations/${id}/checkout`, payload).then((r) => r.data),

  // Attendance
  getAttendance: (hostelId, params) => schoolAdminClient.get(`/platform/school-portal/hostel/attendance/${hostelId}`, { params }).then((r) => r.data),
  saveAttendance: (hostelId, payload) => schoolAdminClient.post(`/platform/school-portal/hostel/attendance/${hostelId}`, payload).then((r) => r.data),

  // Outings
  outings: (params) => schoolAdminClient.get('/platform/school-portal/hostel/outings', { params }).then((r) => r.data),
  createOuting: (payload) => schoolAdminClient.post('/platform/school-portal/hostel/outings', payload).then((r) => r.data),
  updateOutingStatus: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/hostel/outings/${id}/status`, payload).then((r) => r.data),

  // Complaints
  complaints: (params) => schoolAdminClient.get('/platform/school-portal/hostel/complaints', { params }).then((r) => r.data),
  createComplaint: (payload) => schoolAdminClient.post('/platform/school-portal/hostel/complaints', payload).then((r) => r.data),
  updateComplaint: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/hostel/complaints/${id}`, payload).then((r) => r.data),
};

export const transportPortalApi = {
  // Dashboard & Helpers
  dashboard: () => schoolAdminClient.get('/platform/school-portal/transport/dashboard').then((r) => r.data),
  seedDemo: () => schoolAdminClient.post('/platform/school-portal/transport/seed-demo').then((r) => r.data),
  eligibleEntities: () => schoolAdminClient.get('/platform/school-portal/transport/eligible-entities').then((r) => r.data),

  // Vehicles
  vehicles: (params) => schoolAdminClient.get('/platform/school-portal/transport/vehicles', { params }).then((r) => r.data),
  getVehicle: (id) => schoolAdminClient.get(`/platform/school-portal/transport/vehicles/${id}`).then((r) => r.data),
  createVehicle: (payload) => schoolAdminClient.post('/platform/school-portal/transport/vehicles', payload).then((r) => r.data),
  updateVehicle: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/transport/vehicles/${id}`, payload).then((r) => r.data),
  deleteVehicle: (id) => schoolAdminClient.delete(`/platform/school-portal/transport/vehicles/${id}`).then((r) => r.data),

  // Routes
  routes: (params) => schoolAdminClient.get('/platform/school-portal/transport/routes', { params }).then((r) => r.data),
  getRoute: (id) => schoolAdminClient.get(`/platform/school-portal/transport/routes/${id}`).then((r) => r.data),
  createRoute: (payload) => schoolAdminClient.post('/platform/school-portal/transport/routes', payload).then((r) => r.data),
  updateRoute: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/transport/routes/${id}`, payload).then((r) => r.data),
  deleteRoute: (id) => schoolAdminClient.delete(`/platform/school-portal/transport/routes/${id}`).then((r) => r.data),

  // Route Stops
  stops: (routeId) => schoolAdminClient.get(`/platform/school-portal/transport/routes/${routeId}/stops`).then((r) => r.data),
  createStop: (routeId, payload) => schoolAdminClient.post(`/platform/school-portal/transport/routes/${routeId}/stops`, payload).then((r) => r.data),
  updateStop: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/transport/stops/${id}`, payload).then((r) => r.data),
  deleteStop: (id) => schoolAdminClient.delete(`/platform/school-portal/transport/stops/${id}`).then((r) => r.data),

  // Student Assignments
  assignments: (params) => schoolAdminClient.get('/platform/school-portal/transport/assignments', { params }).then((r) => r.data),
  assignStudent: (payload) => schoolAdminClient.post('/platform/school-portal/transport/assignments', payload).then((r) => r.data),
  discontinueAssignment: (id, payload) => schoolAdminClient.post(`/platform/school-portal/transport/assignments/${id}/discontinue`, payload).then((r) => r.data),

  // Attendance
  getAttendance: (routeId, params) => schoolAdminClient.get(`/platform/school-portal/transport/attendance/${routeId}`, { params }).then((r) => r.data),
  saveAttendance: (routeId, payload) => schoolAdminClient.post(`/platform/school-portal/transport/attendance/${routeId}`, payload).then((r) => r.data),

  // Maintenance
  maintenance: (params) => schoolAdminClient.get('/platform/school-portal/transport/maintenance', { params }).then((r) => r.data),
  createMaintenance: (payload) => schoolAdminClient.post('/platform/school-portal/transport/maintenance', payload).then((r) => r.data),

  // Incidents
  incidents: (params) => schoolAdminClient.get('/platform/school-portal/transport/incidents', { params }).then((r) => r.data),
  createIncident: (payload) => schoolAdminClient.post('/platform/school-portal/transport/incidents', payload).then((r) => r.data),
  updateIncident: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/transport/incidents/${id}`, payload).then((r) => r.data),
};

// ============================================================
// ACCOUNTANT PORTAL
// ============================================================
const accountantClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

accountantClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accountant_token') || localStorage.getItem('school_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const accountantAuthApi = {
  login: (credentials) =>
    apiClient.post('/platform/school-portal/auth/accountant-login', credentials).then((r) => r.data),
  profile: () => accountantClient.get('/platform/school-portal/accountant/profile').then((r) => r.data),
  updateProfile: (payload) =>
    accountantClient
      .patch('/platform/school-portal/accountant/profile', payload, studentRequestConfig(payload))
      .then((r) => r.data),
  changePassword: (payload) =>
    accountantClient.patch('/platform/school-portal/accountant/password', payload).then((r) => r.data),
};

export const accountantApi = {
  // Dashboard
  dashboard: (params) =>
    accountantClient.get('/platform/school-portal/accountant/dashboard', { params }).then((r) => r.data),

  // Reference data (shared academic + student lookups)
  academicYears: () =>
    accountantClient.get('/platform/school-portal/accountant/academic-years').then((r) => r.data),
  classes: (params) =>
    accountantClient.get('/platform/school-portal/accountant/classes', { params }).then((r) => r.data),
  sections: (params) =>
    accountantClient.get('/platform/school-portal/accountant/sections', { params }).then((r) => r.data),
  searchStudents: (params) =>
    accountantClient.get('/platform/school-portal/accountant/students', { params }).then((r) => r.data),
  getStudent: (id) =>
    accountantClient.get(`/platform/school-portal/accountant/students/${id}`).then((r) => r.data),

  // Fee Collection
  studentFeeProfile: (studentId, params) =>
    accountantClient
      .get(`/platform/school-portal/accountant/fees/students/${studentId}/profile`, { params })
      .then((r) => r.data),
  generateInvoice: (payload) =>
    accountantClient.post('/platform/school-portal/accountant/fees/invoices/generate', payload).then((r) => r.data),
  collectPayment: (invoiceId, payload) =>
    accountantClient
      .post(`/platform/school-portal/accountant/fees/invoices/${invoiceId}/pay`, payload)
      .then((r) => r.data),

  // Fee Structure (read scope)
  feeStructures: (params) =>
    accountantClient.get('/platform/school-portal/accountant/fee-structures', { params }).then((r) => r.data),
  feeStructure: (id) =>
    accountantClient.get(`/platform/school-portal/accountant/fee-structures/${id}`).then((r) => r.data),

  // Installments
  installments: (params) =>
    accountantClient.get('/platform/school-portal/accountant/installments', { params }).then((r) => r.data),

  // Dues / Pending Fees
  dues: (params) =>
    accountantClient.get('/platform/school-portal/accountant/dues', { params }).then((r) => r.data),
  studentDueHistory: (studentId) =>
    accountantClient.get(`/platform/school-portal/accountant/dues/${studentId}/history`).then((r) => r.data),

  // Expenses
  expenses: (params) =>
    accountantClient.get('/platform/school-portal/accountant/expenses', { params }).then((r) => r.data),
  getExpense: (id) =>
    accountantClient.get(`/platform/school-portal/accountant/expenses/${id}`).then((r) => r.data),
  createExpense: (payload) =>
    accountantClient
      .post('/platform/school-portal/accountant/expenses', payload, studentRequestConfig(payload))
      .then((r) => r.data),
  updateExpense: (id, payload) =>
    accountantClient
      .patch(`/platform/school-portal/accountant/expenses/${id}`, payload, studentRequestConfig(payload))
      .then((r) => r.data),
  updateExpenseStatus: (id, payload) =>
    accountantClient
      .patch(`/platform/school-portal/accountant/expenses/${id}/status`, payload)
      .then((r) => r.data),
  deleteExpense: (id) =>
    accountantClient.delete(`/platform/school-portal/accountant/expenses/${id}`).then((r) => r.data),
  expenseCategories: () =>
    accountantClient.get('/platform/school-portal/accountant/expenses/categories').then((r) => r.data),

  // Receipts / Invoices
  receipts: (params) =>
    accountantClient.get('/platform/school-portal/accountant/receipts', { params }).then((r) => r.data),
  getReceipt: (id) =>
    accountantClient.get(`/platform/school-portal/accountant/receipts/${id}`).then((r) => r.data),
  invoices: (params) =>
    accountantClient.get('/platform/school-portal/accountant/invoices', { params }).then((r) => r.data),
  getInvoice: (id) =>
    accountantClient.get(`/platform/school-portal/accountant/invoices/${id}`).then((r) => r.data),

  // Transactions
  transactions: (params) =>
    accountantClient.get('/platform/school-portal/accountant/transactions', { params }).then((r) => r.data),
  getTransaction: (id) =>
    accountantClient.get(`/platform/school-portal/accountant/transactions/${id}`).then((r) => r.data),

  // Notifications (read/unread is tracked client-side, like the other staff portals)
  notifications: (params) =>
    accountantClient.get('/platform/school-portal/accountant/notifications', { params }).then((r) => r.data),

  // Reports
  report: (category, params) =>
    accountantClient
      .get(`/platform/school-portal/accountant/reports/${category}`, { params })
      .then((r) => r.data),

  // Settings
  settings: () =>
    accountantClient.get('/platform/school-portal/accountant/settings').then((r) => r.data),
  updateSettings: (payload) =>
    accountantClient.patch('/platform/school-portal/accountant/settings', payload).then((r) => r.data),
};

// ===========================================================================
// EVENTS — school-admin (write + read)
// ===========================================================================
export const eventsApi = {
  list: (params) =>
    schoolAdminClient.get('/platform/school-portal/events', { params }).then((r) => r.data),
  stats: () =>
    schoolAdminClient.get('/platform/school-portal/events/stats').then((r) => r.data),
  get: (id) =>
    schoolAdminClient.get(`/platform/school-portal/events/${id}`).then((r) => r.data),
  create: (payload) =>
    schoolAdminClient.post('/platform/school-portal/events', payload).then((r) => r.data),
  update: (id, payload) =>
    schoolAdminClient.patch(`/platform/school-portal/events/${id}`, payload).then((r) => r.data),
  setCancelled: (id, cancelled) =>
    schoolAdminClient.patch(`/platform/school-portal/events/${id}`, { cancelled }).then((r) => r.data),
  remove: (id) =>
    schoolAdminClient.delete(`/platform/school-portal/events/${id}`).then((r) => r.data),
};

// EVENTS — principal (read-only)
export const principalEventApi = {
  list: (params) =>
    principalClient.get('/platform/school-portal/events', { params }).then((r) => r.data),
  stats: () =>
    principalClient.get('/platform/school-portal/events/stats').then((r) => r.data),
};

// ===========================================================================
// HOMEWORK — school-admin (write + read + monitor)
// ===========================================================================
export const homeworkApi = {
  list: (params) =>
    schoolAdminClient.get('/platform/school-portal/homework', { params }).then((r) => r.data),
  stats: (params) =>
    schoolAdminClient.get('/platform/school-portal/homework/stats', { params }).then((r) => r.data),
  monitor: (params) =>
    schoolAdminClient.get('/platform/school-portal/homework/monitor', { params }).then((r) => r.data),
  get: (id) =>
    schoolAdminClient.get(`/platform/school-portal/homework/${id}`).then((r) => r.data),
  create: (payload) =>
    schoolAdminClient.post('/platform/school-portal/homework', payload).then((r) => r.data),
  update: (id, payload) =>
    schoolAdminClient.patch(`/platform/school-portal/homework/${id}`, payload).then((r) => r.data),
  remove: (id) =>
    schoolAdminClient.delete(`/platform/school-portal/homework/${id}`).then((r) => r.data),
};

// HOMEWORK — principal (read-only monitor)
export const principalHomeworkApi = {
  list: (params) =>
    principalClient.get('/platform/school-portal/homework', { params }).then((r) => r.data),
  stats: (params) =>
    principalClient.get('/platform/school-portal/homework/stats', { params }).then((r) => r.data),
  monitor: (params) =>
    principalClient.get('/platform/school-portal/homework/monitor', { params }).then((r) => r.data),
};

// ===========================================================================
// ADMISSIONS — school-admin
// ===========================================================================
export const admissionsApi = {
  list: (params) =>
    schoolAdminClient.get('/platform/school-portal/admissions', { params }).then((r) => r.data),
  stats: () =>
    schoolAdminClient.get('/platform/school-portal/admissions/stats').then((r) => r.data),
  get: (id) =>
    schoolAdminClient.get(`/platform/school-portal/admissions/${id}`).then((r) => r.data),
  create: (payload) =>
    schoolAdminClient.post('/platform/school-portal/admissions', payload).then((r) => r.data),
  update: (id, payload) =>
    schoolAdminClient.patch(`/platform/school-portal/admissions/${id}`, payload).then((r) => r.data),
  setStatus: (id, status, reason) =>
    schoolAdminClient
      .patch(`/platform/school-portal/admissions/${id}/status`, { status, reason })
      .then((r) => r.data),
  approve: (id, payload = {}) =>
    schoolAdminClient.post(`/platform/school-portal/admissions/${id}/approve`, payload).then((r) => r.data),
  remove: (id) =>
    schoolAdminClient.delete(`/platform/school-portal/admissions/${id}`).then((r) => r.data),
};

// ===========================================================================
// MEETINGS — principal
// ===========================================================================
export const principalMeetingApi = {
  list: (params) =>
    principalClient.get('/platform/school-portal/principal/meetings', { params }).then((r) => r.data),
  get: (id) =>
    principalClient.get(`/platform/school-portal/principal/meetings/${id}`).then((r) => r.data),
  create: (payload) =>
    principalClient.post('/platform/school-portal/principal/meetings', payload).then((r) => r.data),
  update: (id, payload) =>
    principalClient.patch(`/platform/school-portal/principal/meetings/${id}`, payload).then((r) => r.data),
  setStatus: (id, status, minutes) =>
    principalClient
      .patch(`/platform/school-portal/principal/meetings/${id}/status`, { status, minutes })
      .then((r) => r.data),
  remove: (id) =>
    principalClient.delete(`/platform/school-portal/principal/meetings/${id}`).then((r) => r.data),
};



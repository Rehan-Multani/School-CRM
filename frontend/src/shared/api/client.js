import axios from 'axios';
import { announceSubscriptionBlocked } from '../ui/SubscriptionBlockedOverlay';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Tokens for every panel — used by assetUrl() so <img>/<a> requests to the
// now-authenticated /uploads mount carry a credential via ?t= query param.
const PANEL_TOKEN_KEYS = [
  'school_admin_token',
  'principal_token',
  'accountant_token',
  'hr_token',
  'librarian_token',
  'transport_token',
  'teacher_token',
  'student_token',
  'parent_token',
  'super_admin_token',
];

const ROUTE_TOKEN_MAP = [
  { prefix: '/school-admin', key: 'school_admin_token' },
  { prefix: '/principal', key: 'principal_token' },
  { prefix: '/accountant', key: 'accountant_token' },
  { prefix: '/hr', key: 'hr_token' },
  { prefix: '/librarian', key: 'librarian_token' },
  { prefix: '/transport', key: 'transport_token' },
  { prefix: '/teacher', key: 'teacher_token' },
  { prefix: '/student', key: 'student_token' },
  { prefix: '/parent', key: 'parent_token' },
  { prefix: '/super-admin', key: 'super_admin_token' },
];

const ROLE_TOKEN_MAP = {
  'school-admin': 'school_admin_token',
  'schooladmin': 'school_admin_token',
  'admin': 'school_admin_token',
  'principal': 'principal_token',
  'accountant': 'accountant_token',
  'hr': 'hr_token',
  'librarian': 'librarian_token',
  'transport': 'transport_token',
  'driver': 'transport_token',
  'teacher': 'teacher_token',
  'student': 'student_token',
  'parent': 'parent_token',
  'super-admin': 'super_admin_token',
  'superadmin': 'super_admin_token',
};

function currentPanelToken(preferredRole) {
  try {
    if (preferredRole) {
      const normalized = String(preferredRole).toLowerCase().replace(/[\s_]/g, '-');
      const key = ROLE_TOKEN_MAP[normalized];
      if (key) {
        const v = localStorage.getItem(key);
        if (v) return v;
      }
    }
    if (typeof window !== 'undefined' && window.location?.pathname) {
      const path = window.location.pathname;
      const matched = ROUTE_TOKEN_MAP.find((m) => path.startsWith(m.prefix));
      if (matched) {
        const v = localStorage.getItem(matched.key);
        if (v) return v;
      }
    }
    for (const key of PANEL_TOKEN_KEYS) {
      const v = localStorage.getItem(key);
      if (v) return v;
    }
  } catch {
    /* localStorage unavailable */
  }
  return '';
}

/**
 * Build a URL for a file stored under the platform-service /uploads mount.
 * Accepts an absolute URL (returned as-is), or a stored relative path like
 * `students/images-123.webp` / `/uploads/users/avatar-1.webp`.
 * Appends `?t=<token>` so the authenticated /uploads route accepts <img>/<a>.
 */
export function assetUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  if (/^(https?:|data:|blob:)/i.test(pathOrUrl)) return pathOrUrl;
  const base = API_BASE_URL.replace(/\/$/, '');
  let rel = String(pathOrUrl).trim();
  if (!rel.startsWith('/')) rel = `/${rel}`;
  const token = currentPanelToken();
  const sep = rel.includes('?') ? '&' : '?';
  return `${base}/platform${rel}${token ? `${sep}t=${encodeURIComponent(token)}` : ''}`;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Every panel except the School Admin's: a 402 means the school has no active
// plan. Only the School Admin can fix that, so these panels show a blocked
// screen (SubscriptionBlockedOverlay) instead of redirecting anywhere.
function blockOnSubscription402(client) {
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      // The School Admin panel handles its own 402 (it sends the admin to Plans).
      const inAdminPanel = typeof window !== 'undefined' && window.location.pathname.startsWith('/school-admin');
      if (error.response?.status === 402 && !inAdminPanel) announceSubscriptionBlocked(error.response?.data?.message);
      return Promise.reject(error);
    }
  );
}
blockOnSubscription402(apiClient);

// Staff panels (Principal / HR / Accountant / Librarian): a 401 means the
// session is over — the token expired, or the account was deactivated or
// removed. Clear that panel's session and send the user to its login page
// instead of leaving them on a page where every request fails.
function signOutOn401(client, { panel, tokenKey, userKey }) {
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const url = error.config?.url || '';
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const loginPath = `/${panel}/login`;
      if (
        error.response?.status === 401 &&
        path.startsWith(`/${panel}/`) && // not when the School Admin panel borrows this client
        path !== loginPath &&
        !url.endsWith('/password') // "current password is incorrect" is also a 401
      ) {
        try {
          localStorage.removeItem(tokenKey);
          localStorage.removeItem(userKey);
        } catch {
          /* localStorage unavailable */
        }
        window.location.assign(loginPath);
      }
      return Promise.reject(error);
    }
  );
}

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const token = localStorage.getItem('super_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
  // One-time code from the Super Admin panel's "Login as school".
  loginAs: (code) => apiClient.post('/platform/school-auth/login-as', { code }).then((res) => res.data),
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

// Backend returns 402 once a school's subscription has expired past its
// grace period. Bounce to the plans page so the block is never just a
// generic error toast on whatever page the admin happened to be on.
schoolAdminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 402 && typeof window !== 'undefined') {
      if (!window.location.pathname.startsWith('/school-admin/plans')) {
        window.location.href = '/school-admin/plans';
      }
    }
    return Promise.reject(error);
  }
);

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
  initiateSubscriptionCheckout: (planId) =>
    schoolAdminClient.post('/platform/school-portal/select-plan/checkout', { planId }).then((res) => res.data),
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
  // Student lifecycle: promotion, transfer / TC, bulk CSV import
  promotionPreview: (params) =>
    schoolAdminClient.get('/platform/school-portal/students/promote/preview', { params }).then((res) => res.data),
  promoteStudents: (payload) =>
    schoolAdminClient.post('/platform/school-portal/students/promote', payload).then((res) => res.data),
  transferStudent: (id, payload) =>
    schoolAdminClient.post(`/platform/school-portal/students/${id}/transfer`, payload).then((res) => res.data),
  reactivateStudent: (id) =>
    schoolAdminClient.post(`/platform/school-portal/students/${id}/reactivate`).then((res) => res.data),
  transferCertificate: (id) =>
    schoolAdminClient.get(`/platform/school-portal/students/${id}/transfer-certificate`).then((res) => res.data),
  studentImportTemplate: () =>
    schoolAdminClient.get('/platform/school-portal/students/import/template', { responseType: 'blob' }).then((res) => res.data),
  importStudentsCsv: (file, academicYearId, { dryRun = false } = {}) => {
    const formData = new FormData();
    formData.append('academicYearId', academicYearId);
    formData.append('file', file);
    return schoolAdminClient
      .post('/platform/school-portal/students/import', formData, {
        params: dryRun ? { dryRun: 1 } : undefined,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data);
  },
  // Safe Pickup APIs
  safePickupSettings: () => schoolAdminClient.get('/platform/school-portal/settings/safe-pickup').then((res) => res.data),
  updateSafePickupClass: (classId, safePickupEnabled) =>
    schoolAdminClient.patch(`/platform/school-portal/academic/classes/${classId}/pickup`, { safePickupEnabled }).then((res) => res.data),
  safePickupStudents: (params) => schoolAdminClient.get('/platform/school-portal/safe-pickup/students', { params }).then((res) => res.data),
  sendSafePickupOtp: (payload) => schoolAdminClient.post('/platform/school-portal/safe-pickup/send-otp', payload).then((res) => res.data),
  verifySafePickupOtp: (payload) => schoolAdminClient.post('/platform/school-portal/safe-pickup/verify-otp', payload).then((res) => res.data),
  resendSafePickupOtp: (payload) => schoolAdminClient.post('/platform/school-portal/safe-pickup/resend-otp', payload).then((res) => res.data),
  cancelSafePickup: (payload) => schoolAdminClient.post('/platform/school-portal/safe-pickup/cancel', payload).then((res) => res.data),
  safePickupHistory: (params) => schoolAdminClient.get('/platform/school-portal/safe-pickup/history', { params }).then((res) => res.data),
  principalSafePickupSettings: () => principalClient.get('/platform/school-portal/principal/safe-pickup/settings').then((res) => res.data),
  principalSafePickupStudents: (params) => principalClient.get('/platform/school-portal/principal/safe-pickup/students', { params }).then((res) => res.data),
  principalSendSafePickupOtp: (payload) => principalClient.post('/platform/school-portal/principal/safe-pickup/send-otp', payload).then((res) => res.data),
  principalVerifySafePickupOtp: (payload) => principalClient.post('/platform/school-portal/principal/safe-pickup/verify-otp', payload).then((res) => res.data),
  principalResendSafePickupOtp: (payload) => principalClient.post('/platform/school-portal/principal/safe-pickup/resend-otp', payload).then((res) => res.data),
  principalCancelSafePickup: (payload) => principalClient.post('/platform/school-portal/principal/safe-pickup/cancel', payload).then((res) => res.data),
  principalSafePickupHistory: (params) => principalClient.get('/platform/school-portal/principal/safe-pickup/history', { params }).then((res) => res.data),
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
  setTeacherPassword: (id, newPassword) =>
    schoolAdminClient.post(`/platform/school-portal/academic/teachers/${id}/set-password`, { newPassword }).then((r) => r.data),
  deleteTeacher: (id) => schoolAdminClient.delete(`/platform/school-portal/academic/teachers/${id}`).then((r) => r.data),
};

// Class timetable (School Admin). Entries: { id, sectionId, subjectId, subjectName, teacherId, teacherName,
// dayOfWeek: 'MON'..'SAT', periodNumber, startTime, endTime, room }.
export const timetableApi = {
  list: (params) => schoolAdminClient.get('/platform/school-portal/timetable', { params }).then((r) => r.data),
  create: (payload) => schoolAdminClient.post('/platform/school-portal/timetable', payload).then((r) => r.data),
  update: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/timetable/${id}`, payload).then((r) => r.data),
  remove: (id) => schoolAdminClient.delete(`/platform/school-portal/timetable/${id}`).then((r) => r.data),
  // Replaces the whole grid of one section: { academicYearId?, periods: [{ dayOfWeek, periodNumber, startTime, endTime, subjectId, teacherId? }] }
  saveSection: (sectionId, payload) =>
    schoolAdminClient.put(`/platform/school-portal/timetable/sections/${sectionId}`, payload).then((r) => r.data),
};

export const feePortalApi = {
  // Fee Heads
  heads: (params) => schoolAdminClient.get('/platform/school-portal/fees/heads', { params }).then((r) => r.data),
  getHead: (id) => schoolAdminClient.get(`/platform/school-portal/fees/heads/${id}`).then((r) => r.data),
  createHead: (payload) => schoolAdminClient.post('/platform/school-portal/fees/heads', payload).then((r) => r.data),
  updateHead: (id, payload) => schoolAdminClient.patch(`/platform/school-portal/fees/heads/${id}`, payload).then((r) => r.data),
  deleteHead: (id) => schoolAdminClient.delete(`/platform/school-portal/fees/heads/${id}`).then((r) => r.data),
  seedDefaultHeads: () => schoolAdminClient.post('/platform/school-portal/fees/heads/seed').then((r) => r.data),
  bulkCreateHeads: (payload) => schoolAdminClient.post('/platform/school-portal/fees/heads/bulk', payload).then((r) => r.data),

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

  // Installment schedule, fee policy & late fees
  generateSchedule: (payload) => schoolAdminClient.post('/platform/school-portal/fees/invoices/schedule', payload).then((r) => r.data),
  feeSettings: () => schoolAdminClient.get('/platform/school-portal/fees/settings').then((r) => r.data),
  updateFeeSettings: (payload) => schoolAdminClient.put('/platform/school-portal/fees/settings', payload).then((r) => r.data),
  applyLateFees: () => schoolAdminClient.post('/platform/school-portal/fees/late-fees/apply').then((r) => r.data),
  refundPayment: (id, payload) => schoolAdminClient.post(`/platform/school-portal/fees/payments/${id}/refund`, payload).then((r) => r.data),
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
  resetLogin: (id, payload = {}) =>
    apiClient.post(`/platform/schools/${id}/reset-login`, payload).then((res) => res.data),
  changePassword: (id, password) =>
    apiClient.post(`/platform/schools/${id}/change-password`, { password }).then((res) => res.data),
  remove: (id) => apiClient.delete(`/platform/schools/${id}`).then((res) => res.data),
  getFeatures: (id) => apiClient.get(`/platform/schools/${id}/features`).then((res) => res.data),
  updateFeatures: (id, payload) =>
    apiClient.patch(`/platform/schools/${id}/features`, payload).then((res) => res.data),
};

export const platformSubscriptionApi = {
  list: () => apiClient.get('/platform/subscriptions').then((res) => res.data),
  get: (id) => apiClient.get(`/platform/subscriptions/${id}`).then((res) => res.data),
  create: (payload) => apiClient.post('/platform/subscriptions', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/platform/subscriptions/${id}`, payload).then((res) => res.data),
  archive: (id) => apiClient.post(`/platform/subscriptions/${id}/archive`).then((res) => res.data),
  remove: (id) => apiClient.delete(`/platform/subscriptions/${id}`).then((res) => res.data),
};

// ===========================================================================
// SCHOOL SUBSCRIPTIONS (Razorpay recurring) — Super Admin
// ===========================================================================
export const platformSchoolSubscriptionApi = {
  stats: () => apiClient.get('/platform/school-subscriptions/stats').then((r) => r.data),
  list: (params) => apiClient.get('/platform/school-subscriptions', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/platform/school-subscriptions/${id}`).then((r) => r.data),
  create: (schoolId, payload) => apiClient.post(`/platform/schools/${schoolId}/subscription`, payload).then((r) => r.data),
  cancel: (id, payload) => apiClient.post(`/platform/school-subscriptions/${id}/cancel`, payload).then((r) => r.data),
  changePlan: (id, planId) => apiClient.post(`/platform/school-subscriptions/${id}/change-plan`, { planId }).then((r) => r.data),
  override: (id, payload) => apiClient.post(`/platform/school-subscriptions/${id}/override`, payload).then((r) => r.data),
  payments: (id, params) => apiClient.get(`/platform/school-subscriptions/${id}/payments`, { params }).then((r) => r.data),
  invoices: (id, params) => apiClient.get(`/platform/school-subscriptions/${id}/invoices`, { params }).then((r) => r.data),
  history: (id, params) => apiClient.get(`/platform/school-subscriptions/${id}/history`, { params }).then((r) => r.data),
};

// SCHOOL SUBSCRIPTION — School Admin (own school only, schoolId from JWT)
export const schoolSubscriptionApi = {
  checkoutInfo: () => schoolAdminClient.get('/platform/school-portal/subscription/checkout-info').then((r) => r.data),
  get: () => schoolAdminClient.get('/platform/school-portal/subscription').then((r) => r.data),
  entitlement: () => schoolAdminClient.get('/platform/school-portal/subscription/entitlement').then((r) => r.data),
  // Asks the backend to check with Razorpay whether the open checkout was paid.
  sync: () => schoolAdminClient.post('/platform/school-portal/subscription/sync').then((r) => r.data),
  checkout: (planId) => schoolAdminClient.post('/platform/school-portal/subscription/checkout', { planId }).then((r) => r.data),
  changePlan: (planId) => schoolAdminClient.post('/platform/school-portal/subscription/change-plan', { planId }).then((r) => r.data),
  cancel: (reason) => schoolAdminClient.post('/platform/school-portal/subscription/cancel', { reason }).then((r) => r.data),
  payments: (params) => schoolAdminClient.get('/platform/school-portal/subscription/payments', { params }).then((r) => r.data),
  invoices: (params) => schoolAdminClient.get('/platform/school-portal/subscription/invoices', { params }).then((r) => r.data),
  history: (params) => schoolAdminClient.get('/platform/school-portal/subscription/history', { params }).then((r) => r.data),
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

// `apiClient`'s interceptor only carries the super-admin token by default, but the inbox
// and device-token routes are called from every role portal and are now authenticated
// (they derive school/user scope from the caller's token instead of trusting query
// params). So these send whichever panel token this browser holds or the caller's role.
function panelAuthHeader(roleOrToken) {
  let token = '';
  if (roleOrToken && typeof roleOrToken === 'string') {
    if (roleOrToken.startsWith('Bearer ')) {
      return { headers: { Authorization: roleOrToken } };
    }
    const normalized = roleOrToken.toLowerCase().replace(/[\s_]/g, '-');
    if (ROLE_TOKEN_MAP[normalized]) {
      token = currentPanelToken(roleOrToken);
    } else {
      token = roleOrToken;
    }
  }
  if (!token) {
    token = currentPanelToken();
  }
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export const platformNotificationApi = {
  list: () => apiClient.get('/platform/notifications').then((res) => res.data),
  send: (payload) => apiClient.post('/platform/notifications', payload).then((res) => res.data),
  inbox: (roleOrToken) =>
    apiClient.get('/platform/notifications/inbox', panelAuthHeader(roleOrToken)).then((res) => res.data),
  registerDevice: (payload, roleOrToken) =>
    apiClient.post('/platform/device-tokens', payload, panelAuthHeader(roleOrToken)).then((res) => res.data),
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

export const publicEnquiryApi = {
  submit: (payload) => apiClient.post('/platform/enquiries', payload).then((res) => res.data),
};

export const publicFaqApi = {
  list: () => apiClient.get('/platform/faqs').then((res) => res.data),
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
blockOnSubscription402(librarianClient);
signOutOn401(librarianClient, { panel: 'librarian', tokenKey: 'librarian_token', userKey: 'librarian_user' });

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
blockOnSubscription402(hrClient);
signOutOn401(hrClient, { panel: 'hr', tokenKey: 'hr_token', userKey: 'hr_user' });

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
  disbursePayroll: (id, payload = {}) =>
    hrClient.patch(`/platform/school-portal/hr/payroll/${id}/status`, { ...payload, status: payload.paymentStatus || payload.status || 'PAID' }).then((r) => r.data),
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
  updateAnnouncement: (id, payload) => hrClient.patch(`/platform/school-portal/hr/announcements/${id}`, payload).then((r) => r.data),
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
blockOnSubscription402(principalClient);
signOutOn401(principalClient, { panel: 'principal', tokenKey: 'principal_token', userKey: 'principal-user' });

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
  // Forgot password — OTP emailed to the registered address (public routes, role PRINCIPAL).
  // 1. forgotPassword → email   2. verifyResetOtp → resetToken   3. resetPassword
  forgotPassword: (identifier) =>
    apiClient
      .post('/platform/school-portal/auth/forgot-password', { role: 'PRINCIPAL', identifier: String(identifier || '').trim() })
      .then((r) => r.data),
  verifyResetOtp: (identifier, otp) =>
    apiClient
      .post('/platform/school-portal/auth/verify-reset-otp', { role: 'PRINCIPAL', identifier: String(identifier || '').trim(), otp })
      .then((r) => r.data),
  resetPassword: (resetToken, newPassword) =>
    apiClient.post('/platform/school-portal/auth/reset-password', { resetToken, newPassword }).then((r) => r.data),
};

// Teacher forgot-password — OTP is emailed to the registered address (public routes, role TEACHER).
export const teacherAuthApi = {
  forgotPassword: (identifier) =>
    apiClient
      .post('/platform/school-portal/auth/forgot-password', { role: 'TEACHER', identifier: String(identifier || '').trim() })
      .then((r) => r.data),
  verifyResetOtp: (identifier, otp) =>
    apiClient
      .post('/platform/school-portal/auth/verify-reset-otp', { role: 'TEACHER', identifier: String(identifier || '').trim(), otp })
      .then((r) => r.data),
  resetPassword: (resetToken, newPassword) =>
    apiClient.post('/platform/school-portal/auth/reset-password', { resetToken, newPassword }).then((r) => r.data),
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
  setTeacherPassword: (id, newPassword) =>
    principalClient.post(`/platform/school-portal/academic/teachers/${id}/set-password`, { newPassword }).then((r) => r.data),
  deleteTeacher: (id) => principalClient.delete(`/platform/school-portal/academic/teachers/${id}`).then((r) => r.data),
};

export const principalTimetableApi = {
  list: (params) => principalClient.get('/platform/school-portal/timetable', { params }).then((r) => r.data),
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

const HOSTEL = '/platform/school-portal/hostel';

/**
 * Hostel module — the school-admin surface, in flow order:
 * Hostel -> Room -> Beds -> Warden (+ hostel) -> Student (+ hostel + room +
 * bed) -> Yearly hostel fee.
 *
 * Nothing outside that flow has an endpoint: no mess, attendance, visitors,
 * complaints, laundry, inventory, maintenance or hostel reports.
 */
export const hostelPortalApi = {
  // Dropdown data for every form on the page — students, hostels with their
  // rooms and beds, wardens, the current year and its fee. One call.
  lookups: () => schoolAdminClient.get(`${HOSTEL}/lookups`).then((r) => r.data),

  // 1 - Hostels
  hostels: (params) => schoolAdminClient.get(`${HOSTEL}/hostels`, { params }).then((r) => r.data),
  getHostel: (id) => schoolAdminClient.get(`${HOSTEL}/hostels/${id}`).then((r) => r.data),
  createHostel: (payload) => schoolAdminClient.post(`${HOSTEL}/hostels`, payload).then((r) => r.data),
  updateHostel: (id, payload) => schoolAdminClient.patch(`${HOSTEL}/hostels/${id}`, payload).then((r) => r.data),
  deleteHostel: (id) => schoolAdminClient.delete(`${HOSTEL}/hostels/${id}`).then((r) => r.data),

  // 2 + 3 - Rooms. Capacity defines the beds; they are created with the room.
  rooms: (params) => schoolAdminClient.get(`${HOSTEL}/rooms`, { params }).then((r) => r.data),
  getRoom: (id) => schoolAdminClient.get(`${HOSTEL}/rooms/${id}`).then((r) => r.data),
  createRoom: (payload) => schoolAdminClient.post(`${HOSTEL}/rooms`, payload).then((r) => r.data),
  updateRoom: (id, payload) => schoolAdminClient.patch(`${HOSTEL}/rooms/${id}`, payload).then((r) => r.data),
  deleteRoom: (id) => schoolAdminClient.delete(`${HOSTEL}/rooms/${id}`).then((r) => r.data),

  // 3 - Beds are read-only; their status follows the allocations below.
  beds: (params) => schoolAdminClient.get(`${HOSTEL}/beds`, { params }).then((r) => r.data),

  // 4 - Wardens, and the warden -> hostel link
  wardens: (params) => schoolAdminClient.get(`${HOSTEL}/wardens`, { params }).then((r) => r.data),
  getWarden: (id) => schoolAdminClient.get(`${HOSTEL}/wardens/${id}`).then((r) => r.data),
  createWarden: (payload) => schoolAdminClient.post(`${HOSTEL}/wardens`, payload).then((r) => r.data),
  updateWarden: (id, payload) => schoolAdminClient.patch(`${HOSTEL}/wardens/${id}`, payload).then((r) => r.data),
  deleteWarden: (id) => schoolAdminClient.delete(`${HOSTEL}/wardens/${id}`).then((r) => r.data),
  assignWardenToHostel: (id, hostelId) =>
    schoolAdminClient.post(`${HOSTEL}/wardens/${id}/hostel`, { hostelId }).then((r) => r.data),
  unassignWardenFromHostel: (id) => schoolAdminClient.delete(`${HOSTEL}/wardens/${id}/hostel`).then((r) => r.data),

  // 5 - Student assignments
  allocations: (params) => schoolAdminClient.get(`${HOSTEL}/allocations`, { params }).then((r) => r.data),
  allocateStudent: (payload) => schoolAdminClient.post(`${HOSTEL}/allocations`, payload).then((r) => r.data),
  updateAllocation: (id, payload) => schoolAdminClient.patch(`${HOSTEL}/allocations/${id}`, payload).then((r) => r.data),
  vacateAllocation: (id) => schoolAdminClient.delete(`${HOSTEL}/allocations/${id}`).then((r) => r.data),

  // 6 - Yearly hostel fee, one amount per academic year for the whole school
  fees: () => schoolAdminClient.get(`${HOSTEL}/fees`).then((r) => r.data),
  setFee: (academicYearId, yearlyAmount) =>
    schoolAdminClient.put(`${HOSTEL}/fees/${academicYearId}`, { yearlyAmount }).then((r) => r.data),
  clearFee: (academicYearId) => schoolAdminClient.delete(`${HOSTEL}/fees/${academicYearId}`).then((r) => r.data),
};

const TRANSPORT = '/platform/school-portal/transport';

/**
 * Transport module — the school-admin surface, in flow order:
 * Vehicle -> Driver (+ vehicle) -> Route -> Stops (+ times) -> Route
 * (+ vehicle + driver) -> Student (+ route + stop).
 *
 * Daily pickup/drop is the driver's own API and is not called from here.
 */
export const transportPortalApi = {
  // Dropdown data for every form on the page — students, vehicles, drivers,
  // routes with their stops. One call, all real records.
  lookups: () => schoolAdminClient.get(`${TRANSPORT}/lookups`).then((r) => r.data),

  // 1 - Vehicles
  vehicles: (params) => schoolAdminClient.get(`${TRANSPORT}/vehicles`, { params }).then((r) => r.data),
  getVehicle: (id) => schoolAdminClient.get(`${TRANSPORT}/vehicles/${id}`).then((r) => r.data),
  createVehicle: (payload) => schoolAdminClient.post(`${TRANSPORT}/vehicles`, payload).then((r) => r.data),
  updateVehicle: (id, payload) => schoolAdminClient.patch(`${TRANSPORT}/vehicles/${id}`, payload).then((r) => r.data),
  deleteVehicle: (id) => schoolAdminClient.delete(`${TRANSPORT}/vehicles/${id}`).then((r) => r.data),

  // 2 - Drivers, and the driver -> vehicle link
  drivers: (params) => schoolAdminClient.get(`${TRANSPORT}/drivers`, { params }).then((r) => r.data),
  getDriver: (id) => schoolAdminClient.get(`${TRANSPORT}/drivers/${id}`).then((r) => r.data),
  createDriver: (payload) =>
    schoolAdminClient.post(`${TRANSPORT}/drivers`, payload, studentRequestConfig(payload)).then((r) => r.data),
  updateDriver: (id, payload) =>
    schoolAdminClient.patch(`${TRANSPORT}/drivers/${id}`, payload, studentRequestConfig(payload)).then((r) => r.data),
  deleteDriver: (id) => schoolAdminClient.delete(`${TRANSPORT}/drivers/${id}`).then((r) => r.data),
  assignVehicleToDriver: (id, vehicleId) =>
    schoolAdminClient.post(`${TRANSPORT}/drivers/${id}/vehicle`, { vehicleId }).then((r) => r.data),
  unassignVehicleFromDriver: (id) =>
    schoolAdminClient.delete(`${TRANSPORT}/drivers/${id}/vehicle`).then((r) => r.data),

  // 3 + 4 - Routes, and the route -> vehicle + driver link
  routes: (params) => schoolAdminClient.get(`${TRANSPORT}/routes`, { params }).then((r) => r.data),
  getRoute: (id) => schoolAdminClient.get(`${TRANSPORT}/routes/${id}`).then((r) => r.data),
  createRoute: (payload) => schoolAdminClient.post(`${TRANSPORT}/routes`, payload).then((r) => r.data),
  updateRoute: (id, payload) => schoolAdminClient.patch(`${TRANSPORT}/routes/${id}`, payload).then((r) => r.data),
  deleteRoute: (id) => schoolAdminClient.delete(`${TRANSPORT}/routes/${id}`).then((r) => r.data),
  assignRouteResources: (id, payload) =>
    schoolAdminClient.post(`${TRANSPORT}/routes/${id}/assign`, payload).then((r) => r.data),
  unassignRouteResources: (id) =>
    schoolAdminClient.delete(`${TRANSPORT}/routes/${id}/assign`).then((r) => r.data),

  // 3 - Route stops. Pickup + drop time are mandatory on every stop.
  stops: (routeId) => schoolAdminClient.get(`${TRANSPORT}/routes/${routeId}/stops`).then((r) => r.data),
  createStop: (routeId, payload) =>
    schoolAdminClient.post(`${TRANSPORT}/routes/${routeId}/stops`, payload).then((r) => r.data),
  updateStop: (id, payload) => schoolAdminClient.patch(`${TRANSPORT}/stops/${id}`, payload).then((r) => r.data),
  deleteStop: (id) => schoolAdminClient.delete(`${TRANSPORT}/stops/${id}`).then((r) => r.data),
  reorderStops: (routeId, stopIds) =>
    schoolAdminClient.patch(`${TRANSPORT}/routes/${routeId}/stops/reorder`, { stopIds }).then((r) => r.data),

  // 5 - Student assignments. Timing is always inherited from the stop.
  assignments: (params) => schoolAdminClient.get(`${TRANSPORT}/assignments`, { params }).then((r) => r.data),
  assignStudent: (payload) => schoolAdminClient.post(`${TRANSPORT}/assignments`, payload).then((r) => r.data),
  updateAssignment: (id, payload) =>
    schoolAdminClient.patch(`${TRANSPORT}/assignments/${id}`, payload).then((r) => r.data),
  removeAssignment: (id) => schoolAdminClient.delete(`${TRANSPORT}/assignments/${id}`).then((r) => r.data),

  // 6 - Yearly transport fee, one amount per academic year for the whole
  // school — the same for every class, route and stop.
  fees: () => schoolAdminClient.get(`${TRANSPORT}/fees`).then((r) => r.data),
  setFee: (academicYearId, yearlyAmount) =>
    schoolAdminClient.put(`${TRANSPORT}/fees/${academicYearId}`, { yearlyAmount }).then((r) => r.data),
  clearFee: (academicYearId) => schoolAdminClient.delete(`${TRANSPORT}/fees/${academicYearId}`).then((r) => r.data),

  // 7 - Daily pickup / drop, read-only. It is recorded by the Transport Manager
  // in the mobile app. `date` is YYYY-MM-DD; omitted = today.
  daily: (date) => schoolAdminClient.get(`${TRANSPORT}/daily`, { params: { date } }).then((r) => r.data),
  dailyRoute: (routeId, date) =>
    schoolAdminClient.get(`${TRANSPORT}/daily/${routeId}`, { params: { date } }).then((r) => r.data),
};

// ============================================================
// ACCOUNTANT PORTAL
// ============================================================
const accountantClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
blockOnSubscription402(accountantClient);
signOutOn401(accountantClient, { panel: 'accountant', tokenKey: 'accountant_token', userKey: 'accountant-user' });

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
  generateSchedule: (payload) =>
    accountantClient.post('/platform/school-portal/accountant/invoices/schedule', payload).then((r) => r.data),
  feeSettings: () =>
    accountantClient.get('/platform/school-portal/accountant/fee-settings').then((r) => r.data),
  updateFeeSettings: (payload) =>
    accountantClient.put('/platform/school-portal/accountant/fee-settings', payload).then((r) => r.data),
  applyLateFees: () =>
    accountantClient.post('/platform/school-portal/accountant/late-fees/apply').then((r) => r.data),

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
  refundReceipt: (id, payload) =>
    accountantClient.post(`/platform/school-portal/accountant/receipts/${id}/refund`, payload).then((r) => r.data),
  invoices: (params) =>
    accountantClient.get('/platform/school-portal/accountant/invoices', { params }).then((r) => r.data),
  getInvoice: (id) =>
    accountantClient.get(`/platform/school-portal/accountant/invoices/${id}`).then((r) => r.data),

  // Transactions
  transactions: (params) =>
    accountantClient.get('/platform/school-portal/accountant/transactions', { params }).then((r) => r.data),
  getTransaction: (id, options = {}) =>
    accountantClient.get(`/platform/school-portal/accountant/transactions/${id}`, { params: options }).then((r) => r.data),

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
    schoolAdminClient.put(`/platform/school-portal/events/${id}`, payload).then((r) => r.data),
  setCancelled: (id, cancelled) =>
    schoolAdminClient
      .patch(`/platform/school-portal/events/${id}/cancel`, { cancelled })
      .then((r) => r.data),
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
// AUDIT LOGS — school-admin (read)
// ===========================================================================
export const auditApi = {
  list: (params) =>
    schoolAdminClient.get('/platform/school-portal/audit-logs', { params }).then((r) => r.data),
};

// ===========================================================================
// STUDENT ATTENDANCE — capture (school-admin) + monitoring (principal)
// ===========================================================================
export const studentAttendanceApi = {
  getDay: (sectionId, date) =>
    schoolAdminClient
      .get('/platform/school-portal/attendance/students', { params: { sectionId, date } })
      .then((r) => r.data),
  saveDay: (payload) =>
    schoolAdminClient.post('/platform/school-portal/attendance/students', payload).then((r) => r.data),
  markAll: (payload) =>
    schoolAdminClient.post('/platform/school-portal/attendance/students/mark-all', payload).then((r) => r.data),
  markSingle: (sectionId, studentId, payload) =>
    schoolAdminClient
      .patch(`/platform/school-portal/attendance/students/${sectionId}/${studentId}`, payload)
      .then((r) => r.data),
};

export const principalAttendanceApi = {
  studentMonitor: (date) =>
    principalClient
      .get('/platform/school-portal/attendance/students/monitor', { params: { date } })
      .then((r) => r.data),
  studentReport: (from, to) =>
    principalClient
      .get('/platform/school-portal/attendance/students/report', { params: { from, to } })
      .then((r) => r.data),
  staffReport: (params) =>
    principalClient
      .get('/platform/school-portal/reports/data', { params: { category: 'attendance', ...params } })
      .then((r) => r.data),
};

// ===========================================================================
// COMMUNICATION HUB — school-admin
// ===========================================================================
export const communicationApi = {
  announcements: (params) =>
    schoolAdminClient.get('/platform/school-portal/communication/announcements', { params }).then((r) => r.data),
  createAnnouncement: (payload) =>
    schoolAdminClient.post('/platform/school-portal/communication/announcements', payload).then((r) => r.data),
  updateAnnouncement: (id, payload) =>
    schoolAdminClient.patch(`/platform/school-portal/communication/announcements/${id}`, payload).then((r) => r.data),
  publishAnnouncement: (id) =>
    schoolAdminClient.post(`/platform/school-portal/communication/announcements/${id}/publish`).then((r) => r.data),
  deleteAnnouncement: (id) =>
    schoolAdminClient.delete(`/platform/school-portal/communication/announcements/${id}`).then((r) => r.data),
  broadcasts: (params) =>
    schoolAdminClient.get('/platform/school-portal/communication/broadcasts', { params }).then((r) => r.data),
  createBroadcast: (payload) =>
    schoolAdminClient.post('/platform/school-portal/communication/broadcasts', payload).then((r) => r.data),
  threads: () =>
    schoolAdminClient.get('/platform/school-portal/communication/threads').then((r) => r.data),
  thread: (key) =>
    schoolAdminClient.get(`/platform/school-portal/communication/threads/${key}`).then((r) => r.data),
  reply: (key, body) =>
    schoolAdminClient.post(`/platform/school-portal/communication/threads/${key}/reply`, { body }).then((r) => r.data),
};

// ===========================================================================
// INVENTORY / SCHOOL ASSETS — school-admin
// ===========================================================================
export const inventoryApi = {
  stats: () =>
    schoolAdminClient.get('/platform/school-portal/inventory/stats').then((r) => r.data),
  movements: (params) =>
    schoolAdminClient.get('/platform/school-portal/inventory/movements', { params }).then((r) => r.data),
  categories: () =>
    schoolAdminClient.get('/platform/school-portal/inventory/categories').then((r) => r.data),
  createCategory: (payload) =>
    schoolAdminClient.post('/platform/school-portal/inventory/categories', payload).then((r) => r.data),
  updateCategory: (id, payload) =>
    schoolAdminClient.patch(`/platform/school-portal/inventory/categories/${id}`, payload).then((r) => r.data),
  deleteCategory: (id) =>
    schoolAdminClient.delete(`/platform/school-portal/inventory/categories/${id}`).then((r) => r.data),
  assets: (params) =>
    schoolAdminClient.get('/platform/school-portal/inventory/assets', { params }).then((r) => r.data),
  getAsset: (id) =>
    schoolAdminClient.get(`/platform/school-portal/inventory/assets/${id}`).then((r) => r.data),
  createAsset: (payload) =>
    schoolAdminClient.post('/platform/school-portal/inventory/assets', payload).then((r) => r.data),
  updateAsset: (id, payload) =>
    schoolAdminClient.patch(`/platform/school-portal/inventory/assets/${id}`, payload).then((r) => r.data),
  deleteAsset: (id) =>
    schoolAdminClient.delete(`/platform/school-portal/inventory/assets/${id}`).then((r) => r.data),
  movement: (id, payload) =>
    schoolAdminClient.post(`/platform/school-portal/inventory/assets/${id}/movement`, payload).then((r) => r.data),
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



// ===========================================================================
// STUDENT SAFE PICKUP — School Admin configuration + history
// ===========================================================================
export const safePickupSettingsApi = {
  // The school-level master switch is Super Admin–only; school admins read it
  // via get() and manage per-class toggles via setClass().
  get: () =>
    schoolAdminClient.get('/platform/school-portal/settings/safe-pickup').then((r) => r.data),
  setClass: (classId, safePickupEnabled) =>
    schoolAdminClient
      .patch(`/platform/school-portal/academic/classes/${classId}/pickup`, { safePickupEnabled })
      .then((r) => r.data),
  history: (params) =>
    schoolAdminClient
      .get('/platform/school-portal/pickups/history', { params })
      .then((r) => r.data),
};

// ===========================================================================
// STUDENT SAFE PICKUP — Teacher (used by the mock-panel demo page).
// Its own axios instance with a self-managed bearer, so it never touches the
// other panels' auth. token lives in localStorage key `pickup_demo_token`.
// ===========================================================================
const pickupDemoClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
pickupDemoClient.interceptors.request.use((config) => {
  const t = localStorage.getItem('pickup_demo_token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const teacherPickupApi = {
  login: (identifier, password) =>
    axios
      .post(`${API_BASE_URL}/platform/school-portal/auth/teacher-login`, { identifier, password })
      .then((r) => {
        if (r.data?.token) localStorage.setItem('pickup_demo_token', r.data.token);
        return r.data;
      }),
  logout: () => localStorage.removeItem('pickup_demo_token'),
  eligibleStudents: (params) =>
    pickupDemoClient
      .get('/platform/school-portal/teacher/pickups/eligible-students', { params })
      .then((r) => r.data),
  initiate: (studentId, idempotencyKey) =>
    pickupDemoClient
      .post(
        '/platform/school-portal/teacher/pickups/initiate',
        { studentId },
        idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined
      )
      .then((r) => r.data),
  session: (id) =>
    pickupDemoClient
      .get(`/platform/school-portal/teacher/pickups/${id}`)
      .then((r) => r.data),
  verify: (id, otp) =>
    pickupDemoClient
      .post(`/platform/school-portal/teacher/pickups/${id}/verify`, { otp })
      .then((r) => r.data),
  resend: (id) =>
    pickupDemoClient
      .post(`/platform/school-portal/teacher/pickups/${id}/resend-otp`)
      .then((r) => r.data),
  cancel: (id) =>
    pickupDemoClient
      .post(`/platform/school-portal/teacher/pickups/${id}/cancel`)
      .then((r) => r.data),
  complete: (id, payload) =>
    pickupDemoClient
      .post(`/platform/school-portal/teacher/pickups/${id}/complete`, payload)
      .then((r) => r.data),
};

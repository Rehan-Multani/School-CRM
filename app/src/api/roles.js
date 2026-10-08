// One app, five flows. Each role's login/me/logout endpoints and home route.
// The fourth flow is the Transport Manager — a staff account that runs the
// school's buses (backend transportManager.routes.js). Drivers do not sign in.
// `auth` is how the role signs in: 'password' (teacher / transport manager:
// email + password) or 'otp' (student / parent: the mobile number given at
// admission + SMS OTP, see api/otpLogin.js — `loginPath` is then unused).

export const ROLES = {
  TEACHER: {
    key: 'TEACHER',
    icon: 'easel-outline',
    solidIcon: 'desktop',
    color: '#2563EB',
    label: 'Teacher',
    home: '/teacher',
    auth: 'password',
    loginPath: '/school-portal/auth/teacher-login',
    mePath: '/school-portal/teacher/me',
    logoutPath: '/school-portal/teacher/auth/logout',
    deleteAccountPath: '/school-portal/teacher/account/delete',
    identifierLabel: 'Employee ID / Email',
    identifierKeyboard: 'default',
    otpChannel: 'EMAIL',
  },
  STUDENT: {
    key: 'STUDENT',
    icon: 'school-outline',
    solidIcon: 'school',
    color: '#16A34A',
    label: 'Student',
    home: '/student',
    auth: 'otp',
    loginPath: '/school-portal/auth/student-login',
    mePath: '/school-portal/student/me',
    logoutPath: '/school-portal/student/auth/logout',
    deleteAccountPath: '/school-portal/student/account/delete',
    identifierLabel: 'Mobile Number',
    identifierKeyboard: 'phone-pad',
    otpChannel: 'SMS',
  },
  PARENT: {
    key: 'PARENT',
    icon: 'people-outline',
    solidIcon: 'people',
    color: '#F97316',
    label: 'Parent',
    home: '/parent',
    auth: 'otp',
    loginPath: '/school-portal/auth/parent-login',
    mePath: '/school-portal/parent/me',
    logoutPath: '/school-portal/parent/auth/logout',
    deleteAccountPath: '/school-portal/parent/account/delete',
    identifierLabel: 'Mobile Number',
    identifierKeyboard: 'phone-pad',
    otpChannel: 'SMS',
  },
  TRANSPORT: {
    key: 'TRANSPORT',
    icon: 'bus-outline',
    solidIcon: 'bus',
    color: '#7C3AED',
    label: 'Transport',
    home: '/transport',
    auth: 'password',
    loginPath: '/school-portal/auth/transport-login',
    mePath: '/school-portal/transport-manager/me',
    logoutPath: '/school-portal/transport-manager/auth/logout',
    deleteAccountPath: '/school-portal/transport-manager/account/delete',
    identifierLabel: 'Email',
    identifierKeyboard: 'email-address',
    otpChannel: 'EMAIL',
  },
  // The Principal signs in with the same email / employee ID + password as the web
  // panel. The web and app share every /school-portal route behind requirePrincipal.
  PRINCIPAL: {
    key: 'PRINCIPAL',
    icon: 'ribbon-outline',
    solidIcon: 'ribbon',
    color: '#2563EB',
    label: 'Principal',
    home: '/principal',
    auth: 'password',
    loginPath: '/school-portal/auth/principal-login',
    mePath: '/school-portal/principal/me',
    logoutPath: '/school-portal/principal/auth/logout',
    deleteAccountPath: '/school-portal/principal/account/delete',
    identifierLabel: 'Email / Employee ID',
    identifierKeyboard: 'default',
    otpChannel: 'EMAIL',
  },
};

export const ROLE_LIST = [ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT, ROLES.TRANSPORT, ROLES.PRINCIPAL];

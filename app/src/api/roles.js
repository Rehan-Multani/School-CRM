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
    label: 'Teacher',
    home: '/teacher',
    auth: 'password',
    loginPath: '/school-portal/auth/teacher-login',
    mePath: '/school-portal/teacher/me',
    logoutPath: '/school-portal/teacher/auth/logout',
    deleteAccountPath: '/school-portal/teacher/account/delete',
    identifierLabel: 'Employee ID / Email',
    identifierKeyboard: 'default',
  },
  STUDENT: {
    key: 'STUDENT',
    icon: 'school-outline',
    label: 'Student',
    home: '/student',
    auth: 'otp',
    loginPath: '/school-portal/auth/student-login',
    mePath: '/school-portal/student/me',
    logoutPath: '/school-portal/student/auth/logout',
    deleteAccountPath: '/school-portal/student/account/delete',
    identifierLabel: 'Mobile Number',
    identifierKeyboard: 'phone-pad',
  },
  PARENT: {
    key: 'PARENT',
    icon: 'people-outline',
    label: 'Parent',
    home: '/parent',
    auth: 'otp',
    loginPath: '/school-portal/auth/parent-login',
    mePath: '/school-portal/parent/me',
    logoutPath: '/school-portal/parent/auth/logout',
    deleteAccountPath: '/school-portal/parent/account/delete',
    identifierLabel: 'Mobile Number',
    identifierKeyboard: 'phone-pad',
  },
  TRANSPORT: {
    key: 'TRANSPORT',
    icon: 'bus-outline',
    label: 'Transport',
    home: '/transport',
    auth: 'password',
    loginPath: '/school-portal/auth/transport-login',
    mePath: '/school-portal/transport-manager/me',
    logoutPath: '/school-portal/transport-manager/auth/logout',
    deleteAccountPath: '/school-portal/transport-manager/account/delete',
    identifierLabel: 'Email',
    identifierKeyboard: 'email-address',
  },
  // The Principal signs in with the same email / employee ID + password as the web
  // panel. The web and app share every /school-portal route behind requirePrincipal.
  PRINCIPAL: {
    key: 'PRINCIPAL',
    icon: 'ribbon-outline',
    label: 'Principal',
    home: '/principal',
    auth: 'password',
    loginPath: '/school-portal/auth/principal-login',
    mePath: '/school-portal/principal/me',
    logoutPath: '/school-portal/principal/auth/logout',
    deleteAccountPath: '/school-portal/principal/account/delete',
    identifierLabel: 'Email / Employee ID',
    identifierKeyboard: 'default',
  },
};

export const ROLE_LIST = [ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT, ROLES.TRANSPORT, ROLES.PRINCIPAL];

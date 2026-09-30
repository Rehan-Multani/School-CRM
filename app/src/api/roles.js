// One app, four flows. Each role's login/me/logout endpoints and home route.
// Driver deliberately does NOT follow the common APK contract (mobile login)
// — see backend driver.routes.js.

export const ROLES = {
  TEACHER: {
    key: 'TEACHER',
    icon: 'easel-outline',
    label: 'Teacher',
    home: '/teacher',
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
    loginPath: '/school-portal/auth/student-login',
    mePath: '/school-portal/student/me',
    logoutPath: '/school-portal/student/auth/logout',
    deleteAccountPath: '/school-portal/student/account/delete',
    identifierLabel: 'Email / Username / Admission No.',
    identifierKeyboard: 'default',
  },
  PARENT: {
    key: 'PARENT',
    icon: 'people-outline',
    label: 'Parent',
    home: '/parent',
    loginPath: '/school-portal/auth/parent-login',
    mePath: '/school-portal/parent/me',
    logoutPath: '/school-portal/parent/auth/logout',
    deleteAccountPath: '/school-portal/parent/account/delete',
    identifierLabel: 'Mobile / Email',
    identifierKeyboard: 'default',
  },
  DRIVER: {
    key: 'DRIVER',
    icon: 'bus-outline',
    label: 'Driver',
    home: '/driver',
    loginPath: '/school-portal/auth/driver-login',
    mePath: '/school-portal/driver/me',
    logoutPath: '/school-portal/driver/auth/logout',
    deleteAccountPath: '/school-portal/driver/account/delete',
    identifierLabel: 'Mobile Number',
    identifierKeyboard: 'phone-pad',
  },
};

export const ROLE_LIST = [ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT, ROLES.DRIVER];

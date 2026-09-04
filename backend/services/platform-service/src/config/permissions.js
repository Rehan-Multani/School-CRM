// Catalogue of fine-grained permissions used across the school portal.
// Format: "<module>.<action>". "*" grants everything.

export const PERMISSION_MODULES = [
  {
    key: 'students',
    label: 'Students',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  { key: 'academics', label: 'Academics', actions: ['view', 'manage'] },
  { key: 'admissions', label: 'Admissions', actions: ['view', 'manage', 'approve'] },
  { key: 'attendance', label: 'Attendance', actions: ['view', 'mark'] },
  { key: 'exams', label: 'Exams', actions: ['view', 'manage'] },
  { key: 'homework', label: 'Homework', actions: ['view', 'manage'] },
  { key: 'fees', label: 'Fees', actions: ['view', 'collect', 'manage'] },
  { key: 'payroll', label: 'Payroll', actions: ['view', 'manage'] },
  { key: 'hr', label: 'HR', actions: ['view', 'manage'] },
  { key: 'library', label: 'Library', actions: ['view', 'manage'] },
  { key: 'transport', label: 'Transport', actions: ['view', 'manage'] },
  { key: 'hostel', label: 'Hostel', actions: ['view', 'manage'] },
  { key: 'inventory', label: 'Inventory', actions: ['view', 'manage'] },
  { key: 'events', label: 'Events', actions: ['view', 'manage'] },
  { key: 'communication', label: 'Communication', actions: ['view', 'manage'] },
  { key: 'meetings', label: 'Meetings', actions: ['view', 'manage'] },
  { key: 'reports', label: 'Reports', actions: ['view', 'export'] },
  { key: 'users', label: 'User Management', actions: ['view', 'manage'] },
  { key: 'roles', label: 'Roles & Permissions', actions: ['view', 'manage'] },
  { key: 'settings', label: 'School Settings', actions: ['view', 'manage'] },
  { key: 'audit', label: 'Audit Logs', actions: ['view'] },
];

export const ALL_PERMISSIONS = PERMISSION_MODULES.flatMap((m) =>
  m.actions.map((a) => `${m.key}.${a}`)
);

export function isValidPermission(p) {
  return p === '*' || ALL_PERMISSIONS.includes(p);
}

// Default permission sets for the six built-in roles.
export const SYSTEM_ROLE_DEFAULTS = {
  SchoolAdmin: ['*'],
  Principal: [
    'students.view',
    'academics.view',
    'academics.manage',
    'admissions.view',
    'attendance.view',
    'exams.view',
    'exams.manage',
    'homework.view',
    'fees.view',
    'hr.view',
    'events.view',
    'meetings.view',
    'meetings.manage',
    'reports.view',
    'reports.export',
    'users.view',
  ],
  Accountant: ['fees.view', 'fees.collect', 'fees.manage', 'reports.view', 'reports.export'],
  HR: ['hr.view', 'hr.manage', 'payroll.view', 'payroll.manage', 'attendance.view', 'reports.view'],
  Librarian: ['library.view', 'library.manage', 'reports.view'],
  Transport: ['transport.view', 'transport.manage', 'reports.view'],
};

// Staff (SchoolUser) roles the principal can manage, mirroring the web StaffManagement.
export const ROLE_TABS = [
  { id: 'ALL', label: 'All Staff' },
  { id: 'PRINCIPAL', label: 'Principals' },
  { id: 'LIBRARIAN', label: 'Librarians' },
  { id: 'HR', label: 'Human Resources' },
  { id: 'ACCOUNTANT', label: 'Accountants' },
  { id: 'TRANSPORT', label: 'Transport' },
];

export const ROLES = [
  { value: 'PRINCIPAL', label: 'Principal' },
  { value: 'LIBRARIAN', label: 'Librarian' },
  { value: 'HR', label: 'HR (Human Resources)' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'TRANSPORT', label: 'Transport Manager' },
];

export const ROLE_LABELS = {
  TEACHER: 'Teacher',
  PRINCIPAL: 'Principal',
  LIBRARIAN: 'Librarian',
  HR: 'Human Resources (HR)',
  ACCOUNTANT: 'Accountant',
  TRANSPORT: 'Transport Manager',
};

export const ROLE_TONES = {
  PRINCIPAL: 'primary',
  LIBRARIAN: 'info',
  HR: 'primary',
  ACCOUNTANT: 'warning',
  TRANSPORT: 'success',
};

export const EXAM_TYPES = [
  { value: 'UNIT_TEST', label: 'Unit Test' },
  { value: 'MONTHLY_TEST', label: 'Monthly Test' },
  { value: 'QUARTERLY', label: 'Quarterly Examination' },
  { value: 'HALF_YEARLY', label: 'Half Yearly Examination' },
  { value: 'ANNUAL', label: 'Annual / Final Examination' },
  { value: 'PRE_BOARD', label: 'Pre-Board Examination' },
];

export const EXAM_STATUSES = ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PUBLISHED', 'CANCELLED'];

export const typeLabel = (v) => EXAM_TYPES.find((t) => t.value === v)?.label || String(v || '').replace(/_/g, ' ');

export const ATTENDANCE = [
  { key: 'PRESENT', short: 'P' },
  { key: 'ABSENT', short: 'AB' },
  { key: 'MEDICAL', short: 'MED' },
  { key: 'EXEMPTED', short: 'EX' },
];

// Page-level list helper: tolerate `{data: [...]}` or a bare array.
export const rows = (res) => (Array.isArray(res) ? res : res?.data || []);

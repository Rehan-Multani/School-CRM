export function apiMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const YEAR_STATUS_VARIANT = {
  DRAFT: 'default',
  ACTIVE: 'success',
  COMPLETED: 'info',
  ARCHIVED: 'warning',
};

export const ENTITY_STATUS_VARIANT = {
  ACTIVE: 'success',
  INACTIVE: 'default',
};

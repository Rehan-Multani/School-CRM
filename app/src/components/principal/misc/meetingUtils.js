export const MEETING_TYPES = ['STAFF', 'PARENT', 'BOARD', 'DEPARTMENT', 'ONE_ON_ONE', 'OTHER'];
export const MEETING_TYPE_LABEL = {
  STAFF: 'Staff Meeting',
  PARENT: 'Parent Meeting',
  BOARD: 'Board Meeting',
  DEPARTMENT: 'Department Meeting',
  ONE_ON_ONE: 'One-on-One',
  OTHER: 'Other',
};
export const MEETING_STATUS_TONE = { SCHEDULED: 'success', COMPLETED: 'info', CANCELLED: 'danger' };

const pad = (n) => String(n).padStart(2, '0');

/** ISO instant -> local { date: 'YYYY-MM-DD', time: 'HH:MM' }. */
export function splitDateTime(iso) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Local 'YYYY-MM-DD' + 'HH:MM' -> ISO instant. */
export function joinDateTime(date, time) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
}

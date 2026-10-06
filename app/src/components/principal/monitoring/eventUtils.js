import { fmtDate, fmtTime } from '../../../lib/format';

export const EVENT_STATUS_TONE = {
  UPCOMING: 'success',
  ONGOING: 'info',
  COMPLETED: 'muted',
  CANCELLED: 'danger',
};

// "12 Oct 2026, 9:30 AM", or just the date for an all-day event.
export function fmtEventTime(value, allDay) {
  if (!value) return '–';
  return allDay ? fmtDate(value) : `${fmtDate(value)}, ${fmtTime(value)}`;
}

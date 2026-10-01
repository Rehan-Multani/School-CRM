// Date + error helpers shared by every screen.

const pad = (n) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD (the backend's date format). */
export function ymd(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DD → local Date at midnight (no UTC shift). */
export function parseYmd(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date();
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 Oct 2026" from an ISO string, a YYYY-MM-DD, or a Date. */
export function fmtDate(v) {
  if (!v) return '';
  const d = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? parseYmd(v) : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateTime(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${fmtDate(d)}, ${h}:${pad(d.getMinutes())} ${ampm}`;
}

export function fmtTime(v) {
  if (!v) return '';
  const d = new Date(v);
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())} ${ampm}`;
}

/** "HH:MM" (24h, as stored in the timetable) → "9:30 AM". */
export function fmtHM(hm) {
  if (!hm || !/^\d{1,2}:\d{2}/.test(hm)) return hm || '';
  const [h, m] = hm.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function fmtBytes(n) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const DAY_LABELS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };

// Friendly text for the backend's stable error codes (doc §7). The UI branches
// on `code`, never on the message text.
const CODE_MESSAGES = {
  INVALID_CREDENTIALS: 'Wrong login ID or password.',
  TEACHER_INACTIVE: 'Your account is inactive. Please contact the school.',
  STUDENT_INACTIVE: 'Your account is inactive. Please contact the school office.',
  ACCOUNT_NOT_PROVISIONED: 'Your app login has not been created yet. Please contact the school office.',
  NO_ACTIVE_ENROLLMENT: 'You are not enrolled in the current session. Please contact the school office.',
  RESULT_NOT_PUBLISHED: 'Result not declared yet.',
  SUBMISSION_WINDOW_CLOSED: 'Submissions for this homework are closed.',
  HOMEWORK_NOT_SUBMITTABLE: 'This homework cannot be submitted.',
  ALREADY_SUBMITTED: 'This homework is already graded.',
  DUPLICATE_REQUEST: 'This was already sent. Please wait a moment.',
  LEAVE_NOT_EDITABLE: 'Only a pending leave can be edited.',
  DOCUMENT_PATH_INVALID: 'Document not available.',
  CURRENT_PASSWORD_INVALID: 'Current password is incorrect.',
  SECTION_ACCESS_DENIED: 'You are not assigned to this section.',
  SUBJECT_ACCESS_DENIED: 'You do not teach this subject in this section.',
  STUDENT_ACCESS_DENIED: 'This student is not assigned to you.',
  CLASS_ACCESS_DENIED: 'You are not assigned to this class.',
  ATTENDANCE_FINALIZED: 'Attendance for this day is finalized and locked.',
  EXAM_FINALIZED: 'This exam is closed. Marks can no longer be changed.',
  UPLOAD_REJECTED: 'This file type is not allowed.',
  LEAVE_NOT_CANCELLABLE: 'Only a pending leave can be cancelled.',
  LEAVE_OVERLAP: 'You already have a leave on these dates.',
  NO_ACTIVE_YEAR: 'You are not enrolled in the current session. Please contact the school office.',
  RATE_LIMITED: 'Too many attempts. Please try again in a few minutes.',
  OFFLINE: 'You are offline. Check your internet connection.',
  NETWORK_ERROR: 'Could not reach the school server. Please try again.',
  TIMEOUT: 'The server is taking too long to respond. Please try again.',
  // Parent app (doc 03 §8)
  PARENT_INACTIVE: 'Your account is inactive. Please contact the school office.',
  NO_LINKED_CHILDREN: 'No student is linked to your account. Please contact the school.',
  CHILD_ACCESS_DENIED: 'This student is not linked to your account.',
  CHILD_NOT_FOUND: 'This student could not be found.',
  PAYMENTS_NOT_CONFIGURED: 'Online payment is not enabled by your school. Please pay at the school office.',
  INVOICE_ALREADY_PAID: 'This invoice is already paid.',
  INVOICE_NOT_PAYABLE: 'This invoice cannot be paid online.',
  PAYMENT_AMOUNT_INVALID: 'Enter an amount between ₹1 and the balance due.',
  PAYMENT_SIGNATURE_INVALID: 'We could not verify the payment yet. It will update once the bank confirms.',
  PAYMENT_GATEWAY_ERROR: 'The payment service is unavailable right now. Please try again.',
  INVALID_ID: 'This item could not be found. Please go back and try again.',
  DUPLICATE: 'This was already saved.',
};

// Never show a raw server/runtime message (e.g. "Request failed (502)",
// "TypeError: …") — 5xx and status-only failures get a plain sentence.
export function errorText(err) {
  if (!err) return '';
  if (CODE_MESSAGES[err.code]) return CODE_MESSAGES[err.code];
  if (err.status >= 500) return 'Something went wrong on the server. Please try again in a moment.';
  if (!err.message || /^(Request|Upload) failed \(\d+\)$/.test(err.message) || !('status' in err)) {
    return 'Something went wrong. Please try again.';
  }
  return err.message;
}

/**
 * `withPrefix('Room', '12')` → "Room 12", but `withPrefix('Room', 'Room 12')`
 * stays "Room 12" — schools often type the word into the name themselves.
 */
export function withPrefix(prefix, value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  return v.toLowerCase().startsWith(prefix.toLowerCase()) ? v : `${prefix} ${v}`;
}

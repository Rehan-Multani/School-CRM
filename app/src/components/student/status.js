// Student-side status → badge mapping shared by lists and detail screens.

/** My side of a homework: graded / submitted / overdue / pending. */
export function homeworkBadge(h) {
  if (h.submissionStatus === 'GRADED') return { label: h.marksObtained != null ? `GRADED · ${h.marksObtained}` : 'GRADED', tone: 'success' };
  if (h.submissionStatus === 'SUBMITTED') return { label: 'SUBMITTED', tone: 'primary' };
  if (h.submissionStatus === 'LATE') return { label: 'SUBMITTED LATE', tone: 'warning' };
  if (h.dueDate && new Date(h.dueDate) < new Date()) return { label: 'OVERDUE', tone: 'danger' };
  return { label: 'PENDING', tone: 'warning' };
}

// Fee invoice status (doc §6.7): PENDING | PARTIALLY_PAID | PAID | OVERDUE.
export const INVOICE_TONE = { PENDING: 'warning', PARTIALLY_PAID: 'primary', PAID: 'success', OVERDUE: 'danger', CANCELLED: 'muted' };

// Exam phase computed by the backend from its dates.
export const PHASE_TONE = { upcoming: 'primary', ongoing: 'warning', completed: 'muted' };

/** "₹1,250" — Indian grouping, no decimals unless needed. */
export function money(n) {
  const v = Number(n) || 0;
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// Real backend enum (LeaveRequest.leaveType). The web page offers SICK/EARNED, which the
// backend would reject, so the app uses the enum.
export const LEAVE_TYPES = [
  { value: 'CASUAL', label: 'Casual' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'PAID', label: 'Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'MATERNITY', label: 'Maternity' },
  { value: 'PATERNITY', label: 'Paternity' },
  { value: 'OTHER', label: 'Other' },
];

export function leaveTypeLabel(v) {
  return LEAVE_TYPES.find((t) => t.value === v)?.label || String(v || '').replace(/_/g, ' ');
}

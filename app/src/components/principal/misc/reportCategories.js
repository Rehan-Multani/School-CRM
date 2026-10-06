// Same catalogue as the web SchoolReportsHub. `countKey` reads the record count from
// GET /reports/summary; `dateFilter` / `statuses` list only the filters that report honours.
export const REPORT_CATEGORIES = [
  { id: 'students', label: 'Student Directory', desc: 'Admission number, class & section, roll number, parent contact and status.', icon: 'people-outline', group: 'Academic', countKey: 'studentsCount', statuses: ['ACTIVE', 'INACTIVE'] },
  { id: 'exams', label: 'Exam Schedule', desc: 'Exams with their type, start and end dates and publishing status.', icon: 'school-outline', group: 'Academic', countKey: 'examsCount', statuses: ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PUBLISHED', 'CANCELLED'] },
  { id: 'homework', label: 'Homework', desc: 'Assigned homework by class and subject, with submission and evaluation progress.', icon: 'book-outline', group: 'Academic' },
  { id: 'fees', label: 'Fee Payments', desc: 'Every payment received: receipt number, student, amount, mode and date.', icon: 'cash-outline', group: 'Finance', dateFilter: true },
  { id: 'fee_dues', label: 'Fee Dues & Defaulters', desc: 'Unpaid and partly paid invoices with pending amount, due date and parent phone.', icon: 'alert-circle-outline', group: 'Finance', statuses: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
  { id: 'payroll', label: 'Payroll', desc: 'Salary records per employee and month: gross pay, deductions and net pay.', icon: 'wallet-outline', group: 'Finance', countKey: 'payrollCount', statuses: ['PROCESSED', 'PAID', 'ON_HOLD', 'CANCELLED'] },
  { id: 'staff', label: 'Staff Directory', desc: 'Teachers and other staff with role, designation, department and contact details.', icon: 'id-card-outline', group: 'Staff', countKey: 'staffCount', statuses: ['ACTIVE', 'INACTIVE'] },
  { id: 'attendance', label: 'Staff Attendance', desc: 'Day-wise staff attendance: present, absent, on leave and attendance percentage.', icon: 'calendar-outline', group: 'Staff', dateFilter: true },
  { id: 'reviews', label: 'Performance Reviews', desc: 'Staff appraisals with review period, rating, reviewer and status.', icon: 'ribbon-outline', group: 'Staff', countKey: 'reviewsCount' },
  { id: 'hostel', label: 'Hostel Allocations', desc: 'Students currently in the hostel with room, bed and yearly fee.', icon: 'bed-outline', group: 'Facilities', countKey: 'hostelCount' },
  { id: 'transport', label: 'Transport Riders', desc: 'Students using school transport with route, stop, timings and yearly fee.', icon: 'bus-outline', group: 'Facilities', countKey: 'transportCount', statuses: ['ACTIVE', 'DISCONTINUED'] },
  { id: 'library', label: 'Library Stock', desc: 'Book catalogue with total, available and issued copies and shelf location.', icon: 'library-outline', group: 'Facilities', countKey: 'libraryCount' },
  { id: 'support', label: 'Support Tickets', desc: 'Tickets raised with the platform team, with priority and current status.', icon: 'help-buoy-outline', group: 'Facilities', statuses: ['Open', 'In Progress', 'Resolved', 'Closed'] },
];

export const REPORT_GROUPS = ['All', 'Academic', 'Finance', 'Staff', 'Facilities'];

export const statusLabel = (v) => String(v).replace(/_/g, ' ');
export const statusKey = (v) => String(v).trim().toUpperCase().replace(/\s+/g, '_');
export const formatINR = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;

const isMoney = (v) => typeof v === 'string' && /^₹[\d,]+(\.\d+)?$/.test(v);

// Rows arrive display-formatted ("₹3,000", "15/7/2026"); sort on the real value.
export function sortValue(value) {
  if (typeof value === 'number') return value;
  const str = String(value ?? '');
  if (isMoney(str)) return Number(str.replace(/[₹,]/g, ''));
  if (/^\d+%$/.test(str)) return Number(str.slice(0, -1));
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])).getTime();
  return str.toLowerCase();
}

// Totals shown above a report (the API sends the ones that apply to the category).
export function statItems(stats) {
  if (!stats) return [];
  return [
    stats.totalCollected !== undefined && { label: 'Total collected', value: formatINR(stats.totalCollected) },
    stats.totalDue !== undefined && { label: 'Total outstanding', value: formatINR(stats.totalDue) },
    stats.totalGross !== undefined && { label: 'Gross pay', value: formatINR(stats.totalGross) },
    stats.totalDeductions !== undefined && { label: 'Deductions', value: formatINR(stats.totalDeductions) },
    stats.totalNetDisbursed !== undefined && { label: 'Net pay', value: formatINR(stats.totalNetDisbursed) },
    stats.averageRating !== undefined && { label: 'Average rating', value: `${stats.averageRating} / 5` },
    stats.totalCopies !== undefined && { label: 'Total copies', value: String(stats.totalCopies) },
    stats.availableCopies !== undefined && { label: 'Available', value: String(stats.availableCopies) },
    stats.issuedCopies !== undefined && { label: 'Issued', value: String(stats.issuedCopies) },
  ].filter(Boolean);
}

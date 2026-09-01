import {
  LayoutDashboard,
  CreditCard,
  ClipboardList,
  CalendarClock,
  AlertTriangle,
  Wallet,
  Receipt,
  ArrowLeftRight,
  FileBarChart,
  Bell,
  Settings
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  // MAIN
  { name: 'Dashboard', path: '/accountant/dashboard', icon: LayoutDashboard, category: 'Main' },

  // FEES
  { name: 'Fee Collection', path: '/accountant/fee-collection', icon: CreditCard, category: 'Fees' },
  { name: 'Fee Structure', path: '/accountant/fee-structure', icon: ClipboardList, category: 'Fees' },
  { name: 'Installments', path: '/accountant/installments', icon: CalendarClock, category: 'Fees' },
  { name: 'Dues / Pending Fees', path: '/accountant/dues', icon: AlertTriangle, category: 'Fees' },

  // ACCOUNTS
  { name: 'Expenses', path: '/accountant/expenses', icon: Wallet, category: 'Accounts' },
  { name: 'Receipts / Invoices', path: '/accountant/receipts', icon: Receipt, category: 'Accounts' },
  { name: 'Transactions', path: '/accountant/transactions', icon: ArrowLeftRight, category: 'Accounts' },

  // ALERTS
  { name: 'Notifications', path: '/accountant/notifications', icon: Bell, category: 'Alerts' },

  // SYSTEM
  { name: 'Reports', path: '/accountant/reports', icon: FileBarChart, category: 'System' },
  { name: 'Settings', path: '/accountant/settings', icon: Settings, category: 'System' }
];

export const MOCK_STUDENTS = [];
export const MOCK_COLLECTIONS = [];
export const MOCK_INSTALLMENTS = [
  {
    id: 'INST-2026-001',
    studentName: 'Aarav Mehta',
    admissionNo: 'GPS202601',
    className: 'Class 10-A',
    totalAmount: 48000,
    planType: 'Quarterly',
    installments: [
      { installmentNo: 1, title: 'Quarter 1 (Apr - Jun)', amount: 12000, dueDate: '2026-04-10', status: 'Paid', paidDate: '2026-04-08' },
      { installmentNo: 2, title: 'Quarter 2 (Jul - Sep)', amount: 12000, dueDate: '2026-07-10', status: 'Paid', paidDate: '2026-07-09' },
      { installmentNo: 3, title: 'Quarter 3 (Oct - Dec)', amount: 12000, dueDate: '2026-10-10', status: 'Upcoming', paidDate: null },
      { installmentNo: 4, title: 'Quarter 4 (Jan - Mar)', amount: 12000, dueDate: '2027-01-10', status: 'Upcoming', paidDate: null }
    ]
  },
  {
    id: 'INST-2026-002',
    studentName: 'Ishita Sharma',
    admissionNo: 'GPS202612',
    className: 'Class 12-B',
    totalAmount: 60000,
    planType: 'Monthly',
    installments: [
      { installmentNo: 1, title: 'Installment 1 (Jul)', amount: 15000, dueDate: '2026-07-10', status: 'Paid', paidDate: '2026-07-05' },
      { installmentNo: 2, title: 'Installment 2 (Aug)', amount: 15000, dueDate: '2026-08-10', status: 'Overdue', paidDate: null },
      { installmentNo: 3, title: 'Installment 3 (Sep)', amount: 15000, dueDate: '2026-09-10', status: 'Upcoming', paidDate: null },
      { installmentNo: 4, title: 'Installment 4 (Oct)', amount: 15000, dueDate: '2026-10-10', status: 'Upcoming', paidDate: null }
    ]
  },
  {
    id: 'INST-2026-003',
    studentName: 'Kabir Verma',
    admissionNo: 'GPS202615',
    className: 'Class 9-C',
    totalAmount: 42000,
    planType: 'Term-wise',
    installments: [
      { installmentNo: 1, title: 'Term 1 (First Half)', amount: 21000, dueDate: '2026-05-15', status: 'Paid', paidDate: '2026-05-12' },
      { installmentNo: 2, title: 'Term 2 (Second Half)', amount: 21000, dueDate: '2026-11-15', status: 'Upcoming', paidDate: null }
    ]
  },
  {
    id: 'INST-2026-004',
    studentName: 'Riya Sen',
    admissionNo: 'GPS202619',
    className: 'Class 8-A',
    totalAmount: 36000,
    planType: 'Quarterly',
    installments: [
      { installmentNo: 1, title: 'Quarter 1 (Apr - Jun)', amount: 9000, dueDate: '2026-04-10', status: 'Paid', paidDate: '2026-04-05' },
      { installmentNo: 2, title: 'Quarter 2 (Jul - Sep)', amount: 9000, dueDate: '2026-07-10', status: 'Paid', paidDate: '2026-07-08' },
      { installmentNo: 3, title: 'Quarter 3 (Oct - Dec)', amount: 9000, dueDate: '2026-10-10', status: 'Upcoming', paidDate: null },
      { installmentNo: 4, title: 'Quarter 4 (Jan - Mar)', amount: 9000, dueDate: '2027-01-10', status: 'Upcoming', paidDate: null }
    ]
  },
  {
    id: 'INST-2026-005',
    studentName: 'Aditya Roy',
    admissionNo: 'GPS202622',
    className: 'Class 12-A',
    totalAmount: 56000,
    planType: 'Quarterly',
    installments: [
      { installmentNo: 1, title: 'Quarter 1 (Apr - Jun)', amount: 14000, dueDate: '2026-04-10', status: 'Paid', paidDate: '2026-04-09' },
      { installmentNo: 2, title: 'Quarter 2 (Jul - Sep)', amount: 14000, dueDate: '2026-07-10', status: 'Overdue', paidDate: null },
      { installmentNo: 3, title: 'Quarter 3 (Oct - Dec)', amount: 14000, dueDate: '2026-10-10', status: 'Upcoming', paidDate: null },
      { installmentNo: 4, title: 'Quarter 4 (Jan - Mar)', amount: 14000, dueDate: '2027-01-10', status: 'Upcoming', paidDate: null }
    ]
  }
];
export const MOCK_DISCOUNTS = [];
export const MOCK_REFUNDS = [];
export const MOCK_LATE_FEES = [];
export const MOCK_AUDIT_LOGS = [];

// ANALYTICS DATASETS
export const DAILY_FEE_COLLECTION = [];
export const MONTHLY_COLLECTION_TREND = [];
export const FEE_CATEGORY_DISTRIBUTION = [];
export const PENDING_FEES_ANALYSIS = [];
export const PAYMENT_METHOD_DISTRIBUTION = [];

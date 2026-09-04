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

export const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'NET_BANKING', 'CHEQUE', 'DD', 'OTHER'];

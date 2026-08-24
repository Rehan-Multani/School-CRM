import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  Layers,
  Percent,
  AlertOctagon,
  CornerUpLeft,
  FileBarChart,
  History,
  Bell,
  Settings
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  // MAIN
  { name: 'Dashboard', path: '/accountant/dashboard', icon: LayoutDashboard, category: 'Main' },
  
  // FEES
  { name: 'Fee Collection', path: '/accountant/fee-collection', icon: CreditCard, category: 'Fees' },
  { name: 'Receipt Management', path: '/accountant/receipts', icon: Receipt, category: 'Fees' },
  { name: 'Installments', path: '/accountant/installments', icon: Layers, category: 'Fees' },
  { name: 'Discounts & Scholarships', path: '/accountant/discounts', icon: Percent, category: 'Fees' },
  { name: 'Late Fee Management', path: '/accountant/late-fees', icon: AlertOctagon, category: 'Fees' },
  { name: 'Refund Management', path: '/accountant/refunds', icon: CornerUpLeft, category: 'Fees' },
  
  // ANALYSIS
  { name: 'Financial Reports', path: '/accountant/reports', icon: FileBarChart, category: 'Analysis' },
  { name: 'Student Financial History', path: '/accountant/student-history', icon: History, category: 'Analysis' },
  
  // SYSTEM
  { name: 'Audit Logs', path: '/accountant/audit', icon: History, category: 'System' },
  { name: 'Notifications', path: '/accountant/notifications', icon: Bell, category: 'System' },
  { name: 'Settings', path: '/accountant/settings', icon: Settings, category: 'System' }
];

export const MOCK_STUDENTS = [];
export const MOCK_COLLECTIONS = [];
export const MOCK_INSTALLMENTS = [];
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

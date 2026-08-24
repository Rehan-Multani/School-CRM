import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building,
  Contact,
  CalendarDays,
  CalendarRange,
  BadgeCent,
  FolderOpen,
  Award,
  BarChart3,
  Megaphone,
  ClipboardList,
  Bell,
  Settings as SettingsIcon,
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  // MAIN
  { name: 'Dashboard', path: '/hr/dashboard', icon: LayoutDashboard, category: 'Main' },

  // PEOPLE & STAFF
  { name: 'Teacher Management', path: '/hr/teachers', icon: GraduationCap, category: 'People & Staff' },
  { name: 'Staff Management', path: '/hr/staff', icon: Users, category: 'People & Staff' },
  { name: 'Departments', path: '/hr/departments', icon: Building, category: 'People & Staff' },
  { name: 'Designations', path: '/hr/designations', icon: Contact, category: 'People & Staff' },

  // OPERATIONS
  { name: 'Attendance Record', path: '/hr/attendance', icon: CalendarDays, category: 'Operations' },
  { name: 'Leave Management', path: '/hr/leave', icon: CalendarRange, category: 'Operations' },
  { name: 'Payroll & Slips', path: '/hr/payroll', icon: BadgeCent, category: 'Operations' },
  { name: 'Documents Locker', path: '/hr/documents', icon: FolderOpen, category: 'Operations' },

  // REVIEWS & REPORTS
  { name: 'Performance Reviews', path: '/hr/performance', icon: Award, category: 'Reviews & Reports' },
  { name: 'Reports Hub', path: '/hr/reports', icon: BarChart3, category: 'Reviews & Reports' },

  // SYSTEM & COMMUNICATION
  { name: 'Notice & Circulars', path: '/hr/announcements', icon: Megaphone, category: 'System & Logs' },
  { name: 'System Audit Logs', path: '/hr/audit', icon: ClipboardList, category: 'System & Logs' },
  { name: 'Alerts & Broadcasts', path: '/hr/notifications', icon: Bell, category: 'System & Logs' },
  { name: 'HR Settings', path: '/hr/settings', icon: SettingsIcon, category: 'System & Logs' },
];

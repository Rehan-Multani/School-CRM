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

  // HR MANAGEMENT
  { name: 'Teacher Management', path: '/hr/teachers', icon: GraduationCap, category: 'HR Management' },
  { name: 'Staff Management', path: '/hr/staff', icon: Users, category: 'HR Management' },

  // OPERATIONS
  { name: 'Attendance Record', path: '/hr/attendance', icon: CalendarDays, category: 'Operations' },
  { name: 'Leave Management', path: '/hr/leave', icon: CalendarRange, category: 'Operations' },
  { name: 'Payroll & Salary Slips', path: '/hr/payroll', icon: BadgeCent, category: 'Operations' },
  { name: 'Documents Locker', path: '/hr/documents', icon: FolderOpen, category: 'Operations' },

  // REVIEWS & REPORTS
  { name: 'Performance Reviews', path: '/hr/performance', icon: Award, category: 'Reviews & Reports' },
  { name: 'Analytics Reports', path: '/hr/reports', icon: BarChart3, category: 'Reviews & Reports' },
  { name: 'Notice & Circulars', path: '/hr/announcements', icon: Megaphone, category: 'Reviews & Reports' },

  // SYSTEM
  { name: 'HR Settings', path: '/hr/settings', icon: SettingsIcon, category: 'System' },
];

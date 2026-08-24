import {
  LayoutDashboard,
  Settings2,
  GraduationCap,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  BookOpen,
  Users,
  UserCheck,
  FileInput,
  UserCog,
  CreditCard,
  Wallet,
  Bus,
  Home,
  Library,
  LayoutGrid,
  BookMarked,
  FolderTree,
  SlidersHorizontal,
  Package,
  Calendar,
  Shield,
  Megaphone,
  BarChart3,
  History,
  Bell,
  Settings,
  LifeBuoy,
  Building2,
  Contact,
  Award
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  // MAIN
  { name: 'Dashboard', path: '/school-admin/dashboard', icon: LayoutDashboard, category: 'Main' },
  { name: 'Plans', path: '/school-admin/plans', icon: CreditCard, category: 'Main' },
  
  // ACADEMIC
  { name: 'School Config', path: '/school-admin/school-config', icon: Settings2, category: 'Academic' },
  { name: 'Academic Years', path: '/school-admin/academics/years', icon: CalendarDays, category: 'Academic' },
  { name: 'Classes', path: '/school-admin/academics/classes', icon: GraduationCap, category: 'Academic' },
  { name: 'Subjects', path: '/school-admin/academics/subjects', icon: BookOpen, category: 'Academic' },
  { name: 'Subject Assignments', path: '/school-admin/academics/subject-assignments', icon: BookOpen, category: 'Academic' },
  { name: 'Class Teachers', path: '/school-admin/academics/class-teachers', icon: UserCheck, category: 'Academic' },
  { name: 'Attendance', path: '/school-admin/attendance', icon: ClipboardCheck, category: 'Academic' },
  { name: 'Exams & Results', path: '/school-admin/exams', icon: FileSpreadsheet, category: 'Academic' },
  { name: 'Homework Monitor', path: '/school-admin/homework', icon: BookOpen, category: 'Academic' },
  
  // PEOPLE
  { name: 'Student Management', path: '/school-admin/students', icon: Users, category: 'People' },
  { name: 'Teacher Management', path: '/school-admin/teachers', icon: UserCheck, category: 'People' },
  { name: 'User Management', path: '/school-admin/users', icon: UserCog, category: 'People' },
  { name: 'Departments', path: '/school-admin/hr/departments', icon: Building2, category: 'People' },
  { name: 'Designations', path: '/school-admin/hr/designations', icon: Contact, category: 'People' },
  { name: 'Performance Reviews', path: '/school-admin/hr/reviews', icon: Award, category: 'People' },
  
  // FINANCE
  { name: 'Fees & Finance', path: '/school-admin/fees', icon: CreditCard, category: 'Finance' },
  { name: 'HR & Payroll', path: '/school-admin/hr', icon: Wallet, category: 'Finance' },
  
  // ADMINISTRATION
  { name: 'Transport', path: '/school-admin/transport', icon: Bus, category: 'Administration' },
  { name: 'Hostel', path: '/school-admin/hostel', icon: Home, category: 'Administration' },
  { name: 'Inventory', path: '/school-admin/inventory', icon: Package, category: 'Administration' },
  { name: 'Events', path: '/school-admin/events', icon: Calendar, category: 'Administration' },

  // LIBRARY
  { name: 'Dashboard', path: '/school-admin/library/dashboard', icon: LayoutGrid, category: 'Library' },
  { name: 'Books', path: '/school-admin/library/books', icon: Library, category: 'Library' },
  { name: 'Categories', path: '/school-admin/library/categories', icon: FolderTree, category: 'Library' },
  { name: 'Rules', path: '/school-admin/library/rules', icon: SlidersHorizontal, category: 'Library' },
  { name: 'Reports', path: '/school-admin/library/reports', icon: BookMarked, category: 'Library' },
  { name: 'Settings', path: '/school-admin/library/settings', icon: Settings, category: 'Library' },

  // SYSTEM
  { name: 'Roles & Permissions', path: '/school-admin/roles', icon: Shield, category: 'System' },
  { name: 'Notifications', path: '/school-admin/notifications', icon: Bell, category: 'System' },
  { name: 'Reports Hub', path: '/school-admin/reports', icon: BarChart3, category: 'System' },
  { name: 'Help & Support', path: '/school-admin/support', icon: LifeBuoy, category: 'System' },
  { name: 'Settings', path: '/school-admin/settings', icon: Settings, category: 'System' }
];

export const MOCK_STUDENTS = [];
export const MOCK_TEACHERS = [];
export const MOCK_EMPLOYEES = [];
export const MOCK_ADMISSIONS = [];
export const MOCK_CLASSES = [];
export const MOCK_SECTIONS = [];
export const MOCK_SUBJECTS = [];
export const MOCK_TIMETABLE = [];
export const MOCK_EXAMS = [];
export const MOCK_FEE_COLLECTION = [];
export const MOCK_AUDIT_LOGS = [];

import {
  LayoutDashboard,
  Users,
  UserCheck,
  Briefcase,
  GraduationCap,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  BookOpen,
  CreditCard,
  CheckSquare,
  Video,
  BarChart3,
  Bell,
  Settings
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  // MAIN
  { name: 'Dashboard', path: '/principal/dashboard', icon: LayoutDashboard, category: 'Main' },
  
  // PEOPLE
  { name: 'Student Management', path: '/principal/students', icon: Users, category: 'People' },
  { name: 'Teacher Management', path: '/principal/teachers', icon: UserCheck, category: 'People' },
  { name: 'Staff Management', path: '/principal/staff', icon: Briefcase, category: 'People' },
  
  // ACADEMICS
  { name: 'Academic Years', path: '/principal/academics/years', icon: CalendarDays, category: 'Academics' },
  { name: 'Classes', path: '/principal/academics/classes', icon: GraduationCap, category: 'Academics' },
  { name: 'Subjects', path: '/principal/academics/subjects', icon: BookOpen, category: 'Academics' },
  { name: 'Subject Assignments', path: '/principal/academics/subject-assignments', icon: BookOpen, category: 'Academics' },
  { name: 'Class Teachers', path: '/principal/academics/class-teachers', icon: UserCheck, category: 'Academics' },
  { name: 'Attendance', path: '/principal/attendance', icon: ClipboardCheck, category: 'Academics' },
  { name: 'Exam', path: '/principal/exams', icon: FileSpreadsheet, category: 'Academics' },
  { name: 'Homework', path: '/principal/homework', icon: BookOpen, category: 'Academics' },
  
  // FINANCE
  { name: 'Fee & Dues', path: '/principal/fees', icon: CreditCard, category: 'Finance' },
  
  // MANAGEMENT
  { name: 'Leave Approval', path: '/principal/leave', icon: CheckSquare, category: 'Management' },

  // SYSTEM
  { name: 'Reports', path: '/principal/reports', icon: BarChart3, category: 'System' },
  { name: 'Announcements & Notifications', path: '/principal/notifications', icon: Bell, category: 'System' },
  { name: 'Settings', path: '/principal/settings', icon: Settings, category: 'System' }
];

export const MOCK_STUDENTS = [];
export const MOCK_TEACHERS = [];
export const MOCK_STAFF = [];
export const MOCK_LEAVE_REQUESTS = [];
export const MOCK_SYLLABUS = [];
export const MOCK_EXAMS = [];
export const MOCK_HOMEWORK = [];
export const MOCK_COMMUNICATIONS = [];
export const MOCK_MEETINGS = [];
export const MOCK_AUDIT_LOGS = [];
export const MOCK_EVENTS = [];

// DASHBOARD CHART ARRAYS
export const STUDENT_ATTENDANCE_TREND = [];
export const TEACHER_ATTENDANCE_TREND = [];
export const ADMISSIONS_TREND = [];
export const FEE_COLLECTION_TREND = [];
export const EXAM_PERFORMANCE = [];
export const CLASS_PERFORMANCE = [];
export const DEPT_PERFORMANCE = [];
export const GENDER_RATIO = [];

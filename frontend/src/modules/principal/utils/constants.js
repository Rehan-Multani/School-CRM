import {
  LayoutDashboard,
  Users,
  UserCheck,
  GraduationCap,
  ClipboardCheck,
  FileSpreadsheet,
  BookOpen,
  CheckSquare,
  Video,
  Megaphone,
  Calendar,
  BarChart3,
  Bell,
  Settings
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  // MAIN
  { name: 'Dashboard', path: '/principal/dashboard', icon: LayoutDashboard, category: 'Main' },
  
  // MONITORING
  { name: 'Student Monitoring', path: '/principal/students', icon: Users, category: 'Monitoring' },
  { name: 'Teacher Monitoring', path: '/principal/teachers', icon: UserCheck, category: 'Monitoring' },
  { name: 'Academic Monitoring', path: '/principal/academics', icon: GraduationCap, category: 'Monitoring' },
  { name: 'Attendance Monitoring', path: '/principal/attendance', icon: ClipboardCheck, category: 'Monitoring' },
  { name: 'Examination Monitoring', path: '/principal/exams', icon: FileSpreadsheet, category: 'Monitoring' },
  { name: 'Homework Monitoring', path: '/principal/homework', icon: BookOpen, category: 'Monitoring' },
  
  // MANAGEMENT
  { name: 'Leave Approval', path: '/principal/leave', icon: CheckSquare, category: 'Management' },
  { name: 'Meetings', path: '/principal/meetings', icon: Video, category: 'Management' },
  
  // COMMUNICATION
  { name: 'Announcements & Circulars', path: '/principal/communication', icon: Megaphone, category: 'Communication' },
  { name: 'Events', path: '/principal/events', icon: Calendar, category: 'Communication' },
  
  // SYSTEM
  { name: 'Reports Hub', path: '/principal/reports', icon: BarChart3, category: 'System' },
  { name: 'Notifications', path: '/principal/notifications', icon: Bell, category: 'System' },
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

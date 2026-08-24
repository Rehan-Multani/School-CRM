import {
  LayoutDashboard,
  User,
  Users,
  CalendarCheck,
  BookOpen,
  FileText,
  GraduationCap,
  Calendar,
  BarChart2,
  FilePlus,
  MessageSquare,
  Megaphone,
  Trophy,
  Bell,
  Download,
  Settings,
  ClipboardList,
  BookMarked,
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard, category: 'Main' },

  { name: 'My Classes', path: '/teacher/classes', icon: Users, category: 'Management' },
  { name: 'Attendance', path: '/teacher/attendance', icon: CalendarCheck, category: 'Management' },
  { name: 'Homework', path: '/teacher/homework', icon: BookOpen, category: 'Management' },
  { name: 'Examination', path: '/teacher/examination', icon: FileText, category: 'Management' },

  { name: 'Academics', path: '/teacher/academics', icon: BookMarked, category: 'Academic' },
  { name: 'Timetable', path: '/teacher/timetable', icon: Calendar, category: 'Academic' },
  { name: 'Student Performance', path: '/teacher/performance', icon: BarChart2, category: 'Academic' },
  { name: 'Leave', path: '/teacher/leave', icon: FilePlus, category: 'Academic' },

  { name: 'Messages', path: '/teacher/messages', icon: MessageSquare, category: 'Communication' },
  { name: 'Announcements', path: '/teacher/announcements', icon: Megaphone, category: 'Communication' },
  { name: 'Events', path: '/teacher/events', icon: Trophy, category: 'Communication' },
  { name: 'Notifications', path: '/teacher/notifications', icon: Bell, category: 'Communication' },

  { name: 'My Profile', path: '/teacher/profile', icon: User, category: 'Account' },
  { name: 'Downloads', path: '/teacher/downloads', icon: Download, category: 'Account' },
  { name: 'Settings', path: '/teacher/settings', icon: Settings, category: 'Account' },
];

export const MOBILE_TABS = [
  { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
  { name: 'Classes', path: '/teacher/classes', icon: Users },
  { name: 'Academics', path: '/teacher/academics', icon: BookMarked },
  { name: 'Messages', path: '/teacher/messages', icon: MessageSquare },
  { name: 'Profile', path: '/teacher/profile', icon: User },
];

export const ATTENDANCE_STATUSES = [
  { key: 'Present', label: 'P', color: 'bg-emerald-500 text-white' },
  { key: 'Absent', label: 'A', color: 'bg-rose-500 text-white' },
  { key: 'Late', label: 'L', color: 'bg-amber-500 text-white' },
  { key: 'Half Day', label: 'HD', color: 'bg-orange-400 text-white' },
  { key: 'Leave', label: 'LV', color: 'bg-purple-500 text-white' },
];

export const LEAVE_TYPES = ['Casual Leave', 'Medical Leave', 'Emergency Leave', 'Earned Leave', 'Other'];

export const SUBJECT_TYPES = ['Theory', 'Practical', 'Lab', 'Project'];

export const PAGE_TITLES = {
  '/teacher/dashboard': 'Dashboard',
  '/teacher/profile': 'My Profile',
  '/teacher/classes': 'My Classes',
  '/teacher/attendance': 'Attendance',
  '/teacher/homework': 'Homework',
  '/teacher/examination': 'Examination',
  '/teacher/academics': 'Academics',
  '/teacher/timetable': 'Timetable',
  '/teacher/performance': 'Student Performance',
  '/teacher/leave': 'Leave Management',
  '/teacher/messages': 'Messages',
  '/teacher/announcements': 'Announcements',
  '/teacher/events': 'Events',
  '/teacher/notifications': 'Notifications',
  '/teacher/downloads': 'Downloads',
  '/teacher/settings': 'Settings',
};

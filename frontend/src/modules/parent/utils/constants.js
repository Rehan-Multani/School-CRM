import {
  LayoutDashboard,
  Users,
  User,
  CalendarCheck,
  BookOpen,
  BookMarked,
  Calendar,
  FileText,
  GraduationCap,
  CreditCard,
  Truck,
  Home,
  Library,
  FilePlus,
  MessageSquare,
  Megaphone,
  Trophy,
  Bell,
  Download,
  Settings
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', path: '/parent/dashboard', icon: LayoutDashboard, category: 'Main' },
  { name: 'My Children', path: '/parent/children', icon: Users, category: 'Main' },

  { name: 'Attendance', path: '/parent/attendance', icon: CalendarCheck, category: 'Academic' },
  { name: 'Homework', path: '/parent/homework', icon: BookOpen, category: 'Academic' },
  { name: 'Academics', path: '/parent/academics', icon: BookMarked, category: 'Academic' },
  { name: 'Timetable', path: '/parent/timetable', icon: Calendar, category: 'Academic' },
  { name: 'Examinations', path: '/parent/exams', icon: FileText, category: 'Academic' },
  { name: 'Results', path: '/parent/results', icon: GraduationCap, category: 'Academic' },

  { name: 'Fees Management', path: '/parent/fees', icon: CreditCard, category: 'Finance' },
  { name: 'Transport Details', path: '/parent/transport', icon: Truck, category: 'Services' },
  { name: 'Hostel Status', path: '/parent/hostel', icon: Home, category: 'Services' },
  { name: 'Library Issued', path: '/parent/library', icon: Library, category: 'Services' },
  { name: 'Leave Application', path: '/parent/leave', icon: FilePlus, category: 'Academic' },

  { name: 'Messages', path: '/parent/messages', icon: MessageSquare, category: 'Communication' },
  { name: 'Announcements', path: '/parent/announcements', icon: Megaphone, category: 'Communication' },
  { name: 'Events', path: '/parent/events', icon: Trophy, category: 'Communication' },
  { name: 'Notifications', path: '/parent/notifications', icon: Bell, category: 'Communication' },

  { name: 'Student Profile', path: '/parent/profile', icon: User, category: 'Account' },
  { name: 'Downloads', path: '/parent/downloads', icon: Download, category: 'Account' },
  { name: 'Settings', path: '/parent/settings', icon: Settings, category: 'Account' },
];

export const MOBILE_TABS = [
  { name: 'Dashboard', path: '/parent/dashboard', icon: LayoutDashboard },
  { name: 'Academics', path: '/parent/academics', icon: BookMarked },
  { name: 'Messages', path: '/parent/messages', icon: MessageSquare },
  { name: 'Alerts', path: '/parent/notifications', icon: Bell },
  { name: 'Profile', path: '/parent/profile', icon: User },
];

export const PAGE_TITLES = {
  '/parent/dashboard': 'Parent Dashboard',
  '/parent/children': 'Linked Children',
  '/parent/profile': 'Child Profile',
  '/parent/attendance': 'Attendance Tracker',
  '/parent/homework': 'Homework & Tasks',
  '/parent/academics': 'Academic Syllabus',
  '/parent/timetable': 'Class Timetable',
  '/parent/exams': 'Examinations',
  '/parent/results': 'Academic Results',
  '/parent/fees': 'Fees Ledger',
  '/parent/transport': 'Transport details',
  '/parent/hostel': 'Hostel details',
  '/parent/library': 'Library records',
  '/parent/leave': 'Leave requests',
  '/parent/messages': 'Conversations',
  '/parent/announcements': 'Circulars',
  '/parent/events': 'Events Gallery',
  '/parent/notifications': 'Alerts history',
  '/parent/downloads': 'Report Center',
  '/parent/settings': 'Portal Settings',
};

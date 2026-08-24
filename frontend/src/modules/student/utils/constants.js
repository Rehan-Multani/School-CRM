import { 
  LayoutDashboard, 
  User, 
  CalendarCheck, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  Calendar, 
  CreditCard, 
  Truck, 
  Home, 
  Library, 
  FilePlus, 
  Megaphone, 
  Trophy, 
  Bell, 
  MessageSquare, 
  Download, 
  Settings 
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard, category: 'Main' },
  { name: 'My Profile', path: '/student/profile', icon: User, category: 'Account' },
  { name: 'Attendance', path: '/student/attendance', icon: CalendarCheck, category: 'Academic' },
  { name: 'Homework', path: '/student/homework', icon: BookOpen, category: 'Academic' },
  { name: 'Exams', path: '/student/exams', icon: FileText, category: 'Academic' },
  { name: 'Results', path: '/student/results', icon: GraduationCap, category: 'Academic' },
  { name: 'Academics', path: '/student/academics', icon: BookOpen, category: 'Academic' },
  { name: 'Timetable', path: '/student/timetable', icon: Calendar, category: 'Academic' },
  { name: 'Fees', path: '/student/fees', icon: CreditCard, category: 'Finance' },
  { name: 'Transport', path: '/student/transport', icon: Truck, category: 'Services' },
  { name: 'Hostel', path: '/student/hostel', icon: Home, category: 'Services' },
  { name: 'Library', path: '/student/library', icon: Library, category: 'Services' },
  { name: 'Leave Application', path: '/student/leave', icon: FilePlus, category: 'Academic' },
  { name: 'Announcements', path: '/student/announcements', icon: Megaphone, category: 'Communication' },
  { name: 'Events', path: '/student/events', icon: Trophy, category: 'Communication' },
  { name: 'Notifications', path: '/student/notifications', icon: Bell, category: 'Communication' },
  { name: 'Messages', path: '/student/messages', icon: MessageSquare, category: 'Communication' },
  { name: 'Downloads', path: '/student/downloads', icon: Download, category: 'Account' },
  { name: 'Settings', path: '/student/settings', icon: Settings, category: 'Account' },
];

export const MOBILE_TABS = [
  { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
  { name: 'Academics', path: '/student/academics', icon: BookOpen },
  { name: 'Messages', path: '/student/messages', icon: MessageSquare },
  { name: 'Notifications', path: '/student/notifications', icon: Bell },
  { name: 'Profile', path: '/student/profile', icon: User }
];

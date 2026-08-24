import {
  LayoutDashboard,
  BookOpen,
  FolderTree,
  FileCheck,
  FileX,
  Clock,
  AlertTriangle,
  Users,
  GraduationCap,
  Briefcase,
  Bookmark,
  Receipt,
  BadgeAlert,
  History,
  TrendingUp,
  Bell,
  Sliders,
  User,
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  // MAIN
  { name: 'Dashboard', path: '/librarian/dashboard', icon: LayoutDashboard, category: 'Main' },

  // BOOKS & CATALOG
  { name: 'Book Catalog', path: '/librarian/books', icon: BookOpen, category: 'Catalog' },
  { name: 'Categories', path: '/librarian/books/categories', icon: FolderTree, category: 'Catalog' },

  // ISSUE & RETURN
  { name: 'Issue Book', path: '/librarian/issue', icon: FileCheck, category: 'Circulation' },
  { name: 'Return Book', path: '/librarian/return', icon: FileX, category: 'Circulation' },
  { name: 'Issued Books', path: '/librarian/issued', icon: Clock, category: 'Circulation' },
  { name: 'Overdue Books', path: '/librarian/overdue', icon: AlertTriangle, category: 'Circulation' },

  // MEMBERS
  { name: 'All Members', path: '/librarian/members', icon: Users, category: 'Members' },
  { name: 'Student Members', path: '/librarian/members/students', icon: GraduationCap, category: 'Members' },
  { name: 'Faculty Members', path: '/librarian/members/staff', icon: Briefcase, category: 'Members' },

  // RESERVATIONS & FINES
  { name: 'Book Reservations', path: '/librarian/reservations', icon: Bookmark, category: 'Fines & Holds' },
  { name: 'Pending Fines', path: '/librarian/fines/pending', icon: BadgeAlert, category: 'Fines & Holds' },
  { name: 'Collected Fines', path: '/librarian/fines/collected', icon: Receipt, category: 'Fines & Holds' },

  // ACTIVITY & REPORTS
  { name: 'Issue History', path: '/librarian/transactions/issues', icon: History, category: 'Reports & Logs' },
  { name: 'Analytics & Reports', path: '/librarian/reports', icon: TrendingUp, category: 'Reports & Logs' },

  // SYSTEM
  { name: 'Notifications', path: '/librarian/notifications', icon: Bell, category: 'System' },
  { name: 'Library Rules', path: '/librarian/settings/rules', icon: Sliders, category: 'System' },
  { name: 'My Profile', path: '/librarian/settings/profile', icon: User, category: 'System' },
];

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { useStudentNotifications } from '../../context/NotificationContext';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';

export const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications } = useStudentNotifications();
  const { user } = useStudentAuth();

  const isDashboard = location.pathname === '/student/dashboard';
  const unreadCount = notifications.filter(n => !n.read).length;

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('profile')) return 'My Profile';
    if (path.includes('attendance')) return 'Attendance';
    if (path.includes('homework')) return 'Homework';
    if (path.includes('exams')) return 'Examinations';
    if (path.includes('results')) return 'Results';
    if (path.includes('academics')) return 'Academics';
    if (path.includes('timetable')) return 'Timetable';
    if (path.includes('fees')) return 'Fee Details';
    if (path.includes('transport')) return 'Transport';
    if (path.includes('hostel')) return 'Hostel';
    if (path.includes('library')) return 'Library';
    if (path.includes('leave')) return 'Leave Applications';
    if (path.includes('announcements')) return 'Announcements';
    if (path.includes('events')) return 'Events';
    if (path.includes('notifications')) return 'Notifications';
    if (path.includes('messages')) return 'Messages';
    if (path.includes('downloads')) return 'Downloads';
    if (path.includes('settings')) return 'Settings';
    return 'Student Portal';
  };

  return (
    <header className="sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-border h-16 px-4 flex items-center justify-between z-30 md:hidden shadow-sm">
      <div className="flex items-center gap-3">
        {!isDashboard ? (
          <button 
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : user ? (
          <img 
            src={user.photo} 
            alt={user.name} 
            onClick={() => navigate('/student/profile')}
            className="w-8 h-8 rounded-lg object-cover border border-border cursor-pointer"
          />
        ) : null}
        
        <h2 className="text-sm font-bold text-foreground m-0 p-0 leading-none">
          {getPageTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button 
          onClick={() => navigate('/student/notifications')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 relative transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell, MessageSquare } from 'lucide-react';
import { useTeacherNotifications } from '../../context/TeacherNotificationContext';
import { useTeacherAuth } from '../../context/TeacherAuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import { PAGE_TITLES } from '../../utils/constants';

export const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadNotifCount, unreadMsgCount } = useTeacherNotifications();
  const { user } = useTeacherAuth();

  const isDashboard = location.pathname === '/teacher/dashboard';

  const getPageTitle = () => {
    const path = location.pathname;
    for (const [key, title] of Object.entries(PAGE_TITLES)) {
      if (path.startsWith(key)) return title;
    }
    return 'Teacher Portal';
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
            onClick={() => navigate('/teacher/profile')}
            className="w-8 h-8 rounded-lg object-cover border border-border cursor-pointer"
          />
        ) : null}

        <h2 className="text-sm font-bold text-foreground m-0 p-0 leading-none">
          {getPageTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Messages icon */}
        <button
          onClick={() => navigate('/teacher/messages')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 relative transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadMsgCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-[8px] font-bold">
              {unreadMsgCount}
            </span>
          )}
        </button>

        {/* Notifications icon */}
        <button
          onClick={() => navigate('/teacher/notifications')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 relative transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
              {unreadNotifCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

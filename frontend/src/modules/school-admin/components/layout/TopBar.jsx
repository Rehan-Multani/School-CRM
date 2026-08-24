import React, { useState } from 'react';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { useSchoolAdminTheme } from '../../context/SchoolAdminThemeContext';
import { useSchoolAdminNotifications } from '../../context/SchoolAdminNotificationContext';
import { 
  Bell, 
  Search, 
  Sun, 
  Moon, 
  Menu, 
  CalendarDays, 
  Settings, 
  LogOut, 
  X,
  Check
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '../ui/UserAvatar';
import { schoolPortalApi } from '../../../../shared/api/client';

export const TopBar = ({ onMenuClick, onSearchClick }) => {
  const { user, logout, hasPlan, applyUser } = useSchoolAdminAuth();
  const { darkMode, setTheme } = useSchoolAdminTheme();
  const { notifications, unreadCount, markRead, markAllRead } = useSchoolAdminNotifications();
  const navigate = useNavigate();

  // Dropdown States
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/school-admin/login');
  };

  const handleToggleTheme = async () => {
    const nextTheme = darkMode ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      const result = await schoolPortalApi.updateTheme({ theme: nextTheme });
      if (result?.user) applyUser(result.user);
    } catch {
      // UI already updated; keep local preference if save fails
    }
  };

  return (
    <header className="sticky top-0 z-35 flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-8 shadow-sm">
      {/* Mobile Drawer Trigger & Search Indicator */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {hasPlan && (
          <button
            onClick={onSearchClick}
            className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl text-xs hover:border-slate-300 transition-colors w-64"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left">Search / Ask anything...</span>
            <span className="text-[9px] font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              Ctrl K
            </span>
          </button>
        )}
      </div>

      {/* Right Actions Grid */}
      <div className="flex items-center gap-4">
        {/* Academic Session */}
        {user && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-bold">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Session: {user.academicSession}</span>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={handleToggleTheme}
          className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification Icon */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Panel Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2.5 z-40 w-80 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-950 dark:text-white">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs font-semibold text-slate-400">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => {
                        markRead(notif.id);
                        setShowNotifications(false);
                      }}
                      className={cn(
                        "p-3.5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer text-left",
                        !notif.read && "bg-indigo-50/20 dark:bg-indigo-950/10"
                      )}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{notif.title}</span>
                        <span className="text-[9px] text-slate-400 font-medium shrink-0">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-xl transition-colors"
            >
              <UserAvatar src={user.photo} name={user.name} className="h-8 w-8 rounded-lg text-xs" />
              <span className="hidden lg:block text-xs font-bold text-slate-900 dark:text-white">{user.name}</span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2.5 z-40 w-52 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 space-y-1">
                <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-850">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</span>
                  <span className="block text-[10px] text-slate-400 font-medium truncate mt-0.5">{user.email}</span>
                </div>

                {hasPlan && (
                  <button
                    onClick={() => {
                      navigate('/school-admin/settings');
                      setShowProfileMenu(false);
                    }}
                    className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Settings</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

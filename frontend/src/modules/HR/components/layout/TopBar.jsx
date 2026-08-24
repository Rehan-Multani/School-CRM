import React, { useState } from 'react';
import { useHRAuth } from '../../context/HRAuthContext';
import { useHRTheme } from '../../context/HRThemeContext';
import { useHRNotifications } from '../../context/HRNotificationContext';
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
  Check,
  Users,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TopBar = ({ toggleSidebar, onSearchTrigger }) => {
  const { user, logout } = useHRAuth();
  const { darkMode, toggleDarkMode } = useHRTheme();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useHRNotifications();
  const navigate = useNavigate();

  // Dropdown States
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/hr/login');
  };

  return (
    <header className="sticky top-0 z-35 flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md px-4 md:px-8 shadow-xs">
      {/* Mobile Drawer Trigger & Search Indicator */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 md:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onSearchTrigger}
          className="hidden md:flex items-center gap-2.5 px-3.5 py-2 bg-slate-50/80 dark:bg-slate-900/80 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl text-xs hover:border-indigo-400 dark:hover:border-indigo-800 transition-all w-72 cursor-pointer shadow-2xs group"
        >
          <Search className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          <span className="flex-1 text-left font-semibold">Search staff, payroll, leave...</span>
          <span className="text-[9px] font-bold bg-white dark:bg-slate-950 text-slate-500 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
            Ctrl K
          </span>
        </button>
      </div>

      {/* Right Actions Grid */}
      <div className="flex items-center gap-3">
        {/* Academic Session Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold">
          <CalendarDays className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Session: {user?.academicSession || '2026-2027'}</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title="Toggle Theme"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 relative transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">HR Notifications Feed</h3>
                  <p className="text-[10px] text-slate-400">{unreadCount} unread announcements</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                    No new notifications at this time.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-colors ${
                        !n.read ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Pill */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-800"
          >
            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'H'}
            </div>
            <div className="text-left hidden lg:block">
              <span className="block text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {user?.name || 'HR Officer'}
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold">{user?.role || 'HR Admin'}</span>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'hr@school.edu'}</p>
              </div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/hr/settings');
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Portal Settings</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;

import React, { useState } from 'react';
import { useLibrarianAuth } from '../../context/LibrarianAuthContext';
import { useLibrarianTheme } from '../../context/LibrarianThemeContext';
import { useLibrarianNotifications } from '../../context/LibrarianNotificationContext';
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
  BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '../ui/UserAvatar';

export const TopBar = ({ toggleSidebar, onSearchTrigger }) => {
  const { user, logout } = useLibrarianAuth();
  const { darkMode, toggleDarkMode } = useLibrarianTheme();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useLibrarianNotifications();
  const navigate = useNavigate();

  // Dropdown States
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/librarian/login');
  };

  return (
    <header className="sticky top-0 z-35 flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-8 shadow-sm">
      {/* Mobile Drawer Trigger & Search Indicator */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onSearchTrigger}
          className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl text-xs hover:border-slate-300 transition-colors w-64"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left">Search / Quick actions...</span>
          <span className="text-[9px] font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
            Ctrl K
          </span>
        </button>
      </div>

      {/* Right Actions Grid */}
      <div className="flex items-center gap-4">
        {/* Academic Session */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Session: {user?.academicSession || '2024-2025'}</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
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
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">Notifications</h4>
                  <p className="text-[11px] text-slate-500">
                    {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No active notifications.
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`p-4 transition-colors cursor-pointer text-left ${
                        notif.unread ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.unread ? 'bg-indigo-600' : 'bg-transparent'}`} />
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center">
                <button
                  onClick={() => {
                    navigate('/librarian/notifications');
                    setShowNotifications(false);
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View All Alerts →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 p-1 pl-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
                {user?.name || 'Sanjay Kumar'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Head Librarian</p>
            </div>
            <UserAvatar
              src={user?.photoUrl}
              name={user?.name}
              className="h-8 w-8 rounded-full text-xs shadow-sm"
            />
          </button>

          {/* Profile Flyout */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-white">{user?.name || 'Librarian'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'librarian@greenfield.edu'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-md">
                  {user?.schoolName || 'School Library'}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/librarian/settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2 text-xs text-left text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Library Settings</span>
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-xs text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default TopBar;

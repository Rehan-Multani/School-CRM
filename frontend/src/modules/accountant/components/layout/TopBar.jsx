import React, { useState } from 'react';
import { useAccountantAuth } from '../../context/AccountantAuthContext';
import { useAccountantTheme } from '../../context/AccountantThemeContext';
import { useAccountantNotifications } from '../../context/AccountantNotificationContext';
import { Menu, Search, Sun, Moon, Bell, LogOut, User, Settings as SettingsIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const TopBar = ({ onMenuClick, onSearchClick }) => {
  const { user, logout } = useAccountantAuth();
  const { darkMode, toggleTheme } = useAccountantTheme();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useAccountantNotifications();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/accountant/login');
  };

  return (
    <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-6 z-30 select-none">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 md:hidden transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-xs font-semibold w-72 transition-all cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Quick search routes...</span>
          <kbd className="ml-auto bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono leading-none border border-slate-300 dark:border-slate-700">Ctrl+K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-colors shrink-0 cursor-pointer"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserDropdown(false);
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-colors relative shrink-0 cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-violet-600 border border-white dark:border-slate-900 rounded-full w-2.5 h-2.5 animate-pulse"></span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden text-left"
              >
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Alert Feed ({unreadCount})</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-68 overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-slate-800/50">
                  {notifications.slice(0, 5).map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => markAsRead(item.id)}
                      className={`p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors cursor-pointer ${!item.read ? 'bg-violet-500/5' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{item.title}</span>
                        <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">{item.time}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">{item.message}</p>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 text-center">
                  <Link 
                    to="/accountant/notifications" 
                    onClick={() => setShowNotifications(false)}
                    className="text-[11px] font-extrabold text-violet-600 dark:text-violet-400 block hover:underline"
                  >
                    View All Notifications
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Card info menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-800"
            >
              <img src={user.photo} alt={user.name} className="w-8 h-8 rounded-lg object-cover" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden sm:inline-block max-w-28 truncate">{user.name}</span>
            </button>

            <AnimatePresence>
              {showUserDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1"
                >
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-left">
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">{user.name}</span>
                    <span className="text-[10px] text-slate-400 truncate block mt-0.5">{user.email}</span>
                  </div>

                  <Link
                    to="/accountant/settings"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/accountant/settings"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Account Settings</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl w-full text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
};
export default TopBar;

import React, { useState } from 'react';
import { usePrincipalAuth } from '../../context/PrincipalAuthContext';
import { usePrincipalTheme } from '../../context/PrincipalThemeContext';
import { usePrincipalNotifications } from '../../context/PrincipalNotificationContext';
import { Menu, Search, Sun, Moon, Bell, LogOut, User, Settings as SettingsIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

function buildFileUrl(path) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const _rel = path.startsWith('/') ? path : `/${path}`;
  const _tok = ['school_admin_token','principal_token','accountant_token','hr_token','librarian_token','transport_token','super_admin_token'].reduce((a, k) => a || localStorage.getItem(k), '');
  return `${API_BASE_URL}/platform${_rel}${_tok ? `?t=${encodeURIComponent(_tok)}` : ''}`;
}

export const TopBar = ({ onMenuClick, onSearchClick }) => {
  const { user, logout } = usePrincipalAuth();
  const { darkMode, toggleTheme } = usePrincipalTheme();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = usePrincipalNotifications();
  const navigate = useNavigate();

  // Drawers trigger
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/principal/login');
  };

  return (
    <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-6 z-30 select-none">
      {/* Search Input click & Menu Button */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 md:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search trigger */}
        <button
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-950 text-slate-450 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 rounded-xl text-xs font-semibold w-72 transition-all"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Quick search routes...</span>
          <kbd className="ml-auto bg-slate-205 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono leading-none border dark:border-slate-700">Ctrl+K</kbd>
        </button>
      </div>

      {/* Action panel triggers */}
      <div className="flex items-center gap-3">
        {/* Toggle dark/light */}
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-xl transition-colors shrink-0"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserDropdown(false);
            }}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-xl transition-colors relative shrink-0"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-emerald-600 border border-white dark:border-slate-900 rounded-full w-2.5 h-2.5 animate-pulse"></span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Alert Feed ({unreadCount})</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] font-bold text-emerald-605 dark:text-emerald-450 hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-68 overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-slate-850/50">
                  {notifications.slice(0, 5).map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => markAsRead(item.id)}
                      className={`p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors cursor-pointer ${!item.read ? 'bg-emerald-500/5' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-850 dark:text-slate-200">{item.title}</span>
                        <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">{item.time}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed mt-1">{item.message}</p>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t text-center">
                  <Link 
                    to="/principal/notifications" 
                    onClick={() => setShowNotifications(false)}
                    className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 block hover:underline"
                  >
                    View All Notifications
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User profile dropdown drawer */}
        {user && (
          <div className="relative">
            <button
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1 hover:bg-slate-55 dark:hover:bg-slate-950 rounded-xl transition-all cursor-pointer border"
            >
              {user.photo ? (
                <img src={buildFileUrl(user.photo)} alt={user.name} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'P'}
                </div>
              )}
              <span className="text-xs font-bold text-slate-700 dark:text-slate-350 hidden sm:inline-block max-w-28 truncate">{user.name}</span>
            </button>

            <AnimatePresence>
              {showUserDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl z-50 p-2 space-y-1"
                >
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-850">
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">{user.name}</span>
                    <span className="text-[10px] text-slate-400 truncate block mt-0.5">{user.email}</span>
                  </div>

                  <Link
                    to="/principal/settings"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-950 rounded-xl"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/principal/settings"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-950 rounded-xl"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>System Settings</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl w-full text-left"
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

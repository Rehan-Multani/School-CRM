import React, { useState } from 'react';
import { useTransportAuth } from '../../context/TransportAuthContext';
import { useTransportTheme } from '../../context/TransportThemeContext';
import { useTransportNotifications } from '../../context/TransportNotificationContext';
import { Menu, Search, Moon, Sun, Bell, LogOut, ChevronDown, CheckCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

export const TopBar = ({ toggleSidebar, onSearchTrigger }) => {
  const { user, logout } = useTransportAuth();
  const { darkMode, toggleDarkMode } = useTransportTheme();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useTransportNotifications();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-205 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Mobile Toggle & Search */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search Input click to open command palette */}
        <div 
          onClick={onSearchTrigger}
          className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-955 text-slate-400 hover:text-slate-650 cursor-pointer select-none w-56 text-xs transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>Quick actions (⌘K)...</span>
        </div>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-3">
        {/* Mobile Search Button */}
        <button
          onClick={onSearchTrigger}
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl sm:hidden"
        >
          <Search className="h-4.5 w-4.5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-slate-550 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-150"
        >
          {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        {/* Notifications Panel */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
            className={cn(
              "p-2 text-slate-550 rounded-xl relative hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
              showNotifications ? "bg-slate-100 dark:bg-slate-800" : ""
            )}
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-cyan-600 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>

          {/* Notifications Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-3xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Transport Alerts ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-3xs font-bold text-cyan-600 hover:text-cyan-705 flex items-center gap-1"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Mark read</span>
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto no-scrollbar">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={cn(
                        "p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors",
                        !notif.read ? "bg-cyan-50/15 dark:bg-cyan-950/5" : ""
                      )}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <p className={cn(
                          "text-xs font-bold",
                          !notif.read ? "text-slate-900 dark:text-white" : "text-slate-650 dark:text-slate-400"
                        )}>
                          {notif.title}
                        </p>
                        <span className="text-4xs text-slate-400 font-semibold">{notif.time}</span>
                      </div>
                      <p className="text-3xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium">
                    All caught up! No alerts.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <img
              src={user?.photoUrl}
              alt={user?.name}
              className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700"
            />
            <ChevronDown className="h-3.5 w-3.5 text-slate-550 hidden md:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5 animate-fadeIn">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="block text-xs font-bold text-slate-850 dark:text-slate-200">{user?.name}</span>
                <span className="block text-4xs text-slate-400 font-semibold uppercase tracking-wider">{user?.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

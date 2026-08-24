import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useHRNotifications } from '../../context/HRNotificationContext';
import { Bell, Check, Eye, Trash2, CheckCircle2, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const Notifications = () => {
  const { notifications, unreadCount, markAllAsRead, markAsRead, clearAll } = useHRNotifications();
  const [filterType, setFilterType] = useState('ALL');

  const filtered = filterType === 'ALL'
    ? notifications
    : notifications.filter((n) => n.type === filterType);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="HR Notifications & Operational Alerts Feed"
        subtitle="Stay updated on new faculty leave petitions, upcoming payroll deadlines, and institutional circulars."
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 px-4 py-2 border border-rose-200 dark:border-rose-900/40 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Feed</span>
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Filter bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-1.5 shrink-0 text-left">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block px-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
            Alert Categories
          </span>
          {[
            { id: 'ALL', label: `All Alerts (${notifications.length})` },
            { id: 'info', label: 'Info & Notice' },
            { id: 'leave', label: 'Leave Requests' },
            { id: 'payroll', label: 'Payroll Alerts' },
            { id: 'attendance', label: 'Attendance' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterType(cat.id)}
              className={`w-full px-3.5 py-2 rounded-xl text-left text-xs transition-all cursor-pointer font-bold ${
                filterType === cat.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* List Feed */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activity Stream</h3>
            <span className="text-xs text-slate-400 font-semibold">{unreadCount} unread notices</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Bell className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs">No notifications in your feed.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-2.5 text-left">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`pt-3 first:pt-0 flex items-start gap-3.5 p-3.5 rounded-2xl transition-all cursor-pointer ${
                    !n.read
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;

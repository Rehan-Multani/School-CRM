import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { EmptyState } from '../components/ui/EmptyState';
import { useParentNotifications } from '../context/ParentNotificationContext';
import { Bell, Check, Trash2, CalendarCheck, BookOpen, GraduationCap, CreditCard, Megaphone } from 'lucide-react';

const TYPE_ICONS = {
  attendance: CalendarCheck,
  homework: BookOpen,
  results: GraduationCap,
  fees: CreditCard,
  announcements: Megaphone,
};

const TYPE_COLORS = {
  attendance: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  homework: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  results: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  fees: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  announcements: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
};

export const ParentNotifications = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    unreadNotifCount
  } = useParentNotifications();

  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { value: 'all', label: 'All Notifications' },
    { value: 'unread', label: 'Unread' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'homework', label: 'Homework' },
    { value: 'fees', label: 'Fees' },
  ];

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !n.read;
    return n.type === activeFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Alerts</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time alerts, homework posts, fee due dates, and circular logs</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadNotifCount > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-450 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>
      </div>

      <FilterBar
        filters={filters}
        active={activeFilter}
        onChange={setActiveFilter}
      />

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            title="All quiet here"
            description="You do not have any notification alerts matching your search criteria."
            icon={Bell}
          />
        ) : (
          filteredNotifications.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] || Bell;
            const colorClass = TYPE_COLORS[notif.type] || 'bg-slate-100 dark:bg-slate-800 text-slate-500';

            return (
              <Card
                key={notif.id}
                onClick={() => !notif.read && markNotificationAsRead(notif.id)}
                className={`transition-all border ${
                  notif.read ? 'bg-card/75 border-border opacity-70' : 'bg-card border-primary/20 shadow-premium cursor-pointer'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl shrink-0 ${colorClass}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs font-bold text-foreground ${!notif.read ? 'font-black' : ''}`}>
                        {notif.title}
                      </h4>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[9px] text-slate-400 font-medium block mt-2">
                      {new Date(notif.date).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

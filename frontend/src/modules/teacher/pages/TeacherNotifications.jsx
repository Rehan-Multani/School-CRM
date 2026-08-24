import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { EmptyState } from '../components/ui/EmptyState';
import { useTeacherNotifications } from '../context/TeacherNotificationContext';
import { Bell, BookOpen, Clock, FileText, MessageSquare, Check, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';

const TYPE_ICONS = {
  homework: BookOpen,
  attendance: Clock,
  exam: FileText,
  message: MessageSquare,
  announcement: Bell,
  leave: FileText,
};

const TYPE_COLORS = {
  homework: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  attendance: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  exam: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  message: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  announcement: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  leave: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

export const TeacherNotifications = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
  } = useTeacherNotifications();

  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { value: 'all', label: 'All Alerts' },
    { value: 'unread', label: 'Unread' },
    { value: 'homework', label: 'Homework' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'exam', label: 'Exams' },
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
          <h2 className="text-lg font-black text-foreground">Notifications</h2>
          <p className="text-xs text-slate-500 mt-0.5">Stay updated with classroom activity and school circulars</p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors"
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
            title="No new notifications"
            description="You are all caught up! There are no alerts to show."
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
                className={cn(
                  "transition-all duration-200 border",
                  notif.read
                    ? "bg-card/70 border-border opacity-75"
                    : "bg-card border-primary/20 shadow-premium cursor-pointer"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("p-2.5 rounded-xl shrink-0", colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={cn("text-xs font-bold text-foreground", !notif.read && "font-extrabold")}>
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 bg-rose-500 rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[9px] text-slate-400 font-medium block mt-2">
                      {notif.time}
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

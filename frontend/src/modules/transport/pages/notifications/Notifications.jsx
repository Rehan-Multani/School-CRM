import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useTransportNotifications } from '../../context/TransportNotificationContext';
import { Badge } from '../../components/ui/Badge';
import { Bell, ShieldAlert, Check, Calendar } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Notifications = () => {
  const { notifications, markAsRead, markAllAsRead } = useTransportNotifications();

  return (
    <div className="space-y-6 text-xs max-w-2xl mx-auto animate-fadeIn">
      <PageHeader
        title="Fleet Notifications & Alert Desk"
        subtitle="Manage upcoming compliance warnings and maintenance reminders."
        actions={
          notifications.some(n => !n.read) && (
            <button
              onClick={markAllAsRead}
              className="h-10 px-4 bg-cyan-600 hover:bg-cyan-705 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all duration-150"
            >
              <Check className="h-4.5 w-4.5" />
              <span>Mark All Read</span>
            </button>
          )
        }
      />

      <div className="space-y-3.5">
        {notifications.length > 0 ? (
          notifications.map((notif) => {
            const isUnread = !notif.read;
            return (
              <div
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={cn(
                  "p-5 bg-white dark:bg-slate-900 border rounded-3xl flex gap-4 transition-all duration-200",
                  isUnread 
                    ? "border-cyan-305 dark:border-cyan-900 shadow-sm" 
                    : "border-slate-200 dark:border-slate-800 opacity-75"
                )}
              >
                <div className={cn(
                  "p-3 rounded-2xl shrink-0 h-11 w-11 flex items-center justify-center",
                  notif.type === 'maintenance' ? "bg-amber-50 text-amber-600 dark:bg-amber-955/20" : "bg-rose-50 text-rose-600 dark:bg-rose-955/20"
                )}>
                  <ShieldAlert className="h-5.5 w-5.5" />
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={cn(
                      "font-black text-xs leading-tight truncate",
                      isUnread ? "text-slate-905 dark:text-white" : "text-slate-700 dark:text-slate-350"
                    )}>
                      {notif.title}
                    </h4>
                    <span className="text-4xs text-slate-400 font-semibold">{notif.time}</span>
                  </div>
                  <p className="text-3xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-450 font-bold">No active compliance or maintenance alerts.</p>
          </div>
        )}
      </div>
    </div>
  );
};

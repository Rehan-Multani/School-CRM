import React from 'react';
import { useStudentNotifications } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  Bell, 
  Check, 
  Trash2, 
  CalendarCheck, 
  BookOpen, 
  CreditCard, 
  GraduationCap, 
  Megaphone 
} from 'lucide-react';

export const StudentNotifications = () => {
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    clearNotifications 
  } = useStudentNotifications();

  const getIcon = (type) => {
    switch (type) {
      case 'attendance': return <CalendarCheck className="w-5 h-5 text-emerald-500" />;
      case 'homework': return <BookOpen className="w-5 h-5 text-amber-500" />;
      case 'fees': return <CreditCard className="w-5 h-5 text-rose-500" />;
      case 'results': return <GraduationCap className="w-5 h-5 text-cyan-500" />;
      default: return <Megaphone className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'attendance': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'homework': return 'bg-amber-500/10 border-amber-500/20';
      case 'fees': return 'bg-rose-500/10 border-rose-500/20';
      case 'results': return 'bg-cyan-500/10 border-cyan-500/20';
      default: return 'bg-indigo-500/10 border-indigo-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
          Feed Alerts ({notifications.filter(n => !n.read).length} Unread)
        </span>
        
        <div className="flex items-center gap-3">
          <button
            onClick={markAllNotificationsAsRead}
            className="flex items-center gap-1 text-[10px] text-primary font-bold hover:underline"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
          <button
            onClick={clearNotifications}
            className="flex items-center gap-1 text-[10px] text-rose-500 font-bold hover:underline"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear all</span>
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <EmptyState 
            title="Inbox Clean" 
            description="You don't have any alerts in your dashboard inbox right now."
            icon={Bell}
          />
        ) : (
          notifications.map((n) => (
            <Card 
              key={n.id} 
              onClick={() => markNotificationAsRead(n.id)}
              className={`p-4 border cursor-pointer hover:shadow-premium duration-100 flex items-start gap-4 ${
                n.read ? 'border-border opacity-75' : 'border-primary bg-primary/5'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 border ${getBgColor(n.type)}`}>
                {getIcon(n.type)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-xs font-bold text-foreground truncate leading-none">{n.title}</h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!n.read && <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>}
                    <span className="text-[9px] text-slate-400 font-semibold">{new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {n.message}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

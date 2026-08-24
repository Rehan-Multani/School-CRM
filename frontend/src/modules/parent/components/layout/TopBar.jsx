import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell, MessageSquare, ChevronDown, Check } from 'lucide-react';
import { useParentNotifications } from '../../context/ParentNotificationContext';
import { useParentAuth } from '../../context/ParentAuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import { PAGE_TITLES } from '../../utils/constants';

export const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadNotifCount, unreadMsgCount } = useParentNotifications();
  const { user, selectedChildId, changeSelectedChild, activeChildInfo } = useParentAuth();
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  const isDashboard = location.pathname === '/parent/dashboard';

  const getPageTitle = () => {
    const path = location.pathname;
    for (const [key, title] of Object.entries(PAGE_TITLES)) {
      if (path.startsWith(key)) return title;
    }
    return 'Parent Portal';
  };

  return (
    <header className="sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-border h-16 px-4 flex items-center justify-between z-30 md:hidden shadow-sm">
      <div className="flex items-center gap-3">
        {!isDashboard ? (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : activeChildInfo ? (
          <button
            onClick={() => setShowSwitchModal(true)}
            className="flex items-center gap-2 text-left bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-border"
          >
            <img
              src={activeChildInfo.photo}
              alt={activeChildInfo.name}
              className="w-6 h-6 rounded-lg object-cover"
            />
            <span className="text-[11px] font-black text-foreground truncate max-w-[80px]">
              {activeChildInfo.name.split(' ')[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : null}

        {isDashboard ? null : (
          <h2 className="text-sm font-bold text-foreground m-0 p-0 leading-none">
            {getPageTitle()}
          </h2>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Message Notifications */}
        <button
          onClick={() => navigate('/parent/messages')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 relative transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadMsgCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-[8px] font-bold">
              {unreadMsgCount}
            </span>
          )}
        </button>

        {/* Alert Notifications */}
        <button
          onClick={() => navigate('/parent/notifications')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 relative transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
              {unreadNotifCount}
            </span>
          )}
        </button>
      </div>

      {/* Sibling Quick Switch Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSwitchModal(false)} />
          <div className="relative bg-card w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 border border-border shadow-2xl animate-in slide-in-from-bottom duration-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Switch Sibling</h3>
            <div className="space-y-2">
              {user?.linkedChildren.map(c => {
                const isActive = c.id === selectedChildId;
                return (
                  <button
                    key={c.id}
                    onClick={() => { changeSelectedChild(c.id); setShowSwitchModal(false); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      isActive ? 'bg-primary/5 border-primary' : 'bg-slate-50/50 dark:bg-slate-900/50 border-border hover:border-primary/20'
                    }`}
                  >
                    <img src={c.photo} alt={c.name} className="w-10 h-10 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{c.class} - {c.section} • Roll #{c.rollNo}</p>
                    </div>
                    {isActive && <Check className="w-4.5 h-4.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowSwitchModal(false)}
              className="w-full mt-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

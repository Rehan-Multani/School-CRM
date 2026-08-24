import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  RotateCcw, 
  Layers, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export const UnifiedDemoBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { store, resetStore } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine current active portal
  const path = location.pathname;
  let activeRole = 'Guest';
  if (path.startsWith('/student')) activeRole = 'Student';
  else if (path.startsWith('/teacher')) activeRole = 'Teacher';
  else if (path.startsWith('/parent')) activeRole = 'Parent';
  else if (path.startsWith('/school-admin')) activeRole = 'School Admin';
  else if (path.startsWith('/principal')) activeRole = 'Principal';
  else if (path.startsWith('/accountant')) activeRole = 'Accountant';
  else if (path.startsWith('/hr')) activeRole = 'HR Staff';
  else if (path.startsWith('/librarian')) activeRole = 'Librarian';
  else if (path.startsWith('/transport')) activeRole = 'Transport';
  else if (path.startsWith('/super-admin')) activeRole = 'Super Admin';

  const ROLES = [
    { role: 'Student', path: '/student/dashboard', userKey: 'student-user', defaultUser: store.auth.users.find(u => u.role === 'student'), badge: 'bg-emerald-500' },
    { role: 'Teacher', path: '/teacher/dashboard', userKey: 'teacher-user', defaultUser: store.auth.users.find(u => u.role === 'teacher'), badge: 'bg-blue-500' },
    { role: 'Parent', path: '/parent/dashboard', userKey: 'parent-user', defaultUser: store.auth.users.find(u => u.role === 'parent'), badge: 'bg-purple-500' },
    { role: 'School Admin', path: '/school-admin/dashboard', userKey: 'school-admin-user', defaultUser: store.auth.users.find(u => u.role === 'school-admin'), badge: 'bg-indigo-500' },
    { role: 'Principal', path: '/principal/dashboard', userKey: 'principal-user', defaultUser: store.auth.users.find(u => u.role === 'principal'), badge: 'bg-amber-500' },
    { role: 'Accountant', path: '/accountant/dashboard', userKey: 'accountant-user', defaultUser: store.auth.users.find(u => u.role === 'accountant'), badge: 'bg-teal-500' },
    { role: 'HR Staff', path: '/hr/dashboard', userKey: 'hr-user', defaultUser: store.auth.users.find(u => u.role === 'hr'), badge: 'bg-rose-500' },
    { role: 'Librarian', path: '/librarian/dashboard', userKey: 'librarian_user', defaultUser: store.auth.users.find(u => u.role === 'librarian'), badge: 'bg-cyan-500' },
    { role: 'Transport', path: '/transport/dashboard', userKey: 'transport_user', defaultUser: store.auth.users.find(u => u.role === 'transport'), badge: 'bg-orange-500' },
    { role: 'Super Admin', path: '/super-admin/dashboard', userKey: 'super_admin_user', defaultUser: store.auth.users.find(u => u.role === 'super-admin'), badge: 'bg-slate-700' }
  ];

  const handleSwitchRole = (item) => {
    if (item.defaultUser) {
      localStorage.setItem(item.userKey, JSON.stringify(item.defaultUser));
      if (item.role === 'Parent' && item.defaultUser.children) {
        localStorage.setItem('parent-selected-child', item.defaultUser.children[0]);
      }
    }
    navigate(item.path);
  };

  const handleReset = () => {
    if (window.confirm('Reset all shared data (students, admissions, fees, attendance, library, etc.) back to initial standard seed data?')) {
      resetStore();
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans print:hidden">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-2xl p-2.5 text-white max-w-sm sm:max-w-md transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 px-2 py-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-200">
              Active Portal: <strong className="text-indigo-400 font-extrabold">{activeRole}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/login')}
              title="Central Universal Login"
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg text-slate-300 flex items-center gap-1 transition-all"
            >
              <span>Login</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reset shared state to default"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-[10px] transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-[10px] transition-all"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded 10-Role Quick Selector */}
        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              <span>Switch Live Role (Synchronized State)</span>
              <span className="text-indigo-400">10 Portals</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {ROLES.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSwitchRole(r)}
                  className={`p-1.5 rounded-lg border text-left text-[11px] font-bold transition-all truncate flex items-center gap-1.5 ${
                    activeRole === r.role 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${r.badge}`} />
                  <span className="truncate">{r.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

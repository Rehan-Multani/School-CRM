import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  School,
  CreditCard,
  Bell,
  DollarSign,
  Receipt,
  FileText,
  Scale,
  LifeBuoy,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useSuperAdminAuth } from '../../context/SuperAdminAuthContext';
import { cn } from '../ui/Button';
import BrandLogo from '../../../../shared/ui/BrandLogo';

const menuItems = [
  { name: 'Dashboard', path: '/super-admin/dashboard', icon: LayoutDashboard },
  { name: 'Schools', path: '/super-admin/schools', icon: School },
  { name: 'Subscription', path: '/super-admin/subscriptions', icon: CreditCard },
  { name: 'Notifications', path: '/super-admin/notifications', icon: Bell },
  { name: 'Revenue', path: '/super-admin/revenue', icon: DollarSign },
  { name: 'Billings', path: '/super-admin/billing', icon: Receipt },
  { name: 'Reports', path: '/super-admin/reports', icon: FileText },
  { name: 'Privacy & Policy', path: '/super-admin/privacy-policy', icon: Scale },
  { name: 'Help & Support', path: '/super-admin/support', icon: LifeBuoy },
  { name: 'Settings', path: '/super-admin/settings', icon: Settings },
];

export const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { admin, logout } = useSuperAdminAuth();
  const navigate = useNavigate();

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <motion.aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen bg-white dark:bg-slate-950/95 border-r border-slate-200 dark:border-slate-900 flex flex-col justify-between py-4 select-none',
        isCollapsed ? 'w-16' : 'w-64'
      )}
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar px-3">
        <div className={cn(
          'flex mb-6 px-2 transition-all duration-300',
          isCollapsed ? 'flex-col items-center gap-3' : 'items-center justify-between'
        )}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <BrandLogo className="h-9 w-9" />
              <span className="flex flex-col leading-tight">
                <span className="font-bold text-foreground dark:text-white text-md tracking-wider">School CRM</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide">Superadmin Panel</span>
              </span>
            </motion.div>
          )}
          {isCollapsed && (
            <BrandLogo className="h-8 w-8" />
          )}
          <button
            onClick={handleToggle}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-100 dark:border-slate-900 text-slate-400 hover:text-foreground dark:hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <div className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center transition-all duration-200 group relative',
                  isCollapsed ? 'justify-center p-2 rounded-lg' : 'gap-3 px-3 py-2 rounded-lg text-sm',
                  isActive
                    ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-foreground dark:hover:text-slate-100'
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {item.name}
                </motion.span>
              )}
              {isCollapsed && (
                <div className="absolute left-14 bg-slate-950 border border-slate-800 text-slate-100 text-xs px-2.5 py-1.5 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap">
                  {item.name}
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="px-3 border-t border-border dark:border-slate-900/60 pt-4 mt-auto">
        <div className={cn('flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-border dark:border-slate-900/60', isCollapsed && 'justify-center')}>
          <img
            src={admin?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60'}
            alt="Avatar"
            className="w-8 h-8 rounded-full border border-border dark:border-slate-800"
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground dark:text-slate-200 truncate">{admin?.name || 'Chirag J.'}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{admin?.role || 'Super Admin'}</p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={() => { logout(); navigate('/super-admin/login'); }}
              className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-450 transition-colors p-1"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

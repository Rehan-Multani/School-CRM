import React from 'react';
import { cn } from '../lib/cn';

// Canonical merged Badge — superset of every variant used across gen-1
// (student/teacher/parent) and gen-2 (HR/accountant/librarian/principal/
// school-admin/transport) modules.
export const Badge = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    primary: 'bg-primary/10 text-primary border border-primary/20',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30',
    info: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/30',
    secondary: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    cyan: 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide select-none shrink-0 transition-colors duration-150",
      variants[variant] || variants.default,
      className
    )}>
      {children}
    </span>
  );
};

export default Badge;

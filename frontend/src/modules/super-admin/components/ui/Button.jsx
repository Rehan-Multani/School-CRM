import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => {
  return twMerge(clsx(inputs));
};

export const Button = React.forwardRef(({ className, variant = 'primary', size = 'default', children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
        {
          // Variants
          'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20': variant === 'primary',
          'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700': variant === 'secondary',
          'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20': variant === 'destructive',
          'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200': variant === 'ghost',
          'text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline-offset-4 hover:underline': variant === 'link',
          // Sizes
          'px-4 py-2 text-sm': size === 'default',
          'px-3 py-1.5 text-xs': size === 'sm',
          'px-6 py-3 text-base': size === 'lg',
          'p-2': size === 'icon',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export const Badge = ({ className, variant = 'default', children, ...props }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide border',
        {
          'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700': variant === 'default',
          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20': variant === 'success' || variant === 'Active' || variant === 'Paid',
          'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20': variant === 'warning' || variant === 'Trial' || variant === 'Pending Approval' || variant === 'Pending',
          'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20': variant === 'danger' || variant === 'Expired' || variant === 'Suspended' || variant === 'Failed' || variant === 'Cancelled' || variant === 'Overdue',
          'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20': variant === 'info' || variant === 'Enterprise',
          'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20': variant === 'Growth',
          'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20': variant === 'Basic' || variant === 'Refunded',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export const Card = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-lg p-5 transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700/80',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

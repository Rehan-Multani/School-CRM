import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => {
  return twMerge(clsx(inputs));
};

export const Button = React.forwardRef(
  ({ className, variant = 'primary', size = 'default', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'group relative inline-flex items-center justify-center font-semibold select-none rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none active:scale-[0.98] cursor-pointer',
          {
            // Primary - Vibrant indigo gradient with top border highlight & ambient glow
            'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_2px_10px_-2px_rgba(79,70,229,0.35)] hover:from-indigo-600 hover:to-indigo-700 hover:shadow-[0_4px_16px_-2px_rgba(79,70,229,0.45)] hover:-translate-y-0.5 active:translate-y-0 border border-indigo-400/30':
              variant === 'primary',

            // Secondary - Crisp elevated white/dark pill with clean border & subtle hover elevation
            'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0':
              variant === 'secondary',

            // Destructive - Crimson gradient with top highlight & glow
            'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_2px_10px_-2px_rgba(225,29,72,0.35)] hover:from-rose-600 hover:to-rose-700 hover:shadow-[0_4px_16px_-2px_rgba(225,29,72,0.45)] hover:-translate-y-0.5 active:translate-y-0 border border-rose-400/30':
              variant === 'destructive',

            // Success - Emerald gradient for approvals, activations
            'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_2px_10px_-2px_rgba(16,185,129,0.35)] hover:from-emerald-600 hover:to-emerald-700 hover:shadow-[0_4px_16px_-2px_rgba(16,185,129,0.45)] hover:-translate-y-0.5 active:translate-y-0 border border-emerald-400/30':
              variant === 'success',

            // Outline - Clean tinted border & smooth fill on hover
            'bg-transparent border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700':
              variant === 'outline',

            // Ghost - Sleek flat button with clean hover state
            'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100':
              variant === 'ghost',

            // Link
            'text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline-offset-4 hover:underline p-0 h-auto font-medium shadow-none':
              variant === 'link',

            // Sizes
            'h-10 px-4 py-2 text-sm tracking-tight gap-2': size === 'default',
            'h-8.5 px-3.5 py-1.5 text-xs tracking-wide gap-1.5': size === 'sm',
            'h-7 px-2.5 text-[11px] font-semibold rounded-lg gap-1': size === 'xs',
            'h-12 px-6 py-3 text-base tracking-tight gap-2.5 rounded-2xl': size === 'lg',
            'h-9 w-9 p-0 rounded-xl': size === 'icon',
            'h-8 w-8 p-0 rounded-lg': size === 'icon-sm',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

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
          'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20': variant === 'info' || variant === 'Enterprise' || variant === 'Enterprise Plan',
          'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20': variant === 'Growth' || variant === 'Growth Plan',
          'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20': variant === 'Basic' || variant === 'Basic Plan' || variant === 'Refunded',
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

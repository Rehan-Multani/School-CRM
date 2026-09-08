import React from 'react';
import { cn } from './Button';

export const Input = React.forwardRef(({ className, type = 'text', label, error, ...props }, ref) => {
  return (
    <div className="w-full space-y-1">
      {label && <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>}
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 ring-offset-background placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200',
          error && 'border-rose-500 focus-visible:ring-rose-500/30 focus-visible:border-rose-500',
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
});

export const Select = React.forwardRef(({ className, wrapperClassName, label, error, children, ...props }, ref) => {
  return (
    <div className={cn('w-full space-y-1', wrapperClassName)}>
      {label && <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>}
      <select
        className={cn(
          'flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%2394a3b8%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E")] bg-[size:1.25rem_1.25rem] bg-[position:right_0.5rem_center] bg-no-repeat pr-10 transition-colors duration-200',
          error && 'border-rose-500',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
});

export const Textarea = React.forwardRef(({ className, label, error, ...props }, ref) => {
  return (
    <div className="w-full space-y-1">
      {label && <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>}
      <textarea
        className={cn(
          'flex min-h-[120px] w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 ring-offset-background placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 resize-y',
          error && 'border-rose-500 focus-visible:ring-rose-500/30 focus-visible:border-rose-500',
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
});

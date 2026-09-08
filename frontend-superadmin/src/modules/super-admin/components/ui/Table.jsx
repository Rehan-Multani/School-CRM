import React from 'react';
import { cn } from './Button';

export const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-950">
    <table ref={ref} className={cn('w-full caption-bottom text-xs', className)} {...props} />
  </div>
));

export const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60', className)}
    {...props}
  />
));

export const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('divide-y divide-slate-100 dark:divide-slate-800/80 font-medium', className)} {...props} />
));

export const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50 data-[state=selected]:bg-slate-100 dark:data-[state=selected]:bg-slate-800',
      className
    )}
    {...props}
  />
));

export const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-11 px-3.5 text-left align-middle text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400',
      className
    )}
    {...props}
  />
));

export const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td ref={ref} className={cn('px-3.5 py-3 align-middle text-slate-800 dark:text-slate-200 text-xs', className)} {...props} />
));

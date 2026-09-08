import React from 'react';
import { cn } from './Button';

export function Pulse({ className, style, ...props }) {
  return (
    <div
      style={style}
      className={cn(
        'animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800/80 transition-colors',
        className
      )}
      {...props}
    />
  );
}

export const SkeletonLoader = ({ className, count = 1, ...props }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Pulse key={i} className={cn('h-4 w-full', className)} {...props} />
      ))}
    </>
  );
};

export function KpiSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 mr-3">
              <Pulse className="h-3 w-20" />
              <Pulse className="h-7 w-24" />
            </div>
            <Pulse className="h-10 w-10 rounded-xl shrink-0" />
          </div>
          <Pulse className="h-2.5 w-16 opacity-60" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
        <Pulse className="h-3 w-16" />
        <Pulse className="h-3 w-12" />
        <Pulse className="h-3 w-16" />
        <Pulse className="h-3 w-12" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between py-2.5 border-b border-slate-100/70 dark:border-slate-800/40">
          <div className="space-y-1.5 flex-1 pr-4">
            <Pulse className="h-3.5 w-32" />
            <Pulse className="h-2.5 w-20 opacity-60" />
          </div>
          <Pulse className="h-4 w-16 rounded-md mr-4" />
          <Pulse className="h-3 w-20 mr-4" />
          <Pulse className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ActivitySkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Pulse className="h-9 w-9 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Pulse className="h-3.5 w-48" />
              <Pulse className="h-2.5 w-24 opacity-60" />
            </div>
          </div>
          <Pulse className="h-5 w-14 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

export const EmptyState = ({ title, description, icon: Icon, action }) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-950/20 max-w-lg mx-auto">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-500 dark:text-indigo-400 mb-4">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

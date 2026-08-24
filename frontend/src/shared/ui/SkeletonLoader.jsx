import React from 'react';
import { cn } from '../lib/cn';

// 1. Primitive Base Skeleton
export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70 transition-colors',
        className
      )}
      {...props}
    />
  );
};

// 2. Text Skeleton
export const SkeletonText = ({ lines = 2, className, lineClassName }) => {
  return (
    <div className={cn('space-y-2 w-full', className)}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          className={cn(
            'h-3.5',
            idx === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full',
            lineClassName
          )}
        />
      ))}
    </div>
  );
};

// 3. Avatar Skeleton
export const SkeletonAvatar = ({ size = 'md', shape = 'circle', className }) => {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  };

  return (
    <Skeleton
      className={cn(
        sizeClasses[size] || sizeClasses.md,
        shape === 'circle' ? 'rounded-full' : 'rounded-2xl',
        'shrink-0',
        className
      )}
    />
  );
};

// 4. Button Skeleton
export const SkeletonButton = ({ className, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-28',
    lg: 'h-12 w-36',
  };

  return (
    <Skeleton
      className={cn('rounded-xl', sizeClasses[size] || sizeClasses.md, className)}
    />
  );
};

// 5. Stat Card Skeleton (Matches exact dimensions of StatCard component)
export const SkeletonStatCard = ({ className }) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1 mr-3">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-7 w-3/5" />
        </div>
        <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
};

// 6. Generic Card Skeleton
export const SkeletonCard = ({ className, children }) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4',
        className
      )}
    >
      {children || (
        <>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        </>
      )}
    </div>
  );
};

// 7. Table Row Skeleton
export const SkeletonTableRow = ({ columns = 5, className }) => {
  return (
    <tr className={cn('border-b border-slate-100 dark:border-slate-800', className)}>
      {Array.from({ length: columns }).map((_, idx) => (
        <td key={idx} className="px-5 py-4">
          <Skeleton
            className={cn(
              'h-4',
              idx === 0 ? 'w-4/5' : idx === columns - 1 ? 'w-16 ml-auto' : 'w-3/5'
            )}
          />
        </td>
      ))}
    </tr>
  );
};

// 8. Table Skeleton
export const SkeletonTable = ({ rows = 5, columns = 5, className }) => {
  return (
    <div
      className={cn(
        'rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              {Array.from({ length: columns }).map((_, idx) => (
                <th key={idx} className="px-5 py-4">
                  <Skeleton className="h-3.5 w-24" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: rows }).map((_, idx) => (
              <SkeletonTableRow key={idx} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 9. Form Skeleton
export const SkeletonForm = ({ fields = 4, className }) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6',
        className
      )}
    >
      <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-80" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, idx) => (
          <div key={idx} className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
};

// 10. List Skeleton
export const SkeletonList = ({ count = 4, className }) => {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <SkeletonAvatar size="md" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
};

// 11. Profile / Detail Header Skeleton
export const SkeletonProfile = ({ className }) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SkeletonAvatar size="xl" shape="rounded" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-64" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl space-y-1.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
};

// 12. Full Dashboard Composite Skeleton
export const DashboardSkeleton = () => {
  return (
    <div className="space-y-8 pb-12 animate-in fade-in-50 duration-300">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* 8 Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, idx) => (
          <SkeletonStatCard key={idx} />
        ))}
      </div>

      {/* 4 Module Pulse Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-xl" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-3.5 w-3.5" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Quick Actions Hub */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-36" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-2"
            >
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* 6 Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
};

// 13. Full Table Page Composite Skeleton
export const TablePageSkeleton = ({
  columns = 6,
  rows = 6,
  hasHeader = true,
  hasFilters = true,
  hasTabs = false,
}) => {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {hasHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-3.5 w-96" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      )}

      {hasTabs && (
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-9 w-28 rounded-xl" />
          ))}
        </div>
      )}

      {hasFilters && (
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-10 w-72 rounded-xl" />
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      )}

      <SkeletonTable rows={rows} columns={columns} />
    </div>
  );
};

// 14. Full Detail Page Composite Skeleton
export const DetailPageSkeleton = () => {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Top Profile Header */}
      <SkeletonProfile />

      {/* Tab bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-9 w-28 rounded-xl" />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonTable rows={4} columns={4} />
        </div>
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
};

// Backward Compatibility Wrapper
export const SkeletonLoader = ({ variant, type, rows, lines, count, className }) => {
  const kind = variant || type || 'card';
  const repeat = rows ?? lines ?? count ?? 1;

  switch (kind) {
    case 'table':
      return <SkeletonTable rows={repeat} className={className} />;
    case 'table-row':
      return (
        <>
          {Array.from({ length: repeat }).map((_, i) => (
            <SkeletonTableRow key={i} className={className} />
          ))}
        </>
      );
    case 'stat':
      return (
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
          {Array.from({ length: repeat }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      );
    case 'text':
      return <SkeletonText lines={repeat} className={className} />;
    case 'list':
      return <SkeletonList count={repeat} className={className} />;
    case 'avatar':
      return <SkeletonAvatar className={className} />;
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'form':
      return <SkeletonForm fields={repeat} className={className} />;
    case 'card':
    default:
      return (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5', className)}>
          {Array.from({ length: repeat }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
  }
};

export default SkeletonLoader;

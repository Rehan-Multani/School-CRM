import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Clock } from 'lucide-react';

export const HomeworkMonitor = () => {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Homework" 
        subtitle="Homework and assignment management"
      />

      <div className="flex min-h-[380px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Clock className="h-7 w-7 animate-pulse text-primary" />
        </div>
        <h2 className="text-xl font-black text-slate-800 dark:text-white">Working</h2>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          This module is currently in progress.
        </p>
      </div>
    </div>
  );
};

export default HomeworkMonitor;

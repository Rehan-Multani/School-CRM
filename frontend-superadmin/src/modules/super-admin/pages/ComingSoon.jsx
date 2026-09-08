import React, { useEffect } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Placeholder for platform modules that are on the roadmap but have no
 * backend yet (Platform Users, Audit Logs, System Management).
 * Rendered inside the authenticated SuperAdminLayout shell.
 */
export default function ComingSoon({ title = 'Coming soon', description }) {
  useEffect(() => {
    document.title = `${title} | Super Admin`;
  }, [title]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center rounded-2xl border border-slate-200 bg-white px-8 py-12 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {description || 'This module is not available yet. It will be enabled in an upcoming release.'}
        </p>
        <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
          Coming soon
        </span>
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Users } from 'lucide-react';

/**
 * Student seats of the school's plan: "120 of 500 students used".
 * The server is the one that refuses an add over the limit (403 PLAN_LIMIT_REACHED);
 * this only shows the number and greys out the Add button when the plan is full.
 *
 * `fetchUsage` returns the API body `{ data: { students: { used, limit }, planName } }`.
 */
export function useSeatUsage(fetchUsage) {
  const [usage, setUsage] = useState(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetchUsage();
      setUsage(res?.data || null);
    } catch {
      /* the banner is optional - never block the page on it */
    }
  }, [fetchUsage]);

  useEffect(() => {
    reload();
  }, [reload]);

  const limit = usage?.students?.limit ?? null;
  const used = usage?.students?.used ?? 0;
  return { usage, reload, used, limit, full: limit !== null && used >= limit };
}

export function SeatUsageBanner({ usage }) {
  const limit = usage?.students?.limit;
  if (!limit) return null;
  const used = usage.students.used || 0;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const full = used >= limit;
  const near = !full && pct >= 90;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
        full
          ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200'
          : near
            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'
            : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
      }`}
    >
      {full || near ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Users className="h-4 w-4 shrink-0 text-primary" />}
      <div className="min-w-0 flex-1">
        <div className="font-bold">
          {used.toLocaleString('en-IN')} of {limit.toLocaleString('en-IN')} students
          {usage.planName ? <span className="font-medium opacity-70"> · {usage.planName}</span> : null}
        </div>
        {full ? (
          <div className="text-xs">Your plan is full. Upgrade the plan to add more students.</div>
        ) : near ? (
          <div className="text-xs">Almost full - {limit - used} seat(s) left.</div>
        ) : null}
      </div>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${full ? 'bg-rose-500' : near ? 'bg-amber-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Card, cn } from '../ui/Button';
import { Pulse } from '../ui/SkeletonLoader';

export const KPI_ICON_TONES = {
  indigo: 'bg-indigo-600 shadow-indigo-600/25',
  emerald: 'bg-emerald-600 shadow-emerald-600/25',
  violet: 'bg-violet-600 shadow-violet-600/25',
  sky: 'bg-sky-600 shadow-sky-600/25',
  amber: 'bg-amber-500 shadow-amber-500/25',
  rose: 'bg-rose-600 shadow-rose-600/25',
};

export function KpiIcon({ icon: Icon, tone = 'indigo', className }) {
  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md',
        KPI_ICON_TONES[tone] || KPI_ICON_TONES.indigo,
        className
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </div>
  );
}

export const StatCard = ({ title, value, change, trend = 'up', hint, icon: Icon, tone = 'indigo', to, loading }) => {
  const card = (
    <Card
      className={cn(
        'flex h-full items-start justify-between gap-3 hover:scale-[1.01] transition-transform duration-200',
        to && 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/50'
      )}
    >
      <div className="min-w-0 space-y-2 flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        {loading ? (
          <div className="space-y-2 pt-0.5">
            <Pulse className="h-7 w-28 rounded-xl" />
            {(hint || change) ? (
              <Pulse className="h-3 w-20 rounded" />
            ) : (
              <Pulse className="h-2.5 w-16 rounded opacity-50" />
            )}
          </div>
        ) : (
          <>
            <h3 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</h3>
            {change && (
              <div className="flex items-center gap-1">
                <span className={`text-xs font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {trend === 'up' ? '+' : '-'}
                  {change}
                </span>
                <span className="text-[10px] text-slate-500">vs last month</span>
              </div>
            )}
            {hint && <p className="text-xs text-slate-500">{hint}</p>}
          </>
        )}
      </div>
      {Icon && (
        loading ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500 animate-pulse">
            <Icon className="h-5 w-5 opacity-30" strokeWidth={2} />
          </div>
        ) : (
          <KpiIcon icon={Icon} tone={tone} />
        )
      )}
    </Card>
  );

  if (!to) return card;

  return (
    <Link to={to} className="block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40">
      {card}
    </Link>
  );
};

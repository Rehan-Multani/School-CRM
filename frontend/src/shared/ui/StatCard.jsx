import React from 'react';
import { cn } from '../lib/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Canonical merged StatCard — superset of gen-2 (HR/accountant/librarian/
// principal/school-admin/transport, prop names `subtitle`/`trend` as a
// signed string e.g. "+12%") and gen-1 (student/teacher/parent, prop names
// `subtext`/`colorClass`/`onClick`, no trend). Both `subtitle`/`subtext`
// and `trend`/`trendType` are accepted as aliases; `colorClass` lets a
// caller override the icon chip color (gen-1 style), otherwise it falls
// back to a neutral indigo chip (gen-2 style).
export const StatCard = ({
  title,
  value,
  subtitle,
  subtext,
  icon: Icon,
  trend,
  trendType,
  colorClass,
  onClick,
  className,
}) => {
  const isPositive = trendType ? trendType === 'up' : !(trend && String(trend).startsWith('-'));
  const footerText = subtitle ?? subtext;

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between",
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block truncate">
            {title}
          </span>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none pt-1 truncate">
            {value}
          </h3>
        </div>
        {Icon && (
          <div className={cn(
            "p-3 rounded-2xl shrink-0",
            colorClass ? cn(colorClass, "text-white") : "bg-primary/10 text-primary"
          )}>
            <Icon className="w-5 h-5 shrink-0" />
          </div>
        )}
      </div>

      {(footerText || trend) && (
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          {trend && (
            <span className={cn(
              "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold leading-none shrink-0",
              isPositive
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
            )}>
              {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              <span>{trend}</span>
            </span>
          )}
          {footerText && (
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
              {footerText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;

import React from 'react';

/**
 * Premium floating mini-card for Hero and product visual previews.
 * Features glassmorphism, glowing micro-accents, and subtle float classes.
 */
export const FloatingCard = ({
  icon: Icon,
  title,
  subtitle,
  value,
  trend,
  trendPositive = true,
  badgeText,
  colorScheme = 'indigo', // indigo, emerald, amber, rose, cyan, violet
  className = '',
  animationClass = 'animate-float-slow',
}) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      dot: 'bg-indigo-500',
      pill: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300',
      badge: 'border-indigo-200 dark:border-indigo-800',
    },
    emerald: {
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-500',
      pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
      badge: 'border-emerald-200 dark:border-emerald-800',
    },
    amber: {
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      dot: 'bg-amber-500',
      pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
      badge: 'border-amber-200 dark:border-amber-800',
    },
    rose: {
      bg: 'bg-indigo-600/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      dot: 'bg-indigo-600',
      pill: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
      badge: 'border-rose-200 dark:border-rose-800',
    },
    cyan: {
      bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      dot: 'bg-cyan-500',
      pill: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300',
      badge: 'border-cyan-200 dark:border-cyan-800',
    },
    violet: {
      bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
      dot: 'bg-violet-500',
      pill: 'bg-violet-50 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300',
      badge: 'border-violet-200 dark:border-violet-800',
    },
  };

  const scheme = colorMap[colorScheme] || colorMap.indigo;

  return (
    <div
      className={`group relative rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-xl shadow-slate-900/5 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 dark:border-slate-800/90 dark:bg-indigo-600/90 dark:shadow-black/40 ${animationClass} ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${scheme.bg} transition-transform group-hover:scale-105`}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <h4 className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
              {title}
            </h4>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                {value}
              </span>
              {trend && (
                <span
                  className={`text-[10px] font-bold ${
                    trendPositive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {trend}
                </span>
              )}
            </div>
          </div>
        </div>

        {badgeText && (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${scheme.pill} ${scheme.badge}`}
          >
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1.5 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default FloatingCard;



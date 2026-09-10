ï»¿import React from 'react';

/**
 * Premium pill/eyebrow badge with soft gradient border and glowing bullet indicator.
 */
export const GradientBadge = ({
  icon: Icon,
  children,
  className = '',
  dot = true,
  dotColor = 'bg-emerald-500',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 via-white/90 to-purple-50/80 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 shadow-sm shadow-indigo-500/5 backdrop-blur-md dark:border-indigo-500/30 dark:bg-gradient-to-r dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-purple-950/40 dark:text-indigo-300 ${className}`}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColor}`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`}
          />
        </span>
      )}
      {Icon && <Icon className="h-3.5 w-3.5 text-indigo-500" />}
      <span>{children}</span>
    </span>
  );
};

export default GradientBadge;


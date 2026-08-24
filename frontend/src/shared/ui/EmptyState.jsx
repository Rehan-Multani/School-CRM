import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../lib/cn';

// Canonical merged EmptyState — superset of student's simpler version
// (no action button, no className passthrough) and teacher/parent's
// richer version (optional `action`/`actionLabel` CTA button, className).
export const EmptyState = ({
  title = 'Nothing here yet',
  description = '',
  icon: Icon = Inbox,
  action,
  actionLabel,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="p-5 bg-slate-100 dark:bg-slate-800/60 rounded-3xl text-slate-400 dark:text-slate-500 mb-5">
        <Icon className="w-10 h-10" />
      </div>
      <h3 className="text-sm font-bold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-5 px-5 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-hover active:scale-95 transition-all duration-150 select-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

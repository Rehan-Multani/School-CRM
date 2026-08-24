import React from 'react';

// Canonical merged PageHeader — near-identical across all six gen-2
// modules; only cosmetic spacing/weight differed.
export const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;

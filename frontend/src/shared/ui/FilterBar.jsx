import React from 'react';
import { cn } from '../lib/cn';

// Canonical FilterBar — byte-identical between teacher and parent.
export const FilterBar = ({ filters, active, onChange, className }) => {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto no-scrollbar pb-1", className)}>
      {filters.map((filter) => {
        const isActive = active === filter.value;
        return (
          <button
            key={filter.value}
            onClick={() => onChange(filter.value)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-[11px] font-bold tracking-wide whitespace-nowrap transition-all duration-150 select-none shrink-0",
              isActive
                ? "bg-primary text-white shadow-premium"
                : "bg-card border border-border text-slate-600 dark:text-slate-400 hover:border-primary/30 hover:text-primary"
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
};

export default FilterBar;

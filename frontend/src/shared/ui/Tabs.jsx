import React from 'react';
import { cn } from '../lib/cn';

// Canonical merged Tabs — superset of all six gen-2 modules. Includes the
// optional `tab.count` badge (used by principal/transport) on top of the
// plain label style (used by HR/accountant/librarian).
export const Tabs = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={cn("border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-4 py-2.5 text-xs font-bold tracking-wide border-b-2 transition-all whitespace-nowrap -mb-px shrink-0 select-none",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;

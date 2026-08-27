import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function AcademicBreadcrumb({ items = [] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs font-semibold text-slate-400">
      <Link to="/principal/academics/years" className="hover:text-primary">
        Academic
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            <ChevronRight className="h-3 w-3 shrink-0" />
            {isLast || !item.to ? (
              <span className="font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
            ) : (
              <Link to={item.to} className="hover:text-primary">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function CountCards({ items = [] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{item.value ?? 0}</p>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-950/40">
      <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
      {description && <p className="mt-1 max-w-md text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

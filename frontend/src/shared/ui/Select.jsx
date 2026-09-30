import React from 'react';
import { cn } from '../lib/cn';

// Canonical merged Select — superset of all six gen-2 modules.
// `onChange` is always called with the raw *value* (not the event), which
// matches HR/accountant/librarian/principal/transport; school-admin's
// version passed the raw event instead, but a repo-wide grep found zero
// consumers of school-admin's Select, so there was no real call-site to
// preserve and the majority behavior was kept.
// Also folds in `placeholder` (librarian/transport) and `error` (transport).
export const Select = ({ label, options, value, onChange, className, placeholder, error, ...props }) => {
  const handleChange = (e) => onChange && onChange(e.target.value);

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={handleChange}
        className={cn(
          "w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors cursor-pointer",
          error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-rose-500 font-medium">{error}</p>
      )}
    </div>
  );
};

export default Select;

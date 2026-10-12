import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const MAX_VISIBLE = 150; // a village list can have thousands; render only the best matches

const norm = (v) => String(v ?? '').toLowerCase().trim();

/**
 * A select you can type into. Replaces a long native <select>.
 *
 *   options      string[] or { value, label }[]
 *   value        the selected value ('' = none)
 *   onChange     (value) => void
 *   pinned       { value, label }[] — always shown at the bottom, even while searching
 *                (e.g. "Other (type manually)")
 *   inputClass   the form's own input class, so it looks like its neighbours
 */
export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select',
  searchPlaceholder = 'Type to search…',
  disabled = false,
  pinned = [],
  inputClass = '',
  clearable = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const list = useMemo(
    () => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
    [options]
  );
  const selected =
    list.find((o) => o.value === value) || pinned.find((o) => o.value === value) || (value ? { value, label: value } : null);

  const matches = useMemo(() => {
    const q = norm(query);
    if (!q) return list;
    const starts = [];
    const contains = [];
    for (const o of list) {
      const l = norm(o.label);
      if (l.startsWith(q)) starts.push(o);
      else if (l.includes(q)) contains.push(o);
    }
    return [...starts, ...contains];
  }, [list, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      const id = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open]);

  const pick = (v) => {
    onChange?.(v);
    setOpen(false);
  };

  const shown = matches.slice(0, MAX_VISIBLE);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${inputClass} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400'}`}>{selected ? selected.label : placeholder}</span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && selected && !disabled ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              onClick={(e) => {
                e.stopPropagation();
                pick('');
              }}
              className="rounded p-0.5 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full min-w-[12rem] rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setOpen(false);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (shown[0]) pick(shown[0].value);
                }
              }}
              placeholder={searchPlaceholder}
              className="h-10 w-full bg-transparent text-sm outline-none dark:text-white"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {shown.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">No match</li>
            ) : (
              shown.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    onClick={() => pick(o.value)}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-slate-800 ${
                      o.value === value ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-slate-800' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
            {matches.length > MAX_VISIBLE ? (
              <li className="px-3 py-1.5 text-xs text-slate-400">Showing {MAX_VISIBLE} of {matches.length} — keep typing to narrow down</li>
            ) : null}
          </ul>
          {pinned.length ? (
            <div className="border-t border-slate-100 py-1 dark:border-slate-800">
              {pinned.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => pick(o.value)}
                  className="block w-full px-3 py-2 text-left text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800"
                >
                  {o.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Database, X } from 'lucide-react';

const DISMISS_KEY = 'dataCareNoticeDismissed';

const wasDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Friendly "tidy up your old data" tip for the School Admin / Principal
 * dashboard. The server decides when to show it (Super Admin's MB setting) and
 * sends only the wording - there are no numbers and no plan talk here.
 * Closing it hides it for this sign-in session only.
 *
 * `fetchNotice` returns `{ data: { show, title, message } }`.
 */
export function DataCareNotice({ fetchNotice }) {
  const [notice, setNotice] = useState(null);
  const [closed, setClosed] = useState(wasDismissed);

  useEffect(() => {
    if (closed) return undefined;
    let alive = true;
    fetchNotice()
      .then((res) => {
        if (alive && res?.data?.show) setNotice(res.data);
      })
      .catch(() => {
        /* optional banner - never get in the dashboard's way */
      });
    return () => {
      alive = false;
    };
  }, [fetchNotice, closed]);

  if (!notice || closed) return null;

  const close = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setClosed(true);
  };

  return (
    <div
      role="status"
      className="flex items-start gap-4 rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50 p-5 shadow-sm dark:border-sky-900/50 dark:from-sky-950/30 dark:to-indigo-950/30"
    >
      <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-600 dark:text-sky-400">
        <Database className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{notice.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{notice.message}</p>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss"
        className="rounded-xl p-1.5 text-slate-400 transition hover:bg-white/70 hover:text-slate-600 dark:hover:bg-slate-800"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

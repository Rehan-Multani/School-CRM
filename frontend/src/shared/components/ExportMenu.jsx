import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2, Table2 } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF, safeFileName } from '../lib/exportHelpers';

/**
 * One Export button -> Excel / PDF / CSV, used by every table and report.
 *
 *   getRows():  returns the rows to export, as plain `{ Column: value }` objects.
 *               Called on click so it always reflects the current filters/search.
 *   title:      document heading (PDF) and sheet name (Excel)
 *   subtitle:   optional line under the heading, e.g. "Class 10 · Overdue only"
 *   filename:   base name without extension
 */
export const ExportMenu = ({
  getRows,
  title = 'Report',
  subtitle = '',
  filename,
  disabled = false,
  className = '',
  label = 'Export',
  onExported,
  onError,
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const base = safeFileName(filename || title);
  const day = new Date().toISOString().slice(0, 10);

  const run = async (kind) => {
    setOpen(false);
    setBusy(kind);
    try {
      // getRows may be async (e.g. fetching every page of a server-paged list).
      const rows = (await getRows?.()) || [];
      if (!rows.length) {
        onError?.('Nothing to export — no records match the current filters.');
        return;
      }
      if (kind === 'excel') await exportToExcel([{ name: title, data: rows }], `${base}_${day}.xlsx`);
      else if (kind === 'pdf') await exportToPDF({ rows, title, subtitle, filename: `${base}_${day}.pdf` });
      else exportToCSV(rows, `${base}_${day}.csv`);
      onExported?.(kind, rows.length);
    } catch (err) {
      onError?.(err?.message || 'Export failed');
    } finally {
      setBusy('');
    }
  };

  const item =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800';

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled || Boolean(busy)}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          className ||
          'inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-indigo-600 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 cursor-pointer'
        }
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        <span>{label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <button type="button" role="menuitem" className={item} onClick={() => run('excel')}>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => run('pdf')}>
            <FileText className="h-4 w-4 text-rose-600" /> PDF
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => run('csv')}>
            <Table2 className="h-4 w-4 text-slate-500" /> CSV
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;

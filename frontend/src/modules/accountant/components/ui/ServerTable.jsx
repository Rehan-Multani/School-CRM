import React from 'react';
import { ChevronLeft, ChevronRight, Loader2, Inbox } from 'lucide-react';

/**
 * Server-paginated table. The parent owns data fetching, page state and filters;
 * this component only renders rows + a pager driven by `pagination`.
 *
 * columns: [{ key, title, align?, render?(row) }]
 * pagination: { page, limit, total, totalPages }
 */
export const ServerTable = ({
  columns = [],
  rows = [],
  loading = false,
  error = null,
  pagination,
  onPageChange,
  emptyMessage = 'No records found.',
  rowKey = (r) => r.id,
  onRowClick,
}) => {
  const page = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total ?? rows.length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-rose-500 font-semibold">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-slate-400 font-semibold">
                  <Inbox className="w-5 h-5 inline mr-2 -mt-0.5" />
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/50' : ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-slate-700 dark:text-slate-300 font-medium ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500">
        <span>
          {total} record{total === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange?.(page - 1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-950"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange?.(page + 1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-950"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerTable;

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { safePickupSettingsApi } from '../../../../shared/api/client';

function apiMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

const STATUS_STYLES = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  EXPIRED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  FAILED: 'bg-rose-100 text-rose-700 dark:bg-slate-900/10 dark:text-rose-300',
  VERIFIED: 'bg-blue-100 text-blue-700 dark:bg-indigo-500/10 dark:text-blue-300',
  OTP_SENT: 'bg-blue-50 text-blue-600 dark:bg-indigo-500/10 dark:text-blue-300',
  PENDING: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
};
const STATUSES = ['ALL', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED', 'VERIFIED', 'OTP_SENT', 'PENDING'];

export function SafePickupHistory() {
  const { showToast, ToastComponent } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ status: 'ALL', from: '', to: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await safePickupSettingsApi.history({
        page,
        limit: 25,
        status: filters.status === 'ALL' ? undefined : filters.status,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setRows(res.data || []);
      setMeta(res.pagination || { total: 0, totalPages: 1 });
    } catch (e) {
      showToast(apiMessage(e, 'Failed to load pickup history'), 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filters, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const fmt = (d) => (d ? new Date(d).toLocaleString() : '–');

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <ToastComponent />
      <div className="flex items-center gap-3">
        <Link to="/school-admin/settings/safe-pickup" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Student Pickup History</h1>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/50">
        <label className="text-xs font-semibold text-slate-500">
          Status
          <select
            value={filters.status}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, status: e.target.value }));
            }}
            className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">
          From
          <input
            type="date"
            value={filters.from}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, from: e.target.value }));
            }}
            className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          To
          <input
            type="date"
            value={filters.to}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, to: e.target.value }));
            }}
            className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Student</th>
              <th className="px-4 py-2.5">Class</th>
              <th className="px-4 py-2.5">Teacher</th>
              <th className="px-4 py-2.5">Guardian</th>
              <th className="px-4 py-2.5">Pickup person</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No pickup sessions found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-indigo-600/40">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{fmt(r.initiatedAt || r.date)}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{r.studentName}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                    {[r.className, r.sectionName].filter(Boolean).join(' ') || '–'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{r.teacherName || '–'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-400">{r.maskedMobile || '–'}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {r.pickupPersonName ? `${r.pickupPersonName}${r.pickupPersonRelationship ? ` (${r.pickupPersonRelationship})` : ''}` : '–'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status] || STATUS_STYLES.PENDING}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{meta.total} sessions</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 disabled:opacity-40 dark:border-slate-700"
          >
            Prev
          </button>
          <span>
            {page} / {meta.totalPages || 1}
          </span>
          <button
            type="button"
            disabled={page >= (meta.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 disabled:opacity-40 dark:border-slate-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default SafePickupHistory;


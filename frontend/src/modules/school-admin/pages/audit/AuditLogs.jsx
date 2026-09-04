import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { auditApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

const MODULE_VARIANT = {
  EVENTS: 'info',
  HOMEWORK: 'primary',
  MEETINGS: 'info',
  ADMISSIONS: 'success',
  INVENTORY: 'warning',
  COMMUNICATION: 'primary',
  ATTENDANCE: 'info',
  ROLES: 'danger',
  USERS: 'danger',
};

export const AuditLogs = () => {
  const { showToast, ToastComponent } = useToast();
  const [rows, setRows] = useState([]);
  const [modules, setModules] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [filters, setFilters] = useState({ module: 'ALL', actor: '', from: '', to: '', page: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: filters.page, limit: 25 };
      if (filters.module !== 'ALL') params.module = filters.module;
      if (filters.actor.trim()) params.actor = filters.actor.trim();
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const res = await auditApi.list(params);
      setRows(res?.data || []);
      setPagination(res?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
      if (res?.modules?.length) setModules(res.modules);
    } catch (err) {
      setError(apiMessage(err, 'Unable to load audit logs'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const moduleOptions = useMemo(
    () => ['ALL', ...new Set([...Object.keys(MODULE_VARIANT), ...modules])].filter(Boolean),
    [modules]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs Registry"
        subtitle="Every write action taken across the school portal — who did what, and when."
      />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-400">Module</label>
          <select
            value={filters.module}
            onChange={(e) => set({ module: e.target.value })}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            {moduleOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-400">Actor</label>
          <input
            value={filters.actor}
            onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && set({ actor: filters.actor })}
            placeholder="name / email"
            className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-400">From</label>
          <input type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-400">To</label>
          <input type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
        </div>
        <button
          type="button"
          onClick={() => set({ actor: filters.actor })}
          className="h-10 rounded-xl bg-primary px-4 text-xs font-bold text-white"
        >
          Apply
        </button>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/60 p-10 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button type="button" onClick={load} className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">
            Retry
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Summary</th>
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-xs font-semibold text-slate-400">
                    No audit entries match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <React.Fragment key={r.id}>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-950/30">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 dark:text-white">{r.actorName || 'System'}</span>
                        {r.actorRole && <div className="text-[10px] text-slate-400">{r.actorRole}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={MODULE_VARIANT[r.module] || 'default'}>{r.module}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{r.action}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.summary || '—'}</td>
                      <td className="px-2 py-3 text-center">
                        {(r.before || r.after) && (
                          <button
                            type="button"
                            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {expanded === r.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr className="bg-slate-50/60 dark:bg-slate-950/40">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] font-black uppercase text-slate-400">Before</span>
                              <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-white p-2 text-[10px] dark:bg-slate-900">
                                {r.before ? JSON.stringify(r.before, null, 2) : '—'}
                              </pre>
                            </div>
                            <div>
                              <span className="text-[10px] font-black uppercase text-slate-400">After</span>
                              <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-white p-2 text-[10px] dark:bg-slate-900">
                                {r.after ? JSON.stringify(r.after, null, 2) : '—'}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500">
              {pagination.total} entr{pagination.total === 1 ? 'y' : 'ies'} · page {pagination.page} / {pagination.totalPages}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => set({ page: pagination.page - 1 })}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 dark:border-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => set({ page: pagination.page + 1 })}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 dark:border-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastComponent />
    </div>
  );
};

export default AuditLogs;

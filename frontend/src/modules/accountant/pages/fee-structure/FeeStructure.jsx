import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ServerTable } from '../../components/ui/ServerTable';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { accountantApi } from '../../../../shared/api/client';
import { formatCurrency } from '../../utils/formatters';
import { exportToCSV } from '../../../../shared/lib/exportHelpers';
import { ClipboardList, Layers, Download, Lock, Eye } from 'lucide-react';

export const FeeStructure = () => {
  const { showToast, ToastComponent } = useToast();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ academicYearId: '', classId: '', status: '', page: 1 });
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    accountantApi.academicYears().then((res) => setYears(res?.data || [])).catch(() => {});
    accountantApi.classes().then((res) => setClasses(res?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const params = { page: filters.page, limit: 15 };
    if (filters.academicYearId) params.academicYearId = filters.academicYearId;
    if (filters.classId) params.classId = filters.classId;
    if (filters.status) params.status = filters.status;
    accountantApi
      .feeStructures(params)
      .then((res) => {
        if (!alive) return;
        setRows(res?.data || []);
        setPagination(res?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      })
      .catch((err) => alive && setError(err?.response?.data?.message || 'Failed to load fee structures'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [filters]);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const openDetail = (row) => {
    setLoadingDetail(true);
    setDetail({ id: row.id, name: row.name });
    accountantApi
      .feeStructure(row.id)
      .then((res) => setDetail(res?.data || null))
      .catch((err) => showToast(err?.response?.data?.message || 'Failed to load structure', 'error'))
      .finally(() => setLoadingDetail(false));
  };

  const columns = useMemo(
    () => [
      { key: 'name', title: 'Structure', render: (r) => (
        <span className="font-bold text-slate-900 dark:text-white">{r.name}</span>
      ) },
      { key: 'academicYear', title: 'Academic Year', render: (r) => r.academicYear?.name || '—' },
      { key: 'class', title: 'Class', render: (r) => r.class?.name || '—' },
      { key: 'itemsCount', title: 'Fee Heads', render: (r) => `${r.itemsCount ?? 0}` },
      { key: 'status', title: 'Status', render: (r) => (
        <Badge variant={r.status === 'ACTIVE' ? 'success' : 'warning'}>{r.status}</Badge>
      ) },
      { key: 'actions', title: '', render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openDetail(r);
          }}
          className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300"
        >
          <Eye className="w-3 h-3" /> View
        </button>
      ) },
    ],
    []
  );

  const detailTotal = (detail?.items || []).reduce((s, it) => s + (it.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Structure"
        subtitle="The school's class-wise fee structure. Read-only for the accountant role."
        actions={
          <button
            onClick={() => {
              if (!rows.length) return showToast('Nothing to export', 'info');
              exportToCSV(
                rows.map((r) => ({
                  structure: r.name,
                  academicYear: r.academicYear?.name || '',
                  class: r.class?.name || '',
                  feeHeads: r.itemsCount ?? 0,
                  status: r.status,
                })),
                `fee_structures_${new Date().toISOString().split('T')[0]}.csv`
              );
              showToast('Exported to CSV', 'success');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        }
      />

      <div className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-4 py-2.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
        <Lock className="w-3.5 h-3.5" />
        Fee structures are configured by the school administration. This view is read-only.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Fee Structures" value={`${pagination.total}`} subtitle="matching filters" icon={ClipboardList} />
        <StatCard title="Academic Years" value={`${years.length}`} subtitle="available" icon={Layers} />
        <StatCard title="Classes" value={`${classes.length}`} subtitle="configured" icon={Layers} />
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={filters.academicYearId}
          onChange={(e) => set({ academicYearId: e.target.value })}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
        >
          <option value="">All Academic Years</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
        <select
          value={filters.classId}
          onChange={(e) => set({ classId: e.target.value })}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <ServerTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={(p) => set({ page: p })}
        onRowClick={openDetail}
        emptyMessage="No fee structures found."
      />

      {detail && (
        <Modal isOpen onClose={() => setDetail(null)} title={`Fee Structure — ${detail.name || ''}`} size="lg">
          {loadingDetail ? (
            <p className="py-8 text-center text-slate-400 text-sm">Loading…</p>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <Info label="Academic Year" value={detail.academicYear?.name} />
                <Info label="Class" value={detail.class?.name} />
                <Info label="Status" value={detail.status} />
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="text-left py-2">Fee Head</th>
                    <th className="text-left py-2">Frequency</th>
                    <th className="text-right py-2">Installments</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(detail.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 font-semibold text-slate-700 dark:text-slate-300">
                        {it.feeHead?.name || it.feeHeadName || '—'}
                      </td>
                      <td className="py-2 text-slate-400">{it.frequency || '—'}</td>
                      <td className="py-2 text-right">{it.installments ?? '—'}</td>
                      <td className="py-2 text-right font-bold">{formatCurrency(it.amount || 0)}</td>
                    </tr>
                  ))}
                  {(detail.items || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-slate-400">
                        No fee heads in this structure.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 dark:border-slate-800 font-black">
                    <td className="py-2" colSpan={3}>
                      Total
                    </td>
                    <td className="py-2 text-right text-indigo-600 dark:text-indigo-400">{formatCurrency(detailTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Modal>
      )}

      <ToastComponent />
    </div>
  );
};

const Info = ({ label, value }) => (
  <div>
    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
    <span className="font-bold text-slate-800 dark:text-slate-200">{value ?? '—'}</span>
  </div>
);

export default FeeStructure;

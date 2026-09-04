import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { ServerTable } from '../../components/ui/ServerTable';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { accountantApi } from '../../../../shared/api/client';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../../../shared/lib/exportHelpers';
import { AlertTriangle, Users, Download, CreditCard, Eye, History, Search } from 'lucide-react';

const STATUS_OPTIONS = ['', 'Pending', 'Partially Paid', 'Overdue'];
const badgeVariant = (s) => (s === 'Overdue' ? 'danger' : s === 'Partially Paid' ? 'info' : 'warning');

export const DuesPendingFees = () => {
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ totalFee: 0, totalPaid: 0, totalPending: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [classes, setClasses] = useState([]);
  const [history, setHistory] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', classId: '', admissionNumber: '', page: 1 });

  useEffect(() => {
    accountantApi.classes().then((res) => setClasses(res?.data || [])).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const params = { page: filters.page, limit: 15 };
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.classId) params.classId = filters.classId;
    if (filters.admissionNumber) params.admissionNumber = filters.admissionNumber;

    accountantApi
      .dues(params)
      .then((res) => {
        if (!alive) return;
        setRows(res?.data || []);
        setSummary(res?.summary || { totalFee: 0, totalPaid: 0, totalPending: 0 });
        setPagination(res?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      })
      .catch((err) => alive && setError(err?.response?.data?.message || 'Failed to load dues'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [filters]);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const openHistory = (row) => {
    accountantApi
      .studentDueHistory(row.studentId)
      .then((res) => setHistory(res?.data || null))
      .catch((err) => showToast(err?.response?.data?.message || 'Failed to load history', 'error'));
  };

  const columns = useMemo(
    () => [
      { key: 'admissionNumber', title: 'Admn No', render: (r) => (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{r.admissionNumber || '—'}</span>
      ) },
      { key: 'studentName', title: 'Student', render: (r) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{r.studentName}</p>
          <p className="text-[10px] text-slate-400">{r.invoiceNumber} • {r.periodLabel}</p>
        </div>
      ) },
      { key: 'className', title: 'Class', render: (r) => [r.className, r.sectionName].filter(Boolean).join(' - ') || '—' },
      { key: 'totalAmount', title: 'Total Fee', align: 'right', render: (r) => formatCurrency(r.totalAmount) },
      { key: 'paidAmount', title: 'Paid', align: 'right', render: (r) => formatCurrency(r.paidAmount) },
      { key: 'discountAmount', title: 'Discount', align: 'right', render: (r) => formatCurrency(r.discountAmount) },
      { key: 'fineAmount', title: 'Fine', align: 'right', render: (r) => formatCurrency(r.fineAmount) },
      { key: 'pendingAmount', title: 'Pending', align: 'right', render: (r) => (
        <span className="font-black text-rose-600 dark:text-rose-400">{formatCurrency(r.pendingAmount)}</span>
      ) },
      { key: 'dueDate', title: 'Due Date', render: (r) => formatDate(r.dueDate) },
      { key: 'status', title: 'Status', render: (r) => <Badge variant={badgeVariant(r.status)}>{r.status}</Badge> },
      { key: 'actions', title: 'Actions', render: (r) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openHistory(r)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded-lg"
          >
            <History className="w-3 h-3" /> History
          </button>
          <button
            onClick={() => navigate('/accountant/fee-collection')}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg"
          >
            <CreditCard className="w-3 h-3" /> Collect
          </button>
        </div>
      ) },
    ],
    [navigate] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dues / Pending Fees"
        subtitle="All outstanding student fee balances with filters, totals and per-student history."
        actions={
          <button
            onClick={() => {
              if (!rows.length) return showToast('Nothing to export', 'info');
              exportToCSV(rows, `dues_${new Date().toISOString().split('T')[0]}.csv`);
              showToast('Current page exported to CSV', 'success');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Billed (filtered)" value={formatCurrency(summary.totalFee)} subtitle="sum of matching invoices" icon={Users} />
        <StatCard title="Total Collected" value={formatCurrency(summary.totalPaid)} subtitle="against these invoices" icon={CreditCard} />
        <StatCard title="Total Pending" value={formatCurrency(summary.totalPending)} subtitle="outstanding balance" icon={AlertTriangle} />
        <StatCard title="Rows" value={`${pagination.total}`} subtitle="pending invoices" icon={Users} />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search student / invoice…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-violet-500"
          />
        </div>
        <input
          value={filters.admissionNumber}
          onChange={(e) => set({ admissionNumber: e.target.value })}
          placeholder="Admission no"
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
        />
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
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s || 'All Statuses'}
            </option>
          ))}
        </select>
      </div>

      <ServerTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={(p) => set({ page: p })}
        emptyMessage="No outstanding dues match the current filters."
      />

      {history && (
        <Modal isOpen onClose={() => setHistory(null)} title={`Fee History — ${history.student?.name}`} size="lg">
          <div className="space-y-5 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Invoices</p>
              <table className="w-full">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(history.invoices || []).map((i) => (
                    <tr key={i.id}>
                      <td className="py-2 font-semibold">{i.invoiceNumber}</td>
                      <td className="py-2 text-slate-400">{i.periodLabel}</td>
                      <td className="py-2 text-right">{formatCurrency(i.totalAmount)}</td>
                      <td className="py-2 text-right text-rose-600 font-bold">{formatCurrency(i.balanceAmount)}</td>
                      <td className="py-2 text-right">{i.status}</td>
                    </tr>
                  ))}
                  {(history.invoices || []).length === 0 && (
                    <tr><td className="py-3 text-slate-400" colSpan={5}>No invoices.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Payments</p>
              <table className="w-full">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(history.payments || []).map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 font-semibold">{p.receiptNumber}</td>
                      <td className="py-2 text-slate-400">{p.invoiceNumber} {p.periodLabel}</td>
                      <td className="py-2 text-slate-400">{formatDate(p.paymentDate)}</td>
                      <td className="py-2 text-right text-emerald-600 font-bold">{formatCurrency(p.amount)}</td>
                      <td className="py-2 text-right">{p.paymentMethod}</td>
                    </tr>
                  ))}
                  {(history.payments || []).length === 0 && (
                    <tr><td className="py-3 text-slate-400" colSpan={5}>No payments.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      <ToastComponent />
    </div>
  );
};

export default DuesPendingFees;

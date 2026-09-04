import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ServerTable } from '../../components/ui/ServerTable';
import { Badge } from '../../components/ui/Badge';
import { accountantApi } from '../../../../shared/api/client';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Search } from 'lucide-react';

const STATUS_OPTIONS = ['', 'Paid', 'Partially Paid', 'Pending', 'Overdue'];
const badgeVariant = (status) =>
  status === 'Paid' ? 'success' : status === 'Overdue' ? 'danger' : status === 'Partially Paid' ? 'info' : 'warning';

export const InstallmentManagement = () => {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', classId: '', page: 1 });

  useEffect(() => {
    accountantApi
      .classes()
      .then((res) => setClasses(res?.data || []))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const params = { page: filters.page, limit: 15 };
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.classId) params.classId = filters.classId;

    accountantApi
      .installments(params)
      .then((res) => {
        if (!alive) return;
        setRows(res?.data || []);
        setPagination(res?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      })
      .catch((err) => {
        if (alive) setError(err?.response?.data?.message || 'Failed to load installments');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [filters]);

  const columns = useMemo(
    () => [
      { key: 'studentName', title: 'Student', render: (r) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{r.studentName}</p>
          <p className="text-[10px] text-slate-400">{r.admissionNumber || r.invoiceNumber}</p>
        </div>
      ) },
      { key: 'className', title: 'Class', render: (r) => [r.className, r.sectionName].filter(Boolean).join(' - ') || '—' },
      { key: 'periodLabel', title: 'Installment' },
      { key: 'dueDate', title: 'Due Date', render: (r) => formatDate(r.dueDate) },
      { key: 'totalAmount', title: 'Amount', align: 'right', render: (r) => formatCurrency(r.totalAmount) },
      { key: 'paidAmount', title: 'Paid', align: 'right', render: (r) => formatCurrency(r.paidAmount) },
      { key: 'pendingAmount', title: 'Pending', align: 'right', render: (r) => (
        <span className="font-bold">{formatCurrency(r.pendingAmount)}</span>
      ) },
      { key: 'status', title: 'Status', render: (r) => <Badge variant={badgeVariant(r.status)}>{r.status}</Badge> },
    ],
    []
  );

  const set = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Installments"
        subtitle="Installment plans and their collection status across all students."
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search student, admission no, invoice…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={filters.classId}
          onChange={(e) => set({ classId: e.target.value })}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-violet-500"
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
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-violet-500"
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
        emptyMessage="No installments match the current filters."
      />
    </div>
  );
};

export default InstallmentManagement;

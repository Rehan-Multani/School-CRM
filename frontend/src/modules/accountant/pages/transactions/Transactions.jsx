import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ServerTable } from '../../components/ui/ServerTable';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { accountantApi } from '../../../../shared/api/client';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../../../shared/lib/exportHelpers';
import { Download, Filter, Search } from 'lucide-react';
import { PAYMENT_METHODS } from '../../utils/constants';

const TYPE_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'FEE_PAYMENT', label: 'Inflows (Fee)' },
  { id: 'EXPENSE', label: 'Outflows (Expense)' },
];

export const Transactions = () => {
  const { showToast, ToastComponent } = useToast();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  const [filters, setFilters] = useState({
    type: 'ALL',
    paymentMethod: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    page: 1,
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const params = { page: filters.page, limit: 20 };
    if (filters.type !== 'ALL') params.type = filters.type;
    if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
    if (filters.status) params.status = filters.status;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.search) params.search = filters.search;

    accountantApi
      .transactions(params)
      .then((res) => {
        if (!alive) return;
        setRows(res?.data || []);
        setPagination(res?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      })
      .catch((err) => alive && setError(err?.response?.data?.message || 'Failed to load transactions'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [filters]);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const openDetail = (row) => {
    accountantApi
      .getTransaction(row.id, { type: row.type })
      .then((res) => setDetail(res?.data || null))
      .catch((err) => showToast(err?.response?.data?.message || 'Failed to load transaction', 'error'));
  };

  const columns = useMemo(
    () => [
      { key: 'transactionId', title: 'Txn / Ref', render: (r) => (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{r.transactionId}</span>
      ) },
      { key: 'date', title: 'Date', render: (r) => formatDate(r.date) },
      { key: 'party', title: 'Party / Note', render: (r) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{r.party || '—'}</p>
          <p className="text-[10px] text-slate-400 truncate max-w-xs">{r.note}</p>
        </div>
      ) },
      { key: 'category', title: 'Category' },
      { key: 'direction', title: 'Flow', render: (r) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
            r.direction === 'CREDIT'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
          }`}
        >
          {r.direction === 'CREDIT' ? '+ INFLOW' : '- OUTFLOW'}
        </span>
      ) },
      { key: 'paymentMethod', title: 'Method' },
      { key: 'status', title: 'Status' },
      { key: 'amount', title: 'Amount', align: 'right', render: (r) => (
        <span className={`font-black ${r.direction === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {r.direction === 'CREDIT' ? '+' : '-'}
          {formatCurrency(r.amount)}
        </span>
      ) },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle="Central ledger of student fee collections (credits) and school expenditures (debits)."
        actions={
          <button
            onClick={() => {
              if (!rows.length) return showToast('Nothing to export', 'info');
              exportToCSV(rows, `transactions_${new Date().toISOString().split('T')[0]}.csv`);
              showToast('Current page exported to CSV', 'success');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs tabs={TYPE_TABS} activeTab={filters.type} onChange={(id) => set({ type: id })} />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search ref, party, note…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={filters.paymentMethod}
          onChange={(e) => set({ paymentMethod: e.target.value })}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
        >
          <option value="">All Methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => set({ dateFrom: e.target.value })}
            className="h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
          />
        </label>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => set({ dateTo: e.target.value })}
          className="h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
        />
      </div>

      <ServerTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={(p) => set({ page: p })}
        onRowClick={openDetail}
        emptyMessage="No transactions match the current filters."
      />

      {detail && (
        <Modal isOpen onClose={() => setDetail(null)} title={`Transaction — ${detail.transactionId || detail.receiptNumber || detail.expenseNumber || ''}`} size="md">
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Type" value={detail.type} />
              <Info label="Direction" value={detail.direction} />
              <Info label="Amount" value={formatCurrency(detail.amount)} />
              <Info label="Method" value={detail.paymentMethod} />
              <Info label="Status" value={detail.status} />
              <Info label="Reference" value={detail.paymentReference || detail.reference || '—'} />
              {detail.student && <Info label="Student" value={detail.student.name} />}
              {detail.invoice && <Info label="Invoice" value={`${detail.invoice.invoiceNumber} (${detail.invoice.periodLabel})`} />}
              {detail.vendorName && <Info label="Vendor" value={detail.vendorName} />}
              {detail.category && <Info label="Category" value={detail.category} />}
            </div>
            {(detail.timeline || []).length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Timeline</p>
                <ul className="space-y-1.5">
                  {detail.timeline.map((t, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{t.label}</span>
                      <span className="text-slate-400">
                        {formatDate(t.at)} {t.by ? `• ${t.by}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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

export default Transactions;

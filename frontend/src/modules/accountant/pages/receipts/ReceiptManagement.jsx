import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ServerTable } from '../../components/ui/ServerTable';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useAccountantAuth } from '../../context/AccountantAuthContext';
import { accountantApi } from '../../../../shared/api/client';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../../../shared/lib/exportHelpers';
import { PrintReportModal } from '../../../../shared/components/PrintReportModal';
import { PAYMENT_METHODS } from '../../utils/constants';
import { Printer, Download, Search } from 'lucide-react';

const TABS = [
  { id: 'receipts', label: 'Receipts' },
  { id: 'invoices', label: 'Invoices' },
];

const invoiceBadge = (s) =>
  s === 'PAID' ? 'success' : s === 'PARTIALLY_PAID' ? 'info' : s === 'OVERDUE' ? 'danger' : 'warning';

export const ReceiptManagement = () => {
  const { showToast, ToastComponent } = useToast();
  const { user } = useAccountantAuth();

  const [tab, setTab] = useState('receipts');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [print, setPrint] = useState(null);

  const [filters, setFilters] = useState({ search: '', paymentMethod: '', status: '', page: 1 });

  useEffect(() => {
    setFilters({ search: '', paymentMethod: '', status: '', page: 1 });
  }, [tab]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const params = { page: filters.page, limit: 15 };
    if (filters.search) params.search = filters.search;
    if (tab === 'receipts' && filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
    if (tab === 'invoices' && filters.status) params.status = filters.status;

    const req = tab === 'receipts' ? accountantApi.receipts(params) : accountantApi.invoices(params);
    req
      .then((res) => {
        if (!alive) return;
        setRows(res?.data || []);
        setPagination(res?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      })
      .catch((err) => alive && setError(err?.response?.data?.message || 'Failed to load'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tab, filters]);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const openReceipt = (row) => {
    accountantApi
      .getReceipt(row.id)
      .then((res) => setPrint({ kind: 'receipt', data: res?.data || row }))
      .catch(() => setPrint({ kind: 'receipt', data: row }));
  };
  const openInvoice = (row) => {
    accountantApi
      .getInvoice(row.id)
      .then((res) => setPrint({ kind: 'invoice', data: res?.data || row }))
      .catch(() => setPrint({ kind: 'invoice', data: row }));
  };

  const receiptColumns = useMemo(
    () => [
      { key: 'receiptNumber', title: 'Receipt', render: (r) => <span className="font-bold text-indigo-600">{r.receiptNumber}</span> },
      { key: 'studentName', title: 'Student', render: (r) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{r.studentName}</p>
          <p className="text-[10px] text-slate-400">{r.admissionNumber}</p>
        </div>
      ) },
      { key: 'invoiceNumber', title: 'Invoice', render: (r) => `${r.invoiceNumber || '—'}` },
      { key: 'paymentDate', title: 'Date', render: (r) => formatDate(r.paymentDate) },
      { key: 'amount', title: 'Amount', align: 'right', render: (r) => (
        <span className="font-bold text-emerald-600">{formatCurrency(r.amount)}</span>
      ) },
      { key: 'paymentMethod', title: 'Method' },
      { key: 'status', title: 'Status', render: (r) => (
        <Badge variant={r.status === 'COMPLETED' ? 'success' : r.status === 'REFUNDED' ? 'warning' : 'danger'}>{r.status}</Badge>
      ) },
      { key: 'actions', title: '', render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openReceipt(r);
          }}
          className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300"
        >
          <Printer className="w-3 h-3 text-indigo-600" /> Print
        </button>
      ) },
    ],
    []
  );

  const invoiceColumns = useMemo(
    () => [
      { key: 'invoiceNumber', title: 'Invoice', render: (r) => <span className="font-bold text-indigo-600">{r.invoiceNumber}</span> },
      { key: 'studentName', title: 'Student', render: (r) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{r.studentName}</p>
          <p className="text-[10px] text-slate-400">{r.admissionNumber}</p>
        </div>
      ) },
      { key: 'className', title: 'Class', render: (r) => [r.className, r.sectionName].filter(Boolean).join(' - ') || '—' },
      { key: 'periodLabel', title: 'Period' },
      { key: 'dueDate', title: 'Due', render: (r) => formatDate(r.dueDate) },
      { key: 'totalAmount', title: 'Total', align: 'right', render: (r) => formatCurrency(r.totalAmount) },
      { key: 'paidAmount', title: 'Paid', align: 'right', render: (r) => formatCurrency(r.paidAmount) },
      { key: 'pendingAmount', title: 'Balance', align: 'right', render: (r) => (
        <span className="font-bold">{formatCurrency(r.pendingAmount)}</span>
      ) },
      { key: 'rawStatus', title: 'Status', render: (r) => <Badge variant={invoiceBadge(r.rawStatus)}>{r.rawStatus}</Badge> },
      { key: 'actions', title: '', render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openInvoice(r);
          }}
          className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300"
        >
          <Printer className="w-3 h-3 text-indigo-600" /> Print
        </button>
      ) },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts / Invoices"
        subtitle="Payment receipts and fee invoices in one place — search, filter, print and download."
        actions={
          <button
            onClick={() => {
              if (!rows.length) return showToast('Nothing to export', 'info');
              exportToCSV(rows, `${tab}_${new Date().toISOString().split('T')[0]}.csv`);
              showToast('Current page exported to CSV', 'success');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        }
      />

      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder={tab === 'receipts' ? 'Search receipt, student, invoice…' : 'Search invoice, student…'}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-violet-500"
          />
        </div>
        {tab === 'receipts' ? (
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
        ) : (
          <select
            value={filters.status}
            onChange={(e) => set({ status: e.target.value })}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="">All Statuses</option>
            {['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      <ServerTable
        columns={tab === 'receipts' ? receiptColumns : invoiceColumns}
        rows={rows}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={(p) => set({ page: p })}
        onRowClick={tab === 'receipts' ? openReceipt : openInvoice}
        emptyMessage={tab === 'receipts' ? 'No receipts found.' : 'No invoices found.'}
      />

      {print?.kind === 'receipt' && (
        <PrintReportModal
          isOpen
          onClose={() => setPrint(null)}
          title={`Official Fee Receipt — ${print.data.receiptNumber}`}
          documentType="Official Fee Receipt"
        >
          <div className="space-y-6">
            <div className="text-center pb-4 border-b border-border">
              <h2 className="text-xl font-black">{user?.schoolName || 'School CRM'}</h2>
              <p className="text-xs text-slate-500">Official Payment Receipt</p>
              <span className="text-xs font-bold text-indigo-600 mt-1 block">{print.data.receiptNumber}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <Row label="Student" value={print.data.studentName} />
              <Row label="Admission No" value={print.data.admissionNumber} />
              <Row label="Invoice" value={`${print.data.invoiceNumber || '—'} ${print.data.periodLabel ? `(${print.data.periodLabel})` : ''}`} />
              <Row label="Payment Date" value={formatDate(print.data.paymentDate)} />
              <Row label="Method" value={print.data.paymentMethod} />
              <Row label="Reference" value={print.data.paymentReference || 'N/A'} />
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border flex justify-between items-center text-sm font-black">
              <span>Amount Settled:</span>
              <span className="text-emerald-600">{formatCurrency(print.data.amount)}</span>
            </div>
            <div className="flex justify-between pt-8 text-xs font-bold text-slate-400">
              <span>Counter Officer: {print.data.collectedBy || user?.name || 'Accounts Department'}</span>
              <span>Authorized Signature: ________________</span>
            </div>
          </div>
        </PrintReportModal>
      )}

      {print?.kind === 'invoice' && (
        <PrintReportModal
          isOpen
          onClose={() => setPrint(null)}
          title={`Fee Invoice — ${print.data.invoiceNumber}`}
          documentType="Fee Invoice"
        >
          <div className="space-y-6">
            <div className="text-center pb-4 border-b border-border">
              <h2 className="text-xl font-black">{user?.schoolName || 'School CRM'}</h2>
              <p className="text-xs text-slate-500">Fee Invoice</p>
              <span className="text-xs font-bold text-indigo-600 mt-1 block">{print.data.invoiceNumber}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <Row label="Student" value={print.data.studentName} />
              <Row label="Admission No" value={print.data.admissionNumber} />
              <Row label="Period" value={print.data.periodLabel} />
              <Row label="Due Date" value={formatDate(print.data.dueDate)} />
              <Row label="Status" value={print.data.rawStatus || print.data.status} />
            </div>
            {Array.isArray(print.data.items) && print.data.items.length > 0 && (
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {print.data.items.map((it, i) => (
                    <tr key={i}>
                      <td className="py-1.5">{it.feeHeadName}</td>
                      <td className="py-1.5 text-right">{formatCurrency(it.finalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border space-y-1 text-sm">
              <div className="flex justify-between"><span>Total</span><span className="font-black">{formatCurrency(print.data.totalAmount)}</span></div>
              <div className="flex justify-between"><span>Paid</span><span className="text-emerald-600 font-bold">{formatCurrency(print.data.paidAmount)}</span></div>
              <div className="flex justify-between"><span>Balance</span><span className="text-rose-600 font-black">{formatCurrency(print.data.balanceAmount ?? print.data.pendingAmount)}</span></div>
            </div>
          </div>
        </PrintReportModal>
      )}

      <ToastComponent />
    </div>
  );
};

const Row = ({ label, value }) => (
  <div>
    <span className="text-slate-400 block font-semibold">{label}:</span>
    <span className="font-bold">{value ?? '—'}</span>
  </div>
);

export default ReceiptManagement;

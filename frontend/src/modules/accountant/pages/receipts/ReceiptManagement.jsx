import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ServerTable } from '../../components/ui/ServerTable';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAccountantAuth } from '../../context/AccountantAuthContext';
import { accountantApi } from '../../../../shared/api/client';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../../../shared/lib/exportHelpers';
import { PrintReportModal } from '../../../../shared/components/PrintReportModal';
import { PAYMENT_METHODS } from '../../utils/constants';
import { Printer, Download, Search, RotateCcw, Ban } from 'lucide-react';

const TABS = [
  { id: 'receipts', label: 'Receipts' },
  { id: 'invoices', label: 'Invoices' },
];

const invoiceBadge = (s) =>
  s === 'PAID' ? 'success' : s === 'PARTIALLY_PAID' ? 'info' : s === 'OVERDUE' ? 'danger' : 'warning';
const receiptBadge = (s) =>
  s === 'COMPLETED' ? 'success' : s === 'REFUNDED' ? 'secondary' : s === 'CANCELLED' ? 'danger' : 'warning';
const RECEIPT_STATUSES = ['COMPLETED', 'REFUNDED', 'CANCELLED'];
const REFUND_METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'ONLINE', 'OTHER'];

const refundableAmount = (r) => Math.max(0, (Number(r.amount) || 0) - (Number(r.refundedAmount) || 0));
const canRefund = (r) => r.status === 'COMPLETED' && refundableAmount(r) > 0;

export const ReceiptManagement = ({ initialStatus = '' }) => {
  const { showToast, ToastComponent } = useToast();
  const { user } = useAccountantAuth();

  const [tab, setTab] = useState('receipts');
  const [refund, setRefund] = useState(null); // { row, amount, reason, method, reference }
  const [refunding, setRefunding] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [print, setPrint] = useState(null);

  const [filters, setFilters] = useState({ search: '', paymentMethod: '', status: initialStatus, page: 1 });

  useEffect(() => {
    setFilters({ search: '', paymentMethod: '', status: tab === 'receipts' ? initialStatus : '', page: 1 });
  }, [tab, initialStatus]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const params = { page: filters.page, limit: 15 };
    if (filters.search) params.search = filters.search;
    if (tab === 'receipts' && filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
    if (filters.status) params.status = filters.status;

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
  const reload = () => setFilters((f) => ({ ...f }));

  const openRefund = (row) => {
    setRefund({ row, amount: String(refundableAmount(row)), reason: '', method: row.paymentMethod || 'CASH', reference: '' });
  };

  const submitRefund = (e) => {
    e.preventDefault();
    if (!refund) return;
    const amount = Number(refund.amount);
    const max = refundableAmount(refund.row);
    if (!refund.reason.trim()) return showToast('Reason is required', 'error');
    if (!amount || amount <= 0 || amount > max) return showToast(`Amount must be between 1 and ${formatCurrency(max)}`, 'error');
    setRefunding(true);
    accountantApi
      .refundReceipt(refund.row.id, {
        kind: 'REFUND',
        amount: amount === max ? undefined : amount,
        reason: refund.reason.trim(),
        method: refund.method || undefined,
        reference: refund.reference.trim() || undefined,
      })
      .then((res) => {
        showToast(res?.message || `Refunded ${formatCurrency(res?.data?.refund?.amount ?? amount)}`, 'success');
        setRefund(null);
        reload();
      })
      .catch((err) => showToast(err?.response?.data?.message || 'Refund failed', 'error'))
      .finally(() => setRefunding(false));
  };

  const cancelEntry = (row) => {
    const reason = window.prompt(`Cancel receipt ${row.receiptNumber}? This voids the receipt and reverses ${formatCurrency(refundableAmount(row))} from the invoice.\n\nEnter a reason:`);
    if (reason === null) return;
    if (!reason.trim()) return showToast('Reason is required', 'error');
    setRefunding(true);
    accountantApi
      .refundReceipt(row.id, { kind: 'CANCEL', reason: reason.trim() })
      .then((res) => {
        showToast(res?.message || 'Receipt cancelled', 'success');
        reload();
      })
      .catch((err) => showToast(err?.response?.data?.message || 'Cancel failed', 'error'))
      .finally(() => setRefunding(false));
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
      { key: 'invoiceNumber', title: 'Invoice', render: (r) => `${r.invoiceNumber || 'ââââââ'}` },
      { key: 'paymentDate', title: 'Date', render: (r) => formatDate(r.paymentDate) },
      { key: 'amount', title: 'Amount', align: 'right', render: (r) => (
        <div>
          <span className={`font-bold ${r.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>{formatCurrency(r.amount)}</span>
          {Number(r.refundedAmount) > 0 && (
            <p className="text-[10px] font-bold text-rose-500">Refunded {formatCurrency(r.refundedAmount)}</p>
          )}
        </div>
      ) },
      { key: 'paymentMethod', title: 'Method' },
      { key: 'status', title: 'Status', render: (r) => (
        <Badge variant={receiptBadge(r.status)}>{r.status}</Badge>
      ) },
      { key: 'actions', title: '', render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openReceipt(r);
            }}
            className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300"
          >
            <Printer className="w-3 h-3 text-indigo-600" /> Print
          </button>
          {canRefund(r) && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openRefund(r);
                }}
                disabled={refunding}
                className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-[10px] font-bold text-amber-700 dark:text-amber-300 disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" /> Refund
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cancelEntry(r);
                }}
                disabled={refunding}
                className="flex items-center gap-1 px-2 py-1 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg text-[10px] font-bold text-rose-700 dark:text-rose-300 disabled:opacity-50"
              >
                <Ban className="w-3 h-3" /> Cancel entry
              </button>
            </>
          )}
        </div>
      ) },
    ],
    [refunding]
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
      { key: 'className', title: 'Class', render: (r) => [r.className, r.sectionName].filter(Boolean).join(' - ') || 'ââââââ' },
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
          className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300"
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
        subtitle="Payment receipts and fee invoices in one place ââââââ search, filter, print and download."
        actions={
          <button
            onClick={() => {
              if (!rows.length) return showToast('Nothing to export', 'info');
              exportToCSV(rows, `${tab}_${new Date().toISOString().split('T')[0]}.csv`);
              showToast('Current page exported to CSV', 'success');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs"
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
            placeholder={tab === 'receipts' ? 'Search receipt, student, invoiceâ¦' : 'Search invoice, studentâ¦'}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-violet-500"
          />
        </div>
        {tab === 'receipts' ? (
          <>
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
            <select
              value={filters.status}
              onChange={(e) => set({ status: e.target.value })}
              className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="">All Statuses</option>
              {RECEIPT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
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
          title={`Official Fee Receipt ââââââ ${print.data.receiptNumber}`}
          documentType="Official Fee Receipt"
        >
          <div className="space-y-6 relative">
            {(print.data.status === 'VOID' || print.data.status === 'CANCELLED') && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rotate-[-20deg] border-4 border-rose-500/50 rounded-xl px-6 py-2 text-4xl font-black uppercase tracking-widest text-rose-500/50">
                  Void
                </span>
              </div>
            )}
            <div className="text-center pb-4 border-b border-border">
              <h2 className="text-xl font-black">{user?.schoolName || 'School CRM'}</h2>
              <p className="text-xs text-slate-500">Official Payment Receipt</p>
              <span className="text-xs font-bold text-indigo-600 mt-1 block">{print.data.receiptNumber}</span>
              {(print.data.status === 'VOID' || print.data.status === 'CANCELLED') && (
                <span className="mt-1 inline-block text-[10px] font-black uppercase text-rose-600">
                  Void{print.data.voidReason ? ` — ${print.data.voidReason}` : ''}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <Row label="Student" value={print.data.studentName} />
              <Row label="Admission No" value={print.data.admissionNumber} />
              <Row label="Invoice" value={`${print.data.invoiceNumber || 'ââââââ'} ${print.data.periodLabel ? `(${print.data.periodLabel})` : ''}`} />
              <Row label="Payment Date" value={formatDate(print.data.paymentDate)} />
              <Row label="Method" value={print.data.paymentMethod} />
              <Row label="Reference" value={print.data.paymentReference || 'N/A'} />
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border flex justify-between items-center text-sm font-black">
              <span>Amount Settled:</span>
              <span className="text-emerald-600">{formatCurrency(print.data.amount)}</span>
            </div>
            {Number(print.data.refundedAmount) > 0 && (
              <div className="flex justify-between text-xs font-bold text-rose-600 px-1">
                <span>Refunded</span>
                <span>{formatCurrency(print.data.refundedAmount)}</span>
              </div>
            )}
            {Array.isArray(print.data.refunds) && print.data.refunds.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Refunds / Reversals</p>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {print.data.refunds.map((rf, i) => (
                      <tr key={i}>
                        <td className="py-1.5 font-bold">{rf.kind}</td>
                        <td className="py-1.5 text-slate-500">{formatDate(rf.refundedAt)}</td>
                        <td className="py-1.5 text-slate-500">{[rf.method, rf.reference].filter(Boolean).join(' / ') || '—'}</td>
                        <td className="py-1.5 text-slate-500">{rf.reason}</td>
                        <td className="py-1.5 text-right font-bold text-rose-600">{formatCurrency(rf.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
          title={`Fee Invoice ââââââ ${print.data.invoiceNumber}`}
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

      <Modal isOpen={!!refund} onClose={() => (refunding ? null : setRefund(null))} title={`Refund — ${refund?.row?.receiptNumber || ''}`} size="sm">
        {refund && (
          <form onSubmit={submitRefund} className="space-y-3 text-xs font-semibold">
            <p className="text-[11px] text-slate-400">
              {refund.row.studentName} • paid {formatCurrency(refund.row.amount)}
              {Number(refund.row.refundedAmount) > 0 ? ` • already refunded ${formatCurrency(refund.row.refundedAmount)}` : ''}
            </p>
            <label className="block space-y-1">
              <span>Amount * (max {formatCurrency(refundableAmount(refund.row))})</span>
              <input
                type="number"
                min="1"
                max={refundableAmount(refund.row)}
                required
                value={refund.amount}
                onChange={(e) => setRefund((r) => ({ ...r, amount: e.target.value }))}
                className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
              />
            </label>
            <label className="block space-y-1">
              <span>Reason *</span>
              <input
                required
                placeholder="e.g. Duplicate payment"
                value={refund.reason}
                onChange={(e) => setRefund((r) => ({ ...r, reason: e.target.value }))}
                className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span>Refund method</span>
                <select
                  value={refund.method}
                  onChange={(e) => setRefund((r) => ({ ...r, method: e.target.value }))}
                  className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                >
                  {REFUND_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span>Reference</span>
                <input
                  placeholder="UTR / cheque no"
                  value={refund.reference}
                  onChange={(e) => setRefund((r) => ({ ...r, reference: e.target.value }))}
                  className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                />
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={refunding} className="flex-1 h-9 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50">
                {refunding ? 'Processing…' : `Refund ${formatCurrency(Number(refund.amount) || 0)}`}
              </button>
              <button type="button" onClick={() => setRefund(null)} disabled={refunding} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500">
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ToastComponent />
    </div>
  );
};

const Row = ({ label, value }) => (
  <div>
    <span className="text-slate-400 block font-semibold">{label}:</span>
    <span className="font-bold">{value ?? 'ââââââ'}</span>
  </div>
);

export default ReceiptManagement;



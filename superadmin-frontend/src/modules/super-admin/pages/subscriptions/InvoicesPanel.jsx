import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button } from '../../components/ui/Button';
import { Pulse } from '../../components/ui/SkeletonLoader';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformBillingApi } from '../../../../shared/api/client';
import { openInvoiceDocument } from './invoiceDocument';
import {
  Search,
  X,
  RefreshCw,
  Receipt,
  Printer,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Clock3,
  AlertTriangle,
  Banknote,
  AlertCircle,
  Eye,
  CheckCircle2,
  Undo2,
  Ban,
} from 'lucide-react';

const PAGE_SIZE = 10;
const INVOICE_STATUSES = ['Pending', 'Paid', 'Overdue', 'Failed', 'Refunded', 'Cancelled'];
const PAYMENT_METHODS = ['UPI', 'Bank Transfer', 'Card', 'Cash', 'Cheque', 'Online'];
const UNPAID = ['Pending', 'Overdue', 'Failed'];

function toDateInput(v) {
  const d = v ? new Date(v) : new Date();
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function invoiceTotal(inv) {
  if (inv?.totalAmount !== null && inv?.totalAmount !== undefined) return inv.totalAmount;
  return Number(inv?.amount || 0) + Number(inv?.tax || 0);
}

function invoiceSubtotal(inv) {
  if (inv?.subtotal !== null && inv?.subtotal !== undefined) return inv.subtotal;
  if (inv?.source === 'RAZORPAY_SUBSCRIPTION') return Number(inv?.amount || 0) - Number(inv?.tax || 0);
  return Number(inv?.amount || 0);
}

function fmt(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

const ROW_ACTION_CLASS =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white';

function statusVariant(status) {
  if (status === 'Paid') return 'success';
  if (status === 'Overdue' || status === 'Failed' || status === 'Cancelled') return 'danger';
  if (status === 'Refunded') return 'info';
  return 'warning';
}

/**
 * Platform-wide invoice ledger — read only.
 *
 * Invoices are raised automatically: by the Razorpay webhook on every successful
 * recurring charge, and once up front when a school is put on a plan. There is
 * deliberately no "create invoice" action here.
 */
export default function InvoicesPanel() {
  const { addNotification } = useSuperAdminNotifications();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Row actions
  const [viewTarget, setViewTarget] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ paidAt: '', paymentMethod: 'Bank Transfer', paymentReference: '' });
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await platformBillingApi.list({
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          status: filterStatus,
        });
        setInvoices(result?.data || []);
        setPagination(result?.pagination || { page: 1, totalPages: 1, total: 0 });
        setStats(result?.stats || null);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to load invoices');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, filterStatus]
  );

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  const errorMessage = (err, fallback) => err.response?.data?.message || err.message || fallback;

  const openView = async (invoice) => {
    setViewTarget(invoice);
    setViewLoading(true);
    try {
      const result = await platformBillingApi.get(invoice.id);
      if (result?.data) setViewTarget(result.data);
    } catch (err) {
      addNotification('error', errorMessage(err, 'Unable to load invoice'));
    } finally {
      setViewLoading(false);
    }
  };

  const openPay = (invoice) => {
    setPayForm({ paidAt: toDateInput(), paymentMethod: invoice.paymentMethod || 'Bank Transfer', paymentReference: invoice.paymentReference || '' });
    setPayTarget(invoice);
  };

  const submitPay = async (e) => {
    e.preventDefault();
    if (!payTarget) return;
    setBusy(true);
    try {
      await platformBillingApi.markPaid(payTarget.id, {
        paidAt: payForm.paidAt ? new Date(payForm.paidAt).toISOString() : undefined,
        paymentMethod: payForm.paymentMethod,
        paymentReference: payForm.paymentReference.trim(),
      });
      addNotification('success', `${payTarget.invoiceNumber} marked as paid`);
      setPayTarget(null);
      load(true);
    } catch (err) {
      addNotification('error', errorMessage(err, 'Unable to mark invoice as paid'));
    } finally {
      setBusy(false);
    }
  };

  const submitRefund = async (e) => {
    e.preventDefault();
    if (!refundTarget) return;
    setBusy(true);
    try {
      await platformBillingApi.refund(refundTarget.id, { reason: refundReason.trim() });
      addNotification('success', `${refundTarget.invoiceNumber} refunded`);
      setRefundTarget(null);
      setRefundReason('');
      load(true);
    } catch (err) {
      addNotification('error', errorMessage(err, 'Unable to refund invoice'));
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      await platformBillingApi.cancel(cancelTarget.id);
      addNotification('success', `${cancelTarget.invoiceNumber} cancelled`);
      setCancelTarget(null);
      load(true);
    } catch (err) {
      addNotification('error', errorMessage(err, 'Unable to cancel invoice'));
    } finally {
      setBusy(false);
    }
  };

  const print = (invoice) => {
    if (invoice.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!openInvoiceDocument(invoice, null)) {
      addNotification('error', 'Allow pop-ups for this site to open the invoice.');
    }
  };

  const kpis = [
    {
      label: 'Collected',
      value: inr(stats?.collectedAmount),
      sub: `${stats?.paid || 0} paid invoices`,
      icon: Wallet,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Outstanding',
      value: inr(stats?.outstandingAmount),
      sub: `${stats?.pending || 0} pending`,
      icon: Clock3,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Overdue',
      value: stats?.overdue ?? 0,
      sub: 'Needs follow-up',
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
    },
    {
      label: 'Total billed',
      value: inr(stats?.totalAmount),
      sub: `${stats?.totalCount || 0} invoices`,
      icon: Banknote,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Invoices</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Raised automatically on every successful recurring charge · Mark paid, refund or cancel from the row actions.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Refresh invoices"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'text-indigo-600' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {c.label}
                </span>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${c.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${c.color}`} />
                </div>
              </div>
              <div className="mt-2 text-xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                {c.value}
              </div>
              <div className="mt-0.5 truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">{c.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-2.5 dark:border-slate-800/80 dark:bg-slate-900/50 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice, school or plan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-xl border border-slate-200/90 bg-white pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="w-full md:w-48">
          <Select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All statuses</option>
            {INVOICE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-center text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-rose-500" />
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => load()}
            className="mt-3 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-xs [&_td]:pr-5 [&_th]:pr-5 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
              <thead className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/90 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Invoice</th>
                  <th className="px-4 py-3.5">School</th>
                  <th className="px-4 py-3.5">Plan</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5">Issued</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-4">
                          <Pulse className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        <Receipt className="h-6 w-6" />
                      </div>
                      <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">No invoices found</h3>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
                        {search || filterStatus !== 'All'
                          ? 'Nothing matches the current search or filter.'
                          : 'Invoices appear here automatically once a school subscription is charged.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-850/40">
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                          {invoice.invoiceNumber}
                        </div>
                        {invoice.source === 'RAZORPAY_SUBSCRIPTION' && (
                          <span className="mt-0.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Recurring
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{invoice.schoolName}</div>
                        {invoice.schoolCode && (
                          <div className="font-mono text-[10px] text-slate-400">{invoice.schoolCode}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{invoice.planName}</div>
                        <div className="text-[10px] text-slate-400">{invoice.planType}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">
                        <div className="font-bold text-slate-900 dark:text-white">{inr(invoiceTotal(invoice))}</div>
                        {Number(invoice.tax) > 0 && (
                          <div className="text-[10px] font-medium text-slate-400">
                            {inr(invoiceSubtotal(invoice))} + {inr(invoice.tax)} tax
                            {invoice.taxPercent !== null && invoice.taxPercent !== undefined ? ` (${invoice.taxPercent}%)` : ''}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        {fmt(invoice.issuedAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="View invoice"
                            aria-label="View invoice"
                            onClick={() => openView(invoice)}
                            className={ROW_ACTION_CLASS}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => print(invoice)}
                            title={invoice.pdfUrl ? 'Open the Razorpay-hosted invoice' : 'Open the invoice and print or save it as PDF'}
                            aria-label="Print invoice"
                            className={ROW_ACTION_CLASS}
                          >
                            {invoice.pdfUrl ? <ExternalLink size={13} /> : <Printer size={13} />}
                          </button>
                          {UNPAID.includes(invoice.status) && (
                            <>
                              <button
                                type="button"
                                title="Mark as paid"
                                aria-label="Mark as paid"
                                onClick={() => openPay(invoice)}
                                className={`${ROW_ACTION_CLASS} hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400`}
                              >
                                <CheckCircle2 size={13} />
                              </button>
                              <button
                                type="button"
                                title="Cancel invoice"
                                aria-label="Cancel invoice"
                                onClick={() => setCancelTarget(invoice)}
                                className={`${ROW_ACTION_CLASS} hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400`}
                              >
                                <Ban size={13} />
                              </button>
                            </>
                          )}
                          {invoice.status === 'Paid' && (
                            <button
                              type="button"
                              title="Refund invoice"
                              aria-label="Refund invoice"
                              onClick={() => {
                                setRefundReason('');
                                setRefundTarget(invoice);
                              }}
                              className={`${ROW_ACTION_CLASS} hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-400`}
                            >
                              <Undo2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-900/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page <span className="font-bold text-slate-800 dark:text-slate-200">{pagination.page}</span> of{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{pagination.totalPages}</span> ·{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{pagination.total}</span> invoices
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW INVOICE */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Receipt size={16} />
              </div>
              <span className="font-mono">{viewTarget?.invoiceNumber}</span>
              {viewTarget && <Badge variant={statusVariant(viewTarget.status)}>{viewTarget.status}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className={`mt-3 space-y-4 text-xs ${viewLoading ? 'opacity-60' : ''}`}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {[
                  ['School', `${viewTarget.schoolName}${viewTarget.schoolCode ? ` (${viewTarget.schoolCode})` : ''}`],
                  ['Plan', `${viewTarget.planName} · ${viewTarget.planType}`],
                  ['Issued', fmt(viewTarget.issuedAt)],
                  ['Due', fmt(viewTarget.dueAt)],
                  ['Paid on', fmt(viewTarget.paidAt)],
                  ['Refunded on', fmt(viewTarget.refundedAt)],
                  ['Payment method', viewTarget.paymentMethod || '—'],
                  ['Reference', viewTarget.paymentReference || viewTarget.razorpayInvoiceId || '—'],
                  ['Source', viewTarget.source === 'RAZORPAY_SUBSCRIPTION' ? 'Razorpay recurring' : 'Manual / local'],
                  [
                    'Billing period',
                    viewTarget.billingPeriodStart && viewTarget.billingPeriodEnd
                      ? `${fmt(viewTarget.billingPeriodStart)} — ${fmt(viewTarget.billingPeriodEnd)}`
                      : '—',
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</dt>
                    <dd className="mt-0.5 break-all font-semibold text-slate-800 dark:text-slate-200">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{inr(invoiceSubtotal(viewTarget))}</span>
                </div>
                <div className="mt-1 flex justify-between text-slate-600 dark:text-slate-300">
                  <span>
                    Tax{viewTarget.taxPercent !== null && viewTarget.taxPercent !== undefined ? ` (${viewTarget.taxPercent}%)` : ''}
                  </span>
                  <span className="tabular-nums">{inr(viewTarget.tax)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900 dark:border-slate-700 dark:text-white">
                  <span>Total</span>
                  <span className="tabular-nums">{inr(invoiceTotal(viewTarget))}</span>
                </div>
              </div>
              {viewTarget.notes && (
                <p className="whitespace-pre-line rounded-xl border border-slate-200/80 p-3 text-slate-500 dark:border-slate-800">{viewTarget.notes}</p>
              )}
              <div className="flex justify-end">
                <Button type="button" variant="outline" className="gap-2" onClick={() => print(viewTarget)}>
                  {viewTarget.pdfUrl ? <ExternalLink size={14} /> : <Printer size={14} />}
                  PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MARK PAID */}
      <Dialog open={Boolean(payTarget)} onOpenChange={(o) => !o && !busy && setPayTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 size={16} />
              </div>
              <span>Mark invoice as paid</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitPay} className="mt-3 space-y-4">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              <p className="font-bold text-slate-800 dark:text-slate-100">
                {payTarget?.invoiceNumber} · {payTarget?.schoolName}
              </p>
              <p className="mt-0.5">
                {payTarget?.planName} · Total {inr(invoiceTotal(payTarget))}
              </p>
            </div>
            <Input
              label="Paid on"
              type="date"
              value={payForm.paidAt}
              max={toDateInput()}
              onChange={(e) => setPayForm((f) => ({ ...f, paidAt: e.target.value }))}
              required
            />
            <Select
              label="Payment method"
              value={payForm.paymentMethod}
              onChange={(e) => setPayForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              required
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Input
              label="Reference (UTR / cheque no. / txn id)"
              value={payForm.paymentReference}
              onChange={(e) => setPayForm((f) => ({ ...f, paymentReference: e.target.value }))}
              placeholder="Optional"
            />
            <p className="text-[11px] text-slate-500">
              Marking as paid activates the school’s manual plan period from the paid date.
            </p>
            <Button type="submit" className="w-full gap-2" disabled={busy}>
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Saving…' : 'Mark as paid'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* REFUND */}
      <Dialog open={Boolean(refundTarget)} onOpenChange={(o) => !o && !busy && setRefundTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Undo2 size={16} />
              </div>
              <span>Refund invoice</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitRefund} className="mt-3 space-y-4">
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <p className="font-bold">
                {refundTarget?.invoiceNumber} · {refundTarget?.schoolName}
              </p>
              <p className="mt-1">
                {inr(invoiceTotal(refundTarget))} paid on {fmt(refundTarget?.paidAt)}. This only records the refund — move the money in
                Razorpay or your bank separately.
              </p>
            </div>
            <Textarea
              label="Reason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Why is this invoice being refunded?"
              className="min-h-[80px]"
              required
            />
            <Button type="submit" variant="destructive" className="w-full gap-2" disabled={busy}>
              <Undo2 className="h-4 w-4" />
              {busy ? 'Refunding…' : 'Record refund'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* CANCEL */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(o) => !o && !busy && setCancelTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                <Ban size={16} />
              </div>
              <span>Cancel invoice</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 space-y-4">
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              <p className="font-bold">
                {cancelTarget?.invoiceNumber} · {cancelTarget?.schoolName}
              </p>
              <p className="mt-1">
                {inr(invoiceTotal(cancelTarget))} · {cancelTarget?.status}. A cancelled invoice can no longer be collected or marked
                as paid.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCancelTarget(null)} disabled={busy}>
                Keep invoice
              </Button>
              <Button type="button" variant="destructive" className="flex-1" onClick={doCancel} disabled={busy}>
                {busy ? 'Cancelling…' : 'Cancel invoice'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

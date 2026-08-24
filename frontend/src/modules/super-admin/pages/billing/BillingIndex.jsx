import React, { useEffect, useMemo, useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Button, Badge, Card } from '../../components/ui/Button';
import { KpiIcon } from '../../components/dashboard/StatCard';
import { Input, Select, Textarea } from '../../components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/Dialog';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import {
  platformBillingApi,
  platformSchoolApi,
  platformSubscriptionApi,
} from '../../../../shared/api/client';
import BrandLogo from '../../../../shared/ui/BrandLogo';
import { formatDate } from '../../utils/formatters';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock3,
  Eye,
  Loader2,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  Wallet,
} from 'lucide-react';

const PAGE_SIZE = 8;
const INVOICE_STATUSES = ['Pending', 'Paid', 'Overdue', 'Failed', 'Refunded', 'Cancelled'];
const PAYMENT_METHODS = ['UPI', 'Bank Transfer', 'Card', 'Cash', 'Cheque', 'Online'];

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

const emptyStats = {
  totalCount: 0,
  totalAmount: 0,
  collectedAmount: 0,
  outstandingAmount: 0,
  paid: 0,
  pending: 0,
  overdue: 0,
  refunded: 0,
};

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysInput(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    schoolId: '',
    planName: '',
    planType: 'Monthly',
    amount: '',
    issuedAt: todayInput(),
    dueAt: plusDaysInput(14),
    status: 'Pending',
    paymentMethod: '',
    notes: '',
  };
}

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function canCollect(status) {
  return ['Pending', 'Overdue', 'Failed'].includes(status);
}

function Pulse({ className }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

function ActionIcon({ label, onClick, className, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
    >
      {children}
    </button>
  );
}

function BillingTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>School</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Issued</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell><Pulse className="h-3.5 w-28" /></TableCell>
            <TableCell>
              <Pulse className="mb-1.5 h-3.5 w-36" />
              <Pulse className="h-2.5 w-16" />
            </TableCell>
            <TableCell><Pulse className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell><Pulse className="h-3.5 w-20" /></TableCell>
            <TableCell><Pulse className="h-3 w-24" /></TableCell>
            <TableCell><Pulse className="h-3 w-24" /></TableCell>
            <TableCell><Pulse className="h-6 w-16 rounded-full" /></TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Pulse className="h-7 w-7 rounded-lg" />
                <Pulse className="h-7 w-7 rounded-lg" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{value || '—'}</p>
    </div>
  );
}

export default function BillingIndex() {
  const { addNotification } = useSuperAdminNotifications();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [schools, setSchools] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [viewing, setViewing] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [payMethod, setPayMethod] = useState('UPI');
  const [refundTarget, setRefundTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [gateway, setGateway] = useState({ razorpay: false, keyId: '' });

  const loadInvoices = async (nextPage = page) => {
    setLoading(true);
    try {
      const result = await platformBillingApi.list({
        search: search || undefined,
        status: filterStatus,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      const meta = result.pagination || { page: nextPage, limit: PAGE_SIZE, total: (result.data || []).length, totalPages: 1 };
      if (meta.totalPages > 0 && nextPage > meta.totalPages) {
        setPage(meta.totalPages);
        return;
      }
      setInvoices(result.data || []);
      setPagination(meta);
      setStats(result.stats || emptyStats);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInvoices(page);
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, filterStatus, page]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [schoolResult, planResult, gatewayResult] = await Promise.all([
          platformSchoolApi.list({ page: 1, limit: 50, status: 'All', plan: 'All' }),
          platformSubscriptionApi.list(),
          platformBillingApi.gateway().catch(() => ({ data: { razorpay: false } })),
        ]);
        setSchools(schoolResult.data || []);
        setPlans(planResult.data || []);
        setGateway(gatewayResult.data || { razorpay: false });
      } catch (err) {
        addNotification('error', err.response?.data?.message || err.message || 'Unable to load billing lookups.');
      }
    };
    loadLookups();
  }, []);

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === form.schoolId),
    [schools, form.schoolId]
  );

  const applyPlan = (planName, nextForm = form) => {
    const plan = plans.find((item) => item.name === planName);
    return {
      ...nextForm,
      planName,
      planType: plan?.planType || nextForm.planType,
      amount: plan ? String(plan.price) : nextForm.amount,
    };
  };

  const handleSchoolChange = (schoolId) => {
    const school = schools.find((item) => item.id === schoolId);
    const assignedPlan = plans.find((plan) => plan.name === school?.subscriptionPlan);
    setForm((prev) =>
      applyPlan(assignedPlan?.name || prev.planName, {
        ...prev,
        schoolId,
      })
    );
  };

  const resetForm = () => setForm(emptyForm());

  const handleCreateInvoice = async (event) => {
    event.preventDefault();
    if (!form.schoolId || !form.planName || form.amount === '') return;

    setSaving(true);
    try {
      const result = await platformBillingApi.create({
        schoolId: form.schoolId,
        planName: form.planName,
        planType: form.planType,
        amount: Number(form.amount),
        issuedAt: form.issuedAt,
        dueAt: form.dueAt,
        status: form.status,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      });
      addNotification('success', result.message || `Invoice created: ${result.data?.invoiceNumber}`);
      setCreateOpen(false);
      resetForm();
      setPage(1);
      await loadInvoices(1);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!payTarget) return;
    setActing(true);
    try {
      const result = await platformBillingApi.markPaid(payTarget.id, { paymentMethod: payMethod });
      addNotification('success', result.message || `Payment recorded for ${payTarget.invoiceNumber}`);
      setPayTarget(null);
      setViewing((current) => (current?.id === result.data.id ? result.data : current));
      await loadInvoices(page);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to mark invoice as paid.');
    } finally {
      setActing(false);
    }
  };

  const handleOnlineCollect = async () => {
    if (!payTarget) return;
    setActing(true);
    try {
      const orderResult = await platformBillingApi.createRazorpayOrder(payTarget.id);
      const RazorpayCheckout = await loadRazorpayScript();
      const invoiceId = payTarget.id;
      await new Promise((resolve, reject) => {
        const checkout = new RazorpayCheckout({
          key: orderResult.data.keyId,
          amount: orderResult.data.amount,
          currency: orderResult.data.currency,
          order_id: orderResult.data.orderId,
          name: 'School CRM',
          description: payTarget.invoiceNumber,
          handler: async (response) => {
            try {
              const result = await platformBillingApi.verifyRazorpay(invoiceId, {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              addNotification('success', result.message || `Online payment recorded for ${payTarget.invoiceNumber}`);
              setPayTarget(null);
              setViewing((current) => (current?.id === result.data.id ? result.data : current));
              await loadInvoices(page);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => resolve(),
          },
        });
        checkout.on('payment.failed', (response) => {
          reject(new Error(response?.error?.description || 'Online payment failed'));
        });
        checkout.open();
      });
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to collect online payment.');
    } finally {
      setActing(false);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    setActing(true);
    try {
      const result = await platformBillingApi.refund(refundTarget.id);
      addNotification('warning', result.message || `Refund issued for ${refundTarget.invoiceNumber}`);
      setRefundTarget(null);
      setViewing((current) => (current?.id === result.data.id ? result.data : current));
      await loadInvoices(page);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to refund invoice.');
    } finally {
      setActing(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setActing(true);
    try {
      const result = await platformBillingApi.cancel(cancelTarget.id);
      addNotification('info', result.message || `Invoice cancelled: ${cancelTarget.invoiceNumber}`);
      setCancelTarget(null);
      setViewing((current) => (current?.id === result.data.id ? result.data : current));
      await loadInvoices(page);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to cancel invoice.');
    } finally {
      setActing(false);
    }
  };

  const handlePrint = (invoice) => {
    const win = window.open('', '_blank', 'width=820,height=980');
    if (!win) {
      addNotification('error', 'Please allow pop-ups to print the invoice.');
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Inter, Segoe UI, sans-serif; color: #0f172a; padding: 40px; }
            .row { display: flex; justify-content: space-between; gap: 24px; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            .muted { color: #64748b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { text-align: left; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .total { font-size: 18px; font-weight: 700; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #eef2ff; color: #4f46e5; font-size: 12px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="row">
            <div>
              <h1>School CRM</h1>
              <div class="muted">Subscription invoice</div>
            </div>
            <div style="text-align:right">
              <div class="badge">${invoice.status}</div>
              <div style="margin-top:8px;font-weight:700">${invoice.invoiceNumber}</div>
            </div>
          </div>
          <div class="row" style="margin-top:28px">
            <div>
              <div class="muted">Billed to</div>
              <div style="font-weight:700">${invoice.schoolName}</div>
              <div class="muted">${invoice.schoolCode || ''}</div>
            </div>
            <div style="text-align:right">
              <div class="muted">Issued ${formatDate(invoice.issuedAt)}</div>
              <div class="muted">Due ${formatDate(invoice.dueAt)}</div>
            </div>
          </div>
          <table>
            <thead><tr><th>Description</th><th>Cycle</th><th>Amount</th></tr></thead>
            <tbody>
              <tr>
                <td>${invoice.planName}</td>
                <td>${invoice.planType}</td>
                <td>${formatINR(invoice.amount)}</td>
              </tr>
            </tbody>
          </table>
          <div class="row" style="margin-top:18px">
            <div class="muted">${invoice.paymentMethod ? `Payment method: ${invoice.paymentMethod}` : ''}${invoice.paymentReference ? ` · Ref ${invoice.paymentReference}` : ''}</div>
            <div class="total">Total ${formatINR(invoice.amount)}</div>
          </div>
          ${invoice.notes ? `<p class="muted" style="margin-top:24px">${invoice.notes}</p>` : ''}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billings</h1>
          <p className="text-xs text-slate-400">
            Create school subscription invoices, record payments, issue refunds, and print receipts.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} className="mr-1.5" />
          Create Invoice
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="flex items-center gap-4">
              <Pulse className="h-12 w-12 rounded-lg" />
              <div className="space-y-2">
                <Pulse className="h-2.5 w-20" />
                <Pulse className="h-6 w-24" />
                <Pulse className="h-2.5 w-28" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Collected</p>
              <p className="truncate text-2xl font-bold tracking-tight">{formatINR(stats.collectedAmount)}</p>
              <p className="text-xs text-slate-500">{stats.paid} paid invoices</p>
            </div>
            <KpiIcon icon={Wallet} tone="emerald" />
          </Card>
          <Card className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Outstanding</p>
              <p className="truncate text-2xl font-bold tracking-tight">{formatINR(stats.outstandingAmount)}</p>
              <p className="text-xs text-slate-500">{stats.pending} pending</p>
            </div>
            <KpiIcon icon={Clock3} tone="amber" />
          </Card>
          <Card className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overdue</p>
              <p className="truncate text-2xl font-bold tracking-tight">{stats.overdue}</p>
              <p className="text-xs text-slate-500">Needs follow-up</p>
            </div>
            <KpiIcon icon={AlertTriangle} tone="rose" />
          </Card>
          <Card className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total billed</p>
              <p className="truncate text-2xl font-bold tracking-tight">{formatINR(stats.totalAmount)}</p>
              <p className="text-xs text-slate-500">{stats.totalCount} invoices</p>
            </div>
            <KpiIcon icon={Banknote} tone="indigo" />
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 dark:border-slate-800/80 dark:bg-slate-950">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice, school, plan..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={filterStatus}
          onChange={(event) => {
            setFilterStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="All">All invoice statuses</option>
          {INVOICE_STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <BillingTableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-16 text-center">
                  <Receipt className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">No invoices found</p>
                  <p className="mt-1 text-xs text-slate-400">Click “Create Invoice” to bill a school for its subscription.</p>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{invoice.schoolName}</div>
                    <div className="font-mono text-[11px] text-slate-400">{invoice.schoolCode}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{invoice.planName}</div>
                    <div className="text-xs text-slate-400">{invoice.planType}</div>
                  </TableCell>
                  <TableCell className="font-semibold">{formatINR(invoice.amount)}</TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDate(invoice.issuedAt)}</TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDate(invoice.dueAt)}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status}>{invoice.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900">
                      <ActionIcon label="View invoice" onClick={() => setViewing(invoice)} className="hover:text-indigo-600">
                        <Eye size={15} />
                      </ActionIcon>
                      <ActionIcon label="Print receipt" onClick={() => handlePrint(invoice)} className="hover:text-indigo-600">
                        <Printer size={15} />
                      </ActionIcon>
                      {canCollect(invoice.status) && (
                        <ActionIcon
                          label="Mark as paid"
                          onClick={() => {
                            setPayMethod(invoice.paymentMethod || 'UPI');
                            setPayTarget(invoice);
                          }}
                          className="hover:text-emerald-600"
                        >
                          <CheckCircle2 size={15} />
                        </ActionIcon>
                      )}
                      {invoice.status === 'Paid' && (
                        <ActionIcon label="Refund invoice" onClick={() => setRefundTarget(invoice)} className="hover:text-amber-600">
                          <RotateCcw size={15} />
                        </ActionIcon>
                      )}
                      {canCollect(invoice.status) && (
                        <ActionIcon label="Cancel invoice" onClick={() => setCancelTarget(invoice)} className="hover:text-rose-600">
                          <CircleX size={15} />
                        </ActionIcon>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {!loading && pagination.total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} invoices
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-900"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-xs font-semibold transition ${
                  pageNumber === page
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-900"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create invoice</DialogTitle>
            <DialogDescription>Bill a school for its subscription plan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <Select
              label="School"
              value={form.schoolId}
              onChange={(event) => handleSchoolChange(event.target.value)}
              required
            >
              <option value="">Select school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name} ({school.code})
                </option>
              ))}
            </Select>
            <Select
              label="Plan"
              value={form.planName}
              onChange={(event) => setForm((prev) => applyPlan(event.target.value, prev))}
              required
            >
              <option value="">Select plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.name}>
                  {plan.name} · ₹{plan.price} / {plan.planType.toLowerCase()}
                </option>
              ))}
            </Select>
            {selectedSchool && !selectedSchool.subscriptionPlan && (
              <p className="text-[11px] text-amber-600">This school has no assigned plan. Choose one before billing.</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount (₹)"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                required
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Issued date"
                type="date"
                value={form.issuedAt}
                onChange={(event) => setForm((prev) => ({ ...prev, issuedAt: event.target.value }))}
                required
              />
              <Input
                label="Due date"
                type="date"
                value={form.dueAt}
                onChange={(event) => setForm((prev) => ({ ...prev, dueAt: event.target.value }))}
                required
              />
            </div>
            {form.status === 'Paid' && (
              <Select
                label="Payment method"
                value={form.paymentMethod}
                onChange={(event) => setForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}
                required
              >
                <option value="">Select method</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </Select>
            )}
            <Textarea
              label="Notes"
              placeholder="Optional billing note"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="min-h-[88px]"
            />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Invoice'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Invoice details</DialogTitle>
            <DialogDescription>Receipt for this school subscription charge.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <BrandLogo className="h-10 w-10" />
                  <div>
                    <p className="font-semibold">{viewing.schoolName}</p>
                    <p className="font-mono text-xs text-slate-500">{viewing.invoiceNumber}</p>
                  </div>
                </div>
                <Badge variant={viewing.status}>{viewing.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Detail label="Plan" value={`${viewing.planName} · ${viewing.planType}`} />
                <Detail label="Amount" value={formatINR(viewing.amount)} />
                <Detail label="Issued" value={formatDate(viewing.issuedAt)} />
                <Detail label="Due" value={formatDate(viewing.dueAt)} />
                <Detail label="Paid on" value={viewing.paidAt ? formatDate(viewing.paidAt) : '—'} />
                <Detail label="Payment method" value={viewing.paymentMethod || '—'} />
                <Detail label="Payment reference" value={viewing.paymentReference || '—'} />
              </div>
              {viewing.notes && <Detail label="Notes" value={viewing.notes} />}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="gap-2" onClick={() => handlePrint(viewing)}>
                  <Printer size={14} />
                  Print receipt
                </Button>
                {canCollect(viewing.status) && (
                  <Button
                    className="gap-2"
                    onClick={() => {
                      setPayMethod(viewing.paymentMethod || 'UPI');
                      setPayTarget(viewing);
                    }}
                  >
                    <CheckCircle2 size={14} />
                    Mark paid
                  </Button>
                )}
                {viewing.status === 'Paid' && (
                  <Button variant="destructive" className="gap-2" onClick={() => setRefundTarget(viewing)}>
                    <RotateCcw size={14} />
                    Refund
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(payTarget)} onOpenChange={(open) => { if (!open && !acting) setPayTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>Mark this invoice as collected from the school.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Record <span className="font-semibold">{formatINR(payTarget?.amount)}</span> for{' '}
            <span className="font-semibold">{payTarget?.invoiceNumber}</span>.
          </p>
          <Select label="Payment method" value={payMethod} onChange={(event) => setPayMethod(event.target.value)}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>{method}</option>
            ))}
          </Select>
          <div className="flex flex-col gap-3">
            {gateway.razorpay && (
              <Button type="button" className="w-full gap-2" disabled={acting} onClick={handleOnlineCollect}>
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                Collect online
              </Button>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" disabled={acting} onClick={() => setPayTarget(null)}>
                Cancel
              </Button>
              <Button type="button" className="flex-1 gap-2" disabled={acting} onClick={handleMarkPaid}>
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Mark as paid
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(refundTarget)} onOpenChange={(open) => { if (!open && !acting) setRefundTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Refund invoice</DialogTitle>
            <DialogDescription>This will reverse a collected payment.</DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <RotateCcw className="h-4 w-4" />
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Refund <span className="font-semibold">{formatINR(refundTarget?.amount)}</span> for{' '}
              <span className="font-semibold">{refundTarget?.invoiceNumber}</span>?
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" disabled={acting} onClick={() => setRefundTarget(null)}>
              Keep paid
            </Button>
            <Button type="button" variant="destructive" className="flex-1 gap-2" disabled={acting} onClick={handleRefund}>
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Issue refund
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => { if (!open && !acting) setCancelTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel invoice</DialogTitle>
            <DialogDescription>Unpaid invoices can be cancelled. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Cancel <span className="font-semibold">{cancelTarget?.invoiceNumber}</span> for{' '}
              <span className="font-semibold">{cancelTarget?.schoolName}</span>?
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" disabled={acting} onClick={() => setCancelTarget(null)}>
              Keep invoice
            </Button>
            <Button type="button" variant="destructive" className="flex-1 gap-2" disabled={acting} onClick={handleCancel}>
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleX className="h-4 w-4" />}
              Cancel invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import {
  CreditCard,
  Loader2,
  ExternalLink,
  Ban,
  ArrowUpRight,
  Receipt,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { schoolSubscriptionApi, platformSubscriptionApi } from '../../../../shared/api/client';

const STATUS_LABEL = {
  created: { label: 'Awaiting Checkout', tone: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  authenticated: { label: 'Authenticated', tone: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20' },
  active: { label: 'Active Mandate', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
  pending: { label: 'Payment Retrying', tone: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
  halted: { label: 'Past Due', tone: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
  paused: { label: 'Paused', tone: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
  cancelled: { label: 'Cancelled', tone: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
  completed: { label: 'Completed', tone: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
  expired: { label: 'Expired', tone: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
  failed: { label: 'Failed', tone: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
};

function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
}

export default function RecurringSubscriptionSection({ schoolName }) {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recurringPlans, setRecurringPlans] = useState([]);
  const [checkoutBusy, setCheckoutBusy] = useState('');
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tab, setTab] = useState('payments');
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [changeTo, setChangeTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [subRes, plansRes] = await Promise.all([
        schoolSubscriptionApi.get(),
        platformSubscriptionApi.list().catch(() => ({ data: [] })),
      ]);
      setSub(subRes?.data || null);
      setRecurringPlans((plansRes?.data || []).filter((p) => p.isRecurring && p.status !== 'archived'));
      if (subRes?.data) {
        const [p, i] = await Promise.all([
          schoolSubscriptionApi.payments({ limit: 10 }).catch(() => ({ data: [] })),
          schoolSubscriptionApi.invoices({ limit: 10 }).catch(() => ({ data: [] })),
        ]);
        setPayments(p?.data || []);
        setInvoices(i?.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load subscription');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startCheckout = async (planId) => {
    setCheckoutBusy(planId);
    setError('');
    try {
      const result = await schoolSubscriptionApi.checkout(planId);
      const { subscription, razorpayKeyId, razorpaySubscriptionId } = result.data;
      const RazorpayCtor = await loadRazorpayScript();
      if (!RazorpayCtor) {
        setError('Could not load Razorpay checkout. Check your connection and try again.');
        return;
      }
      const rzp = new RazorpayCtor({
        key: razorpayKeyId,
        subscription_id: razorpaySubscriptionId,
        name: schoolName || 'School Subscription',
        description: 'Recurring subscription setup',
        handler: () => {
          load();
        },
        theme: { color: '#4f46e5' },
      });
      rzp.on('payment.failed', () => setError('Payment authorization failed. You can retry from this page.'));
      rzp.open();
      setSub(subscription);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to start checkout');
    } finally {
      setCheckoutBusy('');
    }
  };

  const doCancel = async () => {
    setActionBusy(true);
    try {
      const result = await schoolSubscriptionApi.cancel('Requested by school admin');
      setSub(result.data);
      setConfirmCancel(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to cancel subscription');
    } finally {
      setActionBusy(false);
    }
  };

  const doChangePlan = async () => {
    if (!changeTo) return;
    setActionBusy(true);
    try {
      const result = await schoolSubscriptionApi.changePlan(changeTo);
      setSub(result.data);
      setChangeTo('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to change plan');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="h-48 animate-pulse rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
    );
  }

  const statusMeta = sub ? STATUS_LABEL[sub.status] || STATUS_LABEL.created : null;

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <RefreshCw className="h-4 w-4" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Recurring Billing &amp; Renewals
            </h3>
          </div>
          <p className="mt-1 text-base font-black text-slate-900 dark:text-white">
            Automated Razorpay Mandate
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Manage your auto-renewal schedule, switch tiers, or review past transaction receipts.
          </p>
        </div>

        {sub && (
          <span className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-xs font-bold sm:self-auto ${statusMeta.tone}`}>
            <span className="h-2 w-2 rounded-full bg-current" />
            {statusMeta.label}
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {!sub ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Enable Automated Renewal for Seamless Portal Access</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Setting up a recurring subscription ensures uninterrupted CRM services for teachers, students, and parents with automated billing receipts.
            </p>
          </div>

          {recurringPlans.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-slate-800">
              No recurring plans are configured yet. Contact Super Admin to enable recurring billing.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recurringPlans.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {p.billingInterval}
                    </span>
                    <p className="mt-2 text-base font-black text-slate-900 dark:text-white">{p.name}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {inr(p.price)}
                      <span className="text-xs font-semibold text-slate-400"> /{p.billingInterval}</span>
                    </p>
                    {p.trialDays > 0 && (
                      <p className="mt-1 text-[11px] font-bold text-emerald-600">
                        {p.trialDays}-day free trial included
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => startCheckout(p.id)}
                    disabled={Boolean(checkoutBusy)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {checkoutBusy === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    <span>Set Up Auto-Renew</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* 4 Bento metrics */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Mandate Plan</p>
              <p className="mt-1 text-base font-black text-slate-900 dark:text-white">
                {sub.plan?.name || '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Recurring Amount</p>
              <p className="mt-1 text-base font-black text-slate-900 dark:text-white">
                {inr(sub.totalAmount)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Period Ends</p>
              <p className="mt-1 text-base font-black text-slate-900 dark:text-white">
                {fmtDate(sub.currentPeriodEnd)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Next Auto-Charge</p>
              <p className="mt-1 text-base font-black text-slate-900 dark:text-white">
                {fmtDate(sub.nextBillingAt)}
              </p>
            </div>
          </div>

          {sub.status === 'created' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              <span>Your mandate has been initiated but checkout is incomplete.</span>
              <button
                type="button"
                onClick={() => startCheckout(sub.planId)}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Complete Checkout
              </button>
            </div>
          )}

          {sub.cancelAtPeriodEnd && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              Cancellation is scheduled. Your school maintains full access until {fmtDate(sub.currentPeriodEnd)}, after which recurring auto-debit will halt.
            </div>
          )}

          {/* Action Bar (Only Cancel) */}
          {['active', 'pending', 'halted'].includes(sub.status) && !sub.cancelAtPeriodEnd && (
            <div className="flex items-center justify-end rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-50 dark:border-rose-900/40 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/20"
              >
                <Ban className="h-3.5 w-3.5" /> Cancel Auto-Renew
              </button>
            </div>
          )}

          {/* Cancellation Prompt Modal/Card */}
          {confirmCancel && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-5 dark:border-rose-900/40 dark:bg-rose-950/30">
              <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Are you sure you want to stop recurring renewals?
              </p>
              <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                Your portal will remain active until {fmtDate(sub.currentPeriodEnd)}. After this date, you will need to manually pay to maintain access.
              </p>
              <div className="mt-4 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Keep Subscription
                </button>
                <button
                  type="button"
                  onClick={doCancel}
                  disabled={actionBusy}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
                >
                  {actionBusy ? 'Cancelling…' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          )}

          {/* Payments and Invoices Tabs */}
          <div className="space-y-4 pt-2">
            <div className="flex gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTab('payments')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  tab === 'payments'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                Payments ({payments.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('invoices')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  tab === 'invoices'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Receipt className="h-3.5 w-3.5" />
                Invoices ({invoices.length})
              </button>
            </div>

            {/* Payments List */}
            {tab === 'payments' && (
              <div className="space-y-2">
                {payments.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No payment records found.</p>
                ) : (
                  payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3.5 text-xs shadow-sm transition hover:border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                            {p.razorpayPaymentId || 'Payment Reference'}
                          </p>
                          <p className="text-[10px] text-slate-400">{fmtDate(p.createdAt)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {inr(p.amount)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            p.status === 'captured'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : p.status === 'failed'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Invoices List */}
            {tab === 'invoices' && (
              <div className="space-y-2">
                {invoices.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No invoice records found.</p>
                ) : (
                  invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3.5 text-xs shadow-sm transition hover:border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</p>
                          <p className="text-[10px] text-slate-400">{fmtDate(inv.issuedAt)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {inr(inv.amount)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          }`}
                        >
                          {inv.status}
                        </span>
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400"
                          >
                            <ExternalLink className="h-3 w-3" /> View PDF
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

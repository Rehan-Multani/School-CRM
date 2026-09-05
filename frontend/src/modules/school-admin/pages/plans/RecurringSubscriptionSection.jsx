import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, ExternalLink, Ban, ArrowUpRight, Receipt } from 'lucide-react';
import { schoolSubscriptionApi, platformSubscriptionApi } from '../../../../shared/api/client';

const STATUS_LABEL = {
  created: { label: 'Awaiting checkout', tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  authenticated: { label: 'Authenticated', tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' },
  active: { label: 'Active', tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  pending: { label: 'Payment retrying', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  halted: { label: 'Past due', tone: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' },
  paused: { label: 'Paused', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  cancelled: { label: 'Cancelled', tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  completed: { label: 'Completed', tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  expired: { label: 'Expired', tone: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' },
  failed: { label: 'Failed', tone: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' },
};

function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}
function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
          // Frontend callback is NOT the source of truth — Razorpay's webhook
          // is what actually activates the subscription. Just refresh the view.
          load();
        },
        theme: { color: '#4f46e5' },
      });
      rzp.on('payment.failed', () => setError('Payment authorization failed. You can retry from this page.'));
      rzp.open();
      // Reflect the pending state immediately for UX; webhook will confirm shortly after.
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
    return <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />;
  }

  const statusMeta = sub ? STATUS_LABEL[sub.status] || STATUS_LABEL.created : null;

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Recurring Billing (Razorpay)</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Auto-renewing subscription with saved payment method. Separate from the plan above, which controls portal access.
          </p>
        </div>
        {sub && <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusMeta.tone}`}>{statusMeta.label}</span>}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
          {error}
        </div>
      )}

      {!sub ? (
        <div className="space-y-3">
          {recurringPlans.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
              No recurring plans are available yet. Contact your Super Admin.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recurringPlans.map((p) => (
                <div key={p.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    {inr(p.price)}
                    <span className="text-xs font-semibold text-slate-400"> /{p.billingInterval}</span>
                  </p>
                  {p.trialDays > 0 && <p className="text-[11px] text-emerald-600">{p.trialDays}-day free trial</p>}
                  <button
                    onClick={() => startCheckout(p.id)}
                    disabled={Boolean(checkoutBusy)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {checkoutBusy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                    Subscribe
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">Plan</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{sub.plan?.name || '—'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">Amount</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{inr(sub.totalAmount)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">Current Period Ends</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{fmtDate(sub.currentPeriodEnd)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">Next Billing</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{fmtDate(sub.nextBillingAt)}</p>
            </div>
          </div>

          {sub.status === 'created' && (
            <button
              onClick={() => startCheckout(sub.planId)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Complete checkout to activate
            </button>
          )}

          {sub.cancelAtPeriodEnd && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              Cancellation scheduled — access continues until {fmtDate(sub.currentPeriodEnd)}, then billing stops.
            </p>
          )}

          {['active', 'pending', 'halted'].includes(sub.status) && !sub.cancelAtPeriodEnd && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={changeTo}
                onChange={(e) => setChangeTo(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Change plan to…</option>
                {recurringPlans.filter((p) => p.id !== sub.plan?.id).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {inr(p.price)}/{p.billingInterval}
                  </option>
                ))}
              </select>
              <button
                onClick={doChangePlan}
                disabled={!changeTo || actionBusy}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
              >
                <ArrowUpRight className="h-3.5 w-3.5" /> Apply
              </button>
              <button
                onClick={() => setConfirmCancel(true)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/20"
              >
                <Ban className="h-3.5 w-3.5" /> Cancel subscription
              </button>
            </div>
          )}

          {confirmCancel && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                Your subscription will remain active until {fmtDate(sub.currentPeriodEnd)}. After that, recurring billing will stop. Continue?
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setConfirmCancel(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold">
                  Keep subscription
                </button>
                <button onClick={doCancel} disabled={actionBusy} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">
                  {actionBusy ? 'Cancelling…' : 'Yes, cancel'}
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
              {['payments', 'invoices'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${
                    tab === t ? 'bg-indigo-600 text-white' : 'text-slate-500'
                  }`}
                >
                  <Receipt size={13} /> {t}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {tab === 'payments' &&
                (payments.length === 0 ? (
                  <p className="py-4 text-center text-slate-400">No payments yet.</p>
                ) : (
                  payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span>{fmtDate(p.createdAt)}</span>
                      <span className="font-mono text-[11px] text-slate-400">{p.razorpayPaymentId}</span>
                      <span className="font-bold">{inr(p.amount)}</span>
                      <span className={p.status === 'captured' ? 'text-emerald-600' : p.status === 'failed' ? 'text-rose-600' : 'text-slate-500'}>{p.status}</span>
                    </div>
                  ))
                ))}
              {tab === 'invoices' &&
                (invoices.length === 0 ? (
                  <p className="py-4 text-center text-slate-400">No invoices yet.</p>
                ) : (
                  invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span>{fmtDate(inv.issuedAt)}</span>
                      <span>{inv.invoiceNumber}</span>
                      <span className="font-bold">{inr(inv.amount)}</span>
                      <span className={inv.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}>{inv.status}</span>
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                          View
                        </a>
                      )}
                    </div>
                  ))
                ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

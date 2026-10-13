import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, ExternalLink, FileText, History, Loader2, Printer } from 'lucide-react';
import { schoolSubscriptionApi } from '../../../../shared/api/client';
import { openInvoiceDocument } from '../../../../shared/lib/subscriptionInvoiceDocument';

/**
 * Everything the school has been billed: invoices, payments and the
 * subscription activity (created / renewed / expired ...) across ALL of its
 * subscriptions, newest first.
 */
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmt = (v) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const TABS = [
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'history', label: 'Activity', icon: History },
];

const ACTION_LABEL = {
  created: 'Subscription created',
  activated: 'Subscription activated',
  renewed: 'Renewed',
  charged: 'Payment received',
  payment_failed: 'Payment failed',
  halted: 'Payments halted',
  cancelled: 'Cancelled',
  expired: 'Expired',
  upgraded: 'Plan upgraded',
  downgraded: 'Plan downgraded',
  paused: 'Paused',
  resumed: 'Resumed',
};

function Pill({ tone, children }) {
  const cls =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
      : tone === 'bad'
        ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
        : tone === 'warn'
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  return <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${cls}`}>{children}</span>;
}

const invoiceTone = (s) => (s === 'Paid' ? 'good' : ['Failed', 'Cancelled', 'Refunded'].includes(s) ? 'bad' : 'warn');
const paymentTone = (s) => (['captured', 'paid', 'authorized'].includes(String(s).toLowerCase()) ? 'good' : String(s).toLowerCase() === 'failed' ? 'bad' : 'warn');

export default function BillingHistory({ refreshKey = 0 }) {
  const [tab, setTab] = useState('invoices');
  const [invoices, setInvoices] = useState(null);
  const [payments, setPayments] = useState(null);
  const [history, setHistory] = useState(null);
  const [blocked, setBlocked] = useState(false);

  const load = useCallback(async () => {
    const [i, p, h] = await Promise.all([
      schoolSubscriptionApi.invoices({ limit: 50 }).catch(() => ({ data: [] })),
      schoolSubscriptionApi.payments({ limit: 50 }).catch(() => ({ data: [] })),
      schoolSubscriptionApi.history({ limit: 50 }).catch(() => ({ data: [] })),
    ]);
    setInvoices(i?.data || []);
    setPayments(p?.data || []);
    setHistory(h?.data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const print = (inv) => {
    const ok = openInvoiceDocument(inv, null);
    setBlocked(!ok);
  };

  const counts = { invoices: invoices?.length, payments: payments?.length, history: history?.length };
  const list = tab === 'invoices' ? invoices : tab === 'payments' ? payments : history;

  return (
    <section className="w-full rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-slate-900 dark:text-white">Billing history</h3>
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                tab === t.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {counts[t.id] ? <span className="opacity-80">({counts[t.id]})</span> : null}
            </button>
          ))}
        </div>
      </div>

      {blocked ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          The pop-up was blocked. Allow pop-ups for this site to print the invoice.
        </p>
      ) : null}

      <div className="mt-4 space-y-2">
        {list === null ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            {tab === 'invoices' ? 'No invoices yet.' : tab === 'payments' ? 'No payments yet.' : 'No activity yet.'}
          </p>
        ) : tab === 'invoices' ? (
          list.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3.5 text-xs dark:border-slate-800"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</p>
                <p className="text-[11px] text-slate-400">
                  {fmt(inv.issuedAt)}
                  {inv.billingPeriodStart && inv.billingPeriodEnd
                    ? ` · ${fmt(inv.billingPeriodStart)} – ${fmt(inv.billingPeriodEnd)}`
                    : ''}
                  {inv.planName ? ` · ${inv.planName}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {inr(inv.totalAmount ?? inv.amount)}
                  </div>
                  {Number(inv.tax) > 0 ? (
                    <div className="text-[10px] text-slate-400">incl. GST {inr(inv.tax)}</div>
                  ) : null}
                </div>
                <Pill tone={invoiceTone(inv.status)}>{inv.status}</Pill>
                {inv.pdfUrl ? (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary"
                  >
                    <ExternalLink className="h-3 w-3" /> PDF
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => print(inv)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary"
                  >
                    <Printer className="h-3 w-3" /> Print / PDF
                  </button>
                )}
              </div>
            </div>
          ))
        ) : tab === 'payments' ? (
          list.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3.5 text-xs dark:border-slate-800"
            >
              <div>
                <p className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                  {p.razorpayPaymentId || 'Payment'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {fmt(p.paidAt || p.createdAt)}
                  {p.method ? ` · ${String(p.method).toUpperCase()}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-900 dark:text-white">{inr(p.amount)}</span>
                <Pill tone={paymentTone(p.status)}>{p.status}</Pill>
              </div>
            </div>
          ))
        ) : (
          list.map((h) => (
            <div
              key={h.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3.5 text-xs dark:border-slate-800"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {ACTION_LABEL[h.action] || String(h.action || '').replace(/_/g, ' ')}
                </p>
                {h.reason ? <p className="text-[11px] text-slate-400">{h.reason}</p> : null}
              </div>
              <div className="text-right text-[11px] text-slate-400">
                {fmt(h.createdAt)}
                {h.toStatus ? <div className="font-semibold capitalize text-slate-500">{h.toStatus}</div> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

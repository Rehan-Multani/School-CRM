import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Check,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { schoolPortalApi } from '../../../../shared/api/client';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import RecurringSubscriptionSection from './RecurringSubscriptionSection';

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

function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

const STATUS_STYLES = {
  Active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  'Pending Payment': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  Expired: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
};

const BILLING_STATUS_STYLES = {
  Paid: 'text-emerald-600 dark:text-emerald-400',
  Pending: 'text-amber-600 dark:text-amber-400',
  Overdue: 'text-rose-600 dark:text-rose-400',
  Refunded: 'text-slate-500 dark:text-slate-400',
  Failed: 'text-rose-600 dark:text-rose-400',
  Cancelled: 'text-slate-500 dark:text-slate-400',
};

function CurrentSubscriptionCard({ subscription }) {
  if (!subscription) return null;

  const statusClass = STATUS_STYLES[subscription.status] || STATUS_STYLES['Pending Payment'];
  const billing = subscription.billing;

  return (
    <section className="overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white shadow-sm dark:border-indigo-500/20 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900">
      <div className="border-b border-indigo-100 px-6 py-5 dark:border-indigo-500/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Current subscription
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {subscription.planName}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subscription.planType} plan · {formatInr(subscription.price)} /{' '}
              {subscription.planType.toLowerCase()}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
            {subscription.status}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Calendar className="h-4 w-4" />
            Plan selected on
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {formatDate(subscription.startedAt)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {formatDateTime(subscription.startedAt)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Clock className="h-4 w-4" />
            Valid until
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {formatDate(subscription.endsAt)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {formatDateTime(subscription.endsAt)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Sparkles className="h-4 w-4" />
            Days remaining
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {subscription.status === 'Expired' ? 0 : subscription.daysRemaining}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {subscription.status === 'Expired' ? 'Plan has expired' : 'until renewal'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <CreditCard className="h-4 w-4" />
            Billing status
          </div>
          <p
            className={`text-sm font-bold ${
              BILLING_STATUS_STYLES[billing?.status] || 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {billing?.status || 'No invoice'}
          </p>
          {billing?.paidAt && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Paid on {formatDate(billing.paidAt)}
            </p>
          )}
          {!billing?.paidAt && billing?.dueAt && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Due by {formatDate(billing.dueAt)}
            </p>
          )}
        </div>
      </div>

      {billing && (
        <div className="border-t border-indigo-100 px-6 py-4 dark:border-indigo-500/10">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              Invoice: <strong className="text-slate-900 dark:text-white">{billing.invoiceNumber}</strong>
            </span>
            <span>
              Amount: <strong className="text-slate-900 dark:text-white">{formatInr(billing.amount)}</strong>
            </span>
            <span>
              Issued: <strong className="text-slate-900 dark:text-white">{formatDate(billing.issuedAt)}</strong>
            </span>
            {billing.paymentMethod && (
              <span>
                Method: <strong className="text-slate-900 dark:text-white">{billing.paymentMethod}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {(subscription.features || []).length > 0 && (
        <div className="border-t border-indigo-100 px-6 py-4 dark:border-indigo-500/10">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Included features</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {subscription.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SubscriptionPlansSkeleton({ hasPlan }) {
  return (
    <div className="space-y-6 animate-pulse">
      {hasPlan && (
        <section className="overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-white shadow-sm dark:border-indigo-500/20 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900">
          {/* Top banner header */}
          <div className="border-b border-indigo-100 px-6 py-5 dark:border-indigo-500/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-3 w-36 rounded-full bg-indigo-200/70 dark:bg-indigo-900/50" />
                <div className="h-7 w-48 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-52 rounded-lg bg-slate-200/80 dark:bg-slate-800" />
              </div>
              <div className="h-7 w-28 rounded-full bg-amber-100/80 dark:bg-amber-950/40" />
            </div>
          </div>

          {/* 4 metric cards */}
          <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-6 w-32 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-28 rounded bg-slate-200/70 dark:bg-slate-800" />
              </div>
            ))}
          </div>

          {/* Invoice bar */}
          <div className="border-t border-indigo-100 px-6 py-4 dark:border-indigo-500/10">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>

          {/* Features section */}
          <div className="border-t border-indigo-100 px-6 py-4 dark:border-indigo-500/10 space-y-3">
            <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-4 w-4 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/50" />
                  <div className="h-3.5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div>
        {hasPlan && (
          <div className="mb-4 h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
        )}

        {/* 3 Available Plan Cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`flex flex-col rounded-3xl border bg-white p-6 shadow-sm dark:bg-slate-900 ${
                idx === 1 && hasPlan
                  ? 'border-indigo-300 ring-4 ring-indigo-500/10 dark:border-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Badge row */}
              <div className="mb-4 flex items-center justify-between">
                <div className="h-5 w-16 rounded-full bg-indigo-100 dark:bg-indigo-950/60" />
                {idx === 1 && hasPlan && (
                  <div className="h-4 w-16 rounded bg-emerald-100 dark:bg-emerald-950/50" />
                )}
              </div>

              {/* Title & Price */}
              <div className="h-6 w-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="mt-3 flex items-baseline gap-2">
                <div className="h-9 w-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Features list */}
              <div className="mt-6 flex-1 space-y-3">
                {[1, 2, 3, 4, 5].map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="h-4 w-4 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-950/50" />
                    <div className="h-3.5 w-full rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                ))}
              </div>

              {/* Action button */}
              <div className="mt-6 h-11 w-full rounded-2xl bg-indigo-100/80 dark:bg-indigo-950/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const { user, hasPlan, applyUser } = useSchoolAdminAuth();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const loadPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await schoolPortalApi.plans();
      setPlans(result.data || []);
      setSubscription(result.subscription || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  // Subscription activation is confirmed by Razorpay's webhook, not by this
  // browser tab — poll /school-portal/me for a few seconds after checkout
  // closes so the admin lands on the dashboard as soon as it's actually granted.
  const pollForActivation = async (maxAttempts = 12, intervalMs = 2500) => {
    for (let i = 0; i < maxAttempts; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await schoolPortalApi.me();
        if (res?.user?.hasPlan) return res.user;
      } catch {
        // transient — keep polling
      }
    }
    return null;
  };

  const handleSelect = async (plan) => {
    if (hasPlan) return;
    setSelectingId(plan.id);
    setError('');
    try {
      const result = await schoolPortalApi.initiateSubscriptionCheckout(plan.id);
      const { razorpayKeyId, razorpaySubscriptionId } = result;
      const RazorpayCtor = await loadRazorpayScript();
      if (!RazorpayCtor) {
        setError('Could not load the payment gateway. Check your connection and try again.');
        setSelectingId('');
        return;
      }

      const rzp = new RazorpayCtor({
        key: razorpayKeyId,
        subscription_id: razorpaySubscriptionId,
        name: user?.schoolName || 'School Subscription',
        description: `${plan.name} plan — recurring subscription`,
        prefill: { email: user?.email || '' },
        theme: { color: '#4f46e5' },
        handler: async () => {
          setConfirming(true);
          const activatedUser = await pollForActivation();
          setConfirming(false);
          setSelectingId('');
          if (activatedUser) {
            applyUser(activatedUser);
            navigate('/school-admin/dashboard', { replace: true });
          } else {
            setError('Payment received — Razorpay is confirming it, which can take a minute. Refresh this page shortly.');
          }
        },
        modal: {
          ondismiss: () => setSelectingId(''),
        },
      });
      rzp.on('payment.failed', () => {
        setError('Payment failed or was cancelled. You can try again.');
        setSelectingId('');
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to start payment for this plan.');
      setSelectingId('');
    }
  };

  // Resolved current subscription object
  const activeSubscription = subscription || (hasPlan && user?.subscriptionPlan ? {
    planName: user.subscriptionPlan,
    planType: user.subscription?.planType || 'Monthly',
    price: user.subscription?.price || 0,
    status: user.subscription?.status || 'Active',
    startedAt: user.subscription?.startedAt || user.createdAt,
    endsAt: user.subscription?.endsAt,
    daysRemaining: user.subscription?.daysRemaining ?? 30,
    features: user.subscription?.features || [],
    billing: null,
  } : null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={hasPlan ? 'Your subscription plan' : 'Choose a subscription plan'}
        subtitle={
          hasPlan
            ? `Full details of ${user?.schoolName || 'your school'}'s current plan — when it started and when it ends.`
            : `${user?.schoolName || 'Your school'} needs a plan before the rest of the admin portal is unlocked. Payment is collected securely via Razorpay when you choose a plan.`
        }
      />

      {confirming && (
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-950/20 dark:text-indigo-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Confirming your payment with Razorpay — this only takes a few seconds…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadPlans}
            className="rounded-xl bg-rose-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <SubscriptionPlansSkeleton hasPlan={hasPlan} />
      ) : (
        <>
          {hasPlan && activeSubscription && <CurrentSubscriptionCard subscription={activeSubscription} />}

          {hasPlan && <RecurringSubscriptionSection schoolName={user?.schoolName} />}

          <div>
            {hasPlan && (
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
                All available plans
              </h3>
            )}
            {plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400 dark:border-slate-800">
                <p className="text-sm font-semibold">No Result</p>
                <p className="mt-1 text-xs text-slate-500">No subscription plans are currently available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => {
                  const selected = user?.subscriptionPlan === plan.name;
                  return (
                    <div
                      key={plan.id}
                      className={`flex flex-col rounded-3xl border bg-white p-6 shadow-sm dark:bg-slate-900 ${
                        selected
                          ? 'border-indigo-500 ring-4 ring-indigo-500/10'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                          {plan.planType}
                        </span>
                        {selected && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <Check className="h-3.5 w-3.5" /> Current
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">{plan.name}</h3>
                      <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                        {formatInr(plan.price)}
                        <span className="ml-1 text-sm font-semibold text-slate-400">
                          / {plan.planType.toLowerCase()}
                        </span>
                      </p>
                      <ul className="mt-5 flex-1 space-y-2">
                        {(plan.features || []).map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        disabled={hasPlan || Boolean(selectingId)}
                        onClick={() => handleSelect(plan)}
                        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {selectingId === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        {selected
                          ? 'Selected'
                          : hasPlan
                          ? 'Plan already chosen'
                          : selectingId === plan.id
                          ? confirming
                            ? 'Confirming payment…'
                            : 'Opening checkout…'
                          : 'Subscribe & pay'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Ban,
  Building2,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  Sparkles,
  Users,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { schoolPortalApi, schoolSubscriptionApi } from '../../../../shared/api/client';
import BillingHistory from './BillingHistory';

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

function formatDate(value) {
  if (!value) return '–';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

// ============================================================================
// Active Plan Details Card (User's required simple view)
// Only shows: Plan name/price, Started date (kb liya), End date (kab tak chalega), Cancel button
// ============================================================================
export function ActivePlanCard({
  planName,
  price,
  planType,
  startedAt,
  endsAt,
  daysRemaining,
  cancelAtPeriodEnd,
  studentLimit,
  isCancelled,
  phase = 'active',
  lapseDeadline,
  onCancel,
  cancelling,
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const ended = phase === 'renewing' || phase === 'past_due' || phase === 'expired';

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        {/* Decorative subtle ambient blur */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5" />

        {/* Plan Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-6 dark:border-slate-800">
          <div>
            {phase === 'expired' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                Subscription Expired
              </span>
            ) : phase === 'past_due' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Payment Overdue
              </span>
            ) : phase === 'renewing' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
                Renewal Processing
              </span>
            ) : isCancelled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:border-rose-900/40 dark:bg-slate-900/10 dark:text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                Cancelled Subscription
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Subscription
              </span>
            )}
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {planName}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{formatInr(price)}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              per {planType?.toLowerCase() === 'yearly' ? 'year' : planType?.toLowerCase() === 'weekly' ? 'week' : 'month'}
            </div>
          </div>
        </div>

        {/* 2 Core Details:
            1. Plan Started On
            2. Valid Until */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 1. Plan Started On */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Calendar className="h-4 w-4" />
              </div>
              Plan Started On
            </div>
            <p className="mt-3 text-lg font-black text-slate-900 dark:text-white">
              {formatDate(startedAt)}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">Subscription start date</p>
          </div>

          {/* 2. Valid Until */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Clock className="h-4 w-4" />
              </div>
              {ended || (isCancelled && (!daysRemaining || daysRemaining === 0)) ? 'Period Ended On' : 'Valid Until'}
            </div>
            <p className="mt-3 text-lg font-black text-slate-900 dark:text-white">
              {formatDate(endsAt)}
            </p>
            {daysRemaining !== undefined && daysRemaining !== null && daysRemaining > 0 ? (
              <p className={`mt-0.5 text-xs font-semibold ${isCancelled ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
              </p>
            ) : phase === 'renewing' ? (
              <p className="mt-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                Renewal payment pending
              </p>
            ) : isCancelled || ended ? (
              <p className="mt-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                Subscription ended
              </p>
            ) : null}
          </div>

          {/* 3. Student seats of the plan */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <div className="rounded-lg bg-violet-50 p-1.5 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                <Users className="h-4 w-4" />
              </div>
              Students Allowed
            </div>
            <p className="mt-3 text-lg font-black text-slate-900 dark:text-white">
              {studentLimit ? `Up to ${Number(studentLimit).toLocaleString('en-IN')}` : 'Unlimited'}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">Active students on this plan</p>
          </div>
        </div>

        {/* Renewal notices: the paid period is over and no payment was received */}
        {phase === 'renewing' && (
          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-xs font-semibold text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300">
            Your plan period ended on <strong>{formatDate(endsAt)}</strong>. Auto-renewal is being processed with your
            payment method - this page updates once the payment is confirmed. If it is not received within a day, your
            portal access will be closed until a plan is purchased.
          </div>
        )}
        {phase === 'past_due' && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            Your plan ended on <strong>{formatDate(endsAt)}</strong> and the auto-renewal payment was not received.
            {lapseDeadline ? (
              <> Choose a plan below before <strong>{formatDate(lapseDeadline)}</strong> to keep your portal running.</>
            ) : (
              <> Choose a plan below to keep your portal running.</>
            )}
          </div>
        )}
        {phase === 'expired' && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
            Your plan ended on <strong>{formatDate(endsAt)}</strong> and was not renewed. Choose a plan below to restore
            full access for your school.
          </div>
        )}

        {/* Cancellation Notice if already scheduled or cancelled */}
        {isCancelled && phase !== 'expired' && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
            {daysRemaining !== undefined && daysRemaining !== null && daysRemaining > 0 ? (
              <>
                Cancellation scheduled. Your subscription auto-renewal has stopped. Portal access remains active until <strong>{formatDate(endsAt)}</strong>.
              </>
            ) : (
              <>
                This subscription has been cancelled. To restore full access, please choose a subscription plan below.
              </>
            )}
          </div>
        )}

        {/* Cancel Option (Only shown if subscription is active and not yet cancelled) */}
        {!isCancelled && phase === 'active' && (
          <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
            {!confirmCancel ? (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-50 dark:border-rose-900/40 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/20"
              >
                <Ban className="h-4 w-4" />
                <span>Cancel Subscription</span>
              </button>
            ) : (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-5 dark:border-rose-900/40 dark:bg-rose-950/30">
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Are you sure you want to cancel your subscription?
                </p>
                <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                  Your portal access will remain active until <strong>{formatDate(endsAt)}</strong>. After this date, auto-renewal will stop.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Keep Subscription
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancel()}
                    disabled={cancelling}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    <span>{cancelling ? 'Cancelling…' : 'Yes, Cancel Subscription'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Onboarding Banner (for Schools Without a Plan)
// ============================================================================
function OnboardingBanner({ user }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-900/90 via-blue-900/95 to-slate-900 p-6 text-white shadow-xl shadow-indigo-950/20 sm:p-8">
      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-white/10 p-2 backdrop-blur-md">
              <Building2 className="h-5 w-5 text-indigo-200" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
                School Onboarding Portal
              </span>
              <h2 className="text-xl font-black text-white sm:text-2xl">
                {user?.schoolName || 'Your School Institution'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.schoolCode && (
              <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-semibold text-indigo-200 backdrop-blur-md">
                Code: {user.schoolCode}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 backdrop-blur-md">
              <AlertCircle className="h-3.5 w-3.5" />
              Plan Required
            </span>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-indigo-100/90">
          Your institution portal account is verified and ready. To unlock all administrative modules–including
          student admissions, teacher records, fee processing, and examinations–please choose a subscription tier below.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// Pricing Card (shown ONLY to schools without a plan during onboarding)
// ============================================================================
export function InitialPricingCard({ plan, onSelect, selectingId, confirming, isPopular = false, isCurrent = false }) {
  const isSelectingThis = selectingId === plan.id;
  // The student count already has its own highlighted line above; do not repeat it as a bullet.
  const visibleFeatures = (plan.features || []).filter(
    (f) => !(plan.limits?.students && /^up to [\d,]+ students?$/i.test(String(f).trim())),
  );

  return (
    <div
      className={`group relative flex h-full flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl dark:bg-slate-900 ${
        isPopular
          ? 'border-indigo-400/80 shadow-indigo-500/5 ring-2 ring-indigo-500/20 hover:border-indigo-500 dark:border-indigo-500/40'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md shadow-indigo-600/30">
            <Sparkles className="h-3 w-3" />
            Most Popular
          </span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Calendar className="h-3 w-3" />
            {plan.planType} Billing
          </span>
        </div>

        <h3 className="mt-4 flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
          {plan.name}
          {isCurrent ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              Your plan
            </span>
          ) : null}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {plan.description || 'Full-featured suite designed for institutional excellence.'}
        </p>

        <div className="mt-5 flex items-baseline gap-1.5 border-y border-slate-100 py-4 dark:border-slate-800/80">
          <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            {formatInr(plan.price)}
          </span>
          <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
            / {plan.planType.toLowerCase()}
          </span>
        </div>

        {plan.limits?.students ? (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Users className="h-4 w-4" />
            Up to {Number(plan.limits.students).toLocaleString('en-IN')} students
          </div>
        ) : null}

        <div className="mt-5 space-y-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            What&apos;s Included
          </p>
          <ul className="space-y-2">
            {!visibleFeatures.length ? (
              <li className="text-xs text-slate-400">All core modules included.</li>
            ) : null}
            {visibleFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
                <span className="leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 pt-4">
        <button
          type="button"
          disabled={Boolean(selectingId)}
          onClick={() => onSelect(plan)}
          className="group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:from-indigo-500 hover:to-blue-500 hover:shadow-indigo-600/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSelectingThis ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{confirming ? 'Confirming with Razorpay…' : 'Opening Checkout…'}</span>
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              <span>Subscribe & Activate</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </>
          )}
        </button>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
          <Lock className="h-3 w-3" />
          <span>Instant activation via Razorpay</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================
export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const { user, hasPlan, applyUser, refreshUser } = useSchoolAdminAuth();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [recurringSub, setRecurringSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [error, setError] = useState('');

  const loadPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const [result, subRes] = await Promise.all([
        schoolPortalApi.plans().catch(() => ({ data: [] })),
        schoolSubscriptionApi.get().catch((err) => {
          if (err?.response?.status === 402) {
            refreshUser?.();
          }
          return { data: null };
        }),
      ]);
      setPlans(result.data || []);
      setSubscription(result.subscription || null);
      if (subRes?.data) {
        setRecurringSub(subRes.data);
        if (subRes.data.cancelAtPeriodEnd) {
          setCancelAtPeriodEnd(true);
        }
      }
      // A checkout that was paid but not confirmed before the tab was closed
      // is picked up here on the next visit.
      if (!hasPlan && ['created', 'authenticated'].includes(subRes?.data?.status)) {
        const synced = await schoolSubscriptionApi.sync().catch(() => null);
        if (synced?.data?.hasFullAccess) {
          await refreshUser?.();
          const fresh = await schoolSubscriptionApi.get().catch(() => null);
          if (fresh?.data) setRecurringSub(fresh.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const pollForActivation = async (maxAttempts = 12, intervalMs = 2500) => {
    for (let i = 0; i < maxAttempts; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      try {
        // The backend asks Razorpay directly, so activation does not wait on the webhook.
        await schoolSubscriptionApi.sync().catch(() => {});
        // eslint-disable-next-line no-await-in-loop
        const res = await schoolPortalApi.me();
        if (res?.user?.hasPlan) return res.user;
      } catch {
        // transient retry
      }
    }
    return null;
  };

  const handleSelect = async (plan) => {
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
        description: `${plan.name} plan – recurring subscription`,
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
            setError('Payment received – Razorpay is confirming it. Refresh shortly.');
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

  const handleCancelSubscription = async () => {
    setCancelling(true);
    setError('');
    try {
      await schoolSubscriptionApi.cancel('Requested by school admin');
      setCancelAtPeriodEnd(true);
      await loadPlans();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  // Real-time active status check handling all statuses and period-end cancellation
  const isPlanActive = useMemo(() => {
    const now = Date.now();

    if (recurringSub) {
      const status = recurringSub.status;
      if (['active', 'authenticated', 'pending', 'halted'].includes(status)) {
        if (recurringSub.cancelAtPeriodEnd && recurringSub.currentPeriodEnd) {
          return new Date(recurringSub.currentPeriodEnd).getTime() > now;
        }
        // Paid period over and never renewed: access is closed once the deadline passes.
        if (recurringSub.lapsed && recurringSub.lapseDeadline && new Date(recurringSub.lapseDeadline).getTime() <= now) {
          return false;
        }
        return true;
      }
      if (['cancelled', 'expired', 'completed', 'failed'].includes(status)) {
        return false;
      }
    }

    if (subscription) {
      if (subscription.status === 'Expired' || subscription.status === 'Pending Payment') {
        return false;
      }
      if (subscription.status?.toLowerCase() === 'cancelled') {
        return false;
      }
      if (subscription.endsAt) {
        return new Date(subscription.endsAt).getTime() > now;
      }
      return true;
    }

    return Boolean(hasPlan);
  }, [recurringSub, subscription, hasPlan]);

  // Real-time cancellation check (both scheduled at period end and immediately cancelled)
  const isCancelled = useMemo(() => {
    if (recurringSub) {
      if (recurringSub.cancelAtPeriodEnd) return true;
      if (recurringSub.status === 'cancelled') return true;
    }
    if (subscription) {
      if (subscription.status?.toLowerCase() === 'cancelled') return true;
      if (subscription.isCancelled) return true;
      if (subscription.cancelAtPeriodEnd) return true;
    }
    return Boolean(cancelAtPeriodEnd);
  }, [recurringSub, subscription, cancelAtPeriodEnd]);

  // What happened to the paid period (Razorpay may still say "active"):
  //   renewing -> period just ended, the auto-renewal charge is still being processed
  //   past_due -> renewal never arrived; access ends at lapseDeadline
  //   expired  -> access closed, a plan has to be bought again
  const isExpiredSub = useMemo(() => {
    if (!recurringSub || isCancelled) return false;
    if (recurringSub.status === 'expired') return true;
    return Boolean(
      recurringSub.lapsed && recurringSub.lapseDeadline && new Date(recurringSub.lapseDeadline).getTime() <= Date.now(),
    );
  }, [recurringSub, isCancelled]);

  const phase = useMemo(() => {
    if (isCancelled) return 'cancelled';
    if (isExpiredSub) return 'expired';
    if (recurringSub?.lapsed) return 'past_due';
    const end = recurringSub?.currentPeriodEnd ? new Date(recurringSub.currentPeriodEnd).getTime() : null;
    if (end !== null && end < Date.now() && ['active', 'authenticated'].includes(recurringSub?.status)) return 'renewing';
    return 'active';
  }, [recurringSub, isCancelled, isExpiredSub]);

  // Active plan details
  const activePlanName =
    recurringSub?.plan?.name ||
    subscription?.planName ||
    user?.subscriptionPlan ||
    'School Plan';

  const activePrice =
    recurringSub?.totalAmount ||
    subscription?.price ||
    user?.subscription?.price ||
    0;

  const activePlanType =
    subscription?.planType ||
    user?.subscription?.planType ||
    recurringSub?.plan?.planType ||
    'Monthly';

  const activeStartedAt =
    recurringSub?.currentPeriodStart ||
    recurringSub?.createdAt ||
    subscription?.startedAt ||
    user?.subscription?.startedAt ||
    user?.createdAt;

  const activeEndsAt =
    recurringSub?.currentPeriodEnd ||
    subscription?.endsAt ||
    user?.subscription?.endsAt;

  // Real-time remaining days countdown calculated directly from active end date
  const activeDaysRemaining = useMemo(() => {
    const end = recurringSub?.currentPeriodEnd || subscription?.endsAt || user?.subscription?.endsAt;
    if (!end) return null;
    const ms = new Date(end).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  }, [recurringSub?.currentPeriodEnd, subscription?.endsAt, user?.subscription?.endsAt]);

  const hasSubscriptionHistory = Boolean(recurringSub || subscription || user?.subscriptionPlan);

  const popularPlanId = plans.find((p) => /growth|popular/i.test(p.name || ''))?.id || null;
  const currentPlanId = recurringSub?.planId || recurringSub?.plan?.id || null;
  const planGrid = (
    <div className="grid grid-cols-1 items-stretch gap-6 pt-3 sm:grid-cols-2 xl:grid-cols-3">
      {plans.map((plan) => (
        <InitialPricingCard
          key={plan.id}
          plan={plan}
          onSelect={handleSelect}
          selectingId={selectingId}
          confirming={confirming}
          isPopular={plan.id === popularPlanId}
          isCurrent={plan.id === currentPlanId}
        />
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title={isCancelled || isExpiredSub ? 'School Subscription' : (isPlanActive ? 'School Subscription' : 'Choose an Institution Plan')}
        subtitle={
          phase === 'expired'
            ? 'Your subscription has expired. Choose a plan to restore access for your school.'
            : phase === 'past_due'
              ? 'Your plan period has ended and the renewal payment was not received.'
              : isCancelled
            ? `Current subscription status: Cancelled. ${isPlanActive ? `Portal access remains active until ${formatDate(activeEndsAt)}.` : 'Choose a plan to reactivate your portal.'}`
            : (isPlanActive
              ? `Current subscription status and details for ${user?.schoolName || 'your school'}.`
              : `${user?.schoolName || 'Your school'} needs a plan to unlock the complete CRM portal.`)
        }
      />

      {/* Confirmation indicator */}
      {confirming && (
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/90 p-4 text-sm font-semibold text-indigo-800 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-950/30 dark:text-indigo-300">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span>Confirming your payment with Razorpay – unlocking your portal now…</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadPlans}
            className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-500"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="w-full animate-pulse space-y-4">
          <div className="h-64 rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
        </div>
      ) : isPlanActive ? (
        <div className="space-y-8">
        <ActivePlanCard
          planName={activePlanName}
          price={activePrice}
          planType={activePlanType}
          startedAt={activeStartedAt}
          endsAt={activeEndsAt}
          daysRemaining={activeDaysRemaining}
          cancelAtPeriodEnd={cancelAtPeriodEnd || Boolean(recurringSub?.cancelAtPeriodEnd)}
          isCancelled={isCancelled}
          phase={phase}
          studentLimit={recurringSub?.plan?.limits?.students}
          lapseDeadline={recurringSub?.lapseDeadline}
          onCancel={handleCancelSubscription}
          cancelling={cancelling}
        />
          {phase === 'past_due' || phase === 'renewing' ? (
            <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  {phase === 'past_due' ? 'Renew your plan' : 'Need to pay now?'}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Start a new subscription below. It replaces the unpaid one and no extra charge is made on the old one.
                </p>
              </div>
              {planGrid}
            </section>
          ) : null}
          <BillingHistory refreshKey={String(recurringSub?.updatedAt || '')} />
        </div>
      ) : (isCancelled || isExpiredSub) && hasSubscriptionHistory ? (
        /* ===================================================================
           EXPIRED / FULLY CANCELLED PLAN VIEW
           Shows Cancelled Status Card + Plan Options Below to Re-subscribe
           =================================================================== */
        <div className="space-y-8">
          <ActivePlanCard
            planName={activePlanName}
            price={activePrice}
            planType={activePlanType}
            startedAt={activeStartedAt}
            endsAt={activeEndsAt}
            daysRemaining={0}
            cancelAtPeriodEnd={true}
            isCancelled={!isExpiredSub}
            phase={isExpiredSub ? 'expired' : 'cancelled'}
            studentLimit={recurringSub?.plan?.limits?.students}
            onCancel={handleCancelSubscription}
            cancelling={cancelling}
          />

          <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Choose a New Plan to Reactivate
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select any tier below to immediately restore uninterrupted access for your school institution.
              </p>
            </div>
            {planGrid}
          </section>

          <BillingHistory refreshKey={String(recurringSub?.updatedAt || '')} />
        </div>
      ) : (
        /* ===================================================================
           NO-PLAN ONBOARDING VIEW (Only for schools choosing plan for first time)
           =================================================================== */
        <div className="space-y-6">
          <OnboardingBanner user={user} />

          <section className="space-y-4">
            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Select Your School Plan
            </h3>
            {planGrid}
          </section>
        </div>
      )}
    </div>
  );
}


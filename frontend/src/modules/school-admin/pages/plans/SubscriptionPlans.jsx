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
  if (!value) return '—';
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
function ActivePlanCard({
  planName,
  price,
  planType,
  startedAt,
  endsAt,
  daysRemaining,
  cancelAtPeriodEnd,
  onCancel,
  cancelling,
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        {/* Decorative subtle ambient blur */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5" />

        {/* Plan Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-6 dark:border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Subscription
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {planName}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {formatInr(price)} / {planType?.toLowerCase() || 'month'}
            </p>
          </div>
        </div>

        {/* 2 Core Details:
            1. Plan Started On
            2. Valid Until */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              Valid Until
            </div>
            <p className="mt-3 text-lg font-black text-slate-900 dark:text-white">
              {formatDate(endsAt)}
            </p>
            {daysRemaining !== undefined && daysRemaining !== null && (
              <p className="mt-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
              </p>
            )}
          </div>
        </div>

        {/* Cancellation Notice if already scheduled */}
        {cancelAtPeriodEnd && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            Cancellation scheduled. Your subscription remains active until <strong>{formatDate(endsAt)}</strong>, after which auto-renewal will stop.
          </div>
        )}

        {/* Cancel Option (User requested: cancel option bs) */}
        {!cancelAtPeriodEnd && (
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
                    className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
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
          Your institution portal account is verified and ready. To unlock all administrative modules—including
          student admissions, teacher records, fee processing, and examinations—please choose a subscription tier below.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// Pricing Card (shown ONLY to schools without a plan during onboarding)
// ============================================================================
function InitialPricingCard({ plan, onSelect, selectingId, confirming }) {
  const isSelectingThis = selectingId === plan.id;
  const isPopular =
    plan.name?.toLowerCase().includes('growth') ||
    plan.name?.toLowerCase().includes('popular') ||
    plan.planType === 'Monthly';

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl dark:bg-slate-900 ${
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

        <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
          {plan.name}
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

        <div className="mt-5 space-y-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            What&apos;s Included
          </p>
          <ul className="space-y-2">
            {(plan.features || []).map((feature) => (
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
            setError('Payment received — Razorpay is confirming it. Refresh shortly.');
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
      if (subscription.endsAt) {
        return new Date(subscription.endsAt).getTime() > now;
      }
      return true;
    }

    return Boolean(hasPlan);
  }, [recurringSub, subscription, hasPlan]);

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
    (recurringSub?.billingInterval === 'yearly' ? 'Yearly' : 'Monthly');

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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title={isPlanActive ? 'School Subscription' : 'Choose an Institution Plan'}
        subtitle={
          isPlanActive
            ? `Current subscription status and details for ${user?.schoolName || 'your school'}.`
            : `${user?.schoolName || 'Your school'} needs a plan to unlock the complete CRM portal.`
        }
      />

      {/* Confirmation indicator */}
      {confirming && (
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/90 p-4 text-sm font-semibold text-indigo-800 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-950/30 dark:text-indigo-300">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span>Confirming your payment with Razorpay — unlocking your portal now…</span>
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
            className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="mx-auto max-w-2xl animate-pulse space-y-4">
          <div className="h-64 rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
        </div>
      ) : isPlanActive ? (
        /* ===================================================================
           ACTIVE PLAN VIEW (Simple: Name, Started date, End date, Cancel option)
           NO upgrade dropdown, NO extra available plan cards below
           =================================================================== */
        <ActivePlanCard
          planName={activePlanName}
          price={activePrice}
          planType={activePlanType}
          startedAt={activeStartedAt}
          endsAt={activeEndsAt}
          daysRemaining={activeDaysRemaining}
          cancelAtPeriodEnd={cancelAtPeriodEnd || Boolean(recurringSub?.cancelAtPeriodEnd)}
          onCancel={handleCancelSubscription}
          cancelling={cancelling}
        />
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <InitialPricingCard
                  key={plan.id}
                  plan={plan}
                  onSelect={handleSelect}
                  selectingId={selectingId}
                  confirming={confirming}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

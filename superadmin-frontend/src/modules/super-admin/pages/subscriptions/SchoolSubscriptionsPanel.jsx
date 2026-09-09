import React, { useEffect, useMemo, useState } from 'react';
import { Button, Badge } from '../../components/ui/Button';
import { Pulse } from '../../components/ui/SkeletonLoader';
import { Select } from '../../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformSchoolSubscriptionApi, platformSubscriptionApi, platformSchoolApi } from '../../../../shared/api/client';
import {
  Plus,
  Loader2,
  Ban,
  ArrowUpRight,
  Receipt,
  History,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Search,
  X,
  RefreshCw,
  Eye,
  Building2,
  CreditCard,
  Copy,
  Check,
  Calendar,
  ExternalLink,
} from 'lucide-react';

const STATUS_VARIANT = {
  created: 'default',
  authenticated: 'info',
  active: 'success',
  pending: 'warning',
  halted: 'danger',
  paused: 'warning',
  cancelled: 'default',
  completed: 'default',
  expired: 'danger',
  failed: 'danger',
};

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    pillClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dotClass: 'bg-emerald-500',
    pulse: true,
  },
  created: {
    label: 'Created',
    pillClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    dotClass: 'bg-slate-400',
    pulse: false,
  },
  authenticated: {
    label: 'Authenticated',
    pillClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    dotClass: 'bg-sky-500',
    pulse: false,
  },
  pending: {
    label: 'Pending',
    pillClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dotClass: 'bg-amber-500',
    pulse: true,
  },
  halted: {
    label: 'Halted',
    pillClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    dotClass: 'bg-rose-500',
    pulse: false,
  },
  paused: {
    label: 'Paused',
    pillClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dotClass: 'bg-amber-500',
    pulse: false,
  },
  cancelled: {
    label: 'Cancelled',
    pillClass: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
    dotClass: 'bg-slate-400',
    pulse: false,
  },
  completed: {
    label: 'Completed',
    pillClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    dotClass: 'bg-indigo-500',
    pulse: false,
  },
  expired: {
    label: 'Expired',
    pillClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    dotClass: 'bg-rose-500',
    pulse: false,
  },
  failed: {
    label: 'Failed',
    pillClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    dotClass: 'bg-rose-500',
    pulse: false,
  },
};

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'created', label: 'Created' },
  { value: 'authenticated', label: 'Authenticated' },
  { value: 'pending', label: 'Pending' },
  { value: 'halted', label: 'Past due' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
];

function fmt(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function daysUntil(v) {
  if (!v) return null;
  const diff = Math.ceil((new Date(v).getTime() - Date.now()) / 86400000);
  return Number.isFinite(diff) ? diff : null;
}

// Compact relative label for a billing date — "in 12d", "today", "3d overdue".
function relativeLabel(v) {
  const days = daysUntil(v);
  if (days === null) return '';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days}d`;
}

// Generate vibrant initials avatar background based on string
function getAvatarGradient(str = '') {
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-600',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export default function SchoolSubscriptionsPanel() {
  const { addNotification } = useSuperAdminNotifications();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [schools, setSchools] = useState([]);
  const [recurringPlans, setRecurringPlans] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ schoolId: '', planId: '', trialDays: '' });
  const [creating, setCreating] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState('payments');
  const [detailData, setDetailData] = useState({ payments: [], invoices: [], history: [] });
  const [detailLoading, setDetailLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelImmediate, setCancelImmediate] = useState(false);
  const [changePlanTarget, setChangePlanTarget] = useState(null);
  const [changePlanId, setChangePlanId] = useState('');

  const load = async (page = 1, isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 25 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const [listRes, statsRes] = await Promise.all([
        platformSchoolSubscriptionApi.list(params),
        platformSchoolSubscriptionApi.stats().catch(() => null),
      ]);
      setRows(listRes?.data || []);
      setPagination(listRes?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
      if (statsRes?.data) setStats(statsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load school subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const openCreate = async () => {
    setCreateForm({ schoolId: '', planId: '', trialDays: '' });
    setCreateOpen(true);
    try {
      const [schoolsRes, plansRes] = await Promise.all([platformSchoolApi.list(), platformSubscriptionApi.list()]);
      setSchools(schoolsRes?.data || []);
      setRecurringPlans((plansRes?.data || []).filter((p) => p.isRecurring && p.status !== 'archived'));
    } catch {
      /* dialog will just show empty selects */
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!createForm.schoolId || !createForm.planId) return;
    setCreating(true);
    try {
      const payload = {};
      if (createForm.trialDays !== '') payload.trialDays = Number(createForm.trialDays);
      const result = await platformSchoolSubscriptionApi.create(createForm.schoolId, { planId: createForm.planId, ...payload });
      addNotification('success', result.message || 'Subscription created. School Admin must complete Razorpay checkout.');
      setCreateOpen(false);
      load(1);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to create subscription');
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (row) => {
    setDetail(row);
    setDetailTab('payments');
    setDetailLoading(true);
    try {
      const [p, i, h] = await Promise.all([
        platformSchoolSubscriptionApi.payments(row.id, { limit: 20 }),
        platformSchoolSubscriptionApi.invoices(row.id, { limit: 20 }),
        platformSchoolSubscriptionApi.history(row.id, { limit: 30 }),
      ]);
      setDetailData({ payments: p?.data || [], invoices: i?.data || [], history: h?.data || [] });
    } catch (err) {
      addNotification('error', err.response?.data?.message || 'Unable to load subscription detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const copySubscriptionId = (id) => {
    if (!id) return;
    navigator.clipboard?.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    try {
      await platformSchoolSubscriptionApi.cancel(cancelTarget.id, { immediate: cancelImmediate });
      addNotification('success', cancelImmediate ? 'Subscription cancelled immediately' : 'Cancellation scheduled for period end');
      setCancelTarget(null);
      load(pagination.page);
    } catch (err) {
      addNotification('error', err.response?.data?.message || 'Unable to cancel subscription');
    }
  };

  const doChangePlan = async () => {
    if (!changePlanTarget || !changePlanId) return;
    try {
      await platformSchoolSubscriptionApi.changePlan(changePlanTarget.id, changePlanId);
      addNotification('success', 'Plan change processed');
      setChangePlanTarget(null);
      load(pagination.page);
    } catch (err) {
      addNotification('error', err.response?.data?.message || 'Unable to change plan');
    }
  };

  // Counts shown on the filter pills, straight from the stats aggregate.
  const filterCount = (value) => {
    if (!stats) return null;
    if (value === 'ALL') return Object.values(stats.byStatus || {}).reduce((sum, c) => sum + c, 0);
    return stats.byStatus?.[value] || 0;
  };

  // Client search filter
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter((r) => {
      const schoolName = (r.school?.name || '').toLowerCase();
      const schoolCode = (r.school?.schoolId || '').toLowerCase();
      const planName = (r.plan?.name || '').toLowerCase();
      const subId = (r.razorpaySubscriptionId || '').toLowerCase();
      const schoolRef = (r.school?.id || r.schoolId || '').toLowerCase();
      return (
        schoolName.includes(q) || schoolCode.includes(q) || planName.includes(q) || subId.includes(q) || schoolRef.includes(q)
      );
    });
  }, [rows, searchQuery]);

  // Revenue headline — the two numbers that matter most, given their own row.
  const financialTiles = useMemo(
    () => [
      {
        label: 'MRR',
        value: inr(stats?.mrr),
        sub: 'Monthly recurring run rate',
        icon: TrendingUp,
        ring: 'border-indigo-200/70 dark:border-indigo-500/25',
        surface: 'from-indigo-50 to-white dark:from-indigo-500/10 dark:to-slate-900/60',
        chip: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      },
      {
        label: 'ARR (est.)',
        value: inr(stats?.arr),
        sub: '12× monthly run rate + yearly contracts',
        icon: Sparkles,
        ring: 'border-violet-200/70 dark:border-violet-500/25',
        surface: 'from-violet-50 to-white dark:from-violet-500/10 dark:to-slate-900/60',
        chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
      },
    ],
    [stats]
  );

  // Lifecycle counters
  const statusTiles = useMemo(
    () => [
      {
        label: 'Active',
        value: stats?.byStatus?.active || 0,
        sub: 'Live & billing',
        icon: CheckCircle2,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
      },
      {
        label: 'Trial / Pending',
        value: (stats?.byStatus?.created || 0) + (stats?.byStatus?.authenticated || 0) + (stats?.byStatus?.pending || 0),
        sub: 'Awaiting activation',
        icon: Clock,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
      },
      {
        label: 'Past due',
        value: stats?.pastDue || 0,
        sub: 'Retry cycle active',
        icon: AlertCircle,
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-500/10 border-rose-500/20',
      },
      {
        label: 'Cancelled',
        value: stats?.byStatus?.cancelled || 0,
        sub: 'Revoked / ended',
        icon: Ban,
        color: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-500/10 border-slate-500/20',
      },
      {
        label: 'Expired',
        value: stats?.byStatus?.expired || 0,
        sub: 'Grace period past',
        icon: AlertTriangle,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-500/10 border-red-500/20',
      },
    ],
    [stats]
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                School Subscriptions
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {stats?.byStatus?.active || rows.filter((r) => r.status === 'active').length} Active
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Recurring Razorpay subscriptions billed per school · Real-time status & billing cycle monitor.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => load(pagination.page, true)}
            disabled={loading || refreshing}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <Button size="sm" onClick={openCreate} className="gap-1.5 whitespace-nowrap">
            <Plus size={15} />
            <span>New School Subscription</span>
          </Button>
        </div>
      </div>

      {/* Revenue headline */}
      <div className="grid gap-3 sm:grid-cols-2">
        {financialTiles.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 transition-shadow duration-200 hover:shadow-card ${c.ring} ${c.surface}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {c.label}
                  </span>
                  <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums dark:text-white">
                    {loading && !stats ? <Pulse className="h-8 w-28" /> : c.value}
                  </div>
                  <p className="mt-1 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{c.sub}</p>
                </div>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${c.chip}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lifecycle counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statusTiles.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  {c.label}
                </span>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${c.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${c.color}`} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums dark:text-white">
                {loading && !stats ? <Pulse className="h-7 w-10" /> : c.value}
              </div>
              <div className="mt-0.5 truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">{c.sub}</div>
            </div>
          );
        })}
      </div>
      {/* Search & Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-2.5 dark:border-slate-800/80 dark:bg-slate-900/50 lg:flex-row lg:items-center lg:justify-between">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const isSelected = statusFilter === f.value;
            const count = filterCount(f.value);
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all duration-150 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'border border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span>{f.label}</span>
                {count !== null && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none tabular-nums ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : count > 0
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-slate-100/70 text-slate-400 dark:bg-slate-800/60 dark:text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Search */}
        <div className="relative w-full lg:w-72 lg:shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search school, plan or subscription ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200/90 bg-white pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {/* Subscriptions Table */}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-center text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-rose-500" />
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => load(1)}
            className="mt-3 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
          >
            Retry
          </button>
      </div>

      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="max-h-[calc(100vh-22rem)] overflow-auto">
            <table className="w-full min-w-[62rem] text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-50/95 text-[11px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/95 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">School</th>
                  <th className="px-4 py-3.5">Plan</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5">Period End</th>
                  <th className="px-4 py-3.5">Next Billing</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Pulse className="h-9 w-9 rounded-xl shrink-0" />
                          <div className="space-y-1.5 flex-1">
                            <Pulse className="h-4 w-36" />
                            <Pulse className="h-3 w-20" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Pulse className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-4">
                        <Pulse className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="px-4 py-4">
                        <Pulse className="ml-auto h-4 w-16" />
                      </td>
                      <td className="px-4 py-4">
                        <Pulse className="h-4 w-20" />
                      </td>
                      <td className="px-4 py-4">
                        <Pulse className="h-4 w-20" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Pulse className="h-7 w-16 ml-auto rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                        {searchQuery ? 'No matching subscriptions' : 'No school subscriptions yet'}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {searchQuery
                          ? `No subscription matches "${searchQuery}". Clear your search or change the filter.`
                          : 'Create recurring subscriptions for schools to manage billing.'}
                      </p>
                      {searchQuery ? (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="mt-3 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          Clear Search
                        </button>
                      ) : (
                        <Button size="sm" onClick={openCreate} className="mt-4 gap-1.5">
                          <Plus size={14} /> New School Subscription
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const statusInfo = STATUS_CONFIG[r.status] || {
                      label: r.status,
                      pillClass: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
                      dotClass: 'bg-slate-400',
                      pulse: false,
                    };

                    const schoolName = r.school?.name || r.schoolName || 'Unnamed School';
                    const schoolCode = r.school?.schoolId || '';
                    const schoolStatus = r.school?.status || '';
                    const planName = r.plan?.name || 'Standard Plan';
                    const planInterval = r.plan?.billingInterval || 'monthly';
                    const periodEndRel = relativeLabel(r.currentPeriodEnd);
                    const nextBillingRel = relativeLabel(r.nextBillingAt);
                    const nextBillingDays = daysUntil(r.nextBillingAt);
                    const billingSoon = nextBillingDays !== null && nextBillingDays <= 7;

                    const avatarInitials =
                      schoolName
                        .split(' ')
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase() || 'SC';
                    return (
                      <tr
                        key={r.id}
                        onClick={() => openDetail(r)}
                        className="group cursor-pointer transition-colors duration-150 hover:bg-indigo-50/40 dark:hover:bg-slate-850/50"
                      >
                        {/* School Info */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {r.school?.logoUrl ? (
                              <img
                                src={r.school.logoUrl}
                                alt={schoolName}
                                className="h-9 w-9 shrink-0 rounded-xl border border-slate-200/80 object-cover dark:border-slate-700"
                              />
                            ) : (
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(
                                  schoolName
                                )} text-xs font-bold text-white shadow-2xs`}
                              >
                                {avatarInitials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                                {schoolName}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                {schoolCode && (
                                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{schoolCode}</span>
                                )}
                                {schoolStatus && (
                                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                    {schoolStatus}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="px-4 py-3.5">
                          <div className="truncate font-semibold text-slate-800 dark:text-slate-200">{planName}</div>
                          <span className="mt-0.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {planInterval}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize tracking-wide ${statusInfo.pillClass}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass} ${
                                  statusInfo.pulse ? 'animate-pulse' : ''
                                }`}
                              />
                              {statusInfo.label}
                            </span>
                            {r.cancelAtPeriodEnd && (
                              <span
                                title="Cancellation scheduled at period end"
                                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Ending
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <span className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
                            {inr(r.totalAmount)}
                          </span>
                          <span className="ml-0.5 text-[11px] font-medium text-slate-400">
                            /{planInterval === 'yearly' ? 'yr' : 'mo'}
                          </span>
                        </td>

                        {/* Period End */}
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                            <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
                            <span>{fmt(r.currentPeriodEnd)}</span>
                          </div>
                          {periodEndRel && (
                            <div className="mt-0.5 pl-4.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                              {periodEndRel}
                            </div>
                          )}
                        </td>

                        {/* Next Billing */}
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                            <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                            <span>{fmt(r.nextBillingAt)}</span>
                          </div>
                          {nextBillingRel && (
                            <div
                              className={`mt-0.5 pl-4.5 text-[10px] font-bold ${
                                billingSoon
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'font-medium text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {nextBillingRel}
                            </div>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="View details & history"
                              onClick={() => openDetail(r)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              title="Upgrade or change plan"
                              onClick={() => {
                                setChangePlanTarget(r);
                                setChangePlanId('');
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                            >
                              <ArrowUpRight size={13} />
                            </button>
                            <button
                              type="button"
                              title="Cancel subscription"
                              onClick={() => {
                                setCancelTarget(r);
                                setCancelImmediate(false);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 shadow-2xs transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                            >
                              <Ban size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          {!loading && filteredRows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-900/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filteredRows.length}</span> of{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{pagination.total || rows.length}</span> subscriptions
                {pagination.totalPages > 1 && (
                  <>
                    {' · page '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{pagination.page}</span>
                    {' of '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{pagination.totalPages}</span>
                  </>
                )}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => load(pagination.page - 1)}
                  className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => load(pagination.page + 1)}
                  className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Plus size={16} />
              </div>
              <span>Create School Subscription</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="mt-3 space-y-4">
            <Select
              label="School"
              value={createForm.schoolId}
              onChange={(e) => setCreateForm((f) => ({ ...f, schoolId: e.target.value }))}
              required
            >
              <option value="">Select a school…</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code || s.schoolId || 'No Code'})
                </option>
              ))}
            </Select>

            <Select
              label="Recurring Plan"
              value={createForm.planId}
              onChange={(e) => setCreateForm((f) => ({ ...f, planId: e.target.value }))}
              required
            >
              <option value="">Select a recurring plan…</option>
              {recurringPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{p.price}/{p.billingInterval}
                </option>
              ))}
            </Select>

            {recurringPlans.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                No recurring plans exist yet. Please create a plan with recurring billing enabled first.
              </div>
            )}

            <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Razorpay Workflow:</p>
              <p className="mt-0.5">
                This creates the subscription linkage. The School Admin will see the checkout in their school portal to authorize recurring debits.
              </p>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {creating ? 'Creating…' : 'Create Subscription'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* CHANGE PLAN DIALOG */}
      <Dialog open={Boolean(changePlanTarget)} onOpenChange={(o) => !o && setChangePlanTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <ArrowUpRight size={16} />
              </div>
              <span>Change Subscription Plan</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60">
              <span className="text-slate-400">School: </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {changePlanTarget?.school?.name || changePlanTarget?.schoolName}
              </span>
              <div className="mt-1">
                <span className="text-slate-400">Current Plan: </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {changePlanTarget?.plan?.name}
                </span>
              </div>
            </div>

            <Select label="New Plan" value={changePlanId} onChange={(e) => setChangePlanId(e.target.value)}>
              <option value="">Select a new plan…</option>
              {recurringPlans
                .filter((p) => p.id !== changePlanTarget?.plan?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{p.price}/{p.billingInterval}
                  </option>
                ))}
            </Select>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              A higher-priced plan upgrade applies immediately. A lower-priced downgrade is scheduled for the next billing cycle.
            </p>

            <Button className="w-full" onClick={doChangePlan} disabled={!changePlanId}>
              Confirm Plan Change
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CANCEL SUBSCRIPTION DIALOG */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                <Ban size={16} />
              </div>
              <span>Cancel Subscription</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              <p className="font-bold">
                School: {cancelTarget?.school?.name || cancelTarget?.schoolName}
              </p>
              <p className="mt-1">
                Plan: {cancelTarget?.plan?.name} · Period Ends: {fmt(cancelTarget?.currentPeriodEnd)}
              </p>
            </div>

            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
              <input
                type="checkbox"
                checked={cancelImmediate}
                onChange={(e) => setCancelImmediate(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span>Cancel immediately (Super Admin Override)</span>
                <p className="font-normal text-[11px] text-slate-400 mt-0.5">
                  Revokes school access instantly and stops recurring Razorpay billing immediately.
                </p>
              </div>
            </label>

            <p className="text-[11px] text-slate-500">
              {cancelImmediate
                ? 'Access will be restricted immediately.'
                : `Access continues until the billing period end (${fmt(cancelTarget?.currentPeriodEnd)}), then stops.`}
            </p>

            <Button variant="destructive" className="w-full" onClick={doCancel}>
              {cancelImmediate ? 'Cancel Immediately' : 'Schedule Cancellation at Period End'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DETAIL MODAL / DRAWER */}
      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getAvatarGradient(
                    detail?.school?.name || 'School'
                  )} text-sm font-bold text-white shadow-2xs`}
                >
                  {(detail?.school?.name || 'SC').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                    {detail?.school?.name || detail?.schoolName || 'School Subscription'}
                  </DialogTitle>
                  <p className="text-xs text-slate-400">
                    Plan: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{detail?.plan?.name}</span> · ₹{detail?.totalAmount}
                  </p>
                </div>
              </div>

              {detail?.razorpaySubscriptionId && (
                <button
                  type="button"
                  onClick={() => copySubscriptionId(detail.razorpaySubscriptionId)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  title="Copy Razorpay Subscription ID"
                >
                  {copiedId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span>{detail.razorpaySubscriptionId}</span>
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Modal Tabs */}
          <div className="mt-2 flex gap-1.5 border-b border-slate-200/80 pb-2 dark:border-slate-800/80">
            {[
              { id: 'payments', label: 'Payments', icon: Receipt, count: detailData.payments.length },
              { id: 'invoices', label: 'Invoices', icon: Receipt, count: detailData.invoices.length },
              { id: 'history', label: 'Audit History', icon: History, count: detailData.history.length },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDetailTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  detailTab === t.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <t.icon size={13} />
                <span>{t.label}</span>
                {t.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                      detailTab === t.id ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="max-h-96 overflow-y-auto pt-2">
            {detailLoading ? (
              <div className="space-y-2 py-4">
                <Pulse className="h-8 w-full rounded-lg" />
                <Pulse className="h-8 w-full rounded-lg" />
                <Pulse className="h-8 w-full rounded-lg" />
              </div>
            ) : detailTab === 'payments' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 dark:border-slate-800">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2">Payment ID</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {detailData.payments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No payment records found yet.
                        </td>
                      </tr>
                    )}
                    {detailData.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40">
                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-300">{fmt(p.createdAt)}</td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-500">{p.razorpayPaymentId}</td>
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white tabular-nums">{inr(p.amount)}</td>
                        <td className="py-2.5">
                          <Badge variant={p.status === 'captured' ? 'success' : p.status === 'failed' ? 'danger' : 'default'}>
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : detailTab === 'invoices' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 dark:border-slate-800">
                    <tr>
                      <th className="py-2">Issued</th>
                      <th className="py-2">Invoice #</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {detailData.invoices.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No invoices generated yet.
                        </td>
                      </tr>
                    )}
                    {detailData.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40">
                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-300">{fmt(inv.issuedAt)}</td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-500">{inv.invoiceNumber}</td>
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white tabular-nums">{inr(inv.amount)}</td>
                        <td className="py-2.5">
                          <Badge variant={inv.status === 'Paid' ? 'success' : 'warning'}>{inv.status}</Badge>
                        </td>
                        <td className="py-2.5 text-right">
                          {inv.pdfUrl ? (
                            <a
                              href={inv.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                              <span>View</span>
                              <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ul className="space-y-2.5 py-1">
                {detailData.history.length === 0 && (
                  <li className="py-8 text-center text-slate-400">No audit history recorded yet.</li>
                )}
                {detailData.history.map((h) => (
                  <li
                    key={h.id}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                        {h.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400">{fmt(h.createdAt)}</span>
                    </div>
                    <div className="mt-1 text-slate-500 dark:text-slate-400">
                      <span className="capitalize">{h.fromStatus || 'none'}</span> →{' '}
                      <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{h.toStatus}</span>
                      {h.reason && ` · Reason: ${h.reason}`}
                      {h.performedBy && <span className="ml-1">· by {h.performedBy}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

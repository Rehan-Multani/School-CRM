import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button, Badge } from '../../components/ui/Button';
import { Pulse } from '../../components/ui/SkeletonLoader';
import { Select } from '../../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformSchoolSubscriptionApi, platformSubscriptionApi, platformSchoolApi } from '../../../../shared/api/client';
import { Plus, Loader2, Ban, ArrowUpRight, Receipt, History, ChevronLeft, ChevronRight } from 'lucide-react';

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

function fmt(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function SchoolSubscriptionsPanel() {
  const { addNotification } = useSuperAdminNotifications();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [schools, setSchools] = useState([]);
  const [recurringPlans, setRecurringPlans] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ schoolId: '', planId: '', trialDays: '' });
  const [creating, setCreating] = useState(false);

  const [detail, setDetail] = useState(null); // subscription row for the drawer
  const [detailTab, setDetailTab] = useState('payments');
  const [detailData, setDetailData] = useState({ payments: [], invoices: [], history: [] });
  const [detailLoading, setDetailLoading] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelImmediate, setCancelImmediate] = useState(false);
  const [changePlanTarget, setChangePlanTarget] = useState(null);
  const [changePlanId, setChangePlanId] = useState('');

  const load = async (page = 1) => {
    setLoading(true);
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

  const statCards = useMemo(
    () => [
      { label: 'Active', value: stats?.byStatus?.active || 0 },
      { label: 'Trial/Pending', value: (stats?.byStatus?.created || 0) + (stats?.byStatus?.authenticated || 0) + (stats?.byStatus?.pending || 0) },
      { label: 'Past Due', value: stats?.pastDue || 0 },
      { label: 'Cancelled', value: stats?.byStatus?.cancelled || 0 },
      { label: 'Expired', value: stats?.byStatus?.expired || 0 },
      { label: 'MRR', value: inr(stats?.mrr) },
      { label: 'ARR (est.)', value: inr(stats?.arr) },
    ],
    [stats]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">School Subscriptions</h2>
          <p className="text-xs text-slate-400">Recurring Razorpay subscriptions billed per school.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} className="mr-1.5" /> New School Subscription
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {statCards.map((c) => (
          <Card key={c.label} className="border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900/60">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{c.label}</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{c.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        {['ALL', 'active', 'created', 'authenticated', 'pending', 'halted', 'cancelled', 'expired'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${
              statusFilter === s ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10">
          {error}
        </div>
      ) : (
        <Card className="overflow-hidden border-slate-200 p-0 dark:border-slate-800/80">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Period End</th>
                <th className="px-4 py-3">Next Billing</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <Pulse className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-slate-400">
                    No school subscriptions yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-900/40" onClick={() => openDetail(r)}>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{r.school?.name || '—'}</td>
                    <td className="px-4 py-3">{r.plan?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[r.status] || 'default'}>{r.status}</Badge>
                      {r.cancelAtPeriodEnd && <span className="ml-1 text-[10px] text-amber-500">(ending)</span>}
                    </td>
                    <td className="px-4 py-3">{inr(r.totalAmount)}</td>
                    <td className="px-4 py-3">{fmt(r.currentPeriodEnd)}</td>
                    <td className="px-4 py-3">{fmt(r.nextBillingAt)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button
                          title="Change plan"
                          onClick={() => {
                            setChangePlanTarget(r);
                            setChangePlanId('');
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10"
                        >
                          <ArrowUpRight size={14} />
                        </button>
                        <button
                          title="Cancel"
                          onClick={() => {
                            setCancelTarget(r);
                            setCancelImmediate(false);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                        >
                          <Ban size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                Page {pagination.page} / {pagination.totalPages} · {pagination.total} total
              </span>
              <div className="flex gap-1">
                <button disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-800">
                  <ChevronLeft size={14} />
                </button>
                <button disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-800">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* CREATE */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create School Subscription</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            <Select label="School" value={createForm.schoolId} onChange={(e) => setCreateForm((f) => ({ ...f, schoolId: e.target.value }))} required>
              <option value="">Select a school…</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select label="Recurring Plan" value={createForm.planId} onChange={(e) => setCreateForm((f) => ({ ...f, planId: e.target.value }))} required>
              <option value="">Select a plan…</option>
              {recurringPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{p.price}/{p.billingInterval}
                </option>
              ))}
            </Select>
            {recurringPlans.length === 0 && (
              <p className="text-[11px] text-amber-600">No recurring plans exist yet — create one first with "Enable Razorpay recurring billing" checked.</p>
            )}
            <p className="text-[11px] text-slate-500">
              This creates a Razorpay subscription. The School Admin must complete checkout (add a payment method) before billing starts.
            </p>
            <Button type="submit" className="w-full gap-2" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {creating ? 'Creating…' : 'Create Subscription'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* CHANGE PLAN */}
      <Dialog open={Boolean(changePlanTarget)} onOpenChange={(o) => !o && setChangePlanTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change plan — {changePlanTarget?.school?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select label="New Plan" value={changePlanId} onChange={(e) => setChangePlanId(e.target.value)}>
              <option value="">Select…</option>
              {recurringPlans
                .filter((p) => p.id !== changePlanTarget?.plan?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{p.price}/{p.billingInterval}
                  </option>
                ))}
            </Select>
            <p className="text-[11px] text-slate-500">
              A higher-priced plan applies immediately. A lower-priced plan is scheduled for the next billing cycle.
            </p>
            <Button className="w-full" onClick={doChangePlan} disabled={!changePlanId}>
              Confirm Change
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CANCEL */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel subscription — {cancelTarget?.school?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={cancelImmediate} onChange={(e) => setCancelImmediate(e.target.checked)} className="h-4 w-4 rounded text-rose-600" />
              Cancel immediately (Super Admin only — revokes access right away)
            </label>
            <p className="text-[11px] text-slate-500">
              {cancelImmediate
                ? 'Access is restricted immediately and the Razorpay subscription is cancelled now.'
                : `Access continues until ${fmt(cancelTarget?.currentPeriodEnd)}, then billing stops.`}
            </p>
            <Button variant="destructive" className="w-full" onClick={doCancel}>
              {cancelImmediate ? 'Cancel Immediately' : 'Schedule Cancellation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DETAIL DRAWER (modal) */}
      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detail?.school?.name} — {detail?.plan?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
            {[
              { id: 'payments', label: 'Payments', icon: Receipt },
              { id: 'invoices', label: 'Invoices', icon: Receipt },
              { id: 'history', label: 'History', icon: History },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setDetailTab(t.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                  detailTab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-500'
                }`}
              >
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {detailLoading ? (
              <Pulse className="h-32 w-full" />
            ) : detailTab === 'payments' ? (
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {detailData.payments.length === 0 && (
                    <tr><td className="py-6 text-center text-slate-400">No payments yet.</td></tr>
                  )}
                  {detailData.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2">{fmt(p.createdAt)}</td>
                      <td className="py-2 font-mono text-[11px]">{p.razorpayPaymentId}</td>
                      <td className="py-2">{inr(p.amount)}</td>
                      <td className="py-2"><Badge variant={p.status === 'captured' ? 'success' : p.status === 'failed' ? 'danger' : 'default'}>{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : detailTab === 'invoices' ? (
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {detailData.invoices.length === 0 && (
                    <tr><td className="py-6 text-center text-slate-400">No invoices yet.</td></tr>
                  )}
                  {detailData.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-2">{fmt(inv.issuedAt)}</td>
                      <td className="py-2">{inv.invoiceNumber}</td>
                      <td className="py-2">{inr(inv.amount)}</td>
                      <td className="py-2"><Badge variant={inv.status === 'Paid' ? 'success' : 'warning'}>{inv.status}</Badge></td>
                      <td className="py-2">
                        {inv.pdfUrl && (
                          <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <ul className="space-y-2">
                {detailData.history.length === 0 && <li className="py-6 text-center text-slate-400">No history yet.</li>}
                {detailData.history.map((h) => (
                  <li key={h.id} className="rounded-lg border border-slate-100 p-2.5 text-xs dark:border-slate-800">
                    <div className="flex justify-between">
                      <span className="font-bold uppercase text-slate-700 dark:text-slate-200">{h.action.replace(/_/g, ' ')}</span>
                      <span className="text-slate-400">{fmt(h.createdAt)}</span>
                    </div>
                    <div className="text-slate-500">
                      {h.fromStatus} → {h.toStatus} {h.reason ? `· ${h.reason}` : ''} · by {h.performedBy}
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

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from '../../components/ui/Button';
import { Pulse } from '../../components/ui/SkeletonLoader';
import { Input, Select } from '../../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformSubscriptionApi } from '../../../../shared/api/client';
import { Plus, Trash2, CheckCircle2, Loader2, X, Pencil, AlertTriangle } from 'lucide-react';
import SchoolSubscriptionsPanel from './SchoolSubscriptionsPanel';

const PLAN_TYPES = ['Weekly', 'Monthly', 'Yearly'];

function PlansGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="space-y-6 border-slate-200 bg-white p-6 dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex items-start justify-between gap-3">
            <Pulse className="h-5 w-32" />
            <Pulse className="h-6 w-16 rounded-full" />
          </div>
          <Pulse className="h-10 w-28" />
          <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Pulse className="h-3 w-full" />
            <Pulse className="h-3 w-5/6" />
            <Pulse className="h-3 w-4/6" />
            <Pulse className="h-3 w-3/4" />
          </div>
        </Card>
      ))}
    </div>
  );
}

const emptyForm = () => ({
  name: '',
  price: '',
  planType: 'Monthly',
  features: [],
  featureDraft: '',
  makeRecurring: false,
  trialDays: '0',
});

export default function SubscriptionsIndex() {
  const { addNotification } = useSuperAdminNotifications();
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const result = await platformSubscriptionApi.list();
      setPlans(result.data || []);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to load plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingPlan(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      price: String(plan.price),
      planType: plan.planType,
      features: plan.features || [],
      featureDraft: '',
      makeRecurring: Boolean(plan.isRecurring),
      trialDays: String(plan.trialDays ?? 0),
    });
    setDialogOpen(true);
  };

  const canBeRecurring = form.planType === 'Monthly' || form.planType === 'Yearly';

  const addFeature = () => {
    const value = form.featureDraft.trim();
    if (!value) return;
    if (form.features.some((feature) => feature.toLowerCase() === value.toLowerCase())) {
      addNotification('error', 'This feature is already added.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      features: [...prev.features, value],
      featureDraft: '',
    }));
  };

  const removeFeature = (index) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.price === '') return;

    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      planType: form.planType,
      features: form.features,
    };
    // Recurring linkage is immutable after creation — Razorpay plan amount/interval
    // cannot be edited in place, so this only applies when creating a new plan.
    if (!editingPlan && canBeRecurring && form.makeRecurring) {
      payload.makeRecurring = true;
      payload.trialDays = Number(form.trialDays) || 0;
    }

    setSaving(true);
    try {
      if (editingPlan) {
        const result = await platformSubscriptionApi.update(editingPlan.id, payload);
        setPlans((prev) => prev.map((plan) => (plan.id === editingPlan.id ? result.data : plan)));
        addNotification('success', result.message || `Plan updated: ${form.name}`);
      } else {
        const result = await platformSubscriptionApi.create(payload);
        setPlans((prev) => [result.data, ...prev]);
        addNotification('success', result.message || `Plan created: ${form.name}`);
      }
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      addNotification(
        'error',
        err.response?.data?.message || err.message || 'Unable to save plan.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setDeleting(true);
    try {
      await platformSubscriptionApi.remove(planToDelete.id);
      setPlans((prev) => prev.filter((plan) => plan.id !== planToDelete.id));
      addNotification('error', `Plan deleted: ${planToDelete.name}`);
      setPlanToDelete(null);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to delete plan.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('plans')}
          className={`rounded-lg px-3.5 py-2 text-xs font-bold ${activeTab === 'plans' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
        >
          Plans
        </button>
        <button
          onClick={() => setActiveTab('schools')}
          className={`rounded-lg px-3.5 py-2 text-xs font-bold ${activeTab === 'schools' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
        >
          School Subscriptions
        </button>
      </div>

      {activeTab === 'schools' ? (
        <SchoolSubscriptionsPanel />
      ) : (
        <>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SaaS Subscription Plans</h1>
          <p className="text-xs text-slate-400">Create billing plans with weekly, monthly, or yearly pricing and feature lists.</p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1.5" />
            Build SaaS Tier
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Edit Subscription Tier' : 'Create Subscription Tier Profile'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSavePlan} className="space-y-4 mt-2">
              <Input
                label="Plan Name"
                placeholder="Ultimate Enterprise Plan"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="299"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  required
                />
                <Select
                  label="Plan Type"
                  value={form.planType}
                  onChange={(e) => setForm((prev) => ({ ...prev, planType: e.target.value }))}
                >
                  {PLAN_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Features
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                    placeholder="Add a feature and press Enter"
                    value={form.featureDraft}
                    onChange={(e) => setForm((prev) => ({ ...prev, featureDraft: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={addFeature}>
                    Add
                  </Button>
                </div>
                {form.features.length > 0 && (
                  <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    {form.features.map((feature, index) => (
                      <span
                        key={`${feature}-${index}`}
                        className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
                      >
                        {feature}
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="rounded-full p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                          aria-label={`Remove ${feature}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-500">Press Enter to add multiple features.</p>
              </div>

              {!editingPlan && canBeRecurring && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.makeRecurring}
                      onChange={(e) => setForm((prev) => ({ ...prev, makeRecurring: e.target.checked }))}
                      className="h-4 w-4 rounded text-indigo-600"
                    />
                    Enable Razorpay recurring billing for this plan
                  </label>
                  {form.makeRecurring && (
                    <Input
                      label="Trial Days (0 = no trial)"
                      type="number"
                      min="0"
                      value={form.trialDays}
                      onChange={(e) => setForm((prev) => ({ ...prev, trialDays: e.target.value }))}
                    />
                  )}
                  <p className="text-[11px] text-slate-500">
                    Creates a matching Razorpay recurring plan. This cannot be changed after the plan is created —
                    a price/interval change requires a new plan.
                  </p>
                </div>
              )}
              {editingPlan?.isRecurring && (
                <p className="rounded-lg bg-indigo-50 px-3 py-2 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                  This plan is linked to Razorpay ({editingPlan.razorpayPlanId}). Price/interval are immutable.
                </p>
              )}

              <Button type="submit" className="w-full gap-2" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : editingPlan ? (
                  'Save Changes'
                ) : (
                  'Publish Subscription Tier'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <PlansGridSkeleton />
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400 dark:border-slate-800">
          No subscription plans yet. Click &quot;Build SaaS Tier&quot; to create the first plan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative flex flex-col justify-between border-slate-200 bg-white p-6 space-y-6 dark:border-slate-800/80 dark:bg-slate-900/60">
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                  <div className="flex items-center gap-1">
                    {plan.isRecurring && <Badge variant="success">Recurring</Badge>}
                    <Badge variant="info">{plan.planType}</Badge>
                    <button
                      type="button"
                      onClick={() => openEdit(plan)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                      aria-label={`Edit ${plan.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanToDelete(plan)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                      aria-label={`Delete ${plan.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">₹{plan.price}</span>
                  <span className="text-xs text-slate-500">/ {plan.planType.toLowerCase()}</span>
                </div>

                <hr className="border-slate-200 dark:border-slate-800" />

                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {plan.features?.length ? (
                    plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="shrink-0 text-indigo-400" />
                        {feature}
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400">No features listed</li>
                  )}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(planToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setPlanToDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete subscription plan</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Delete <span className="font-semibold text-slate-900 dark:text-white">{planToDelete?.name}</span>? Schools using this plan will no longer be linked to it.
            </p>
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={deleting}
              onClick={() => setPlanToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 gap-2"
              disabled={deleting}
              onClick={handleDeletePlan}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Plan
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}

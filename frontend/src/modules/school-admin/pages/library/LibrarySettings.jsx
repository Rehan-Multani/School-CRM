import React, { useCallback, useEffect, useState } from 'react';
import { Save, RefreshCw, AlertOctagon, Info } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { SkeletonForm } from '../../components/ui/SkeletonLoader';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { libraryPortalApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { LibraryTabsNav, inputClass, labelClass } from './libraryShared';

const Section = ({ icon: Icon, title, description, children }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-[11px] font-medium text-slate-400">{description}</p>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  </div>
);

const ToggleRow = ({ label, description, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/40 sm:col-span-2">
    <div>
      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{label}</span>
      {description && <span className="text-[11px] text-slate-400">{description}</span>}
    </div>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition-colors checked:bg-primary relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4 dark:bg-slate-700" />
  </label>
);

export const LibrarySettings = () => {
  const { showToast, ToastComponent } = useToast();
  const { user } = useSchoolAdminAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, statsRes] = await Promise.all([
        libraryPortalApi.settings(),
        libraryPortalApi.stats(),
      ]);
      setForm(settingsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to load library settings'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await libraryPortalApi.updateSettings({
        gracePeriodDays: Number(form.gracePeriodDays),
        blockIssueOnOverdue: form.blockIssueOnOverdue,
        lostBookFineMultiplier: Number(form.lostBookFineMultiplier),
        damagedBookFineMultiplier: Number(form.damagedBookFineMultiplier),
      });
      setForm(res.data);
      showToast('Library settings saved', 'success');
    } catch (err) {
      showToast(apiMessage(err, 'Failed to save library settings'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" subtitle="Return and lost/damaged policy for this school's library." />
        <LibraryTabsNav />
        <SkeletonForm fields={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastComponent />
      <PageHeader
        title="Settings"
        subtitle="Return and lost/damaged policy for this school's library."
        actions={
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />
      <LibraryTabsNav />

      {/* General info snapshot */}
      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/50 p-4 text-xs dark:border-sky-900/40 dark:bg-sky-950/20">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <div>
          <p className="font-bold text-sky-800 dark:text-sky-300">{user?.schoolName || 'This school'}'s Library</p>
          <p className="mt-0.5 text-slate-600 dark:text-slate-400">
            {stats?.totalTitles || 0} titles · {stats?.totalCopies || 0} physical copies · {stats?.activeIssued || 0} currently on loan.
            Borrowing limits and fine amounts are configured on the <strong>Rules</strong> page.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        <Section icon={AlertOctagon} title="Return & Overdue Policy" description="Grace period and whether overdue borrowers are blocked from new issues.">
          <div>
            <label className={labelClass}>Grace Period (days)</label>
            <input type="number" min="0" value={form.gracePeriodDays} onChange={(e) => set('gracePeriodDays', e.target.value)} className={inputClass} />
          </div>
          <ToggleRow label="Block Issue on Overdue" description="Prevent a borrower with overdue books from being issued a new one" checked={form.blockIssueOnOverdue} onChange={(v) => set('blockIssueOnOverdue', v)} />
        </Section>

        <Section icon={AlertOctagon} title="Lost / Damaged Charges" description="Multiplier applied to the book's catalog price when returned lost or damaged.">
          <div>
            <label className={labelClass}>Lost Book Fine Multiplier</label>
            <input type="number" min="0" step="0.1" value={form.lostBookFineMultiplier} onChange={(e) => set('lostBookFineMultiplier', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Damaged Book Fine Multiplier</label>
            <input type="number" min="0" step="0.1" value={form.damagedBookFineMultiplier} onChange={(e) => set('damagedBookFineMultiplier', e.target.value)} className={inputClass} />
          </div>
        </Section>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60">
            <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LibrarySettings;

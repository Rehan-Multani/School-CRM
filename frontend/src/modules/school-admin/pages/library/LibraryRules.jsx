import React, { useCallback, useEffect, useState } from 'react';
import { Save, Users, CalendarClock, Coins, BookmarkPlus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { SkeletonForm } from '../../components/ui/SkeletonLoader';
import { libraryPortalApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { LibraryTabsNav, inputClass, labelClass } from './libraryShared';

const RuleSection = ({ icon: Icon, title, description, children }) => (
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

export const LibraryRules = () => {
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await libraryPortalApi.settings();
      setForm(res.data);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to load library rules'), 'error');
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
        maxBooksStudent: Number(form.maxBooksStudent),
        maxBooksTeacher: Number(form.maxBooksTeacher),
        issueDaysStudent: Number(form.issueDaysStudent),
        issueDaysTeacher: Number(form.issueDaysTeacher),
        fineEnabled: form.fineEnabled,
        finePerDay: Number(form.finePerDay),
        maxFineAmount: Number(form.maxFineAmount),
        reservationEnabled: form.reservationEnabled,
        maxActiveReservations: Number(form.maxActiveReservations),
      });
      setForm(res.data);
      showToast('Library rules saved — enforced immediately for new issues and reservations', 'success');
    } catch (err) {
      showToast(apiMessage(err, 'Failed to save library rules'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="space-y-6">
        <PageHeader title="Rules" subtitle="Borrowing limits, fines and reservation policy enforced by the circulation backend." />
        <LibraryTabsNav />
        <SkeletonForm fields={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastComponent />
      <PageHeader
        title="Rules"
        subtitle="Borrowing limits, fines and reservation policy — enforced server-side on every issue, return and reservation."
      />
      <LibraryTabsNav />

      <form onSubmit={handleSave} className="space-y-5">
        <RuleSection icon={Users} title="Borrowing Limits" description="Maximum unreturned books allowed per borrower type.">
          <div>
            <label className={labelClass}>Max Books — Student</label>
            <input type="number" min="1" value={form.maxBooksStudent} onChange={(e) => set('maxBooksStudent', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Max Books — Teacher</label>
            <input type="number" min="1" value={form.maxBooksTeacher} onChange={(e) => set('maxBooksTeacher', e.target.value)} className={inputClass} />
          </div>
        </RuleSection>

        <RuleSection icon={CalendarClock} title="Issue Duration" description="Default loan period before a book becomes overdue.">
          <div>
            <label className={labelClass}>Student Issue Duration (days)</label>
            <input type="number" min="1" value={form.issueDaysStudent} onChange={(e) => set('issueDaysStudent', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Teacher Issue Duration (days)</label>
            <input type="number" min="1" value={form.issueDaysTeacher} onChange={(e) => set('issueDaysTeacher', e.target.value)} className={inputClass} />
          </div>
        </RuleSection>

        <RuleSection icon={Coins} title="Fine Policy" description="Overdue fine calculation, applied automatically on return.">
          <ToggleRow label="Fine Enabled" description="Charge a fine for books returned after the due date" checked={form.fineEnabled} onChange={(v) => set('fineEnabled', v)} />
          <div>
            <label className={labelClass}>Fine Per Overdue Day (₹)</label>
            <input type="number" min="0" disabled={!form.fineEnabled} value={form.finePerDay} onChange={(e) => set('finePerDay', e.target.value)} className={`${inputClass} disabled:opacity-50`} />
          </div>
          <div>
            <label className={labelClass}>Maximum Fine Amount (₹)</label>
            <input type="number" min="0" disabled={!form.fineEnabled} value={form.maxFineAmount} onChange={(e) => set('maxFineAmount', e.target.value)} className={`${inputClass} disabled:opacity-50`} />
          </div>
        </RuleSection>

        <RuleSection icon={BookmarkPlus} title="Reservation Policy" description="Controls whether borrowers can place holds on unavailable books.">
          <ToggleRow label="Reservations Enabled" description="Allow students and teachers to reserve books that are currently out" checked={form.reservationEnabled} onChange={(v) => set('reservationEnabled', v)} />
          <div>
            <label className={labelClass}>Maximum Active Reservations per Borrower</label>
            <input type="number" min="1" disabled={!form.reservationEnabled} value={form.maxActiveReservations} onChange={(e) => set('maxActiveReservations', e.target.value)} className={`${inputClass} disabled:opacity-50`} />
          </div>
        </RuleSection>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60">
            <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save Rules'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LibraryRules;

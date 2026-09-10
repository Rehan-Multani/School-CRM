import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Save, Loader2, History, Lock, BadgeCheck } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { safePickupSettingsApi } from '../../../../shared/api/client';

function apiMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
        checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function SafePickup() {
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolEnabled, setSchoolEnabled] = useState(false);
  const [classes, setClasses] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [original, setOriginal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await safePickupSettingsApi.get();
      setSchoolEnabled(Boolean(res.data.schoolEnabled));
      setClasses(res.data.classes || []);
      setOriginal({
        classes: Object.fromEntries((res.data.classes || []).map((c) => [c.id, c.safePickupEnabled])),
      });
      setDirty(false);
    } catch (e) {
      showToast(apiMessage(e, 'Failed to load safe-pickup settings'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleClass = (id, value) => {
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, safePickupEnabled: value } : c)));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const changed = classes.filter((c) => !original || original.classes[c.id] !== c.safePickupEnabled);
      await Promise.all(changed.map((c) => safePickupSettingsApi.setClass(c.id, c.safePickupEnabled)));
      showToast('Safe pickup settings saved', 'success');
      await load();
    } catch (e) {
      showToast(apiMessage(e, 'Failed to save'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = useMemo(() => classes.filter((c) => c.safePickupEnabled).length, [classes]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <ToastComponent />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-500/10">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Student Pickup Verification</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Require parent/guardian OTP verification before teachers can release eligible students.
            </p>
          </div>
        </div>
        {schoolEnabled && (
          <Link
            to="/school-admin/settings/safe-pickup/history"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-indigo-600"
          >
            <History className="h-3.5 w-3.5" /> History
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !schoolEnabled ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500">
            <Lock className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Not available</p>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Student Pickup Verification is managed by your platform administrator and is not
            enabled for your school. Contact platform support to turn it on – once enabled,
            you can configure it class by class here.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">School feature</p>
              <p className="text-xs text-slate-400">
                Enabled for your school by the platform administrator. Manage it class by class below.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <BadgeCheck className="h-3.5 w-3.5" /> Enabled by platform admin
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900">
              <span>Class-wise configuration</span>
              <span className="font-semibold normal-case tracking-normal text-slate-400">
                {enabledCount}/{classes.length} on
              </span>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {classes.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-400">No classes found for this school.</li>
              )}
              {classes.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{c.name}</p>
                    <p className="truncate text-xs text-slate-400">
                      {c.sections?.length ? `Sections ${c.sections.join(', ')}` : 'No sections'}
                    </p>
                  </div>
                  <Toggle
                    checked={c.safePickupEnabled}
                    onChange={(v) => toggleClass(c.id, v)}
                    label={`${c.name} safe pickup`}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3">
            {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default SafePickup;


import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Database, Save } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { platformAppConfigApi } from '../../../../../shared/api/client';
import { showToast } from '../../../../../shared/ui/Toast';

export default function DataNoticeSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [limitMb, setLimitMb] = useState('');

  useEffect(() => {
    let alive = true;
    platformAppConfigApi
      .getDataWarning()
      .then((res) => {
        if (alive) setLimitMb(String(res.data?.dataWarningMb || 0));
      })
      .catch((err) => {
        if (alive) setError(err.response?.data?.message || err.message || 'Unable to load this setting.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    const value = Number(limitMb);
    if (limitMb === '' || !Number.isFinite(value) || value < 0) {
      setError('Enter the size in MB (0 or more).');
      return;
    }
    setSaving(true);
    try {
      await platformAppConfigApi.update({ dataWarningMb: value });
      setLimitMb(String(value));
      setSaved(true);
      showToast.success('Data notice limit saved');
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to save this setting.';
      setError(msg);
      showToast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Data cleanup notice</h3>
            <p className="mt-1 text-sm text-slate-500">
              When one school&apos;s total stored data (admin, principal, teachers, HR, students - everything) reaches
              this size, its School Admin and Principal dashboards show a friendly message asking them to delete old
              data for better performance. The message does not mention any limit or plan upgrade. Set 0 to turn it
              off. The size is re-checked every 15 minutes.
            </p>
          </div>
        </div>
        <div className="max-w-xs">
          <label htmlFor="data-warning-mb" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Show notice at
          </label>
          <div className="relative">
            <input
              id="data-warning-mb"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={limitMb}
              onChange={(e) => setLimitMb(e.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-3 pr-12 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">MB</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Example: 100 shows the notice once a school holds 100 MB of data.</p>
        </div>
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-50 px-3 py-2.5 text-sm text-rose-600 dark:bg-rose-500/5 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
          <Button type="submit" className="h-11 gap-2 rounded-xl px-5" disabled={saving || loading}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </form>
  );
}

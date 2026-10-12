import React, { useCallback, useEffect, useState } from 'react';
import { Database, Download, Loader2, RefreshCw, ShieldCheck, Info } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { schoolBackupApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';

const prettify = (name) =>
  name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// The same page serves the Principal (api = principalBackupApi, no toggle).
export const SchoolBackup = ({ api = schoolBackupApi, adminControls = true }) => {
  const { showToast, ToastComponent } = useToast();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.summary();
      setSummary(res.data || null);
    } catch (err) {
      showToast(apiMessage(err, 'Unable to load backup details'), 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAccess = async () => {
    const next = !summary?.principalAccess;
    setSavingAccess(true);
    try {
      await schoolBackupApi.setPrincipalAccess(next);
      setSummary((prev) => ({ ...prev, principalAccess: next }));
      showToast(next ? 'Principal can now see Database Backup' : 'Database Backup hidden from the Principal', 'success');
    } catch (err) {
      showToast(apiMessage(err, 'Could not change the setting'), 'error');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await api.download();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      showToast('Backup downloaded', 'success');
    } catch (err) {
      showToast(apiMessage(err, 'Backup failed. Please try again.'), 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database Backup"
        subtitle="Download a complete copy of your school's data."
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Database className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Backup my school data</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Students, teachers, staff, academics, attendance, fees, exams, hostel, transport, library and every other
                record of <strong>your school only</strong> — nothing from any other school is included.
              </p>
              {summary && (
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  {summary.totalRecords.toLocaleString()} records across {summary.totalCollections} sections
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-xs shadow-primary/20 hover:bg-primary/90 disabled:opacity-60"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? 'Preparing backup…' : 'Download backup'}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>Passwords, OTPs and login sessions are never included. Keep the file private anyway — it holds student and staff personal data.</span>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            <span>The file is a <code>.json</code> copy of your data in a restorable format (open it in Notepad or VS Code). Uploaded photos/documents that are stored as files are not part of it. You can take one backup per minute.</span>
          </div>
        </div>
      </div>

      {adminControls ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Allow Principal to download backups</h3>
            <p className="mt-1 text-xs text-slate-500">
              When on, a <strong>Database Backup</strong> page appears in the Principal sidebar with the same download.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(summary?.principalAccess)}
            disabled={savingAccess || loading || !summary}
            onClick={toggleAccess}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
              summary?.principalAccess ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                summary?.principalAccess ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">What is included</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !summary || summary.collections.length === 0 ? (
          <p className="py-10 text-center text-xs font-semibold text-slate-400">No data to back up yet.</p>
        ) : (
          <ul className="grid gap-x-8 px-5 py-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.collections.map((c) => (
              <li key={c.collection} className="flex items-center justify-between border-b border-slate-50 py-2 text-xs dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{prettify(c.collection)}</span>
                <span className="font-bold text-slate-400">{c.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ToastComponent />
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { Database, Download, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Card, Button } from '../../components/ui/Button';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformBackupApi } from '../../../../shared/api/client';

const errorMessage = (err, fallback) => err.response?.data?.message || err.message || fallback;

export default function BackupIndex() {
  const { addNotification } = useSuperAdminNotifications();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await platformBackupApi.summary();
      setSummary(res.data || null);
    } catch (err) {
      addNotification('error', errorMessage(err, 'Unable to load backup details'));
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await platformBackupApi.download();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      addNotification('success', 'Full database backup downloaded');
    } catch (err) {
      addNotification('error', errorMessage(err, 'Backup failed. Please try again.'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Database Backup</h1>
          <p className="mt-1 text-sm text-slate-500">Download a complete copy of the entire platform database — every school.</p>
        </div>
        <Button type="button" variant="secondary" className="gap-2" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Database className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Full platform backup</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Every collection in the database: all schools and their data, plans, subscriptions, invoices, settings and
                Super Admin accounts.
              </p>
              {summary && (
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  About {summary.totalRecords.toLocaleString()} records in {summary.totalCollections} collections
                </p>
              )}
            </div>
          </div>
          <Button type="button" className="gap-2 shrink-0" onClick={handleDownload} disabled={downloading || loading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? 'Preparing backup…' : 'Download full backup'}
          </Button>
        </div>

        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This file contains password hashes and personal data of every school. Store it encrypted and never share it.
            Large databases can take a few minutes; keep this tab open until the download starts.
          </span>
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Collections</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !summary || summary.collections.length === 0 ? (
          <p className="py-10 text-center text-xs font-semibold text-slate-400">No collections found.</p>
        ) : (
          <ul className="grid gap-x-8 px-5 py-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.collections.map((c) => (
              <li key={c.collection} className="flex items-center justify-between border-b border-slate-50 py-2 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{c.collection}</span>
                <span className="font-bold text-slate-400">{c.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

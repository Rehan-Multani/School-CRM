import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Users } from 'lucide-react';
import { principalEventApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';

const STATUS_VARIANT = {
  UPCOMING: 'success',
  ONGOING: 'info',
  COMPLETED: 'default',
  CANCELLED: 'danger',
};

function fmt(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const Events = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, statsRes] = await Promise.all([
        principalEventApi.list({ limit: 200 }),
        principalEventApi.stats().catch(() => null),
      ]);
      setRows(listRes?.data || []);
      if (statsRes?.data) setStats(statsRes.data);
    } catch (err) {
      setError(apiMessage(err, 'Unable to load events'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      { key: 'title', title: 'School Event Name', sortable: true },
      { key: 'category', title: 'Category', render: (val) => <Badge variant="info">{val}</Badge> },
      { key: 'startAt', title: 'Scheduled', sortable: true, render: (val) => fmt(val) },
      { key: 'venue', title: 'Venue', render: (val) => val || '—' },
      { key: 'leadName', title: 'Lead Representative', render: (val) => val || '—' },
      {
        key: 'status',
        title: 'Status',
        render: (val) => <Badge variant={STATUS_VARIANT[val] || 'default'}>{val}</Badge>,
      },
    ],
    []
  );

  const upcoming = rows.filter((r) => r.status === 'UPCOMING' || r.status === 'ONGOING');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events Monitoring"
        subtitle="Track upcoming school functions, science seminars, parent meetings, and sports tournaments."
      />

      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Upcoming', value: stats.upcoming },
            { label: 'This Month', value: stats.thisMonth },
            { label: 'Completed', value: stats.completed },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{c.label}</div>
              <div className="mt-0.5 text-xl font-extrabold text-slate-900 dark:text-white">{c.value ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'list', label: 'School Calendar Events' },
          { id: 'overview', label: 'Events Logistics Summary' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/60 p-10 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={load}
            className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      ) : activeTab === 'list' ? (
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          searchPlaceholder="Search school events..."
          searchKeys={['title', 'venue', 'leadName']}
          filterOptions={[
            { key: 'status', label: 'Status', options: ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] },
            { key: 'category', label: 'Category', options: ['ACADEMIC', 'SPORTS', 'CULTURAL', 'MEETING', 'HOLIDAY', 'EXAM', 'OTHER'] },
          ]}
          emptyMessage="No events scheduled yet."
          csvFilename="principal_events.csv"
        />
      ) : loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          Loading events…
        </div>
      ) : upcoming.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          No upcoming events.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {upcoming.map((evt) => (
            <div
              key={evt.id}
              className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 text-xs font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-[10px] font-black uppercase text-slate-400">{evt.category}</span>
                <Badge variant={STATUS_VARIANT[evt.status] || 'default'}>{evt.status}</Badge>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold leading-tight text-slate-800 dark:text-white">{evt.title}</h4>
                <p className="text-[10px] font-medium text-slate-400">Scheduled: {fmt(evt.startAt)}</p>
                {evt.venue && <p className="text-[10px] font-medium text-slate-400">Venue: {evt.venue}</p>}
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <Users className="h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Event Coordinator
                  </span>
                  <span className="block text-slate-800 dark:text-slate-200">{evt.leadName || 'Not assigned'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;

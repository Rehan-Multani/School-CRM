import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { BarChart } from '../../components/ui/Charts/BarChart';
import { principalHomeworkApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';

function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SubmissionBar({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${value >= 85 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="font-bold">{value}%</span>
    </div>
  );
}

export const HomeworkMonitoring = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [rows, setRows] = useState([]);
  const [monitor, setMonitor] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, monRes, statsRes] = await Promise.all([
        principalHomeworkApi.list({ limit: 200 }),
        principalHomeworkApi.monitor({ groupBy: 'subject' }).catch(() => null),
        principalHomeworkApi.stats().catch(() => null),
      ]);
      setRows(listRes?.data || []);
      setMonitor(monRes?.data || []);
      setStats(statsRes?.data || null);
    } catch (err) {
      setError(apiMessage(err, 'Unable to load homework data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      { key: 'title', title: 'Homework Topic Title', sortable: true },
      {
        key: 'className',
        title: 'Class Room',
        render: (v, row) => [row.className, row.sectionName].filter(Boolean).join(' ') || '—',
      },
      { key: 'subjectName', title: 'Course Subject', render: (v) => v || '—' },
      { key: 'teacherName', title: 'Assigned By', render: (v) => v || '—' },
      { key: 'assignedDate', title: 'Assigned', sortable: true, render: (v) => fmtDate(v) },
      { key: 'dueDate', title: 'Due', sortable: true, render: (v, row) => (
        <span className={row.overdue ? 'font-bold text-rose-600' : ''}>{fmtDate(v)}</span>
      ) },
      { key: 'submissionRate', title: 'Submission Rate', render: (v) => <SubmissionBar value={v} /> },
      { key: 'pendingEvaluation', title: 'Evaluation Pending', align: 'center' },
    ],
    []
  );

  const chartData = monitor
    .filter((m) => m.submissionRate !== null && m.submissionRate !== undefined)
    .map((m) => ({ name: m.group, rate: m.submissionRate }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework Monitoring"
        subtitle="Observe daily homework allocation schedules, submission rate percentages, and evaluation pipelines."
      />

      <Tabs
        tabs={[
          { id: 'list', label: 'Homework Assignment Pipeline' },
          { id: 'analytics', label: 'Submission Metrics' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/60 p-10 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button type="button" onClick={load} className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">
            Retry
          </button>
        </div>
      ) : activeTab === 'list' ? (
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          searchPlaceholder="Search homework by title, subject, teacher..."
          searchKeys={['title', 'subjectName', 'teacherName', 'className']}
          emptyMessage="No homework recorded yet."
          csvFilename="principal_homework.csv"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
              Submission Rates by Subject
            </span>
            {chartData.length > 0 ? (
              <BarChart data={chartData} dataKey="rate" xKey="name" height={220} color="#059669" />
            ) : (
              <div className="py-16 text-center text-xs font-semibold text-slate-400">
                No submission data recorded yet.
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 text-xs font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="block border-b pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Operational Homework Summary
            </span>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <span className="text-[10px] font-bold text-slate-400">Total Pending Evaluations</span>
              <h4 className="mt-1 text-xl font-extrabold text-slate-800 dark:text-white">
                {stats?.pendingEvaluation ?? 0} Submissions
              </h4>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <span className="text-[10px] font-bold text-slate-400">Average Submission Rate</span>
              <h4 className="mt-1 text-xl font-extrabold text-emerald-600">
                {stats?.avgSubmissionRate === null || stats?.avgSubmissionRate === undefined
                  ? '—'
                  : `${stats.avgSubmissionRate}%`}
              </h4>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <span className="text-[10px] font-bold text-slate-400">Overdue Assignments</span>
              <h4 className="mt-1 text-xl font-extrabold text-rose-600">{stats?.overdue ?? 0}</h4>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeworkMonitoring;

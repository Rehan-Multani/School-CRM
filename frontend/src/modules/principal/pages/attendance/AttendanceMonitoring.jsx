import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { AreaChart } from '../../components/ui/Charts/AreaChart';
import { principalAttendanceApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';

function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export const AttendanceMonitoring = () => {
  const [activeTab, setActiveTab] = useState('students');
  const [monitor, setMonitor] = useState(null);
  const [staffRows, setStaffRows] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mon, staff, rep] = await Promise.all([
        principalAttendanceApi.studentMonitor(today()).catch(() => null),
        principalAttendanceApi.staffReport({ limit: 60 }).catch(() => ({ data: [] })),
        principalAttendanceApi.studentReport(daysAgo(30), today()).catch(() => null),
      ]);
      setMonitor(mon?.data || null);
      setStaffRows(staff?.data || []);
      setTrend(rep?.data?.trend || []);
    } catch (err) {
      setError(apiMessage(err, 'Unable to load attendance data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sectionColumns = useMemo(
    () => [
      { key: 'label', title: 'Class / Section', sortable: true, render: (v) => <span className="font-bold">{v}</span> },
      { key: 'total', title: 'Students', align: 'center' },
      { key: 'present', title: 'Present', align: 'center', render: (v) => <span className="font-bold text-emerald-600">{v}</span> },
      { key: 'absent', title: 'Absent', align: 'center', render: (v) => <span className="font-bold text-rose-600">{v}</span> },
      {
        key: 'presentRate',
        title: 'Attendance %',
        sortable: true,
        render: (v) => <Badge variant={v >= 90 ? 'success' : v >= 75 ? 'warning' : 'danger'}>{v}%</Badge>,
      },
    ],
    []
  );

  const staffColumns = useMemo(
    () => [
      { key: 'Date', title: 'Date', sortable: true },
      { key: 'Total Staff', title: 'Total Staff', align: 'center' },
      { key: 'Present Count', title: 'Present', align: 'center', render: (v) => <span className="font-bold text-emerald-600">{v}</span> },
      { key: 'Absent Count', title: 'Absent', align: 'center', render: (v) => <span className="font-bold text-rose-600">{v}</span> },
      { key: 'Attendance %', title: 'Attendance %' },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Monitoring"
        subtitle="Observe daily student roll calls, staff clock-ins, and monthly attendance trends."
      />

      {monitor?.totals && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Students (marked)', value: monitor.totals.totalStudents },
            { label: 'Present Today', value: monitor.totals.present },
            { label: 'Absent Today', value: monitor.totals.absent },
            { label: 'Attendance Rate', value: `${monitor.totals.presentRate}%` },
          ].map((c) => (
            <div key={c.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{c.label}</div>
              <div className="mt-0.5 text-xl font-extrabold text-slate-900 dark:text-white">{c.value}</div>
            </div>
          ))}
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'students', label: 'Student Daily Roll Call' },
          { id: 'staff', label: 'Staff Attendance Log' },
          { id: 'trends', label: 'Attendance Trends' },
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
      ) : activeTab === 'students' ? (
        !loading && (!monitor || !monitor.marked) ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            No section has been marked for {today()} yet. Roll-call is captured by the School Admin.
          </div>
        ) : (
          <DataTable
            columns={sectionColumns}
            data={monitor?.sections || []}
            loading={loading}
            searchPlaceholder="Search sections..."
            searchKeys={['label']}
            emptyMessage="No student attendance for today yet."
            csvFilename="student_rollcall_today.csv"
          />
        )
      ) : activeTab === 'staff' ? (
        <DataTable
          columns={staffColumns}
          data={staffRows}
          loading={loading}
          searchPlaceholder="Search by date..."
          searchKeys={['Date']}
          emptyMessage="No staff attendance records."
          csvFilename="staff_attendance_log.csv"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
              Student Attendance Rate — last 30 days (%)
            </span>
            {trend.length > 0 ? (
              <AreaChart data={trend} dataKey="attendance" xKey="date" height={245} color="#059669" />
            ) : (
              <div className="py-16 text-center text-xs font-semibold text-slate-400">
                {loading ? 'Loading…' : 'No attendance history yet.'}
              </div>
            )}
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 text-xs font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="block border-b pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Today at a glance
            </span>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <span className="text-[10px] font-bold text-slate-400">Sections marked today</span>
              <h4 className="mt-1 text-xl font-extrabold text-slate-800 dark:text-white">
                {monitor?.sections?.length ?? 0}
              </h4>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <span className="text-[10px] font-bold text-slate-400">Absent students today</span>
              <h4 className="mt-1 text-xl font-extrabold text-rose-600">{monitor?.totals?.absent ?? 0}</h4>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceMonitoring;

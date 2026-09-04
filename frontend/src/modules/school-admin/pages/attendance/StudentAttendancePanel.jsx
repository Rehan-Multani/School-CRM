import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { studentAttendanceApi, academicPortalApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { CheckCircle2, Save, Users, Loader2 } from 'lucide-react';

const STATUSES = [
  { key: 'PRESENT', label: 'Present', cls: 'bg-emerald-500 text-white', dim: 'text-emerald-600' },
  { key: 'ABSENT', label: 'Absent', cls: 'bg-rose-500 text-white', dim: 'text-rose-600' },
  { key: 'LATE', label: 'Late', cls: 'bg-amber-500 text-white', dim: 'text-amber-600' },
  { key: 'HALF_DAY', label: 'Half Day', cls: 'bg-sky-500 text-white', dim: 'text-sky-600' },
  { key: 'LEAVE', label: 'Leave', cls: 'bg-slate-500 text-white', dim: 'text-slate-600' },
];

function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export const StudentAttendancePanel = () => {
  const { showToast, ToastComponent } = useToast();
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(today());

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState(null);
  const [message, setMessage] = useState('');
  const [markedInfo, setMarkedInfo] = useState(null);

  useEffect(() => {
    Promise.all([
      academicPortalApi.classes({ limit: 100 }).catch(() => ({ data: [] })),
      academicPortalApi.sections({ limit: 500 }).catch(() => ({ data: [] })),
    ]).then(([c, s]) => {
      setClasses((c.data || []).filter((x) => x.status !== 'INACTIVE'));
      setSections(s.data || []);
    });
  }, []);

  const sectionsForClass = useMemo(
    () => (classId ? sections.filter((s) => s.classId === classId) : sections),
    [classId, sections]
  );

  const load = useCallback(async () => {
    if (!sectionId) {
      setEntries([]);
      setMeta(null);
      setMessage('');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await studentAttendanceApi.getDay(sectionId, date);
      const d = res?.data || {};
      setMeta(d.section || null);
      setEntries((d.entries || []).map((e) => ({ ...e })));
      setMessage(d.message || '');
      setMarkedInfo(d.marked ? { by: d.markedByName } : null);
    } catch (err) {
      showToast(apiMessage(err, 'Unable to load attendance'), 'error');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [sectionId, date, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = (studentId, status) =>
    setEntries((prev) => prev.map((e) => (e.studentId === studentId ? { ...e, status } : e)));

  const markAllPresent = () => setEntries((prev) => prev.map((e) => ({ ...e, status: 'PRESENT' })));

  const save = async () => {
    if (!sectionId || entries.length === 0) return;
    setSaving(true);
    try {
      const res = await studentAttendanceApi.saveDay({
        sectionId,
        date,
        entries: entries.map((e) => ({ studentId: e.studentId, status: e.status, note: e.note || '' })),
      });
      showToast('Attendance saved', 'success');
      setMarkedInfo({ by: res?.data?.markedByName });
    } catch (err) {
      showToast(apiMessage(err, 'Unable to save attendance'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0, LEAVE: 0 };
    entries.forEach((e) => (c[e.status] = (c[e.status] || 0) + 1));
    return c;
  }, [entries]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-400">Class</label>
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId('');
            }}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-400">Section *</label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="">Select section…</option>
            {sectionsForClass.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-slate-400">Date</label>
          <input
            type="date"
            max={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={markAllPresent}
            disabled={!entries.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark all present
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !entries.length}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Saving…' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <span key={s.key} className={`rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold ${s.dim} dark:border-slate-800 dark:bg-slate-900`}>
              {s.label}: {counts[s.key] || 0}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          Loading roster…
        </div>
      ) : !sectionId ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Users className="h-8 w-8 text-slate-300" />
          <p className="text-xs font-semibold text-slate-400">Pick a section and date to mark student attendance.</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          {message || 'No active students in this section.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {markedInfo && (
            <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
              {meta?.className} {meta?.sectionName} · {date} · previously saved{markedInfo.by ? ` by ${markedInfo.by}` : ''}
            </div>
          )}
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
              <tr>
                <th className="w-12 px-3 py-3 text-center">#</th>
                <th className="px-3 py-3">Roll</th>
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map((e, i) => (
                <tr key={e.studentId} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/30">
                  <td className="px-3 py-2.5 text-center font-bold text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{e.rollNumber || '—'}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">{e.studentName}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {STATUSES.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setStatus(e.studentId, s.key)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                            e.status === s.key
                              ? s.cls
                              : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ToastComponent />
    </div>
  );
};

export default StudentAttendancePanel;

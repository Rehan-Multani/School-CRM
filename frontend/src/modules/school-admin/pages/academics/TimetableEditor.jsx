import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { academicPortalApi, timetableApi } from '../../../../shared/api/client';
import { TIMETABLE_DAYS, DAY_LABELS, periodsFromEntries } from '../../../../shared/ui/TimetableGrid';
import { AcademicBreadcrumb, EmptyState } from './components/AcademicUi';
import { apiMessage } from './utils';
import { AlertTriangle, Copy, Loader2, Plus, Save, Trash2 } from 'lucide-react';

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950';
const cellSelectClass =
  'h-8 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900';

const pad = (n) => String(n).padStart(2, '0');
const addMinutes = (hhmm, mins) => {
  const [h, m] = String(hhmm || '08:00').split(':').map(Number);
  const total = (h * 60 + m + mins) % (24 * 60);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

/** Default template when a section has no timetable yet: 8 × 45-minute periods from 08:00. */
function defaultPeriods(count = 8, start = '08:00', length = 45) {
  const rows = [];
  let t = start;
  for (let i = 1; i <= count; i += 1) {
    rows.push({ periodNumber: i, startTime: t, endTime: addMinutes(t, length) });
    t = addMinutes(t, length);
  }
  return rows;
}

const cellKey = (day, period) => `${day}-${period}`;

/** Backend 409 message is "<teacher> already teaches <Class> <Section> on MON P3[; ...]". */
function clashCellsFromMessage(message = '') {
  const keys = new Set();
  const re = /\b(MON|TUE|WED|THU|FRI|SAT) P(\d+)\b/g;
  let m;
  while ((m = re.exec(message))) keys.add(cellKey(m[1], Number(m[2])));
  return keys;
}

export const TimetableEditor = () => {
  const [params, setParams] = useSearchParams();
  const { showToast, ToastComponent } = useToast();

  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [sectionSubjects, setSectionSubjects] = useState([]);

  const yearId = params.get('yearId') || '';
  const classId = params.get('classId') || '';
  const sectionId = params.get('sectionId') || '';
  const setSel = (next) => {
    const merged = { yearId, classId, sectionId, ...next };
    const clean = Object.fromEntries(Object.entries(merged).filter(([, v]) => v));
    setParams(clean, { replace: true });
  };

  const [periods, setPeriods] = useState([]);
  const [cells, setCells] = useState({}); // key -> { subjectId, teacherId }
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [clashCells, setClashCells] = useState(new Set());
  const [copyFrom, setCopyFrom] = useState('');

  // ---- selectors -----------------------------------------------------------
  useEffect(() => {
    Promise.all([
      academicPortalApi.years({ limit: 100 }),
      academicPortalApi.teachers({ status: 'ACTIVE' }),
      academicPortalApi.subjects({ limit: 200, status: 'ACTIVE' }),
    ])
      .then(([y, t, s]) => {
        const list = y.data || [];
        setYears(list);
        setTeachers(t.data || []);
        setAllSubjects(s.data || []);
        if (!yearId && list.length) {
          const current = list.find((it) => it.isCurrent) || list.find((it) => it.status === 'ACTIVE') || list[0];
          setSel({ yearId: current.id });
        }
      })
      .catch((e) => showToast(apiMessage(e, 'Unable to load academic data'), 'error'));
  }, []);

  useEffect(() => {
    if (!yearId) return setClasses([]);
    academicPortalApi
      .yearClasses(yearId)
      .then((r) => setClasses(r.data || []))
      .catch((e) => showToast(apiMessage(e, 'Unable to load classes'), 'error'));
  }, [yearId, showToast]);

  useEffect(() => {
    if (!yearId || !classId) return setSections([]);
    academicPortalApi
      .sections({ academicYearId: yearId, classId })
      .then((r) => setSections((r.data || []).filter((s) => s.status !== 'INACTIVE')))
      .catch((e) => showToast(apiMessage(e, 'Unable to load sections'), 'error'));
  }, [yearId, classId, showToast]);

  // ---- grid ----------------------------------------------------------------
  const applyEntries = useCallback((entries) => {
    const next = {};
    for (const e of entries) next[cellKey(e.dayOfWeek, e.periodNumber)] = { subjectId: e.subjectId || '', teacherId: e.teacherId || '' };
    setCells(next);
    const p = periodsFromEntries(entries);
    setPeriods(p.length ? p : defaultPeriods());
  }, []);

  const loadGrid = useCallback(async () => {
    if (!sectionId) return;
    setLoadingGrid(true);
    setError('');
    setClashCells(new Set());
    try {
      const [tt, ss] = await Promise.all([timetableApi.list({ sectionId }), academicPortalApi.sectionSubjects(sectionId)]);
      applyEntries(tt.data || []);
      setSectionSubjects(ss.data || []);
      setDirty(false);
    } catch (e) {
      showToast(apiMessage(e, 'Unable to load timetable'), 'error');
    } finally {
      setLoadingGrid(false);
    }
  }, [sectionId, applyEntries, showToast]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  const subjectOptions = useMemo(() => {
    const assigned = sectionSubjects
      .map((it) => ({ id: it.subject?.id || it.subjectId, name: it.subject?.name, teacherId: it.teacher?.id || it.teacherId || '' }))
      .filter((it) => it.id);
    return assigned.length ? assigned : allSubjects.map((s) => ({ id: s.id, name: s.name, teacherId: '' }));
  }, [sectionSubjects, allSubjects]);

  const teacherOptionsFor = useCallback(
    (subjectId) => {
      const preferred = sectionSubjects
        .filter((it) => (it.subject?.id || it.subjectId) === subjectId && (it.teacher?.id || it.teacherId))
        .map((it) => it.teacher?.id || it.teacherId);
      const pref = teachers.filter((t) => preferred.includes(t.id));
      const rest = teachers.filter((t) => !preferred.includes(t.id));
      return { pref, rest };
    },
    [sectionSubjects, teachers]
  );

  const updateCell = (key, patch) => {
    setCells((prev) => {
      const cur = prev[key] || { subjectId: '', teacherId: '' };
      const next = { ...cur, ...patch };
      // Choosing a subject auto-fills the teacher assigned to it (if any) when none is picked yet.
      if (patch.subjectId !== undefined && !next.teacherId) {
        const opt = subjectOptions.find((s) => s.id === patch.subjectId);
        if (opt?.teacherId) next.teacherId = opt.teacherId;
      }
      if (!next.subjectId && !next.teacherId) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return { ...prev, [key]: next };
    });
    setDirty(true);
    setClashCells((prev) => {
      if (!prev.has(key)) return prev;
      const n = new Set(prev);
      n.delete(key);
      return n;
    });
  };

  const updatePeriod = (idx, patch) => {
    setPeriods((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
    setDirty(true);
  };
  const addPeriod = () => {
    setPeriods((prev) => {
      const last = prev[prev.length - 1];
      const start = last ? last.endTime : '08:00';
      return [...prev, { periodNumber: (last?.periodNumber || 0) + 1, startTime: start, endTime: addMinutes(start, 45) }];
    });
    setDirty(true);
  };
  const removePeriod = (idx) => {
    const p = periods[idx];
    setPeriods((prev) => prev.filter((_, i) => i !== idx).map((row, i) => ({ ...row, periodNumber: i + 1 })));
    setCells((prev) => {
      // Drop the removed row and renumber the rows below it.
      const next = {};
      for (const [key, val] of Object.entries(prev)) {
        const [day, num] = key.split('-');
        const n = Number(num);
        if (n === p.periodNumber) continue;
        next[cellKey(day, n > p.periodNumber ? n - 1 : n)] = val;
      }
      return next;
    });
    setDirty(true);
  };

  const clearGrid = () => {
    setCells({});
    setDirty(true);
  };

  const handleCopy = async () => {
    if (!copyFrom) return;
    try {
      const r = await timetableApi.list({ sectionId: copyFrom });
      if (!(r.data || []).length) return showToast('That section has no timetable to copy', 'error');
      applyEntries(r.data);
      setDirty(true);
      setClashCells(new Set());
      showToast('Copied. Review teachers, then Save.', 'success');
    } catch (e) {
      showToast(apiMessage(e, 'Unable to copy timetable'), 'error');
    }
  };

  const handleSave = async () => {
    setError('');
    const payload = [];
    for (const p of periods) {
      if (!p.startTime || !p.endTime || p.endTime <= p.startTime) {
        setError(`Period ${p.periodNumber}: end time must be after start time.`);
        return;
      }
      for (const day of TIMETABLE_DAYS) {
        const c = cells[cellKey(day, p.periodNumber)];
        if (!c?.subjectId) {
          if (c?.teacherId) {
            setError(`${DAY_LABELS[day]} P${p.periodNumber}: pick a subject (a teacher alone is not a period).`);
            setClashCells(new Set([cellKey(day, p.periodNumber)]));
            return;
          }
          continue;
        }
        payload.push({
          dayOfWeek: day,
          periodNumber: p.periodNumber,
          startTime: p.startTime,
          endTime: p.endTime,
          subjectId: c.subjectId,
          teacherId: c.teacherId || null,
        });
      }
    }
    setSaving(true);
    try {
      const r = await timetableApi.saveSection(sectionId, { academicYearId: yearId || undefined, periods: payload });
      applyEntries(r.data || []);
      setDirty(false);
      setClashCells(new Set());
      showToast('Timetable saved', 'success');
    } catch (e) {
      const msg = apiMessage(e, 'Unable to save timetable');
      setError(msg);
      setClashCells(clashCellsFromMessage(msg));
    } finally {
      setSaving(false);
    }
  };

  const selectedSection = sections.find((s) => s.id === sectionId);
  const selectedClass = classes.find((c) => c.classId === classId);
  const otherSections = sections.filter((s) => s.id !== sectionId);

  return (
    <div className="space-y-6">
      <AcademicBreadcrumb items={[{ label: 'Academics', to: '/school-admin/academics' }, { label: 'Timetable' }]} />
      <PageHeader
        title="Timetable"
        subtitle="Build the weekly period grid for each section. Teachers and students see it in the app."
        actions={
          sectionId && (
            <>
              {yearId && (
                <Link
                  to={`/school-admin/academics/years/${yearId}/sections/${sectionId}`}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700"
                >
                  View section
                </Link>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loadingGrid}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? 'Saving…' : dirty ? 'Save changes' : 'Save'}
              </button>
            </>
          )
        }
      />

      {/* Selectors */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">Academic year</label>
          <select className={inputClass} value={yearId} onChange={(e) => setSel({ yearId: e.target.value, classId: '', sectionId: '' })}>
            <option value="">Select year</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
                {y.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">Class</label>
          <select className={inputClass} value={classId} disabled={!yearId} onChange={(e) => setSel({ classId: e.target.value, sectionId: '' })}>
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.class?.name || c.className || 'Class'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">Section</label>
          <select className={inputClass} value={sectionId} disabled={!classId} onChange={(e) => setSel({ sectionId: e.target.value })}>
            <option value="">Select section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                Section {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!sectionId ? (
        <EmptyState title="Pick a section" description="Choose the academic year, class and section whose timetable you want to edit." />
      ) : loadingGrid ? (
        <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading timetable…
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                {error.split('; ').map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              {selectedClass?.class?.name || 'Class'} – Section {selectedSection?.name || ''}
              {sectionSubjects.length === 0 && (
                <span className="ml-2 text-[11px] font-semibold text-amber-600">
                  No subjects assigned to this section yet – showing all subjects.
                </span>
              )}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {otherSections.length > 0 && (
                <>
                  <select className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                    <option value="">Copy from section…</option>
                    {otherSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={handleCopy} disabled={!copyFrom} className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-semibold disabled:opacity-50 dark:border-slate-700">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </>
              )}
              <button type="button" onClick={addPeriod} disabled={periods.length >= 15} className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-semibold disabled:opacity-50 dark:border-slate-700">
                <Plus className="h-3.5 w-3.5" /> Add period
              </button>
              <button type="button" onClick={clearGrid} className="inline-flex h-9 items-center gap-1 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-600 dark:border-rose-900/60">
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="w-40 px-3 py-3 font-bold">Period</th>
                  {TIMETABLE_DAYS.map((d) => (
                    <th key={d} className="px-2 py-3 font-bold">
                      {DAY_LABELS[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, idx) => (
                  <tr key={p.periodNumber} className="border-b border-slate-50 align-top dark:border-slate-800/60">
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-white">P{p.periodNumber}</span>
                        <button type="button" onClick={() => removePeriod(idx)} title="Remove period" className="text-slate-400 hover:text-rose-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <input type="time" className={cellSelectClass} value={p.startTime} onChange={(e) => updatePeriod(idx, { startTime: e.target.value })} />
                        <span className="text-slate-400">–</span>
                        <input type="time" className={cellSelectClass} value={p.endTime} onChange={(e) => updatePeriod(idx, { endTime: e.target.value })} />
                      </div>
                    </td>
                    {TIMETABLE_DAYS.map((d) => {
                      const key = cellKey(d, p.periodNumber);
                      const c = cells[key] || { subjectId: '', teacherId: '' };
                      const { pref, rest } = teacherOptionsFor(c.subjectId);
                      const clash = clashCells.has(key);
                      return (
                        <td key={d} className={`px-2 py-2 ${clash ? 'bg-rose-50 dark:bg-rose-950/40' : ''}`}>
                          <div className="space-y-1">
                            <select className={`${cellSelectClass} ${clash ? 'border-rose-400' : ''}`} value={c.subjectId} onChange={(e) => updateCell(key, { subjectId: e.target.value })}>
                              <option value="">– Free –</option>
                              {subjectOptions.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <select className={`${cellSelectClass} ${clash ? 'border-rose-400' : ''}`} value={c.teacherId} disabled={!c.subjectId} onChange={(e) => updateCell(key, { teacherId: e.target.value })}>
                              <option value="">No teacher</option>
                              {pref.length > 0 && (
                                <optgroup label="Assigned to subject">
                                  {pref.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              <optgroup label={pref.length ? 'Other teachers' : 'Teachers'}>
                                {rest.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {periods.length === 0 && (
                  <tr>
                    <td colSpan={TIMETABLE_DAYS.length + 1} className="px-4 py-8 text-center text-slate-500">
                      No periods defined. Click "Add period" to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">
            Leave a cell on "– Free –" for a free period. Saving replaces this section's whole grid; a teacher cannot be in two sections in the same period.
          </p>
        </>
      )}

      <ToastComponent />
    </div>
  );
};

export default TimetableEditor;

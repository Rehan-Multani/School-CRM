import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { apiMessage } from '../academics/utils';
import { schoolPortalApi } from '../../../../shared/api/client';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950';
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400';

const STEPS = ['Source', 'Students', 'Target', 'Confirm'];

const emptyState = {
  fromAcademicYearId: '',
  fromClassId: '',
  fromSectionId: '',
  toAcademicYearId: '',
  toClassId: '',
  toSectionId: '',
};

// Year-end promotion wizard: pick source year/class/section, tick students and
// give them next year's roll numbers, pick the target, confirm, see the result.
export function PromoteStudentsModal({ isOpen, onClose, years, classes, sections, showToast, onDone }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyState);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState({});
  const [rolls, setRolls] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [conflict, setConflict] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setForm(emptyState);
      setCandidates([]);
      setSelected({});
      setRolls({});
      setResult(null);
      setConflict(null);
    }
  }, [isOpen]);

  const classesFor = (yearId) => classes.filter((c) => (!yearId || c.academicYearId === yearId) && c.status !== 'INACTIVE');
  const sectionsFor = (yearId, classId) =>
    sections.filter((s) => (!yearId || s.academicYearId === yearId) && (!classId || s.classId === classId) && s.status !== 'INACTIVE');

  const nameOf = (list, id) => list.find((x) => x.id === id)?.name || '—';
  const selectedIds = useMemo(() => candidates.filter((c) => selected[c.id]).map((c) => c.id), [candidates, selected]);
  const targetSection = sections.find((s) => s.id === form.toSectionId);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await schoolPortalApi.promotionPreview({
        fromAcademicYearId: form.fromAcademicYearId,
        fromClassId: form.fromClassId,
        fromSectionId: form.fromSectionId || undefined,
      });
      const list = res.data || [];
      setCandidates(list);
      setSelected(Object.fromEntries(list.map((s) => [s.id, true])));
      setRolls(Object.fromEntries(list.map((s) => [s.id, s.rollNumber || ''])));
      setStep(1);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load students'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setConflict(null);
    try {
      const res = await schoolPortalApi.promoteStudents({
        fromAcademicYearId: form.fromAcademicYearId,
        toAcademicYearId: form.toAcademicYearId,
        fromClassId: form.fromClassId,
        fromSectionId: form.fromSectionId || undefined,
        toClassId: form.toClassId,
        toSectionId: form.toSectionId,
        studentIds: selectedIds,
        rollNumbers: Object.fromEntries(selectedIds.map((id) => [id, rolls[id] || ''])),
      });
      setResult(res.data);
      setStep(4);
      showToast(res.message || 'Students promoted', 'success');
      onDone?.();
    } catch (error) {
      const data = error?.response?.data;
      if (error?.response?.status === 409) {
        setConflict(data);
      } else {
        showToast(apiMessage(error, 'Promotion failed'), 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSource = form.fromAcademicYearId && form.fromClassId;
  const canTarget =
    form.toAcademicYearId && form.toClassId && form.toSectionId && form.toAcademicYearId !== form.fromAcademicYearId;

  const footer =
    step === 4 ? (
      <button type="button" onClick={onClose} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white">
        Done
      </button>
    ) : (
      <div className="flex w-full items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        {step === 0 && (
          <button type="button" disabled={!canSource || loading} onClick={loadCandidates} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />} Load students
          </button>
        )}
        {step === 1 && (
          <button type="button" disabled={!selectedIds.length} onClick={() => setStep(2)} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            Next: target ({selectedIds.length} selected)
          </button>
        )}
        {step === 2 && (
          <button type="button" disabled={!canTarget} onClick={() => setStep(3)} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            Review
          </button>
        )}
        {step === 3 && (
          <button type="button" disabled={submitting} onClick={submit} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Promote {selectedIds.length} student(s)
          </button>
        )}
      </div>
    );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Promote Students" size="xl" footer={footer} titleClassName="text-xl font-extrabold">
      <div className="space-y-5">
        <ol className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider">
          {STEPS.map((label, idx) => (
            <li key={label} className={`rounded-full px-3 py-1 ${idx === step ? 'bg-primary text-white' : idx < step || step === 4 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
              {idx + 1}. {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className={labelClass}>From academic year</label>
              <select className={inputClass} value={form.fromAcademicYearId} onChange={(e) => setForm({ ...form, fromAcademicYearId: e.target.value, fromClassId: '', fromSectionId: '' })}>
                <option value="">Select year</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>From class</label>
              <select className={inputClass} value={form.fromClassId} onChange={(e) => setForm({ ...form, fromClassId: e.target.value, fromSectionId: '' })} disabled={!form.fromAcademicYearId}>
                <option value="">Select class</option>
                {classesFor(form.fromAcademicYearId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>From section (optional)</label>
              <select className={inputClass} value={form.fromSectionId} onChange={(e) => setForm({ ...form, fromSectionId: e.target.value })} disabled={!form.fromClassId}>
                <option value="">All sections</option>
                {sectionsFor(form.fromAcademicYearId, form.fromClassId).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {candidates.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">No active students in this class/section.</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{selectedIds.length} of {candidates.length} selected</span>
                  <div className="flex gap-2">
                    <button type="button" className="font-bold text-primary" onClick={() => setSelected(Object.fromEntries(candidates.map((c) => [c.id, true])))}>Select all</button>
                    <button type="button" className="font-bold text-slate-500" onClick={() => setSelected({})}>Clear</button>
                  </div>
                </div>
                <div className="max-h-80 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-900">
                      <tr>
                        <th className="w-10 px-3 py-2" />
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Admission no.</th>
                        <th className="px-3 py-2">Current roll</th>
                        <th className="w-32 px-3 py-2">New roll no.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((s) => (
                        <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={Boolean(selected[s.id])} onChange={(e) => setSelected({ ...selected, [s.id]: e.target.checked })} />
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">{s.name}</td>
                          <td className="px-3 py-2 text-slate-500">{s.admissionNumber}</td>
                          <td className="px-3 py-2 text-slate-500">{s.rollNumber || '—'}</td>
                          <td className="px-3 py-2">
                            <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={rolls[s.id] || ''} onChange={(e) => setRolls({ ...rolls, [s.id]: e.target.value })} disabled={!selected[s.id]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className={labelClass}>To academic year</label>
              <select className={inputClass} value={form.toAcademicYearId} onChange={(e) => setForm({ ...form, toAcademicYearId: e.target.value, toClassId: '', toSectionId: '' })}>
                <option value="">Select year</option>
                {years.filter((y) => y.id !== form.fromAcademicYearId).map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>To class</label>
              <select className={inputClass} value={form.toClassId} onChange={(e) => setForm({ ...form, toClassId: e.target.value, toSectionId: '' })} disabled={!form.toAcademicYearId}>
                <option value="">Select class</option>
                {classesFor(form.toAcademicYearId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>To section</label>
              <select className={inputClass} value={form.toSectionId} onChange={(e) => setForm({ ...form, toSectionId: e.target.value })} disabled={!form.toClassId}>
                <option value="">Select section</option>
                {sectionsFor(form.toAcademicYearId, form.toClassId).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (capacity {s.capacity})</option>
                ))}
              </select>
            </div>
            {form.toAcademicYearId && classesFor(form.toAcademicYearId).length === 0 && (
              <p className="md:col-span-3 text-xs text-amber-600">No classes exist in that academic year yet. Create classes and sections for it first.</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">From</p>
                <p className="font-bold">{nameOf(years, form.fromAcademicYearId)} · {nameOf(classes, form.fromClassId)}{form.fromSectionId ? ` / ${nameOf(sections, form.fromSectionId)}` : ''}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">To</p>
                <p className="font-bold">{nameOf(years, form.toAcademicYearId)} · {nameOf(classes, form.toClassId)} / {targetSection?.name}</p>
              </div>
            </div>
            <p>
              <strong>{selectedIds.length}</strong> student(s) will be promoted. Their current enrollment is closed as PROMOTED and a new one is created
              for {nameOf(years, form.toAcademicYearId)}; next year's fee components are assigned automatically where a fee structure exists.
            </p>
            {conflict && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <p className="font-bold">{conflict.message}</p>
                {Array.isArray(conflict.studentIds) && conflict.studentIds.length > 0 && (
                  <button
                    type="button"
                    className="mt-2 font-bold underline"
                    onClick={() => {
                      const drop = new Set(conflict.studentIds);
                      setSelected(Object.fromEntries(candidates.filter((c) => selected[c.id] && !drop.has(c.id)).map((c) => [c.id, true])));
                      setConflict(null);
                    }}
                  >
                    Deselect those students and retry
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {step === 4 && result && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" /> {result.promoted} student(s) promoted
            </div>
            {result.skipped?.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="mb-1 font-bold">{result.skipped.length} skipped</p>
                <ul className="list-disc pl-4">
                  {result.skipped.map((s) => (
                    <li key={s.studentId}>{candidates.find((c) => c.id === s.studentId)?.name || s.studentId}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default PromoteStudentsModal;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { homeworkApi, academicPortalApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { ClipboardList, CheckCircle2, AlertTriangle, ListChecks, Plus, Pencil, Trash2 } from 'lucide-react';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const emptyForm = {
  classId: '',
  sectionId: '',
  subjectId: '',
  teacherId: '',
  title: '',
  description: '',
  assignedDate: toDateInput(new Date()),
  dueDate: '',
  totalStudents: '',
  submittedCount: '',
  evaluatedCount: '',
  status: 'ASSIGNED',
};

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

export const HomeworkMonitor = () => {
  const { showToast, ToastComponent } = useToast();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [filters, setFilters] = useState({ classId: '', sectionId: '', status: 'ALL' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadRef = useCallback(async () => {
    try {
      const [c, s, sub, t] = await Promise.all([
        academicPortalApi.classes({ limit: 100 }).catch(() => ({ data: [] })),
        academicPortalApi.sections({ limit: 500 }).catch(() => ({ data: [] })),
        academicPortalApi.subjects({ limit: 200 }).catch(() => ({ data: [] })),
        academicPortalApi.teachers({ limit: 300 }).catch(() => ({ data: [] })),
      ]);
      setClasses((c.data || []).filter((x) => x.status !== 'INACTIVE'));
      setSections(s.data || []);
      setSubjects((sub.data || []).filter((x) => x.status !== 'INACTIVE'));
      setTeachers(t.data || []);
    } catch {
      /* non-fatal */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 200 };
      if (filters.classId) params.classId = filters.classId;
      if (filters.sectionId) params.sectionId = filters.sectionId;
      if (filters.status !== 'ALL') params.status = filters.status;
      const [listRes, statsRes] = await Promise.all([
        homeworkApi.list(params),
        homeworkApi.stats(params).catch(() => null),
      ]);
      setRows(listRes?.data || []);
      setStats(statsRes?.data || null);
    } catch (err) {
      setError(apiMessage(err, 'Unable to load homework'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRef();
  }, [loadRef]);
  useEffect(() => {
    load();
  }, [load]);

  const sectionsForClass = useMemo(
    () => (form.classId ? sections.filter((s) => s.classId === form.classId) : sections),
    [form.classId, sections]
  );
  const filterSections = useMemo(
    () => (filters.classId ? sections.filter((s) => s.classId === filters.classId) : sections),
    [filters.classId, sections]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      classId: row.classId || '',
      sectionId: row.sectionId || '',
      subjectId: row.subjectId || '',
      teacherId: row.teacherId || '',
      title: row.title || '',
      description: row.description || '',
      assignedDate: toDateInput(row.assignedDate),
      dueDate: toDateInput(row.dueDate),
      totalStudents: row.totalStudents ?? '',
      submittedCount: row.submittedCount ?? '',
      evaluatedCount: row.evaluatedCount ?? '',
      status: row.status || 'ASSIGNED',
    });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return showToast('Homework title is required', 'error');
    if (!form.assignedDate || !form.dueDate) return showToast('Assigned and due dates are required', 'error');
    if (new Date(form.dueDate).getTime() < new Date(form.assignedDate).getTime()) {
      return showToast('Due date must be on or after the assigned date', 'error');
    }
    const total = Number(form.totalStudents) || 0;
    const submitted = Number(form.submittedCount) || 0;
    const evaluated = Number(form.evaluatedCount) || 0;
    if (total && submitted > total) return showToast('Submitted cannot exceed total students', 'error');
    if (evaluated > submitted) return showToast('Evaluated cannot exceed submitted', 'error');

    setSaving(true);
    try {
      const payload = {
        classId: form.classId || null,
        sectionId: form.sectionId || null,
        subjectId: form.subjectId || null,
        teacherId: form.teacherId || null,
        title: form.title.trim(),
        description: form.description.trim(),
        assignedDate: form.assignedDate,
        dueDate: form.dueDate,
        totalStudents: total,
        submittedCount: submitted,
        evaluatedCount: evaluated,
        status: form.status,
      };
      if (editing) {
        await homeworkApi.update(editing.id, payload);
        showToast('Homework updated', 'success');
      } else {
        await homeworkApi.create(payload);
        showToast('Homework created', 'success');
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      showToast(apiMessage(err, editing ? 'Unable to update homework' : 'Unable to create homework'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await homeworkApi.remove(deleteTarget.id);
      showToast('Homework deleted', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to delete homework'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'title',
        title: 'Homework',
        sortable: true,
        render: (val, row) => (
          <div>
            <span className="font-bold text-slate-900 dark:text-white">{val}</span>
            <div className="text-[11px] text-slate-400">
              {[row.className, row.sectionName].filter(Boolean).join(' ') || '—'}
            </div>
          </div>
        ),
      },
      { key: 'subjectName', title: 'Subject', render: (v) => v || '—' },
      { key: 'teacherName', title: 'Assigned By', render: (v) => v || '—' },
      { key: 'assignedDate', title: 'Assigned', sortable: true, render: (v) => fmtDate(v) },
      {
        key: 'dueDate',
        title: 'Due',
        sortable: true,
        render: (v, row) => (
          <span className={row.overdue ? 'font-bold text-rose-600' : ''}>{fmtDate(v)}</span>
        ),
      },
      { key: 'submissionRate', title: 'Submission', render: (v) => <SubmissionBar value={v} /> },
      { key: 'pendingEvaluation', title: 'Eval Pending', align: 'center' },
      {
        key: 'status',
        title: 'Status',
        render: (v) => <Badge variant={v === 'CLOSED' ? 'default' : 'success'}>{v}</Badge>,
      },
      {
        key: '_actions',
        title: 'Actions',
        align: 'right',
        render: (_v, row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0, icon: ClipboardList, tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
    { label: 'Active', value: stats?.assigned ?? 0, icon: ListChecks, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Overdue', value: stats?.overdue ?? 0, icon: AlertTriangle, tone: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
    {
      label: 'Avg Submission',
      value: stats?.avgSubmissionRate === null || stats?.avgSubmissionRate === undefined ? '—' : `${stats.avgSubmissionRate}%`,
      icon: CheckCircle2,
      tone: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework"
        subtitle="Track homework allocation, submission rates and evaluation pipelines across classes."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Add Homework
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${c.tone}`}>
              <c.icon className="h-4 w-4" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{c.label}</div>
            <div className="mt-0.5 text-xl font-extrabold text-slate-900 dark:text-white">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <select
          value={filters.classId}
          onChange={(e) => setFilters((f) => ({ ...f, classId: e.target.value, sectionId: '' }))}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filters.sectionId}
          onChange={(e) => setFilters((f) => ({ ...f, sectionId: e.target.value }))}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
        >
          <option value="">All Sections</option>
          {filterSections.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/60 p-10 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button type="button" onClick={load} className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          searchPlaceholder="Search homework by title, subject, teacher..."
          searchKeys={['title', 'subjectName', 'teacherName', 'className']}
          emptyMessage="No homework recorded yet."
          csvFilename="homework_monitor.csv"
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setForm(emptyForm);
        }}
        title={editing ? 'Edit Homework' : 'Add Homework'}
        size="lg"
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Title *</label>
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Chapter 5 exercises" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Class</label>
              <select className={inputClass} value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, sectionId: '' })}>
                <option value="">—</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Section</label>
              <select className={inputClass} value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value })}>
                <option value="">—</option>
                {sectionsForClass.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Subject</label>
              <select className={inputClass} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">—</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Assigned By (Teacher)</label>
              <select className={inputClass} value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                <option value="">—</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name || [t.firstName, t.lastName].filter(Boolean).join(' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Assigned Date *</label>
              <input type="date" className={inputClass} value={form.assignedDate} onChange={(e) => setForm({ ...form, assignedDate: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Due Date *</label>
              <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Total Students</label>
              <input type="number" min="0" className={inputClass} value={form.totalStudents} onChange={(e) => setForm({ ...form, totalStudents: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Submitted</label>
              <input type="number" min="0" className={inputClass} value={form.submittedCount} onChange={(e) => setForm({ ...form, submittedCount: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Evaluated</label>
              <input type="number" min="0" className={inputClass} value={form.evaluatedCount} onChange={(e) => setForm({ ...form, evaluatedCount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Status</label>
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ASSIGNED">Assigned</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Description / Instructions</label>
            <textarea rows={3} className={`${inputClass} h-auto py-2`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Update Homework' : 'Add Homework'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Homework"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmText="Delete Homework"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default HomeworkMonitor;

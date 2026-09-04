import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { PlusCircle, Pencil, CheckCircle2, Ban, Trash2 } from 'lucide-react';
import { principalMeetingApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const TYPES = ['STAFF', 'PARENT', 'BOARD', 'DEPARTMENT', 'ONE_ON_ONE', 'OTHER'];
const TYPE_LABEL = {
  STAFF: 'Staff Meeting',
  PARENT: 'Parent Meeting',
  BOARD: 'Board Meeting',
  DEPARTMENT: 'Department Meeting',
  ONE_ON_ONE: 'One-on-One',
  OTHER: 'Other',
};
const STATUS_VARIANT = { SCHEDULED: 'success', COMPLETED: 'info', CANCELLED: 'danger' };

function splitDateTime(iso) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}
function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const emptyForm = {
  title: '',
  type: 'STAFF',
  date: '',
  time: '',
  durationMin: 30,
  mode: 'IN_PERSON',
  venue: '',
  meetingLink: '',
  participantsLabel: 'All Academic Staff',
  agenda: '',
};

export const Meetings = () => {
  const { showToast, ToastComponent } = useToast();
  const [activeTab, setActiveTab] = useState('list');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ TOTAL: 0, SCHEDULED: 0, COMPLETED: 0, CANCELLED: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [minutesTarget, setMinutesTarget] = useState(null);
  const [minutesText, setMinutesText] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await principalMeetingApi.list({ limit: 200 });
      setRows(res?.data || []);
      if (res?.stats) setStats(res.stats);
    } catch (err) {
      setError(apiMessage(err, 'Unable to load meetings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const startEdit = (row) => {
    const { date, time } = splitDateTime(row.scheduledAt);
    setEditing(row);
    setForm({
      title: row.title || '',
      type: row.type || 'STAFF',
      date,
      time,
      durationMin: row.durationMin || 30,
      mode: row.mode || 'IN_PERSON',
      venue: row.venue || '',
      meetingLink: row.meetingLink || '',
      participantsLabel: row.participantsLabel || '',
      agenda: row.agenda || '',
    });
    setActiveTab('schedule');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date || !form.time) {
      return showToast('Title, date and time are required', 'error');
    }
    if (Number(form.durationMin) <= 0) return showToast('Duration must be positive', 'error');
    const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        scheduledAt,
        durationMin: Number(form.durationMin) || 30,
        mode: form.mode,
        venue: form.venue.trim(),
        meetingLink: form.meetingLink.trim(),
        participantsLabel: form.participantsLabel.trim(),
        agenda: form.agenda.trim(),
      };
      if (editing) {
        await principalMeetingApi.update(editing.id, payload);
        showToast('Meeting updated', 'success');
      } else {
        await principalMeetingApi.create(payload);
        showToast('Meeting scheduled and invitations noted', 'success');
      }
      resetForm();
      setActiveTab('list');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to save meeting'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitMinutes = async () => {
    if (!minutesTarget) return;
    try {
      await principalMeetingApi.setStatus(minutesTarget.id, 'COMPLETED', minutesText.trim());
      showToast('Meeting marked completed', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to update meeting'), 'error');
    } finally {
      setMinutesTarget(null);
      setMinutesText('');
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await principalMeetingApi.setStatus(cancelTarget.id, 'CANCELLED');
      showToast('Meeting cancelled', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to cancel meeting'), 'error');
    } finally {
      setCancelTarget(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await principalMeetingApi.remove(deleteTarget.id);
      showToast('Meeting deleted', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to delete meeting'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'title',
        title: 'Meeting Subject',
        sortable: true,
        render: (val, row) => (
          <div>
            <span className="font-bold text-slate-900 dark:text-white">{val}</span>
            {row.agenda && <div className="max-w-xs truncate text-[11px] text-slate-400">{row.agenda}</div>}
          </div>
        ),
      },
      { key: 'type', title: 'Type', render: (v) => <Badge variant="info">{TYPE_LABEL[v] || v}</Badge> },
      { key: 'scheduledAt', title: 'Scheduled', sortable: true, render: (v) => fmt(v) },
      { key: 'durationMin', title: 'Duration', render: (v) => `${v} min` },
      { key: 'participantsLabel', title: 'Participants', render: (v) => v || '—' },
      { key: 'status', title: 'Status', render: (v) => <Badge variant={STATUS_VARIANT[v] || 'default'}>{v}</Badge> },
      {
        key: '_actions',
        title: 'Actions',
        align: 'right',
        render: (_v, row) => (
          <div className="flex items-center justify-end gap-1">
            {row.status === 'SCHEDULED' && (
              <>
                <button
                  type="button"
                  onClick={() => startEdit(row)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMinutesTarget(row);
                    setMinutesText(row.minutes || '');
                  }}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30"
                  title="Mark completed"
                >
                  <CheckCircle2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setCancelTarget(row)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30"
                  title="Cancel"
                >
                  <Ban size={15} />
                </button>
              </>
            )}
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meetings Agenda Calendar"
        subtitle="Schedule and review staff advisory meetings, PTAs, board sessions and syllabus reviews."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total', value: stats.TOTAL },
          { label: 'Scheduled', value: stats.SCHEDULED },
          { label: 'Completed', value: stats.COMPLETED },
          { label: 'Cancelled', value: stats.CANCELLED },
        ].map((c) => (
          <div key={c.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{c.label}</div>
            <div className="mt-0.5 text-xl font-extrabold text-slate-900 dark:text-white">{c.value ?? 0}</div>
          </div>
        ))}
      </div>

      <Tabs
        tabs={[
          { id: 'list', label: 'All Meetings' },
          { id: 'schedule', label: editing ? 'Edit Meeting' : 'Schedule New Session' },
        ]}
        activeTab={activeTab}
        onChange={(t) => {
          if (t === 'list') resetForm();
          setActiveTab(t);
        }}
      />

      {activeTab === 'list' &&
        (error ? (
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
            searchPlaceholder="Search meetings..."
            searchKeys={['title', 'agenda', 'participantsLabel']}
            filterOptions={[
              { key: 'status', label: 'Status', options: ['SCHEDULED', 'COMPLETED', 'CANCELLED'] },
            ]}
            emptyMessage="No meetings scheduled yet."
            csvFilename="principal_meetings.csv"
          />
        ))}

      {activeTab === 'schedule' && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-xs font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Meeting Category</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Participant Target Group</label>
              <input
                value={form.participantsLabel}
                onChange={(e) => setForm({ ...form, participantsLabel: e.target.value })}
                className={inputCls}
                placeholder="e.g. All Academic Staff"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-400">Meeting Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Annual Syllabus Coverage Review"
              required
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Time *</label>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Duration (min)</label>
              <input
                type="number"
                min="1"
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Mode</label>
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className={inputCls}>
                <option value="IN_PERSON">In person</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Venue</label>
              <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className={inputCls} placeholder="e.g. Conference Room" />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Meeting Link (if online)</label>
              <input value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })} className={inputCls} placeholder="https://…" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-400">Agenda</label>
            <textarea rows={3} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} className={`${inputCls} resize-y`} />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            {editing && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab('list');
                }}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold"
              >
                Cancel edit
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-60"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving…' : editing ? 'Update Session' : 'Schedule Session'}</span>
            </button>
          </div>
        </form>
      )}

      <Modal isOpen={Boolean(minutesTarget)} onClose={() => setMinutesTarget(null)} title="Complete Meeting — Minutes">
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-500">
            Record minutes / outcome for <strong>{minutesTarget?.title}</strong> (optional).
          </p>
          <textarea rows={5} value={minutesText} onChange={(e) => setMinutesText(e.target.value)} className={`${inputCls} resize-y`} />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button type="button" onClick={() => setMinutesTarget(null)} className="rounded-xl px-4 py-2 text-xs font-semibold">
              Cancel
            </button>
            <button type="button" onClick={submitMinutes} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">
              Mark Completed
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancel Meeting"
        message={`Cancel "${cancelTarget?.title}"? It stays in the list marked cancelled.`}
        confirmText="Cancel Meeting"
        variant="warning"
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Meeting"
        message={`Permanently delete "${deleteTarget?.title}"?`}
        confirmText="Delete Meeting"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default Meetings;

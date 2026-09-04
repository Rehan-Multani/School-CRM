import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { eventsApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { CalendarDays, CalendarClock, CheckCircle2, XCircle, Plus, Pencil, Ban, Trash2, RotateCcw } from 'lucide-react';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const CATEGORIES = ['ACADEMIC', 'SPORTS', 'CULTURAL', 'MEETING', 'HOLIDAY', 'EXAM', 'OTHER'];
const AUDIENCES = ['ALL', 'TEACHERS', 'STUDENTS', 'PARENTS', 'STAFF'];

const STATUS_VARIANT = {
  UPCOMING: 'success',
  ONGOING: 'info',
  COMPLETED: 'default',
  CANCELLED: 'danger',
};
const CATEGORY_VARIANT = {
  ACADEMIC: 'info',
  SPORTS: 'success',
  CULTURAL: 'warning',
  MEETING: 'default',
  HOLIDAY: 'primary',
  EXAM: 'danger',
  OTHER: 'default',
};

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
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

const emptyForm = {
  title: '',
  category: 'ACADEMIC',
  startAt: '',
  endAt: '',
  allDay: false,
  venue: '',
  audiences: ['ALL'],
  leadName: '',
};

export const EventsManagement = () => {
  const { showToast, ToastComponent } = useToast();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, thisMonth: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, statsRes] = await Promise.all([
        eventsApi.list({ limit: 200 }),
        eventsApi.stats(),
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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title || '',
      category: row.category || 'ACADEMIC',
      startAt: toLocalInput(row.startAt),
      endAt: toLocalInput(row.endAt),
      allDay: Boolean(row.allDay),
      venue: row.venue || '',
      audiences: row.audiences?.length ? row.audiences : ['ALL'],
      leadName: row.leadName || '',
    });
    setModalOpen(true);
  };

  const toggleAudience = (aud) => {
    setForm((f) => {
      const has = f.audiences.includes(aud);
      let next = has ? f.audiences.filter((a) => a !== aud) : [...f.audiences, aud];
      if (aud === 'ALL' && !has) next = ['ALL'];
      else if (aud !== 'ALL') next = next.filter((a) => a !== 'ALL');
      if (next.length === 0) next = ['ALL'];
      return { ...f, audiences: next };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return showToast('Event title is required', 'error');
    if (!form.startAt || !form.endAt) return showToast('Start and end date/time are required', 'error');
    if (new Date(form.endAt).getTime() < new Date(form.startAt).getTime()) {
      return showToast('Event end must be on or after the start', 'error');
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        allDay: form.allDay,
        venue: form.venue.trim(),
        audiences: form.audiences,
        leadName: form.leadName.trim(),
      };
      if (editing) {
        await eventsApi.update(editing.id, payload);
        showToast('Event updated', 'success');
      } else {
        await eventsApi.create(payload);
        showToast('Event scheduled', 'success');
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      showToast(apiMessage(err, editing ? 'Unable to update event' : 'Unable to schedule event'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await eventsApi.setCancelled(cancelTarget.id, !cancelTarget.cancelled);
      showToast(cancelTarget.cancelled ? 'Event reinstated' : 'Event cancelled', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to update event'), 'error');
    } finally {
      setCancelTarget(null);
    }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await eventsApi.remove(deleteTarget.id);
      showToast('Event deleted', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to delete event'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'title',
        title: 'Event',
        sortable: true,
        render: (val, row) => (
          <div>
            <span className="font-bold text-slate-900 dark:text-white">{val}</span>
            {row.venue && <div className="text-[11px] text-slate-400">{row.venue}</div>}
          </div>
        ),
      },
      {
        key: 'category',
        title: 'Category',
        render: (val) => <Badge variant={CATEGORY_VARIANT[val] || 'default'}>{val}</Badge>,
      },
      { key: 'startAt', title: 'Starts', sortable: true, render: (val) => fmt(val) },
      { key: 'endAt', title: 'Ends', render: (val) => fmt(val) },
      {
        key: 'audiences',
        title: 'Audience',
        render: (val) => (val?.length ? val.join(', ') : 'ALL'),
      },
      { key: 'leadName', title: 'Lead', render: (val) => val || '—' },
      {
        key: 'status',
        title: 'Status',
        render: (val) => <Badge variant={STATUS_VARIANT[val] || 'default'}>{val}</Badge>,
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
              onClick={() => setCancelTarget(row)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30"
              title={row.cancelled ? 'Reinstate' : 'Cancel'}
            >
              {row.cancelled ? <RotateCcw size={15} /> : <Ban size={15} />}
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
    { label: 'Total Events', value: stats.total, icon: CalendarDays, tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
    { label: 'Upcoming', value: stats.upcoming, icon: CalendarClock, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'This Month', value: stats.thisMonth, icon: CalendarDays, tone: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, tone: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
    { label: 'Cancelled', value: stats.cancelled, icon: XCircle, tone: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        subtitle="Schedule and manage campus events, functions, meetings and holidays."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Schedule Event
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {statCards.map((c) => (
          <div
            key={c.label}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${c.tone}`}>
              <c.icon className="h-4 w-4" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{c.label}</div>
            <div className="mt-0.5 text-xl font-extrabold text-slate-900 dark:text-white">{c.value ?? 0}</div>
          </div>
        ))}
      </div>

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
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          searchPlaceholder="Search events by title, venue, lead..."
          searchKeys={['title', 'venue', 'leadName']}
          filterOptions={[
            { key: 'status', label: 'Status', options: ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] },
            { key: 'category', label: 'Category', options: CATEGORIES },
          ]}
          emptyMessage="No events scheduled yet."
          csvFilename="school_events.csv"
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setForm(emptyForm);
        }}
        title={editing ? 'Edit Event' : 'Schedule Event'}
        size="lg"
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Event Title *</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Annual Sports Day"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Category</label>
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Venue</label>
              <input
                className={inputClass}
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                placeholder="e.g. Main Ground"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Starts *</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Ends *</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
              className="h-4 w-4 rounded text-primary"
            />
            All-day event
          </label>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Audience</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map((a) => {
                const active = form.audiences.includes(a);
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => toggleAudience(a)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? 'bg-primary text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Lead / Coordinator</label>
            <input
              className={inputClass}
              value={form.leadName}
              onChange={(e) => setForm({ ...form, leadName: e.target.value })}
              placeholder="e.g. Mr. Sharma"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : editing ? 'Update Event' : 'Schedule Event'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title={cancelTarget?.cancelled ? 'Reinstate Event' : 'Cancel Event'}
        message={
          cancelTarget?.cancelled
            ? `Reinstate "${cancelTarget?.title}"? Its status will be recalculated from its dates.`
            : `Cancel "${cancelTarget?.title}"? It stays in the list marked as cancelled.`
        }
        confirmText={cancelTarget?.cancelled ? 'Reinstate' : 'Cancel Event'}
        variant={cancelTarget?.cancelled ? 'info' : 'warning'}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Event"
        message={`Permanently delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmText="Delete Event"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default EventsManagement;

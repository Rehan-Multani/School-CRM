import React, { useCallback, useEffect, useState } from 'react';
import { DoorOpen, Plus, Pencil, Trash2, Search, Loader2, X } from 'lucide-react';
import { SkeletonTableRow } from '../../ui/SkeletonLoader';

/**
 * Visitor log, shared by HR / School Admin / Principal.
 * HR (`canEdit`) records and edits visitors; School Admin and Principal only read the list.
 * `api` is built by visitorApi(client) in shared/api/client.js.
 */

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400';
const btnPrimary =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50';
const btnGhost =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

const errText = (err, fallback) => err?.response?.data?.message || err?.message || fallback;
const pad = (n) => String(n).padStart(2, '0');
// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm".
const toLocalInput = (value) => {
  const d = value ? new Date(value) : new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const formatWhen = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';

const emptyForm = () => ({ name: '', mobile: '', purpose: '', personToMeet: '', visitDate: toLocalInput(), remarks: '' });

export default function VisitorManager({ api, canEdit = false }) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | { id?, ...form }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.list({ page, limit: 20, search: query || undefined });
      setRows(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(errText(err, 'Could not load visitors'));
    } finally {
      setLoading(false);
    }
  }, [api, page, query]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setFormError('');
    setEditing(emptyForm());
  };
  const openEdit = (row) => {
    setFormError('');
    setEditing({
      id: row.id,
      name: row.name,
      mobile: row.mobile,
      purpose: row.purpose,
      personToMeet: row.personToMeet,
      visitDate: toLocalInput(row.visitDate),
      remarks: row.remarks,
    });
  };
  const set = (key) => (e) => setEditing((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!editing.name.trim() || !editing.mobile.trim() || !editing.purpose.trim()) {
      setFormError('Name, mobile number and purpose are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    const { id, ...body } = editing;
    body.visitDate = new Date(body.visitDate).toISOString();
    try {
      if (id) await api.update(id, body);
      else await api.create(body);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(errText(err, 'Could not save the visitor'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete the visit record of ${row.name}?`)) return;
    try {
      await api.remove(row.id);
      await load();
    } catch (err) {
      setError(errText(err, 'Could not delete the visitor'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10">
            <DoorOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Visitors</h1>
            <p className="text-sm text-slate-500">
              {canEdit ? 'Record everyone who visits the school for an enquiry.' : 'People who visited the school, recorded by HR.'}
            </p>
          </div>
        </div>
        {canEdit ? (
          <button type="button" className={btnPrimary} onClick={openNew}>
            <Plus className="h-4 w-4" /> Add visitor
          </button>
        ) : null}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className={`${inputClass} pl-9`}
          placeholder="Search name, mobile, purpose…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <th className="px-4 py-3">Visitor</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Purpose</th>
              <th className="px-4 py-3">To meet</th>
              <th className="px-4 py-3">Visited on</th>
              <th className="px-4 py-3">Remarks</th>
              {canEdit ? <th className="px-4 py-3 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonTableRow key={i} columns={canEdit ? 7 : 6} />)
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-4 py-10 text-center text-slate-400">
                  No visitors found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800">
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{row.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.mobile}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.purpose}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.personToMeet || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatWhen(row.visitDate)}</td>
                  <td className="px-4 py-3 text-slate-500">{row.remarks || '-'}</td>
                  {canEdit ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => openEdit(row)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => remove(row)} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{pagination.total} visitors</span>
          <div className="flex items-center gap-2">
            <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              {page} / {pagination.totalPages}
            </span>
            <button type="button" className={btnGhost} disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={save} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{editing.id ? 'Edit visitor' : 'Add visitor'}</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Visitor name *</label>
                <input className={inputClass} value={editing.name} onChange={set('name')} maxLength={120} autoFocus placeholder="e.g. Rahul Sharma" />
              </div>
              <div>
                <label className={labelClass}>Mobile number *</label>
                <input className={inputClass} value={editing.mobile} onChange={set('mobile')} maxLength={20} inputMode="tel" placeholder="e.g. 9876543210" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Purpose of visit *</label>
                <input className={inputClass} value={editing.purpose} onChange={set('purpose')} maxLength={300} placeholder="e.g. Admission enquiry" />
              </div>
              <div>
                <label className={labelClass}>Person to meet</label>
                <input className={inputClass} value={editing.personToMeet} onChange={set('personToMeet')} maxLength={120} placeholder="e.g. Principal / Class teacher" />
              </div>
              <div>
                <label className={labelClass}>Visit date &amp; time</label>
                <input type="datetime-local" className={inputClass} value={editing.visitDate} onChange={set('visitDate')} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Remarks</label>
                <textarea className={`${inputClass} h-20 py-2`} value={editing.remarks} onChange={set('remarks')} maxLength={500} placeholder="Any note about the visit (optional)" />
              </div>
            </div>

            {formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}

            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing.id ? 'Save changes' : 'Add visitor'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

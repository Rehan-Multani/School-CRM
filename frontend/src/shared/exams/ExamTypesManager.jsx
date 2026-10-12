import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Pencil, Plus, Power, Trash2, X } from 'lucide-react';

/**
 * Exam type options for a <select>: the school's own active types.
 * `api` is examPortalApi (school admin) or principalExamApi (principal).
 */
export function useExamTypes(api) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await api.examTypes({ includeInactive: true });
      setTypes(res.data || []);
    } catch {
      // keep whatever we had; the form falls back to an empty list
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { types, loading, reload };
}

const msg = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';

/** Full CRUD for the school's exam types, shown as a modal. */
export function ExamTypesManager({ api, onClose, onChanged, showToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null); // { id, name }
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.examTypes({ includeInactive: true });
      setRows(res.data || []);
    } catch (err) {
      showToast?.(msg(err, 'Unable to load exam types'), 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, okMessage) => {
    setBusy(true);
    try {
      await fn();
      if (okMessage) showToast?.(okMessage, 'success');
      await load();
      onChanged?.();
      return true;
    } catch (err) {
      showToast?.(msg(err, 'Something went wrong'), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await run(() => api.createExamType({ name: name.trim() }), 'Exam type added');
    if (ok) setName('');
  };

  const saveEdit = async () => {
    if (!editing?.name.trim()) return;
    const ok = await run(() => api.updateExamType(editing.id, { name: editing.name.trim() }), 'Exam type updated');
    if (ok) setEditing(null);
  };

  const toggle = (row) =>
    run(
      () => api.updateExamType(row.id, { isActive: !row.isActive }),
      row.isActive ? 'Exam type deactivated' : 'Exam type activated'
    );

  const remove = async (row) => {
    const ok = await run(() => api.deleteExamType(row.id), 'Exam type deleted');
    if (ok) setConfirmDelete(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Manage Exam Types</h3>
            <p className="text-xs text-slate-500">Add, rename, deactivate or delete the types offered when creating an exam.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={add} className="flex gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New exam type, e.g. Practical Exam"
            maxLength={60}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-white disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </form>

        <div className="min-h-[120px] flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex justify-center py-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-xs font-semibold text-slate-400">No exam types yet. Add the first one above.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center gap-2 py-2.5">
                  {editing?.id === row.id ? (
                    <>
                      <input
                        autoFocus
                        className={inputClass}
                        value={editing.name}
                        maxLength={60}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') setEditing(null);
                        }}
                      />
                      <button type="button" onClick={saveEdit} disabled={busy} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" aria-label="Save">
                        <Check className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Cancel">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : confirmDelete === row.id ? (
                    <>
                      <span className="flex-1 text-xs font-semibold text-rose-600">Delete “{row.name}”?</span>
                      <button type="button" onClick={() => remove(row)} disabled={busy} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">
                        Delete
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${row.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>
                          {row.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {row.examCount} exam{row.examCount === 1 ? '' : 's'}
                          {row.isActive ? '' : ' · inactive'}
                        </p>
                      </div>
                      <button type="button" onClick={() => setEditing({ id: row.id, name: row.name })} disabled={busy} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Rename">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(row)}
                        disabled={busy}
                        className={`rounded-lg p-2 hover:bg-slate-100 ${row.isActive ? 'text-emerald-600' : 'text-slate-400'}`}
                        aria-label={row.isActive ? 'Deactivate' : 'Activate'}
                        title={row.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(row.id)}
                        disabled={busy}
                        className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                        aria-label="Delete"
                        title={row.examCount ? 'In use — deactivate instead' : 'Delete'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-right dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

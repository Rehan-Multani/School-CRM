import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button, Badge } from '../../components/ui/Button';
import { Pulse } from '../../components/ui/SkeletonLoader';
import { Input } from '../../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformBoardApi } from '../../../../shared/api/client';
import { BookMarked, Plus, Pencil, Power, Search } from 'lucide-react';

const emptyForm = () => ({ name: '', description: '' });
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];

const errorMessage = (err, fallback) => err.response?.data?.message || err.message || fallback;

export default function BoardsIndex() {
  const { addNotification } = useSuperAdminNotifications();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toToggle, setToToggle] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const result = await platformBoardApi.list();
      setBoards(result.data || []);
    } catch (err) {
      addNotification('error', errorMessage(err, 'Unable to load boards.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return boards.filter((board) => {
      if (filter === 'active' && !board.isActive) return false;
      if (filter === 'inactive' && board.isActive) return false;
      if (!term) return true;
      return `${board.name} ${board.description}`.toLowerCase().includes(term);
    });
  }, [boards, search, filter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (board) => {
    setEditing(board);
    setForm({ name: board.name, description: board.description || '' });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() };
      if (editing) {
        const result = await platformBoardApi.update(editing.id, payload);
        addNotification('success', result.message || 'Board updated.');
      } else {
        const result = await platformBoardApi.create(payload);
        addNotification('success', result.message || 'Board created.');
      }
      closeDialog();
      await load();
    } catch (err) {
      addNotification('error', errorMessage(err, 'Unable to save board.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!toToggle) return;
    setToggling(true);
    try {
      const result = await platformBoardApi.setActive(toToggle.id, !toToggle.isActive);
      setBoards((prev) =>
        prev.map((board) => (board.id === toToggle.id ? { ...board, ...result.data } : board))
      );
      addNotification('success', result.message || 'Board status updated.');
      setToToggle(null);
    } catch (err) {
      addNotification('error', errorMessage(err, 'Unable to update board status.'));
    } finally {
      setToggling(false);
    }
  };

  const activeCount = boards.filter((board) => board.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <BookMarked className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Boards</h1>
              {boards.length > 0 && (
                <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  {activeCount} active / {boards.length}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Education boards offered when creating a school. Boards can be deactivated, never deleted.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate} className="shrink-0 whitespace-nowrap">
          <Plus size={14} className="mr-1.5" />
          Add Board
        </Button>
      </div>

      <Card className="border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              placeholder="Search boards"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  filter === item.key
                    ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Pulse key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-slate-800">
            {boards.length === 0 ? 'No boards yet. Click "Add Board" to create one.' : 'No boards match your filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="py-2 pr-4 font-semibold">Board</th>
                  <th className="py-2 pr-4 font-semibold">Description</th>
                  <th className="py-2 pr-4 font-semibold">Schools</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((board) => (
                  <tr key={board.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100">{board.name}</td>
                    <td className="max-w-xs truncate py-3 pr-4 text-slate-500 dark:text-slate-400">
                      {board.description || '—'}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-slate-700 dark:text-slate-300">{board.schoolCount}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={board.isActive ? 'success' : 'default'}>
                        {board.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(board)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                          aria-label={`Edit ${board.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setToToggle(board)}
                          className={`rounded-lg p-1.5 transition ${
                            board.isActive
                              ? 'text-emerald-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10'
                              : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10'
                          }`}
                          aria-label={`${board.isActive ? 'Deactivate' : 'Activate'} ${board.name}`}
                          title={board.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Power size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Board' : 'Add Board'}</DialogTitle>
            <DialogDescription>
              {editing && editing.schoolCount > 0
                ? `Renaming also updates the ${editing.schoolCount} school(s) using this board.`
                : 'This board will be selectable when creating a school.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="mt-2 space-y-4">
            <Input
              label="Board Name"
              placeholder="CBSE"
              maxLength={80}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Description"
              placeholder="Optional"
              maxLength={300}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Board'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(toToggle)}
        onOpenChange={(open) => {
          if (!open && !toggling) setToToggle(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{toToggle?.isActive ? 'Deactivate board' : 'Activate board'}</DialogTitle>
            <DialogDescription>
              {toToggle?.isActive
                ? 'It will no longer be offered for new schools. Schools already using it are not affected.'
                : 'It will be offered again when creating or editing a school.'}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {toToggle?.isActive ? 'Deactivate' : 'Activate'}{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{toToggle?.name}</span>?
          </p>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" disabled={toggling} onClick={() => setToToggle(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={toToggle?.isActive ? 'destructive' : 'primary'}
              className="flex-1"
              disabled={toggling}
              onClick={handleToggle}
            >
              {toggling ? 'Please wait...' : toToggle?.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

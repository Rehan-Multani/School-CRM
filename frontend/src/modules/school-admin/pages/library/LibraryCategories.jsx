import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, FolderTree } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { TablePageSkeleton } from '../../components/ui/SkeletonLoader';
import { libraryPortalApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { LibraryTabsNav, inputClass, labelClass } from './libraryShared';

const EMPTY_FORM = { name: '', description: '', status: 'ACTIVE' };

export const LibraryCategories = () => {
  const { showToast, ToastComponent } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await libraryPortalApi.categories();
      setCategories(res.data || []);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to load categories'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormModalOpen(true); };
  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || '', status: cat.status });
    setFormModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await libraryPortalApi.updateCategory(editing.id, form);
        showToast('Category updated', 'success');
      } else {
        await libraryPortalApi.createCategory(form);
        showToast('Category created', 'success');
      }
      setFormModalOpen(false);
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Failed to save category'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await libraryPortalApi.deleteCategory(deleteTarget.id);
      showToast('Category deleted', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Failed to delete category'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleStatus = async (cat) => {
    try {
      await libraryPortalApi.updateCategory(cat.id, { status: cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      showToast(cat.status === 'ACTIVE' ? 'Category deactivated' : 'Category activated', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Failed to update category status'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Categories" subtitle="Organize the library catalog into subject categories." />
        <LibraryTabsNav />
        <TablePageSkeleton columns={5} rows={6} hasHeader={false} hasFilters={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastComponent />
      <PageHeader
        title="Categories"
        subtitle="Organize the library catalog into subject categories."
        actions={
          <button type="button" onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Add Category
          </button>
        }
      />
      <LibraryTabsNav />

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <FolderTree className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <h4 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No categories found</h4>
          <p className="mt-1 max-w-sm text-xs text-slate-400">Add subject categories such as Science, Fiction or Reference to organize books.</p>
        </div>
      ) : (
        <DataTable
          data={categories}
          searchPlaceholder="Search categories..."
          searchKeys={['name', 'description']}
          columns={[
            { key: 'name', title: 'Category', sortable: true, render: (v) => <span className="font-bold text-slate-900 dark:text-white">{v}</span> },
            { key: 'description', title: 'Description', render: (v) => v || '—' },
            { key: 'count', title: 'Books', sortable: true, render: (v) => <span className="font-black">{v || 0}</span> },
            { key: 'availableCopies', title: 'Available Copies', sortable: true },
            {
              key: 'status',
              title: 'Status',
              render: (v, row) => (
                <button type="button" onClick={() => handleToggleStatus(row)} title="Click to toggle">
                  <Badge variant={v === 'ACTIVE' ? 'success' : 'default'}>{v}</Badge>
                </button>
              ),
            },
            {
              key: 'actions',
              title: 'Actions',
              render: (_, row) => (
                <div className="flex items-center justify-end gap-1.5">
                  <button type="button" onClick={() => openEdit(row)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-800" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(row)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-600 dark:border-slate-800" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal isOpen={formModalOpen} onClose={() => setFormModalOpen(false)} title={editing ? 'Edit Category' : 'Add Category'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} h-auto py-2.5`} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setFormModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 dark:border-slate-800 dark:text-slate-300">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? This is only possible if no books are tagged under it.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default LibraryCategories;

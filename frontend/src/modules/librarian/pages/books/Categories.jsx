import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonCard, SkeletonTable } from '../../components/ui/SkeletonLoader';
import { FolderTree, RefreshCw, Plus, Pencil, Trash2, Power, Loader2, LayoutGrid, List, BookOpen } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';
import { useToast } from '../../components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';

const inputClass =
  'w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900';

const emptyForm = { name: '', description: '', status: 'ACTIVE' };

export const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await librarianApi.categories();
      if (res?.success && Array.isArray(res.data)) {
        setCategories(res.data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      toast.error('Failed to load book categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const activeCount = useMemo(() => categories.filter((c) => c.status === 'ACTIVE').length, [categories]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || '',
      description: category.description || '',
      status: category.status || 'ACTIVE',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingCategory) {
        await librarianApi.updateCategory(editingCategory.id, form);
        toast.success('Category updated successfully');
      } else {
        await librarianApi.createCategory(form);
        toast.success('Category created successfully');
      }
      closeModal();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (category) => {
    const nextStatus = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await librarianApi.updateCategory(category.id, { status: nextStatus });
      toast.success(`"${category.name}" marked ${nextStatus === 'ACTIVE' ? 'active' : 'inactive'}`);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update category status');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await librarianApi.deleteCategory(deleteTarget.id);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete category');
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      title: 'Category Name',
      key: 'name',
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
            <FolderTree className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-xs">{val || 'GENERAL'}</span>
        </div>
      ),
    },
    {
      title: 'Unique Titles',
      key: 'count',
      sortable: true,
      render: (val) => <Badge variant="neutral">{val} Titles</Badge>,
    },
    {
      title: 'Total Stock Copies',
      key: 'totalCopies',
      sortable: true,
      render: (val) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{val || 0}</span>,
    },
    {
      title: 'Available Copies',
      key: 'availableCopies',
      sortable: true,
      render: (val) => (
        <Badge variant={val > 0 ? 'success' : 'danger'}>
          {val || 0} Available
        </Badge>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      render: (val) => <span className="text-xs text-slate-500 dark:text-slate-400">{val || '—'}</span>,
    },
    {
      title: 'Status',
      key: 'status',
      sortable: true,
      render: (val, row) => (
        <button
          onClick={() => toggleStatus(row)}
          title={val === 'ACTIVE' ? 'Click to deactivate' : 'Click to activate'}
          className="inline-flex"
        >
          <Badge variant={val === 'ACTIVE' ? 'success' : 'default'} className="cursor-pointer">
            {val === 'ACTIVE' ? 'Active' : 'Inactive'}
          </Badge>
        </button>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/librarian/books?category=${encodeURIComponent(row.name)}`)}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 text-3xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
          >
            View Books
          </button>
          <button
            onClick={() => openEditModal(row)}
            title="Edit Category"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => toggleStatus(row)}
            title={row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-amber-600 hover:border-amber-300 transition-colors"
          >
            <Power className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            title="Delete Category"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:border-rose-300 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book Categories"
        subtitle={`Manage library departments and classifications · ${activeCount} active of ${categories.length} total.`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCategories}
              disabled={loading}
              className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Grid / Table view switcher */}
            <div className="flex items-center p-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                title="Card view"
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  viewMode === 'grid'
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                    : 'text-slate-400'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Table view"
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  viewMode === 'table'
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                    : 'text-slate-400'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Category
            </button>
          </div>
        }
      />

      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        ) : (
          <SkeletonTable rows={8} columns={7} />
        )
      ) : categories.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <FolderTree className="h-8 w-8 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Categories Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create your first category to start classifying books in the catalogue.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Category
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className={cn(
                'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-900/50 flex flex-col justify-between',
                category.status !== 'ACTIVE' && 'opacity-60'
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <FolderTree className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{category.name}</h4>
                  </div>
                  <button
                    onClick={() => toggleStatus(category)}
                    title={category.status === 'ACTIVE' ? 'Click to deactivate' : 'Click to activate'}
                    className="shrink-0"
                  >
                    <Badge variant={category.status === 'ACTIVE' ? 'success' : 'default'} className="cursor-pointer">
                      {category.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </button>
                </div>

                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem]">
                  {category.description || 'No description provided.'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
                  <Badge variant="neutral">{category.count} Titles</Badge>
                  <Badge variant={category.availableCopies > 0 ? 'success' : 'danger'}>
                    {category.availableCopies || 0} Available
                  </Badge>
                  <Badge variant="default">{category.totalCopies || 0} Total Copies</Badge>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigate(`/librarian/books?category=${encodeURIComponent(category.name)}`)}
                  className="flex-1 h-9 text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all duration-150 inline-flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="h-3.5 w-3.5" /> View Books
                </button>
                <button
                  onClick={() => openEditModal(category)}
                  title="Edit Category"
                  className="px-3 h-9 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 dark:text-indigo-400 rounded-xl transition-all duration-150"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(category)}
                  title="Delete Category"
                  className="px-3 h-9 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 dark:text-rose-400 rounded-xl transition-all duration-150"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={categories}
            searchPlaceholder="Search categories..."
            searchKeys={['name']}
            csvFilename="library_categories.csv"
          />
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingCategory ? 'Edit Category' : 'Add New Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Category Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Science, Fiction, Technology"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short note about what this category covers"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputClass}
            >
              <option value="ACTIVE">Active (Available when adding books)</option>
              <option value="INACTIVE">Inactive (Hidden from new books)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{editingCategory ? 'Save Changes' : 'Create Category'}</span>
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete Category"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
};
export default Categories;

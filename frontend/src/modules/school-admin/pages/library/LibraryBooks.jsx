import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { libraryPortalApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { LibraryTabsNav, inputClass, labelClass, categoryBadgeVariant } from './libraryShared';

const EMPTY_FORM = {
  title: '',
  publisher: '',
  author: '',
  publicationYear: new Date().getFullYear(),
  edition: '',
  language: 'English',
  category: '',
  subject: '',
  price: 0,
  totalCopies: 1,
  description: '',
};

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR'];
const COPY_STATUS_BADGE = {
  AVAILABLE: 'success',
  ISSUED: 'warning',
  RESERVED: 'info',
  LOST: 'danger',
  DAMAGED: 'danger',
  MAINTENANCE: 'default',
};

export const LibraryBooks = () => {
  const { showToast, ToastComponent } = useToast();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [viewBook, setViewBook] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [copiesBook, setCopiesBook] = useState(null);
  const [copies, setCopies] = useState([]);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [newCopyForm, setNewCopyForm] = useState({ accessionNumber: '', barcode: '', condition: 'GOOD' });
  const [savingCopy, setSavingCopy] = useState(false);
  const [deleteCopyTarget, setDeleteCopyTarget] = useState(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await libraryPortalApi.categories();
      setCategories((res.data || []).filter((c) => c.status === 'ACTIVE'));
    } catch {
      // non-fatal; category filter/dropdown just stays empty
    }
  }, []);

  const loadBooks = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await libraryPortalApi.books({
        page,
        limit: pagination.limit,
        search: debouncedSearch.trim() || undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setBooks(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
    } catch (err) {
      showToast(apiMessage(err, 'Failed to load book catalog'), 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, debouncedSearch, categoryFilter, statusFilter, showToast]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadBooks(1); }, [debouncedSearch, categoryFilter, statusFilter, loadBooks]);

  const categoryOptions = useMemo(
    () => [{ value: 'ALL', label: 'All Categories' }, ...categories.map((c) => ({ value: c.name, label: c.name }))],
    [categories]
  );

  // ---- Add / Edit Book ----
  const openAdd = () => {
    setEditingBook(null);
    setForm({
      ...EMPTY_FORM,
      category: categories[0]?.name || '',
    });
    setFormModalOpen(true);
  };

  const openEdit = (book) => {
    setEditingBook(book);
    setForm({
      title: book.title || '',
      publisher: book.publisher || '',
      author: book.author || '',
      publicationYear: book.publicationYear || new Date().getFullYear(),
      edition: book.edition || '',
      language: book.language || 'English',
      category: book.category || categories[0]?.name || '',
      subject: book.subject || '',
      price: book.price ?? 0,
      totalCopies: book.totalCopies || 1,
      description: book.description || '',
    });
    setFormModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim() || !form.publisher.trim() || !form.category.trim()) {
      showToast('Please fill in all required fields marked with *', 'error');
      return;
    }
    if (Number(form.price) < 0) {
      showToast('Please enter a valid Book Cost.', 'error');
      return;
    }
    if (!editingBook && Number(form.totalCopies) <= 0) {
      showToast('Please enter a valid quantity of copies.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        publicationYear: Number(form.publicationYear) || undefined,
        totalCopies: Number(form.totalCopies) || 1,
      };

      if (editingBook) {
        const { totalCopies, ...metadata } = payload;
        await libraryPortalApi.updateBook(editingBook.id, metadata);
        showToast('Book updated successfully', 'success');
      } else {
        await libraryPortalApi.createBook(payload);
        showToast('Book added to catalog', 'success');
      }
      setFormModalOpen(false);
      loadBooks(pagination.page);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to save book'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await libraryPortalApi.deleteBook(deleteTarget.id);
      showToast('Book deleted from catalog', 'success');
      loadBooks(pagination.page);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to delete book'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  // ---- Manage Copies ----
  const loadCopies = useCallback(async (bookId) => {
    setLoadingCopies(true);
    try {
      const res = await libraryPortalApi.copies({ bookId, limit: 100 });
      setCopies(res.data || []);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to load physical copies'), 'error');
    } finally {
      setLoadingCopies(false);
    }
  }, [showToast]);

  const openCopies = (book) => {
    setCopiesBook(book);
    setNewCopyForm({ accessionNumber: '', barcode: '', condition: 'GOOD' });
    loadCopies(book.id);
  };

  const handleAddCopy = async (e) => {
    e.preventDefault();
    setSavingCopy(true);
    try {
      await libraryPortalApi.createCopy({
        bookId: copiesBook.id,
        accessionNumber: newCopyForm.accessionNumber || undefined,
        barcode: newCopyForm.barcode || undefined,
        condition: newCopyForm.condition,
        rackNumber: copiesBook.rackNumber,
        shelfNumber: copiesBook.shelfNumber,
      });
      showToast('Physical copy added', 'success');
      setNewCopyForm({ accessionNumber: '', barcode: '', condition: 'GOOD' });
      loadCopies(copiesBook.id);
      loadBooks(pagination.page);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to add copy'), 'error');
    } finally {
      setSavingCopy(false);
    }
  };

  const handleDeleteCopy = async () => {
    if (!deleteCopyTarget) return;
    try {
      await libraryPortalApi.deleteCopy(deleteCopyTarget.id);
      showToast('Copy removed', 'success');
      loadCopies(copiesBook.id);
      loadBooks(pagination.page);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to remove copy'), 'error');
    } finally {
      setDeleteCopyTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <ToastComponent />
      <PageHeader
        title="Books"
        subtitle="Manage the library's book master catalog, metadata and physical copy inventory."
        actions={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Add Book
          </button>
        }
      />

      <LibraryTabsNav />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, author, ISBN, code..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            {categoryOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="ALL">All Stock Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => loadBooks(pagination.page)}
          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <h4 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No books found</h4>
          <p className="mt-1 max-w-sm text-xs text-slate-400">
            {search || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No books match your current search and filters.'
              : 'Add your first book to start building the library catalog.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Book</th>
                  <th className="px-3 py-3 font-bold">Publisher</th>
                  <th className="px-3 py-3 font-bold">Author</th>
                  <th className="px-3 py-3 font-bold">Category</th>
                  <th className="px-3 py-3 text-center font-bold">Copies</th>
                  <th className="px-3 py-3 text-center font-bold">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {books.map((b) => (
                  <tr key={b.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${b.isActive === false ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block font-bold text-slate-900 dark:text-white">{b.title}</span>
                          <span className="text-[11px] text-slate-400">{b.subject || b.edition || 'General'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 font-semibold text-slate-700 dark:text-slate-300">{b.publisher || '—'}</td>
                    <td className="px-3 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{b.author}</td>
                    <td className="px-3 py-3.5">
                      <Badge variant={categoryBadgeVariant(b.category)}>{b.category}</Badge>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => openCopies(b)}
                        className={`font-black hover:underline ${b.availableCopies > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                        title="Manage Copies"
                      >
                        {b.availableCopies} / {b.totalCopies}
                      </button>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <Badge variant={b.availableCopies > 0 ? 'success' : 'danger'}>
                        {b.availableCopies > 0 ? 'Available' : 'Out of Stock'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button type="button" onClick={() => setViewBook(b)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-800 dark:text-slate-300" title="View Details">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => openCopies(b)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-800 dark:text-slate-300" title="Manage Copies">
                          <Layers className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => openEdit(b)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-800 dark:text-slate-300" title="Edit Book">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(b)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-600 dark:border-slate-800" title="Delete Book">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Server-side pagination */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800 sm:flex-row">
            <span className="text-[11px] font-bold text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} books
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => loadBooks(pagination.page - 1)}
                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-950"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadBooks(pagination.page + 1)}
                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-950"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingBook ? 'Edit Book Details' : 'Register New Book Catalog'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Book Title *</label>
              <input
                type="text"
                name="title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
                placeholder="e.g. A Brief History of Time"
              />
            </div>

            <div>
              <label className={labelClass}>Publisher *</label>
              <input
                type="text"
                name="publisher"
                required
                value={form.publisher}
                onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                className={inputClass}
                placeholder="e.g. Bantam Books"
              />
            </div>

            <div>
              <label className={labelClass}>Author Name *</label>
              <input
                type="text"
                name="author"
                required
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                className={inputClass}
                placeholder="e.g. Stephen Hawking"
              />
            </div>

            <div>
              <label className={labelClass}>Publication Year</label>
              <input
                type="number"
                name="publicationYear"
                value={form.publicationYear}
                onChange={(e) => setForm({ ...form, publicationYear: e.target.value })}
                placeholder="e.g. 2024"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Edition</label>
              <input
                type="text"
                name="edition"
                value={form.edition}
                onChange={(e) => setForm({ ...form, edition: e.target.value })}
                className={inputClass}
                placeholder="e.g. 10th Anniversary / 3rd Edition"
              />
            </div>

            <div>
              <label className={labelClass}>Language</label>
              <input
                type="text"
                name="language"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                placeholder="e.g. English, Hindi"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Category *</label>
              <select
                name="category"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Subject</label>
              <input
                type="text"
                name="subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className={inputClass}
                placeholder="e.g. Physics"
              />
            </div>

            <div>
              <label className={labelClass}>Book Cost (INR) *</label>
              <input
                type="number"
                name="price"
                min="0"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="e.g. 450"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Quantity Copies {!editingBook && '*'}</label>
              <input
                type="number"
                name="totalCopies"
                min="1"
                required={!editingBook}
                disabled={Boolean(editingBook)}
                value={form.totalCopies}
                onChange={(e) => setForm({ ...form, totalCopies: e.target.value })}
                placeholder="e.g. 1"
                className={inputClass}
              />
              {editingBook && (
                <p className="mt-1 text-3xs text-slate-400">
                  Manage individual copies from the Book Copies page.
                </p>
              )}
            </div>

            <div className="col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                rows={3}
                name="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Enter book summary, key topics covered, syllabus notes, or condition details..."
                className={`${inputClass} h-auto py-2.5`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setFormModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-bold text-white transition-all duration-150 shadow-xs disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingBook ? 'Update Book' : 'Save Book'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={!!viewBook} onClose={() => setViewBook(null)} title="Book Details" size="md">
        {viewBook && (
          <div className="space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{viewBook.title}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Author', viewBook.author],
                ['Publisher', viewBook.publisher || '—'],
                ['Category', viewBook.category],
                ['Subject', viewBook.subject || '—'],
                ['Edition', viewBook.edition || '—'],
                ['Publication Year', viewBook.publicationYear || '—'],
                ['Language', viewBook.language || '—'],
                ['Book Cost', `₹${viewBook.price || 0}`],
                ['Total Copies', viewBook.totalCopies],
                ['Available Copies', viewBook.availableCopies],
              ].map(([label, value]) => (
                <div key={label}>
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{value}</span>
                </div>
              ))}
            </div>
            {viewBook.description && (
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Description</span>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{viewBook.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Manage Copies Modal */}
      <Modal isOpen={!!copiesBook} onClose={() => setCopiesBook(null)} title={copiesBook ? `Manage Copies — ${copiesBook.title}` : ''} size="lg">
        {copiesBook && (
          <div className="space-y-4">
            <form onSubmit={handleAddCopy} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/40 sm:grid-cols-4">
              <input
                placeholder="Accession # (auto if blank)"
                value={newCopyForm.accessionNumber}
                onChange={(e) => setNewCopyForm({ ...newCopyForm, accessionNumber: e.target.value })}
                className={`${inputClass} h-9`}
              />
              <input
                placeholder="Barcode (optional)"
                value={newCopyForm.barcode}
                onChange={(e) => setNewCopyForm({ ...newCopyForm, barcode: e.target.value })}
                className={`${inputClass} h-9`}
              />
              <select value={newCopyForm.condition} onChange={(e) => setNewCopyForm({ ...newCopyForm, condition: e.target.value })} className={`${inputClass} h-9`}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="submit" disabled={savingCopy} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-60">
                <Plus className="h-3.5 w-3.5" /> Add Copy
              </button>
            </form>

            <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-slate-100 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">Accession #</th>
                    <th className="px-3 py-2.5 font-bold">Condition</th>
                    <th className="px-3 py-2.5 font-bold">Status</th>
                    <th className="px-3 py-2.5 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingCopies ? (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">Loading copies…</td></tr>
                  ) : copies.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">No physical copies registered yet.</td></tr>
                  ) : (
                    copies.map((c) => (
                      <tr key={c.id}>
                        <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">{c.accessionNumber}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{c.condition}</td>
                        <td className="px-3 py-2.5"><Badge variant={COPY_STATUS_BADGE[c.status] || 'default'}>{c.status}</Badge></td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            disabled={c.status === 'ISSUED'}
                            onClick={() => setDeleteCopyTarget(c)}
                            title={c.status === 'ISSUED' ? 'Cannot remove — currently issued' : 'Remove copy'}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-800"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Book"
        message={`Delete "${deleteTarget?.title}" from the catalog? This is only possible if no copies are issued or reserved.`}
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!deleteCopyTarget}
        onClose={() => setDeleteCopyTarget(null)}
        onConfirm={handleDeleteCopy}
        title="Remove Physical Copy"
        message={`Remove copy "${deleteCopyTarget?.accessionNumber}"? This cannot be undone.`}
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
};

export default LibraryBooks;

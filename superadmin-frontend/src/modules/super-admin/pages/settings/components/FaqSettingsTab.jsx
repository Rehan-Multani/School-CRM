import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ArrowUpDown,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button, Badge } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/Dialog';
import { showToast } from '../../../../../shared/ui/Toast';
import { platformFaqApi } from '../../../../../shared/api/client';

const CATEGORY_SUGGESTIONS = [
  'General',
  'Onboarding',
  'Security',
  'Mobile Apps',
  'Academics & Fees',
  'Hardware & IoT',
  'Payments',
];

const emptyForm = () => ({
  question: '',
  answer: '',
  category: 'General',
  order: 1,
  isActive: true,
});

export default function FaqSettingsTab() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete modal state
  const [deletingFaq, setDeletingFaq] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadFaqs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await platformFaqApi.list();
      setFaqs(res.items || res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load FAQs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  const uniqueCategories = useMemo(() => {
    const set = new Set();
    faqs.forEach((f) => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set);
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      if (statusFilter === 'active' && !faq.isActive) return false;
      if (statusFilter === 'inactive' && faq.isActive) return false;
      if (categoryFilter !== 'All' && faq.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesQ = faq.question?.toLowerCase().includes(q);
        const matchesA = faq.answer?.toLowerCase().includes(q);
        const matchesC = faq.category?.toLowerCase().includes(q);
        if (!matchesQ && !matchesA && !matchesC) return false;
      }
      return true;
    });
  }, [faqs, search, categoryFilter, statusFilter]);

  const handleOpenAdd = () => {
    setEditingFaq(null);
    setForm({
      ...emptyForm(),
      order: (faqs.length || 0) + 1,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (faq) => {
    setEditingFaq(faq);
    setForm({
      question: faq.question || '',
      answer: faq.answer || '',
      category: faq.category || 'General',
      order: faq.order ?? 0,
      isActive: faq.isActive ?? true,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.question.trim()) {
      setFormError('Question is required.');
      return;
    }
    if (!form.answer.trim()) {
      setFormError('Answer is required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingFaq) {
        await platformFaqApi.update(editingFaq.id || editingFaq._id, form);
        showToast('success', 'FAQ updated successfully');
      } else {
        await platformFaqApi.create(form);
        showToast('success', 'FAQ created successfully');
      }
      setModalOpen(false);
      loadFaqs();
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save FAQ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (faq) => {
    const id = faq.id || faq._id;
    const nextState = !faq.isActive;
    try {
      await platformFaqApi.update(id, { isActive: nextState });
      setFaqs((prev) =>
        prev.map((item) => ((item.id || item._id) === id ? { ...item, isActive: nextState } : item))
      );
      showToast('info', `FAQ ${nextState ? 'published' : 'moved to draft'}`);
    } catch (err) {
      showToast('error', err?.response?.data?.message || err?.message || 'Failed to update FAQ status');
    }
  };

  const handleDelete = async () => {
    if (!deletingFaq) return;
    setDeleting(true);
    try {
      const id = deletingFaq.id || deletingFaq._id;
      await platformFaqApi.remove(id);
      showToast('success', 'FAQ deleted successfully');
      setDeletingFaq(null);
      setFaqs((prev) => prev.filter((item) => (item.id || item._id) !== id));
    } catch (err) {
      showToast('error', err?.response?.data?.message || err?.message || 'Failed to delete FAQ');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Top Banner Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Frequently Asked Questions (Website FAQs)
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Add, edit, reorder and publish FAQs. Changes reflect dynamically in real time on the public landing website.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add New FAQ
          </Button>
        </div>

        {/* Filter bar */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search question, answer, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="All">All Categories ({faqs.length})</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="All">All Status</option>
              <option value="active">Active (Published on site)</option>
              <option value="inactive">Inactive (Draft / Hidden)</option>
            </select>
          </div>
        </div>
      </div>

      {/* FAQs List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 w-full animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-500/5 dark:text-rose-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h4 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">No FAQs found</h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {search || categoryFilter !== 'All' || statusFilter !== 'All'
                ? 'Try adjusting your search query or filter options.'
                : 'Click "Add New FAQ" to create the first question for your landing website.'}
            </p>
          </div>
        ) : (
          filteredFaqs.map((faq, index) => (
            <motion.div
              key={faq.id || faq._id || index}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2 flex-1 min-w-0 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      #{faq.order ?? index + 1}
                    </span>
                    <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {faq.category || 'General'}
                    </span>
                    {faq.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Live on site
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        Draft / Hidden
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {faq.question}
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                    {faq.answer}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 rounded-xl border border-slate-100 bg-slate-50/80 p-1 dark:border-slate-800 dark:bg-slate-800/60">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(faq)}
                    title={faq.isActive ? 'Hide from website (draft)' : 'Publish to website'}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                      faq.isActive
                        ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/15'
                        : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {faq.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(faq)}
                    title="Edit FAQ"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-indigo-400 transition"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingFaq(faq)}
                    title="Delete FAQ"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</DialogTitle>
            <DialogDescription>
              {editingFaq
                ? 'Update the question, answer, category, or publishing status.'
                : 'Create a new question and answer to display on the public landing page.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Question <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={500}
                placeholder="e.g. How long does onboarding and data migration take?"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Answer <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                maxLength={3000}
                placeholder="Provide a comprehensive and clear explanation..."
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 resize-y"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <input
                  type="text"
                  maxLength={100}
                  list="category-suggestions"
                  placeholder="e.g. Onboarding, Security"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <datalist id="category-suggestions">
                  {CATEGORY_SUGGESTIONS.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value, 10) || 1 })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Live Status</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  When active, this FAQ is immediately visible on the public website.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(val) => setForm({ ...form, isActive: val })}
                aria-label="Toggle active status"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {submitting ? (
                  <>
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {editingFaq ? 'Update FAQ' : 'Save FAQ'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deletingFaq)} onOpenChange={(open) => !open && setDeletingFaq(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete FAQ</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove this FAQ item?
            </DialogDescription>
          </DialogHeader>

          {deletingFaq && (
            <div className="space-y-3">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <p className="font-bold">{deletingFaq.question}</p>
                <p className="mt-1 line-clamp-2 text-rose-700 dark:text-rose-400">{deletingFaq.answer}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={deleting}
                  onClick={() => setDeletingFaq(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="gap-2"
                >
                  {deleting ? (
                    <>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Permanently
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

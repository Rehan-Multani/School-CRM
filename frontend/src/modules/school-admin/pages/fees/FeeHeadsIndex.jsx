import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { feePortalApi } from '../../../../shared/api/client';
import {
  Download,
  FileText,
  FileUp,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const CATEGORIES = ['ACADEMIC', 'TRANSPORT', 'HOSTEL', 'ACTIVITY', 'OTHER'];

const CATEGORY_COLORS = {
  ACADEMIC: 'primary',
  TRANSPORT: 'warning',
  HOSTEL: 'purple',
  ACTIVITY: 'success',
  OTHER: 'default',
};

const FEE_HEAD_CSV_SAMPLE = `name,code,category,description,status\nTuition Fee,TUITION,ACADEMIC,Regular academic tuition fee,ACTIVE\nAdmission Fee,ADMISSION,ACADEMIC,One-time admission charge,ACTIVE\nTransport Fee,TRANSPORT,TRANSPORT,Bus and van charges,ACTIVE\nHostel Fee,HOSTEL,HOSTEL,Boarding and lodging,ACTIVE`;

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportFeeHeadsCSV(heads) {
  const rows = [
    'name,code,category,description,status',
    ...heads.map((h) => [
      `"${(h.name || '').replace(/"/g, '""')}"`,
      `"${h.code || ''}"`,
      `"${h.category || ''}"`,
      `"${(h.description || '').replace(/"/g, '""')}"`,
      `"${h.status || ''}"`,
    ]),
  ];
  downloadFile(rows.join('\n'), 'fee_heads.csv', 'text/csv');
}

function parseFeeHeadCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, i) => (row[h] = cols[i] || ''));
      return {
        name: row.name,
        code: (row.code || row.name?.slice(0, 6) || '').toUpperCase(),
        category: CATEGORIES.includes((row.category || '').toUpperCase())
          ? row.category.toUpperCase()
          : 'ACADEMIC',
        description: row.description || '',
        status: (row.status || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      };
    })
    .filter((h) => Boolean(h.name));
}

export const FeeHeadsIndex = ({ hideHeader = false }) => {
  const { showToast, ToastComponent } = useToast();
  const importRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [feeHeads, setFeeHeads] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    category: 'ACADEMIC',
    description: '',
    status: 'ACTIVE',
  });

  const loadFeeHeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await feePortalApi.heads({ limit: 100 });
      setFeeHeads(res.data || []);
    } catch (error) {
      showToast(error.message || 'Unable to load fee heads', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadFeeHeads();
  }, [loadFeeHeads]);

  const statusCounts = useMemo(() => {
    return {
      ALL: feeHeads.length,
      ACTIVE: feeHeads.filter((h) => h.status === 'ACTIVE').length,
      INACTIVE: feeHeads.filter((h) => h.status === 'INACTIVE').length,
    };
  }, [feeHeads]);

  const filteredHeads = useMemo(() => {
    return feeHeads.filter((h) => {
      if (categoryFilter !== 'ALL' && h.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && h.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (h.name || '').toLowerCase().includes(q);
        const matchesCode = (h.code || '').toLowerCase().includes(q);
        const matchesDesc = (h.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDesc) return false;
      }
      return true;
    });
  }, [feeHeads, categoryFilter, statusFilter, searchQuery]);

  const handleNameChange = (name) => {
    const autoCode = name
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toUpperCase();
    setForm((prev) => ({
      ...prev,
      name,
      code: prev.code ? prev.code : autoCode,
    }));
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingHead) {
        await feePortalApi.updateHead(editingHead.id, form);
        showToast('Fee head updated successfully', 'success');
      } else {
        await feePortalApi.createHead(form);
        showToast('New fee head created successfully', 'success');
      }
      setModalOpen(false);
      setEditingHead(null);
      loadFeeHeads();
    } catch (error) {
      showToast(error.message || 'Failed to save fee head', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (head) => {
    setEditingHead(head);
    setForm({
      name: head.name,
      code: head.code,
      category: head.category,
      description: head.description || '',
      status: head.status || 'ACTIVE',
    });
    setModalOpen(true);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const items = parseFeeHeadCSV(text);
      if (items.length === 0) {
        showToast('CSV contains no valid fee head rows', 'error');
        return;
      }
      const res = await feePortalApi.bulkCreateHeads({ heads: items });
      showToast(res.message || `Imported ${items.length} fee heads successfully`, 'success');
      loadFeeHeads();
    } catch (error) {
      showToast(error.message || 'Failed to import fee heads CSV', 'error');
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await feePortalApi.deleteHead(deleteTarget.id);
      showToast('Fee head deleted', 'success');
      loadFeeHeads();
    } catch (error) {
      showToast(error.message || 'Unable to delete fee head', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const openCreateModal = () => {
    setEditingHead(null);
    setForm({ name: '', code: '', category: 'ACADEMIC', description: '', status: 'ACTIVE' });
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {!hideHeader && (
        <PageHeader
          title="Fee Heads Master"
          subtitle="Dynamic school-wide list of chargeable fee heads (Tuition, Exam, Transport, Activity, etc.)."
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Create Fee Head
              </button>
            </div>
          }
        />
      )}

      {/* Toolbar & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Left Side: Search + Category Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search head name or code..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-950">
            {[
              { id: 'ALL', label: 'All', count: statusCounts.ALL },
              { id: 'ACTIVE', label: 'Active', count: statusCounts.ACTIVE },
              { id: 'INACTIVE', label: 'Inactive', count: statusCounts.INACTIVE },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  statusFilter === item.id
                    ? 'bg-white text-primary shadow-sm dark:bg-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {item.label}{' '}
                <span className="text-[10px] opacity-75 font-semibold">({item.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: CSV Import/Export + Create Button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadFile(FEE_HEAD_CSV_SAMPLE, 'fee_heads_sample.csv', 'text/csv')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            title="Download CSV Template"
          >
            <Download className="h-3.5 w-3.5" /> Sample
          </button>

          <button
            type="button"
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 disabled:opacity-50"
            title="Import Fee Heads from CSV"
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Import
          </button>
          <input ref={importRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />

          {feeHeads.length > 0 && (
            <button
              type="button"
              onClick={() => exportFeeHeadsCSV(feeHeads)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              title="Export all fee heads to CSV"
            >
              <FileUp className="h-3.5 w-3.5" /> Export
            </button>
          )}

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Add Fee Head
          </button>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : filteredHeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ListChecks className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <h4 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
            No Fee Heads Found
          </h4>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Create fee heads like Tuition Fee, Admission Fee, Transport Fee to start building class fee structures.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Create First Fee Head
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Fee Head</th>
                  <th className="px-3 py-3 font-bold">Code</th>
                  <th className="px-3 py-3 text-center font-bold">Category</th>
                  <th className="px-4 py-3 font-bold">Description</th>
                  <th className="px-3 py-3 text-center font-bold">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHeads.map((head) => (
                  <tr
                    key={head.id}
                    className="group transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    {/* Head Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 font-bold">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {head.name}
                        </span>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-3 py-3.5">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                        {head.code}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3.5 text-center">
                      <Badge variant={CATEGORY_COLORS[head.category] || 'default'}>
                        {head.category}
                      </Badge>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                      {head.description || '—'}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5 text-center">
                      <Badge variant={head.status === 'ACTIVE' ? 'success' : 'default'}>
                        {head.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(head)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-800 dark:text-slate-300"
                          title="Edit Fee Head"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(head)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-600 dark:border-slate-800"
                          title="Delete Fee Head"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingHead(null);
        }}
        title={editingHead ? 'Edit Fee Head' : 'Create New Fee Head'}
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Fee Head Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Tuition Fee, Exam Fee, Transport Fee"
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Code *
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="TUITION"
                required
                className={`${inputClass} font-mono uppercase`}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Category *
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Standard monthly academic tuition fee billed per term."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
              <option value="ACTIVE">Active (Available for structure line items)</option>
              <option value="INACTIVE">Inactive (Hidden from new structures)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{editingHead ? 'Save Changes' : 'Create Fee Head'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Fee Head"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete Head"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default FeeHeadsIndex;

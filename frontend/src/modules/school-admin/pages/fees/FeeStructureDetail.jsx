import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { feePortalApi } from '../../../../shared/api/client';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Calendar, CheckCircle2, DollarSign, HelpCircle, Loader2, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { DetailPageSkeleton } from '../../components/ui/SkeletonLoader';

const inputClass =
  'h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const FREQUENCIES = [
  { id: 'ONE_TIME', label: 'One Time (Admission/Deposit)' },
  { id: 'MONTHLY', label: 'Monthly' },
  { id: 'QUARTERLY', label: 'Quarterly (Every 3 Months)' },
  { id: 'HALF_YEARLY', label: 'Half-Yearly (Every 6 Months)' },
  { id: 'YEARLY', label: 'Annual / Yearly' },
];

const FREQUENCY_COLORS = {
  ONE_TIME: 'default',
  MONTHLY: 'primary',
  QUARTERLY: 'warning',
  HALF_YEARLY: 'purple',
  YEARLY: 'success',
};

export const FeeStructureDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(true);
  const [structure, setStructure] = useState(null);
  const [availableHeads, setAvailableHeads] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    feeHeadId: '',
    amount: '',
    frequency: 'MONTHLY',
    dueDay: 10,
    isOptional: false,
  });

  const loadStructureDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [stRes, headsRes] = await Promise.all([
        feePortalApi.getStructure(id),
        feePortalApi.heads({ limit: 100, status: 'ACTIVE' }),
      ]);
      setStructure(stRes.data || null);
      setAvailableHeads(headsRes.data || []);
    } catch (error) {
      showToast(error.message || 'Failed to load structure details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadStructureDetails();
  }, [loadStructureDetails]);

  // Compute stats
  const stats = useMemo(() => {
    if (!structure?.items) return { monthly: 0, annual: 0, mandatory: 0, optional: 0 };
    let monthly = 0;
    let annual = 0;
    let mandatory = 0;
    let optional = 0;

    structure.items.forEach((item) => {
      const amt = Number(item.amount) || 0;
      if (item.isOptional) {
        optional++;
      } else {
        mandatory++;
        if (item.frequency === 'MONTHLY') {
          monthly += amt;
          annual += amt * 12;
        } else if (item.frequency === 'QUARTERLY') {
          annual += amt * 4;
        } else if (item.frequency === 'HALF_YEARLY') {
          annual += amt * 2;
        } else if (item.frequency === 'YEARLY' || item.frequency === 'ONE_TIME') {
          annual += amt;
        }
      }
    });

    return { monthly, annual, mandatory, optional };
  }, [structure]);

  // Filter out already added fee heads when adding new item
  const unassignedHeads = useMemo(() => {
    if (!structure?.items) return availableHeads;
    const assignedHeadIds = new Set(structure.items.map((i) => i.feeHead?.id || i.feeHeadId));
    return availableHeads.filter((h) => !assignedHeadIds.has(h.id));
  }, [availableHeads, structure]);

  const handleCreateOrUpdateItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        await feePortalApi.updateStructureItem(editingItem.id, {
          amount: Number(form.amount),
          frequency: form.frequency,
          dueDay: Number(form.dueDay),
          isOptional: Boolean(form.isOptional),
        });
        showToast('Fee line item updated', 'success');
      } else {
        await feePortalApi.addStructureItem(id, {
          feeHeadId: form.feeHeadId,
          amount: Number(form.amount),
          frequency: form.frequency,
          dueDay: Number(form.dueDay),
          isOptional: Boolean(form.isOptional),
        });
        showToast('Fee line item added to structure', 'success');
      }
      setModalOpen(false);
      setEditingItem(null);
      loadStructureDetails();
    } catch (error) {
      showToast(error.message || 'Failed to save fee item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setForm({
      feeHeadId: item.feeHead?.id || item.feeHeadId,
      amount: item.amount,
      frequency: item.frequency || 'MONTHLY',
      dueDay: item.dueDay || 10,
      isOptional: Boolean(item.isOptional),
    });
    setModalOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;
    try {
      await feePortalApi.deleteStructureItem(deleteTarget.id);
      showToast('Fee line item removed', 'success');
      loadStructureDetails();
    } catch (error) {
      showToast(error.message || 'Unable to delete fee item', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    setForm({
      feeHeadId: unassignedHeads[0]?.id || '',
      amount: '',
      frequency: 'MONTHLY',
      dueDay: 10,
      isOptional: false,
    });
    setModalOpen(true);
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (!structure) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Fee structure not found</p>
        <button
          type="button"
          onClick={() => navigate('/school-admin/fees/structures')}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
        >
          Back to Fee Structures
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => navigate('/school-admin/fees/structures')}
          className="flex items-center gap-1 font-semibold hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Class Fee Structures
        </button>
        <span>/</span>
        <span className="font-bold text-slate-800 dark:text-slate-200">{structure.name}</span>
      </div>

      <PageHeader
        title={structure.name}
        subtitle={`${structure.class?.name || 'Class'} • ${structure.academicYear?.name || 'Academic Session'} • Status: ${structure.status}`}
        actions={
          <button
            type="button"
            onClick={openAddItemModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Add Fee Component
          </button>
        }
      />

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Monthly Mandatory</span>
              <p className="text-lg font-extrabold text-slate-800 dark:text-white">{formatCurrency(stats.monthly)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Annual Est. Payable</span>
              <p className="text-lg font-extrabold text-emerald-600">{formatCurrency(stats.annual)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mandatory Items</span>
              <p className="text-lg font-extrabold text-purple-600">{stats.mandatory} Heads</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Optional Charges</span>
              <p className="text-lg font-extrabold text-amber-600">{stats.optional} (Transport/Hostel)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Items Table */}
      {structure.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Wallet className="h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No fee line items attached yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Add components like Tuition Fee (Monthly), Exam Fee (Quarterly), Admission Fee (One-Time) to complete this structure.
          </p>
          <button
            type="button"
            onClick={openAddItemModal}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            + Add First Fee Component
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
              <tr>
                {['#', 'Fee Component', 'Category', 'Amount (₹)', 'Frequency', 'Due Day', 'Obligation', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-center font-bold text-slate-500 dark:text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {structure.items.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-50 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                  <td className="px-4 py-3.5 text-center font-semibold text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3.5 text-center font-bold text-slate-800 dark:text-white">
                    {item.feeHead?.name || 'Fee Head'}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge variant="default">{item.feeHead?.category || 'ACADEMIC'}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge variant={FREQUENCY_COLORS[item.frequency] || 'default'}>{item.frequency}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-slate-600 dark:text-slate-400">
                    {item.dueDay}th of month
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {item.isOptional ? (
                      <span className="inline-flex items-center rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        Optional (Opt-In)
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Mandatory
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditItem(item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-primary hover:text-primary dark:border-slate-700"
                        title="Edit Amount or Schedule"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-rose-500 hover:border-rose-300 hover:bg-rose-50 dark:border-slate-700 dark:hover:bg-rose-950/20"
                        title="Remove Component"
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
      )}

      {/* Add / Edit Line Item Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Edit Fee Item' : 'Add Fee Head to Structure'}
      >
        <form onSubmit={handleCreateOrUpdateItem} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Fee Head *</label>
            {editingItem ? (
              <input className={inputClass} value={editingItem.feeHead?.name || ''} disabled />
            ) : (
              <select
                className={inputClass}
                value={form.feeHeadId}
                onChange={(e) => setForm({ ...form, feeHeadId: e.target.value })}
                required
              >
                <option value="" disabled>
                  Select Fee Head
                </option>
                {unassignedHeads.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.category})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Amount (₹) *</label>
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g. 2000"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Collection Frequency *</label>
              <select
                className={inputClass}
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                required
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Due Day of Month (1-28)</label>
              <input
                type="number"
                min="1"
                max="28"
                className={inputClass}
                value={form.dueDay}
                onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) })}
                required
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={form.isOptional}
                  onChange={(e) => setForm({ ...form, isOptional: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Optional Fee (e.g. Transport/Hostel)
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingItem ? 'Update Fee Item' : 'Add Fee Item'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteItem}
        title="Remove Fee Component"
        message={`Remove "${deleteTarget?.feeHead?.name || 'Fee Head'}" from this fee structure?`}
        confirmText="Remove Component"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default FeeStructureDetail;

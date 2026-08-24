import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { academicPortalApi, feePortalApi } from '../../../../shared/api/client';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  ChevronRight,
  Filter,
  GraduationCap,
  Layers,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';

export const FeeStructuresIndex = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(true);
  const [structures, setStructures] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Dynamic Year-Specific Classes State
  const [yearClasses, setYearClasses] = useState([]);
  const [loadingYearClasses, setLoadingYearClasses] = useState(false);

  const [form, setForm] = useState({
    academicYearId: '',
    classId: '',
    name: '',
    description: '',
    status: 'ACTIVE',
  });

  // Load reference Academic Years
  useEffect(() => {
    academicPortalApi
      .years({ limit: 100 })
      .then((yRes) => {
        const yearList = yRes.data || [];
        setYears(yearList);
      })
      .catch(() => {});
  }, []);

  const loadStructures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await feePortalApi.structures({
        academicYearId: selectedYear || undefined,
        limit: 100,
      });
      setStructures(res.data || []);
    } catch (error) {
      showToast(error.message || 'Unable to load fee structures', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, showToast]);

  useEffect(() => {
    loadStructures();
  }, [loadStructures]);

  // Fetch classes specifically mapped to the chosen Academic Year
  const fetchClassesForYear = useCallback(async (yearId) => {
    if (!yearId) {
      setYearClasses([]);
      return [];
    }
    setLoadingYearClasses(true);
    try {
      const res = await academicPortalApi.yearClasses(yearId);
      const list = res.data || [];
      const normalized = list.map((item) => ({
        id: item.classId || item.class?.id || item.id,
        name: item.class?.name || item.name || 'Class',
        code: item.class?.code || item.code || '',
      }));
      setYearClasses(normalized);
      return normalized;
    } catch {
      setYearClasses([]);
      return [];
    } finally {
      setLoadingYearClasses(false);
    }
  }, []);

  const statusCounts = useMemo(() => {
    return {
      ALL: structures.length,
      ACTIVE: structures.filter((s) => s.status === 'ACTIVE').length,
      DRAFT: structures.filter((s) => s.status === 'DRAFT').length,
      INACTIVE: structures.filter((s) => s.status === 'INACTIVE').length,
    };
  }, [structures]);

  const filteredStructures = useMemo(() => {
    return structures.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesClass = (s.class?.name || '').toLowerCase().includes(q);
        const matchesYear = (s.academicYear?.name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesClass && !matchesYear) return false;
      }
      return true;
    });
  }, [structures, statusFilter, searchQuery]);

  const handleYearChange = async (academicYearId) => {
    const yrObj = years.find((y) => y.id === academicYearId);
    setForm((prev) => ({ ...prev, academicYearId, classId: '' }));

    const classesForThisYear = await fetchClassesForYear(academicYearId);
    const firstCls = classesForThisYear?.[0];
    const autoName = firstCls && yrObj ? `${firstCls.name} - ${yrObj.name} Fee Structure` : '';

    setForm((prev) => ({
      ...prev,
      academicYearId,
      classId: firstCls?.id || '',
      name: autoName || prev.name,
    }));
  };

  const handleClassChange = (classId) => {
    const clsObj = yearClasses.find((c) => c.id === classId);
    const yrObj = years.find((y) => y.id === (form.academicYearId || selectedYear));
    const autoName = clsObj && yrObj ? `${clsObj.name} - ${yrObj.name} Fee Structure` : form.name;
    setForm((prev) => ({ ...prev, classId, name: autoName }));
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (!form.classId) {
      showToast('Please select a target class for this academic year', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingStructure) {
        await feePortalApi.updateStructure(editingStructure.id, {
          name: form.name,
          description: form.description,
          status: form.status,
        });
        showToast('Fee structure updated', 'success');
      } else {
        const res = await feePortalApi.createStructure({
          ...form,
          academicYearId: form.academicYearId || selectedYear,
        });
        showToast('Fee structure created! Now configure fee line items.', 'success');
        navigate(`/school-admin/fees/structures/${res.data.id}`);
      }
      setModalOpen(false);
      setEditingStructure(null);
      loadStructures();
    } catch (error) {
      showToast(error.message || 'Failed to save fee structure', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (structure) => {
    setEditingStructure(structure);
    const yearId = structure.academicYear?.id || structure.academicYearId || '';
    const classId = structure.class?.id || structure.classId || '';

    setForm({
      academicYearId: yearId,
      classId,
      name: structure.name || '',
      description: structure.description || '',
      status: structure.status || 'ACTIVE',
    });
    setModalOpen(true);

    if (yearId) {
      await fetchClassesForYear(yearId);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await feePortalApi.deleteStructure(deleteTarget.id);
      showToast('Fee structure and items deleted', 'success');
      loadStructures();
    } catch (error) {
      showToast(error.message || 'Unable to delete fee structure', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const openCreateModal = async () => {
    const defaultYearId = selectedYear || years.find((y) => y.isCurrent)?.id || years[0]?.id || '';
    const yrObj = years.find((y) => y.id === defaultYearId);

    setEditingStructure(null);
    setForm({
      academicYearId: defaultYearId,
      classId: '',
      name: '',
      description: '',
      status: 'ACTIVE',
    });
    setModalOpen(true);

    if (defaultYearId) {
      const classesForThisYear = await fetchClassesForYear(defaultYearId);
      const firstClass = classesForThisYear?.[0];
      const defaultName = firstClass && yrObj ? `${firstClass.name} - ${yrObj.name} Fee Structure` : '';
      setForm((prev) => ({
        ...prev,
        academicYearId: defaultYearId,
        classId: firstClass?.id || '',
        name: defaultName,
      }));
    }
  };

  return (
    <div className="space-y-5">
      {!hideHeader && (
        <PageHeader
          title="Class Fee Structures"
          subtitle="Manage dynamic fee line items and charge schedules configured per Class and Academic Year."
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Create Fee Structure
              </button>
            </div>
          }
        />
      )}

      {/* Toolbar & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Left Side: Search + Academic Year */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search structure or class..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
            >
              <option value="">All Academic Years</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Side: Status Filter Pills + Create Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-950">
            {[
              { id: 'ALL', label: 'All', count: statusCounts.ALL },
              { id: 'ACTIVE', label: 'Active', count: statusCounts.ACTIVE },
              { id: 'DRAFT', label: 'Draft', count: statusCounts.DRAFT },
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

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Create Structure
          </button>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : filteredStructures.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Layers className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <h4 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
            No Fee Structures Found
          </h4>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Create fee structures for classes (e.g. Class 10 - 2026-27) and attach tuition, exam, and other line items.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Create First Fee Structure
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Structure Name</th>
                  <th className="px-3 py-3 font-bold">Target Class</th>
                  <th className="px-3 py-3 font-bold">Academic Session</th>
                  <th className="px-3 py-3 text-center font-bold">Configured Fees</th>
                  <th className="px-3 py-3 text-center font-bold">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStructures.map((st) => (
                  <tr
                    key={st.id}
                    className="group transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    {/* Structure Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => navigate(`/school-admin/fees/structures/${st.id}`)}
                            className="font-bold text-slate-900 hover:text-primary transition dark:text-white"
                          >
                            {st.name}
                          </button>
                          {st.description && (
                            <span className="block text-[11px] text-slate-400 line-clamp-1">
                              {st.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Class */}
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {st.class?.name || 'All Classes'}
                        </span>
                      </div>
                    </td>

                    {/* Academic Session */}
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {st.academicYear?.name || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Line Items Count */}
                    <td className="px-3 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                        {st.itemsCount || 0} Line Items
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5 text-center">
                      <Badge
                        variant={
                          st.status === 'ACTIVE'
                            ? 'success'
                            : st.status === 'DRAFT'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {st.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/school-admin/fees/structures/${st.id}`)}
                          className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-white"
                          title="Configure Fee Line Items"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          <span>Setup Fees</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(st)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-800 dark:text-slate-300"
                          title="Edit Structure"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(st)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-600 dark:border-slate-800"
                          title="Delete Structure"
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
        onClose={() => setModalOpen(false)}
        title={editingStructure ? 'Edit Fee Structure' : 'Create Class Fee Structure'}
        size="lg"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Academic Session */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Academic Session *
              </label>
              <select
                value={form.academicYearId || selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                required
                disabled={Boolean(editingStructure)}
                className={inputClass}
              >
                <option value="">-- Select Academic Year --</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Class (Filtered dynamically by chosen academic year) */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Class *
              </label>
              {loadingYearClasses ? (
                <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Loading classes for this session...
                </div>
              ) : (
                <select
                  value={form.classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  required
                  disabled={Boolean(editingStructure) || yearClasses.length === 0}
                  className={inputClass}
                >
                  <option value="">
                    {yearClasses.length === 0
                      ? '-- No classes mapped to this session --'
                      : '-- Select Target Class --'}
                  </option>
                  {yearClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {form.academicYearId && yearClasses.length === 0 && !loadingYearClasses && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  No classes mapped to this session. Please add classes in Academics first.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Structure Title / Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Class 10 - Annual Fee Structure 2026-27"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Standard comprehensive fee schedule for secondary school."
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
              <option value="ACTIVE">Active (Ready to attach items & invoice)</option>
              <option value="DRAFT">Draft (Under configuration)</option>
              <option value="INACTIVE">Inactive (Archived)</option>
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
              disabled={saving || yearClasses.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{editingStructure ? 'Save Changes' : 'Create & Configure Items'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Fee Structure"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All attached line items and configurations will be removed.`}
        confirmLabel="Delete Structure"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default FeeStructuresIndex;

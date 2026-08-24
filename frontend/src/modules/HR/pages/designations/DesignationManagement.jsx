import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import {
  Contact,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Power,
  Users,
  Building,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs font-semibold outline-none transition focus:border-indigo-600 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const createEmptyForm = () => ({
  title: '',
  departmentId: '',
  description: '',
  status: 'ACTIVE',
});

export const DesignationManagement = () => {
  const { showToast, ToastComponent } = useToast();

  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState(null);
  const [form, setForm] = useState(createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [desigRes, deptRes, empRes] = await Promise.all([
        hrApi.designations(),
        hrApi.departments(),
        hrApi.employees({ limit: 300 }),
      ]);
      setDesignations(desigRes.data || []);
      setDepartments(deptRes.data || []);
      setEmployees(empRes.data || []);
    } catch {
      showToast('Unable to load designations', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingDesig(null);
    setForm(createEmptyForm());
    setModalOpen(true);
  };

  const handleOpenEdit = (desig) => {
    setEditingDesig(desig);
    setForm({
      title: desig.title || '',
      departmentId: desig.departmentId || desig.departmentId?._id || '',
      description: desig.description || '',
      status: desig.status || 'ACTIVE',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Designation title is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const selectedDept = departments.find((d) => d.id === form.departmentId);
      const payload = {
        title: form.title.trim(),
        departmentId: form.departmentId || null,
        departmentName: selectedDept ? selectedDept.name : '',
        level: 1,
        description: form.description.trim(),
        status: form.status,
      };

      if (editingDesig) {
        await hrApi.updateDesignation(editingDesig.id, payload);
        showToast(`Designation "${form.title}" updated successfully`, 'success');
      } else {
        await hrApi.createDesignation(payload);
        showToast(`Designation "${form.title}" created successfully`, 'success');
      }
      setModalOpen(false);
      loadData();
    } catch (error) {
      showToast(error?.response?.data?.message || 'Unable to save designation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (desig) => {
    const nextStatus = desig.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await hrApi.updateDesignation(desig.id, { status: nextStatus });
      showToast(`Designation ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'success');
      loadData();
    } catch {
      showToast('Unable to update designation status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hrApi.deleteDesignation(deleteTarget.id);
      showToast('Designation deleted successfully', 'success');
      setDeleteTarget(null);
      loadData();
    } catch {
      showToast('Unable to delete designation', 'error');
    }
  };

  // Compute live count of employees per designation
  const designationCounts = useMemo(() => {
    const counts = {};
    employees.forEach((emp) => {
      if (emp.designation) {
        counts[emp.designation] = (counts[emp.designation] || 0) + 1;
      }
    });
    return counts;
  }, [employees]);

  const filteredDesignations = useMemo(() => {
    return designations.filter((d) => {
      const matchesSearch =
        !searchTerm ||
        (d.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.departmentName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept =
        filterDept === 'ALL' ||
        d.departmentId === filterDept ||
        d.departmentName === filterDept;

      const matchesStatus = filterStatus === 'ALL' || d.status === filterStatus;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [designations, searchTerm, filterDept, filterStatus]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Designation Management"
        subtitle="Create and manage staff designations. These appear as a mandatory dropdown when adding Teachers or Staff."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Designation</span>
            </button>
          </div>
        }
      />

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search designations by title or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white pl-9.5 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none text-xs font-semibold"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <SkeletonTable rows={5} columns={5} />
        ) : filteredDesignations.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Contact className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Designations Configured</h3>
            <p className="text-xs max-w-sm mx-auto">Click "Add Designation" above to configure your first job title.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Designation Title</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Assigned Staff</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {filteredDesignations.map((desig) => {
                  const count = designationCounts[desig.title] || desig.employeeCount || 0;
                  const isActive = desig.status !== 'INACTIVE';

                  return (
                    <tr key={desig.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200 dark:border-indigo-800">
                            <Contact className="w-4 h-4" />
                          </div>
                          <span>{desig.title}</span>
                        </div>
                      </td>

                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        {desig.departmentName ? (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{desig.departmentName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">General</span>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold">
                          <Users className="w-3 h-3" />
                          <span>{count} Staff</span>
                        </span>
                      </td>

                      <td className="p-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {desig.description || '-'}
                      </td>

                      <td className="p-4">
                        <Badge variant={isActive ? 'success' : 'default'}>
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(desig)}
                            className={`rounded-lg p-1.5 transition-colors ${
                              isActive
                                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={isActive ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(desig)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(desig)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Designation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDesig ? 'Edit Designation' : 'Add New Designation'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left text-xs font-semibold">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Designation Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Senior Mathematics Teacher"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Department
              </label>
              <select
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className={inputClass}
              >
                <option value="">-- Optional --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inputClass}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of responsibilities..."
              className={`${inputClass} resize-y`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Saving...' : editingDesig ? 'Update Designation' : 'Create Designation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Designation"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? Staff holding this designation will remain unclassified until updated.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmVariant="danger"
        confirmText="Delete"
      />

      <ToastComponent />
    </div>
  );
};

export default DesignationManagement;

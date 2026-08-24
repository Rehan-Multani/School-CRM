import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import {
  Building,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Power,
  Users,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs font-semibold outline-none transition focus:border-indigo-600 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const createEmptyForm = () => ({
  name: '',
  code: '',
  description: '',
  status: 'ACTIVE',
});

export const DepartmentManagement = () => {
  const { showToast, ToastComponent } = useToast();

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState(createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, empRes] = await Promise.all([
        hrApi.departments(),
        hrApi.employees({ limit: 300 }),
      ]);
      setDepartments(deptRes.data || []);
      setEmployees(empRes.data || []);
    } catch {
      showToast('Unable to load departments', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleOpenCreate = () => {
    setEditingDept(null);
    setForm(createEmptyForm());
    setModalOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setForm({
      name: dept.name || '',
      code: dept.code || '',
      description: dept.description || '',
      status: dept.status || 'ACTIVE',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Department name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase() || form.name.slice(0, 3).toUpperCase(),
        description: form.description.trim(),
        status: form.status,
      };

      if (editingDept) {
        await hrApi.updateDepartment(editingDept.id, payload);
        showToast(`Department "${form.name}" updated successfully`, 'success');
      } else {
        await hrApi.createDepartment(payload);
        showToast(`Department "${form.name}" created successfully`, 'success');
      }
      setModalOpen(false);
      loadDepartments();
    } catch (error) {
      showToast(error?.response?.data?.message || 'Unable to save department', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (dept) => {
    const nextStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await hrApi.updateDepartment(dept.id, { status: nextStatus });
      showToast(`Department ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'success');
      loadDepartments();
    } catch {
      showToast('Unable to update department status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hrApi.deleteDepartment(deleteTarget.id);
      showToast('Department deleted successfully', 'success');
      setDeleteTarget(null);
      loadDepartments();
    } catch {
      showToast('Unable to delete department', 'error');
    }
  };

  // Compute live employee counts per department
  const departmentCounts = useMemo(() => {
    const counts = {};
    employees.forEach((emp) => {
      if (emp.department) {
        counts[emp.department] = (counts[emp.department] || 0) + 1;
      }
    });
    return counts;
  }, [employees]);

  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const matchesSearch =
        !searchTerm ||
        d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.code?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'ALL' || d.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [departments, searchTerm, filterStatus]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Department Management"
        subtitle="Create and manage school departments. These appear as a mandatory dropdown when adding Teachers or Staff."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadDepartments}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Department</span>
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
            placeholder="Search departments by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white pl-9.5 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none text-xs font-semibold"
          />
        </div>

        <div className="flex items-center gap-2">
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
        ) : filteredDepartments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Building className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Departments Configured</h3>
            <p className="text-xs max-w-sm mx-auto">Click "Add Department" above to configure your first institutional division.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Department Name</th>
                  <th className="p-4">Code</th>
                  <th className="p-4">Assigned Staff</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {filteredDepartments.map((dept) => {
                  const memberCount = departmentCounts[dept.name] || dept.employeeCount || 0;
                  const isActive = dept.status !== 'INACTIVE';

                  return (
                    <tr key={dept.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200 dark:border-indigo-800">
                            <Building className="w-4 h-4" />
                          </div>
                          <span>{dept.name}</span>
                        </div>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs">
                          {dept.code || '-'}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold">
                          <Users className="w-3 h-3" />
                          <span>{memberCount} Staff</span>
                        </span>
                      </td>

                      <td className="p-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {dept.description || '-'}
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
                            onClick={() => handleToggleStatus(dept)}
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
                            onClick={() => handleOpenEdit(dept)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(dept)}
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

      {/* Add / Edit Department Modal (Exact Fields Matching School Admin) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDept ? 'Edit Department' : 'Add New Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left text-xs font-semibold">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Science & Technology"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Department Code
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SCI"
                className={`${inputClass} uppercase`}
              />
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
              placeholder="Brief description of department scope..."
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
              {saving ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Department"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Staff assigned to this department will not be deleted but may need reassignment.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmVariant="danger"
        confirmText="Delete"
      />

      <ToastComponent />
    </div>
  );
};

export default DepartmentManagement;

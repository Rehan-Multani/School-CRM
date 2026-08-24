import React, { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { Building2, Plus, Pencil, Trash2, Power, RefreshCw, Users } from 'lucide-react';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs font-semibold outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const createEmptyForm = () => ({
  name: '',
  code: '',
  description: '',
  status: 'ACTIVE',
});

export const DepartmentManagement = () => {
  const { showToast, ToastComponent } = useToast();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState(createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hrApi.departments();
      setDepartments(res.data || []);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load departments'), 'error');
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
        code: form.code.trim() || form.name.slice(0, 3).toUpperCase(),
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
      showToast(apiMessage(error, 'Unable to save department'), 'error');
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
    } catch (error) {
      showToast(apiMessage(error, 'Unable to update department status'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hrApi.deleteDepartment(deleteTarget.id);
      showToast('Department deleted successfully', 'success');
      setDeleteTarget(null);
      loadDepartments();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to delete department'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Management"
        subtitle="Create and manage school departments. These appear as a mandatory dropdown when adding Teachers or Staff."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadDepartments}
              className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Add Department
            </button>
          </div>
        }
      />

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <SkeletonTable rows={5} columns={5} />
        ) : departments.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
            <h3 className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">No Departments Configured</h3>
            <p className="mt-1 text-xs text-slate-400">
              Create departments like Science, Administration, Accounts, or Sports.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Add First Department
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Department</th>
                  <th className="px-3 py-3 font-bold">Code</th>
                  <th className="px-3 py-3 font-bold">Description</th>
                  <th className="px-3 py-3 font-bold">Staff</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {departments.map((dept) => (
                  <tr key={dept.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-primary/10 p-2 text-primary">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-bold uppercase text-slate-500">{dept.code || '—'}</td>
                    <td className="px-3 py-3 max-w-xs truncate text-slate-500">{dept.description || '—'}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                        <Users className="h-3.5 w-3.5" /> {dept.employeeCount || 0}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={dept.status === 'ACTIVE' ? 'success' : 'default'}>{dept.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(dept)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            dept.status === 'ACTIVE'
                              ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={dept.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(dept)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDept ? 'Edit Department' : 'Add New Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Department Name *</label>
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
              <label className="mb-1 block text-[11px] font-bold text-slate-500">Department Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SCI"
                className={`${inputClass} uppercase`}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">Status</label>
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
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Description</label>
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
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import {
  Contact,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  Search,
  Power,
  Building,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs font-semibold outline-none transition focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';

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
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState(null);
  const [form, setForm] = useState(createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [desigRes, deptRes] = await Promise.all([hrApi.designations(), hrApi.departments()]);
      setDesignations(desigRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load designations'), 'error');
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
      departmentId: desig.departmentId || '',
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
      showToast(apiMessage(error, 'Unable to save designation'), 'error');
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
    } catch (error) {
      showToast(apiMessage(error, 'Unable to update designation status'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hrApi.deleteDesignation(deleteTarget.id);
      showToast('Designation deleted successfully', 'success');
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to delete designation'), 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Designation Master"
        subtitle="Manage official teacher and staff designations used across the institution."
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
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Designation</span>
            </button>
          </div>
        }
      />

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <SkeletonTable rows={5} columns={4} />
        ) : designations.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Contact className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Designations Configured</h3>
            <p className="text-xs max-w-sm mx-auto">Click "Add Designation" above to configure your first job title.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Designation</th>
                  <th className="px-3 py-3 font-bold">Department</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {designations.map((desig) => (
                  <tr key={desig.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-primary/10 p-2 text-primary">
                          <Contact className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{desig.title}</span>
                          {desig.description && (
                            <span className="text-[11px] text-slate-400 line-clamp-1">{desig.description}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {desig.departmentName || 'General / Unassigned'}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={desig.status === 'ACTIVE' ? 'success' : 'default'}>{desig.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(desig)}
                          className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                            desig.status === 'ACTIVE'
                              ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={desig.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(desig)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800 cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(desig)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 cursor-pointer"
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
        title={editingDesig ? 'Edit Designation' : 'Add New Designation'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Designation Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Senior Mathematics Teacher"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Department Link</label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              className={inputClass}
            >
              <option value="">General / All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
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

          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Role Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Responsibilities overview..."
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
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Saving...' : editingDesig ? 'Update Designation' : 'Create Designation'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Designation"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmText="Delete"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default DesignationManagement;

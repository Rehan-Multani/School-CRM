import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { rolesApi, schoolUserApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { Shield, Plus, Pencil, Trash2, Lock, Users } from 'lucide-react';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white';

export const RolesAndPermissions = () => {
  const { showToast, ToastComponent } = useToast();
  const [tab, setTab] = useState('roles');
  const [catalogue, setCatalogue] = useState({ modules: [], all: [] });
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [assigning, setAssigning] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, rolesRes, usersRes] = await Promise.all([
        rolesApi.catalogue(),
        rolesApi.list(),
        schoolUserApi.list({ limit: 300 }).catch(() => ({ data: [] })),
      ]);
      setCatalogue(catRes?.data || { modules: [], all: [] });
      setRoles(rolesRes?.data || []);
      setUsers(usersRes?.data || []);
    } catch (err) {
      setError(apiMessage(err, 'Unable to load roles'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', permissions: [] });
    setModal(true);
  };
  const openEdit = (role) => {
    setEditing(role);
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions?.includes('*') ? catalogue.all : role.permissions || [],
    });
    setModal(true);
  };

  const togglePerm = (perm) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  const toggleModule = (mod) => {
    const modPerms = mod.actions.map((a) => `${mod.key}.${a}`);
    const allOn = modPerms.every((p) => form.permissions.includes(p));
    setForm((f) => ({
      ...f,
      permissions: allOn
        ? f.permissions.filter((p) => !modPerms.includes(p))
        : [...new Set([...f.permissions, ...modPerms])],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Role name is required', 'error');
    setSaving(true);
    try {
      if (editing) {
        await rolesApi.update(editing.id, { name: form.name, description: form.description, permissions: form.permissions });
        showToast('Role updated', 'success');
      } else {
        await rolesApi.create({ name: form.name, description: form.description, permissions: form.permissions });
        showToast('Role created', 'success');
      }
      setModal(false);
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to save role'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await rolesApi.remove(deleteTarget.id);
      showToast('Role deleted', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to delete role'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const assignRole = async (userId, roleId) => {
    setAssigning(userId);
    try {
      await rolesApi.assignUser(userId, roleId || null);
      showToast(roleId ? 'Role assigned' : 'Role cleared', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to assign role'), 'error');
    } finally {
      setAssigning(null);
    }
  };

  const customCount = roles.filter((r) => !r.isSystem).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Define custom roles, tune the permission matrix, and assign roles to staff accounts."
        actions={
          tab === 'roles' && (
            <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white">
              <Plus className="h-3.5 w-3.5" /> Create Role
            </button>
          )
        }
      />

      <Tabs
        tabs={[
          { id: 'roles', label: 'Roles', count: roles.length },
          { id: 'assign', label: 'Assign to Users', count: users.length },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/60 p-10 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button type="button" onClick={load} className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          Loading…
        </div>
      ) : tab === 'roles' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <div key={r.id} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                      {r.name}
                      {r.isSystem && <Lock className="h-3 w-3 text-slate-400" />}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{r.key}</span>
                  </div>
                </div>
                <Badge variant={r.isSystem ? 'default' : 'primary'}>{r.isSystem ? 'System' : 'Custom'}</Badge>
              </div>
              {r.description && <p className="mb-3 text-[11px] text-slate-400">{r.description}</p>}
              <div className="mb-3 flex flex-wrap gap-1">
                {r.permissions?.includes('*') ? (
                  <Badge variant="success">All permissions</Badge>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500">
                    {r.permissions?.length || 0} permission{(r.permissions?.length || 0) === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                  <Users className="h-3 w-3" /> {r.userCount} user{r.userCount === 1 ? '' : 's'}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
                    title={r.isSystem ? 'Edit permissions' : 'Edit'}
                  >
                    <Pencil size={14} />
                  </button>
                  {!r.isSystem && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(r)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
              <tr>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Base Role</th>
                <th className="px-4 py-3">Assigned Custom Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-xs font-semibold text-slate-400">
                    No staff accounts yet.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/30">
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-900 dark:text-white">{u.name || `${u.firstName || ''} ${u.lastName || ''}`}</span>
                    <div className="text-[11px] text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.roleId || ''}
                      disabled={assigning === u.id}
                      onChange={(e) => assignRole(u.id, e.target.value)}
                      className="h-9 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="">— none (legacy access) —</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ROLE MODAL */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? `Edit Role — ${editing.name}` : 'Create Role'} size="xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-400">Role Name *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={editing?.isSystem} required />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-400">Description</label>
              <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Permission Matrix</span>
              <span className="text-[11px] font-semibold text-slate-400">{form.permissions.length} selected</span>
            </div>
            <div className="max-h-[46vh] space-y-3 overflow-y-auto p-4">
              {catalogue.modules.map((m) => {
                const modPerms = m.actions.map((a) => `${m.key}.${a}`);
                const allOn = modPerms.every((p) => form.permissions.includes(p));
                return (
                  <div key={m.key} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <input type="checkbox" checked={allOn} onChange={() => toggleModule(m)} className="h-3.5 w-3.5 rounded text-primary" />
                      {m.label}
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2 pl-6">
                      {m.actions.map((a) => {
                        const perm = `${m.key}.${a}`;
                        return (
                          <button
                            type="button"
                            key={perm}
                            onClick={() => togglePerm(perm)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                              form.permissions.includes(perm)
                                ? 'bg-primary text-white'
                                : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                            }`}
                          >
                            {a}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setModal(false)} className="rounded-xl px-4 py-2 text-xs font-semibold">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save Matrix' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Role"
        message={`Delete role "${deleteTarget?.name}"? Users must be un-assigned first.`}
        confirmText="Delete"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default RolesAndPermissions;

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { schoolUserApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Key,
  Loader2,
  Mail,
  Pencil,
  Power,
  Send,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserX,
} from 'lucide-react';
import { DetailPageSkeleton } from '../../components/ui/SkeletonLoader';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

const ROLE_VARIANTS = {
  TEACHER: 'primary',
  LIBRARIAN: 'info',
  HR: 'purple',
  ACCOUNTANT: 'warning',
  TRANSPORT: 'emerald',
};

const ROLE_LABELS = {
  TEACHER: 'Teacher',
  LIBRARIAN: 'Librarian',
  HR: 'Human Resources (HR)',
  ACCOUNTANT: 'Accountant',
  TRANSPORT: 'Transport Manager',
};

function buildFileUrl(path) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const _rel = path.startsWith('/') ? path : `/${path}`;
  const _tok = ['school_admin_token','principal_token','accountant_token','hr_token','librarian_token','transport_token','super_admin_token'].reduce((a, k) => a || localStorage.getItem(k), '');
  return `${API_BASE_URL}/platform${_rel}${_tok ? `?t=${encodeURIComponent(_tok)}` : ''}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(name) {
  return (
    (name || 'Staff User')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'SU'
  );
}

function DetailCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, isMono = false }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p
        className={`mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100 ${
          isMono ? 'font-mono text-xs' : ''
        }`}
      >
        {value || '—'}
      </p>
    </div>
  );
}

export const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const result = await schoolUserApi.get(userId);
      setUser(result.data);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load user details'), 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, showToast]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleToggleStatus = async () => {
    if (!user) return;
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setBusy(true);
    try {
      const res = await schoolUserApi.updateStatus(user.id, nextStatus);
      setUser(res.data);
      showToast(`User status marked as ${nextStatus}`, 'success');
    } catch (error) {
      showToast(apiMessage(error, 'Failed to update user status'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSendCredentials = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const res = await schoolUserApi.sendCredentials(user.id);
      showToast(res.message || `Credentials dispatched to ${user.email}`, 'success');
      loadUser();
    } catch (error) {
      showToast(apiMessage(error, 'Failed to send credentials email'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await schoolUserApi.changePassword(user.id, newPassword);
      showToast(res.message || 'Password changed successfully', 'success');
      setPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showToast(apiMessage(error, 'Failed to change password'), 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await schoolUserApi.delete(user.id);
      showToast('User deleted successfully', 'success');
      navigate('/school-admin/users');
    } catch (error) {
      showToast(apiMessage(error, 'Failed to delete user'), 'error');
      setBusy(false);
    }
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Link
          to="/school-admin/users"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Users Directory
        </Link>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <UserX className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
          <h3 className="mt-4 text-base font-bold text-slate-700 dark:text-slate-200">User Not Found</h3>
          <p className="mt-1 text-xs text-slate-400">The requested staff user record does not exist or was deleted.</p>
        </div>
      </div>
    );
  }

  const avatarUrl = buildFileUrl(user.photo);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Link to="/school-admin/users" className="hover:text-slate-600 dark:hover:text-slate-200">
          Staff & User Directory
        </Link>
        <span>/</span>
        <span className="font-bold text-slate-800 dark:text-white">{user.name}</span>
      </div>

      {/* Main Profile Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.name}
                className="h-20 w-20 rounded-2xl border-2 border-slate-100 object-cover shadow-sm dark:border-slate-800"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-xl font-black text-primary">
                {getInitials(user.name)}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{user.name}</h1>
                <Badge variant={ROLE_VARIANTS[user.role] || 'primary'}>
                  {ROLE_LABELS[user.role] || user.role}
                </Badge>
                <Badge variant={user.status === 'ACTIVE' ? 'success' : 'default'}>
                  {user.status}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  EMP ID: {user.employeeId}
                </span>
                <span>•</span>
                <span>{user.email}</span>
                {user.phone && (
                  <>
                    <span>•</span>
                    <span>{user.phone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSendCredentials}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-700 shadow-sm transition hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
              title="Dispatch Login Password & Instructions to Email"
            >
              <Send className="h-3.5 w-3.5" /> Send Password to Email
            </button>

            <button
              onClick={() => setPasswordModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <Key className="h-3.5 w-3.5 text-amber-500" /> Change Password
            </button>

            <button
              onClick={handleToggleStatus}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm transition ${
                user.status === 'ACTIVE'
                  ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>

            <button
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 1. Personal & Contact Information */}
        <DetailCard title="Personal & Contact Details" icon={User}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" value={user.firstName} />
            <Field label="Last Name" value={user.lastName} />
            <Field label="Email Address" value={user.email} />
            <Field label="Phone / Mobile" value={user.phone} />
            <Field label="Gender" value={user.gender} />
            <Field label="Specialization" value={user.specialization} />
          </div>
        </DetailCard>

        {/* 2. Employment & Designation */}
        <DetailCard title="Employment & Department" icon={Briefcase}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Employee ID" value={user.employeeId} isMono />
            <Field label="Assigned Role" value={ROLE_LABELS[user.role] || user.role} />
            <Field label="Department" value={user.department} />
            <Field label="Designation" value={user.designation} />
            <Field label="Joining Date" value={formatDate(user.joiningDate)} />
            <Field label="Account Status" value={user.status} />
          </div>
        </DetailCard>

        {/* 3. Banking & Salary Information */}
        <DetailCard title="Bank Account & Payroll Details" icon={CreditCard}>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Basic Monthly Salary"
              value={user.basicSalary ? `₹${Number(user.basicSalary).toLocaleString('en-IN')} / month` : '₹0'}
            />
            <Field label="Account Type" value={user.bankDetails?.accountType || 'SALARY'} />
            <Field label="Account Holder Name" value={user.bankDetails?.accountName} />
            <Field label="Account Number" value={user.bankDetails?.accountNumber} isMono />
            <Field label="IFSC Code" value={user.bankDetails?.ifscCode} isMono />
            <Field label="Bank Name" value={user.bankDetails?.bankName} />
            <Field label="Branch Name" value={user.bankDetails?.branchName} />
          </div>
        </DetailCard>

        {/* 4. Security & Activity Log */}
        <DetailCard title="Login Security & Activity" icon={ShieldCheck}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Login Email" value={user.email} />
            <Field label="Last Login" value={formatDate(user.lastLoginAt)} />
            <Field label="Credentials Dispatched" value={formatDate(user.credentialsSentAt)} />
            <Field label="Profile Created On" value={formatDate(user.createdAt)} />
          </div>
        </DetailCard>
      </div>

      {/* 5. Uploaded Documents Section (Max 3) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Uploaded Documents (Max 3 Images)</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {user.documents?.length || 0} of 3 Documents
          </span>
        </div>

        {user.documents && user.documents.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {user.documents.map((docPath, index) => {
              const fullUrl = buildFileUrl(docPath);
              return (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="aspect-video w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                    <img
                      src={fullUrl}
                      alt={`Document ${index + 1}`}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Document #{index + 1}
                      </p>
                      <p className="text-[10px] text-slate-400">KYC Verification Image</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(fullUrl)}
                      className="rounded-lg bg-white p-1.5 text-slate-600 shadow-sm hover:text-primary dark:bg-slate-800 dark:text-slate-300"
                      title="View Full Image"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center dark:border-slate-800">
            <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">No Documents Uploaded</p>
            <p className="text-[11px] text-slate-400">No KYC or verification images attached to this profile.</p>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title={`Change Password for ${user.name}`}
        size="md"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-xs font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                tabIndex={-1}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-slate-500" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-xs font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-slate-500" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword ? (
              <p className="mt-1 text-[11px] font-semibold text-rose-500">
                Passwords do not match
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                This will update the user's login password immediately.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={changingPassword || (confirmPassword && newPassword !== confirmPassword)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
            >
              {changingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {changingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Image Preview Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-white p-2 dark:bg-slate-900">
            <img src={previewImage} alt="Preview" className="max-h-[80vh] w-auto rounded-xl object-contain" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white hover:bg-black"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete User Record"
        message={`Are you sure you want to permanently remove "${user.name}" (${user.employeeId})? This action cannot be undone.`}
        confirmLabel="Delete User"
        onConfirm={handleDeleteUser}
        onCancel={() => setConfirmDelete(false)}
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default UserDetail;

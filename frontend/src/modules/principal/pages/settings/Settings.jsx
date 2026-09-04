import React, { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import { usePrincipalAuth } from '../../context/PrincipalAuthContext';
import { usePrincipalTheme } from '../../context/PrincipalThemeContext';
import { principalAuthApi } from '../../../../shared/api/client';
import {
  Camera,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Lock,
  Mail,
  Moon,
  Phone,
  Save,
  Shield,
  Sun,
  Trash2,
  User,
} from 'lucide-react';

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

function buildFileUrl(path) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const _rel = path.startsWith('/') ? path : `/${path}`;
  const _tok = ['school_admin_token','principal_token','accountant_token','hr_token','librarian_token','transport_token','super_admin_token'].reduce((a, k) => a || localStorage.getItem(k), '');
  return `${API_BASE_URL}/platform${_rel}${_tok ? `?t=${encodeURIComponent(_tok)}` : ''}`;
}

const TABS = [
  { id: 'profile', label: 'Principal Profile' },
  { id: 'security', label: 'Security & Password' },
  { id: 'theme', label: 'Theme' },
];

function apiMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function Field({ id, label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-slate-600 dark:text-slate-300">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function TextInput({ id, className = '', ...props }) {
  return (
    <input
      id={id}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 ${className}`}
      {...props}
    />
  );
}

function PasswordInput({ id, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <TextInput
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pl-10 pr-10"
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setVisible((open) => !open)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function passwordStrength(password) {
  if (!password) return { score: 0, label: '', color: 'bg-slate-200' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, updateProfile } = usePrincipalAuth();
  const { darkMode, toggleTheme } = usePrincipalTheme();
  const { showToast, ToastComponent } = useToast();

  const [firstName, setFirstName] = useState(user?.firstName || user?.name?.split(' ')?.[0] || '');
  const [lastName, setLastName] = useState(user?.lastName || user?.name?.split(' ')?.slice(1).join(' ') || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const photoInputRef = useRef(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const strength = passwordStrength(newPassword);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      showToast('Please upload an image under 2MB', 'error');
      return;
    }

    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const handleRemovePhoto = () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview('');
    setRemovePhoto(true);
  };

  const displayPhoto = photoPreview || (!removePhoto ? buildFileUrl(user?.photo) : '');

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const payload = new FormData();
      payload.append('firstName', firstName);
      payload.append('lastName', lastName);
      payload.append('phone', phone);
      if (photoFile) payload.append('photo', photoFile);
      if (removePhoto) payload.append('removePhoto', 'true');

      const result = await principalAuthApi.updateProfile(payload);
      if (result.user) updateProfile(result.user);
      setPhotoFile(null);
      setPhotoPreview('');
      setRemovePhoto(false);
      showToast('Principal profile updated successfully', 'success');
    } catch (error) {
      showToast(apiMessage(error, 'Unable to update profile'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await principalAuthApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully', 'success');
    } catch (error) {
      showToast(apiMessage(error, 'Unable to update password'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Parameters"
        subtitle="Manage your principal profile, update your account password, and switch the portal theme."
      />

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-850 dark:bg-slate-950">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              {displayPhoto ? (
                <img src={displayPhoto} alt={user?.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
                  <User className="h-7 w-7" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Principal Account
              </span>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.designation || 'School Principal'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-200"
              >
                <Camera className="h-3.5 w-3.5" />
                {displayPhoto ? 'Change photo' : 'Upload photo'}
              </button>
              {displayPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-rose-500 hover:border-rose-300 hover:bg-rose-50 dark:border-slate-700 dark:hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-slate-400">
            <ImagePlus className="mr-1 inline h-3 w-3" />
            PNG or JPG, max 2MB.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Field id="firstName" label="First name">
              <TextInput id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </Field>
            <Field id="lastName" label="Last name">
              <TextInput id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
            <Field id="email" label="Official email" hint="Email is your login ID and cannot be changed here.">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput id="email" value={user?.email || ''} disabled className="pl-10 opacity-70" />
              </div>
            </Field>
            <Field id="phone" label="Contact phone">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" />
              </div>
            </Field>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save profile changes
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <form
          onSubmit={handleChangePassword}
          className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change password</h3>
              <p className="mt-1 text-xs text-slate-500">
                Use your current password to set a new one. Minimum 8 characters.
              </p>
            </div>
          </div>

          <div className="grid max-w-xl gap-4">
            <Field id="currentPassword" label="Current password">
              <PasswordInput
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </Field>
            <Field id="newPassword" label="New password" hint="At least 8 characters. Mix letters, numbers, and symbols.">
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </Field>
            {newPassword && (
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full ${strength.color}`}
                    style={{ width: `${Math.min(100, strength.score * 20)}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-500">{strength.label}</span>
              </div>
            )}
            <Field id="confirmPassword" label="Confirm new password">
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </Field>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              Update password
            </button>
          </div>
        </form>
      )}

      {activeTab === 'theme' && (
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40">
              {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Appearance</h3>
              <p className="mt-1 text-xs text-slate-500">
                Switch between light and dark mode for the Principal portal. This preference is saved on this device.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => darkMode && toggleTheme()}
              className={`rounded-2xl border p-5 text-left transition ${
                !darkMode
                  ? 'border-emerald-500 ring-4 ring-emerald-500/10'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
              }`}
            >
              <div className="mb-4 h-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="h-6 bg-white" />
                <div className="m-3 h-3 w-2/3 rounded bg-slate-200" />
                <div className="mx-3 h-3 w-1/2 rounded bg-slate-100" />
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Sun className="h-4 w-4 text-amber-500" />
                Light
              </div>
            </button>

            <button
              type="button"
              onClick={() => !darkMode && toggleTheme()}
              className={`rounded-2xl border p-5 text-left transition ${
                darkMode
                  ? 'border-emerald-500 ring-4 ring-emerald-500/10'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
              }`}
            >
              <div className="mb-4 h-20 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                <div className="h-6 bg-slate-800" />
                <div className="m-3 h-3 w-2/3 rounded bg-slate-700" />
                <div className="mx-3 h-3 w-1/2 rounded bg-slate-800" />
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                <Moon className="h-4 w-4 text-emerald-500" />
                Dark
              </div>
            </button>
          </div>
        </section>
      )}

      <ToastComponent />
    </div>
  );
};
export default Settings;

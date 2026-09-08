import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge, cn } from '../../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { useSuperAdminAuth } from '../../context/SuperAdminAuthContext';
import { platformAppConfigApi } from '../../../../shared/api/client';
import {
  AlertCircle,
  Camera,
  Check,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Lock,
  Mail,
  Save,
  Shield,
  Smartphone,
  UserRound,
} from 'lucide-react';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=60';

const tabTriggerClass = cn(
  'gap-2 rounded-lg px-4 py-2 text-sm font-medium',
  'data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm',
  'dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-indigo-400'
);

function Field({ id, label, icon: Icon, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}
        {children}
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function PasswordField({ id, label, value, onChange, hint }) {
  const [visible, setVisible] = useState(false);

  return (
    <Field id={id} label={label} icon={Lock} hint={hint}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-950"
      />
      <button
        type="button"
        onClick={() => setVisible((open) => !open)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </Field>
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

export default function SettingsIndex() {
  const { admin, updateProfile, changePassword } = useSuperAdminAuth();
  const fileRef = useRef(null);

  const [name, setName] = useState(admin?.name || 'Super Admin');
  const [avatar, setAvatar] = useState(admin?.avatar || DEFAULT_AVATAR);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const strength = passwordStrength(newPassword);

  // Mobile app links shown on the public landing site.
  const [appConfig, setAppConfig] = useState({ playStoreUrl: '', appStoreUrl: '', apkUrl: '' });
  const [appConfigUpdatedAt, setAppConfigUpdatedAt] = useState(null);
  const [loadingAppConfig, setLoadingAppConfig] = useState(true);
  const [savingAppConfig, setSavingAppConfig] = useState(false);
  const [appConfigSaved, setAppConfigSaved] = useState(false);
  const [appConfigError, setAppConfigError] = useState('');

  useEffect(() => {
    if (!admin) return;
    setName(admin.name || 'Super Admin');
    setAvatar(admin.avatar || DEFAULT_AVATAR);
  }, [admin]);

  useEffect(() => {
    let alive = true;
    platformAppConfigApi
      .get()
      .then((result) => {
        if (!alive) return;
        setAppConfig({
          playStoreUrl: result.data?.playStoreUrl || '',
          appStoreUrl: result.data?.appStoreUrl || '',
          apkUrl: result.data?.apkUrl || '',
        });
        setAppConfigUpdatedAt(result.data?.updatedAt || null);
      })
      .catch((err) => {
        if (!alive) return;
        setAppConfigError(err.response?.data?.message || err.message || 'Unable to load mobile app links.');
      })
      .finally(() => {
        if (alive) setLoadingAppConfig(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSaveAppConfig = async (event) => {
    event.preventDefault();
    setAppConfigError('');
    setAppConfigSaved(false);
    setSavingAppConfig(true);
    try {
      const result = await platformAppConfigApi.update({
        playStoreUrl: appConfig.playStoreUrl.trim(),
        appStoreUrl: appConfig.appStoreUrl.trim(),
        apkUrl: appConfig.apkUrl.trim(),
      });
      setAppConfig({
        playStoreUrl: result.data?.playStoreUrl || '',
        appStoreUrl: result.data?.appStoreUrl || '',
        apkUrl: result.data?.apkUrl || '',
      });
      setAppConfigUpdatedAt(result.data?.updatedAt || new Date().toISOString());
      setAppConfigSaved(true);
      setTimeout(() => setAppConfigSaved(false), 2200);
    } catch (err) {
      setAppConfigError(err.response?.data?.message || err.message || 'Unable to save mobile app links.');
    } finally {
      setSavingAppConfig(false);
    }
  };

  const updateAppConfigField = (key) => (event) =>
    setAppConfig((prev) => ({ ...prev, [key]: event.target.value }));

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setProfileError('');
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      await updateProfile({ name: name.trim() || 'Super Admin', avatar });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2200);
    } catch (err) {
      setProfileError(err.response?.data?.message || err.message || 'Unable to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSaved(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2200);
    } catch (err) {
      setPasswordError(err.response?.data?.message || err.message || 'Unable to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Update your profile and keep your account secure.
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/70">
          <TabsTrigger value="profile" className={tabTriggerClass}>
            <UserRound className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className={tabTriggerClass}>
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="mobile-app" className={tabTriggerClass}>
            <Smartphone className="h-4 w-4" />
            Mobile app
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <form onSubmit={handleSaveProfile}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="grid gap-6 lg:grid-cols-[240px_1fr]"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group relative mx-auto block"
                  aria-label="Change profile photo"
                >
                  <img
                    src={avatar}
                    alt="Profile"
                    className="h-28 w-28 rounded-full object-cover ring-4 ring-slate-100 dark:ring-slate-800"
                  />
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/55 text-white opacity-0 transition group-hover:opacity-100">
                    <Camera className="h-5 w-5" />
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />

                <h2 className="mt-4 truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                  {name || 'Super Admin'}
                </h2>
                <p className="mt-1 truncate text-xs text-slate-500">{admin?.email || 'superadmin@gmail.com'}</p>
                <div className="mt-3 flex justify-center">
                  <Badge variant="info">{admin?.role || 'Super Admin'}</Badge>
                </div>
                <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
                  JPG or PNG. Hover the photo to replace it.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Personal details</h3>
                  <p className="mt-1 text-sm text-slate-500">This is how you appear across the admin portal.</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="profile-name" label="Full name" icon={UserRound}>
                    <input
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Super Admin"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </Field>
                  <Field
                    id="profile-email"
                    label="Email address"
                    icon={Mail}
                    hint="Email is linked to your account and cannot be changed here."
                  >
                    <input
                      id="profile-email"
                      type="email"
                      value={admin?.email || 'superadmin@gmail.com'}
                      readOnly
                      className="h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 pl-10 pr-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400"
                    />
                  </Field>
                </div>

                <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                  {profileError && (
                    <span className="mr-auto text-sm text-rose-600 dark:text-rose-400">{profileError}</span>
                  )}
                  <AnimatePresence>
                    {profileSaved && (
                      <motion.span
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
                      >
                        <Check className="h-4 w-4" />
                        Saved
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <Button type="submit" className="h-11 gap-2 rounded-xl px-5" disabled={savingProfile}>
                    {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savingProfile ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </form>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <form onSubmit={handleChangePassword}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Change password</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Use at least 8 characters, with a mix of letters and numbers.
                  </p>
                </div>
              </div>

              <div className="max-w-xl space-y-5">
                <PasswordField
                  id="current-password"
                  label="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <PasswordField
                  id="new-password"
                  label="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                {newPassword && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Password strength</span>
                      <span className="font-medium text-slate-600 dark:text-slate-300">{strength.label}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((step) => (
                        <span
                          key={step}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-colors',
                            step <= strength.score ? strength.color : 'bg-slate-200 dark:bg-slate-800'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <PasswordField
                  id="confirm-password"
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                {passwordError && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-50 px-3 py-2.5 text-sm text-rose-600 dark:bg-rose-500/5 dark:text-rose-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {passwordError}
                  </div>
                )}
              </div>

              <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <AnimatePresence>
                  {passwordSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
                    >
                      <Check className="h-4 w-4" />
                      Password updated
                    </motion.span>
                  )}
                </AnimatePresence>
                <Button type="submit" className="h-11 gap-2 rounded-xl px-5" disabled={savingPassword}>
                  {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {savingPassword ? 'Updating…' : 'Update password'}
                </Button>
              </div>
            </motion.div>
          </form>
        </TabsContent>

        <TabsContent value="mobile-app" className="mt-6">
          <form onSubmit={handleSaveAppConfig}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Mobile app links
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Shown on the public landing page. Leave a field blank to hide that button
                    (it renders as “coming soon”).
                    {appConfigUpdatedAt && (
                      <span className="ml-1 text-slate-400">
                        Last saved {new Date(appConfigUpdatedAt).toLocaleString()}.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {loadingAppConfig ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-11 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : (
                <div className="max-w-xl space-y-5">
                  <Field
                    id="play-store-url"
                    label="Google Play URL"
                    icon={Smartphone}
                    hint="e.g. https://play.google.com/store/apps/details?id=com.schoolcrm.app"
                  >
                    <input
                      id="play-store-url"
                      type="url"
                      inputMode="url"
                      placeholder="https://play.google.com/store/apps/details?id=…"
                      value={appConfig.playStoreUrl}
                      onChange={updateAppConfigField('playStoreUrl')}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </Field>

                  <Field
                    id="apk-url"
                    label="APK download URL"
                    icon={Link2}
                    hint="Direct link to the signed .apk for sideloading."
                  >
                    <input
                      id="apk-url"
                      type="url"
                      inputMode="url"
                      placeholder="https://downloads.schoolcrm.app/schoolcrm-latest.apk"
                      value={appConfig.apkUrl}
                      onChange={updateAppConfigField('apkUrl')}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </Field>

                  <Field
                    id="app-store-url"
                    label="Apple App Store URL"
                    icon={Link2}
                    hint="Optional — reserved for a future iOS build."
                  >
                    <input
                      id="app-store-url"
                      type="url"
                      inputMode="url"
                      placeholder="https://apps.apple.com/app/id…"
                      value={appConfig.appStoreUrl}
                      onChange={updateAppConfigField('appStoreUrl')}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </Field>

                  {appConfigError && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-50 px-3 py-2.5 text-sm text-rose-600 dark:bg-rose-500/5 dark:text-rose-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {appConfigError}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <AnimatePresence>
                  {appConfigSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
                    >
                      <Check className="h-4 w-4" />
                      Saved
                    </motion.span>
                  )}
                </AnimatePresence>
                <Button
                  type="submit"
                  className="h-11 gap-2 rounded-xl px-5"
                  disabled={savingAppConfig || loadingAppConfig}
                >
                  {savingAppConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingAppConfig ? 'Saving…' : 'Save links'}
                </Button>
              </div>
            </motion.div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

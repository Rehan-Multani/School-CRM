import React, { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import { useSchoolAdminTheme } from '../../context/SchoolAdminThemeContext';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { schoolPortalApi } from '../../../../shared/api/client';
import { ACCENT_PRESETS, normalizeHex } from '../../utils/themeColors';
import {
  Check,
  Eye,
  EyeOff,
  Image,
  Loader2,
  Lock,
  Mail,
  Moon,
  Palette,
  Pipette,
  Save,
  Shield,
  Sun,
  Upload,
} from 'lucide-react';
import { SkeletonForm } from '../../components/ui/SkeletonLoader';

const TABS = [
  { id: 'theme', label: 'Theme' },
  { id: 'security', label: 'Security & Password' },
  { id: 'email', label: 'Email Config' },
];

const DEFAULT_TEMPLATE_BODY =
  'Dear {ParentName},\n\nWe have received a tuition fee payment of {Amount} on {Date}. Your receipt number is {ReceiptNo}.\n\nWarm regards,\nSchool Administration';

function apiMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.readAsDataURL(file);
  });
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
  const [activeTab, setActiveTab] = useState('theme');
  const { showToast, ToastComponent } = useToast();
  const { darkMode, setTheme, primaryColor, setAccentColor } = useSchoolAdminTheme();
  const { applyUser } = useSchoolAdminAuth();
  const accentSaveTimer = useRef(null);

  const [loading, setLoading] = useState(true);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpPassSet, setSmtpPassSet] = useState(false);
  const [templateName, setTemplateName] = useState('Fee Receipt');
  const [templateBody, setTemplateBody] = useState(DEFAULT_TEMPLATE_BODY);
  const [brandingLogo, setBrandingLogo] = useState('');
  const [brandingFavicon, setBrandingFavicon] = useState('');

  const [hexDraft, setHexDraft] = useState(primaryColor);
  const strength = passwordStrength(newPassword);

  useEffect(() => {
    setHexDraft(primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    return () => clearTimeout(accentSaveTimer.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    schoolPortalApi
      .settings()
      .then((result) => {
        if (cancelled || !result.data) return;
        const data = result.data;
        if (data.theme) setTheme(data.theme);
        if (data.primaryColor) setAccentColor(data.primaryColor);
        setBrandingLogo(data.portalBranding?.logo || '');
        setBrandingFavicon(data.portalBranding?.favicon || '');
        setSmtpHost(data.smtp?.host || '');
        setSmtpPort(data.smtp?.port || 587);
        setSmtpUser(data.smtp?.user || '');
        setSmtpFrom(data.smtp?.from || '');
        setSmtpPassSet(Boolean(data.smtp?.passSet));
        setTemplateName(data.emailTemplate?.name || 'Fee Receipt');
        setTemplateBody(data.emailTemplate?.body || DEFAULT_TEMPLATE_BODY);
      })
      .catch((error) => {
        if (!cancelled) showToast(apiMessage(error, 'Unable to load settings'), 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setTheme, setAccentColor, showToast]);

  const persistTheme = async (payload, successMessage) => {
    setSavingTheme(true);
    try {
      const result = await schoolPortalApi.updateTheme(payload);
      if (result.user) applyUser(result.user);
      if (successMessage) showToast(successMessage, 'success');
    } catch (error) {
      showToast(apiMessage(error, 'Unable to save theme'), 'error');
    } finally {
      setSavingTheme(false);
    }
  };

  const handleSaveTheme = (theme) => {
    setTheme(theme);
    persistTheme({ theme }, 'Theme saved');
  };

  const handleSaveAccent = (hex) => {
    const next = normalizeHex(hex);
    setHexDraft(next);
    setAccentColor(next);
    persistTheme({ primaryColor: next }, 'Accent color saved');
  };

  const handlePickerChange = (hex) => {
    const next = normalizeHex(hex);
    setHexDraft(next);
    setAccentColor(next);
    clearTimeout(accentSaveTimer.current);
    accentSaveTimer.current = setTimeout(() => {
      persistTheme({ primaryColor: next });
    }, 400);
  };

  const handleBrandFileChange = async (event, type) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Please upload an image under 2MB', 'error');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (type === 'logo') {
        setBrandingLogo(dataUrl);
      } else {
        setBrandingFavicon(dataUrl);
      }
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load image'), 'error');
    }
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const result = await schoolPortalApi.updateBranding({
        logo: brandingLogo,
        favicon: brandingFavicon,
      });
      if (result.user) applyUser(result.user);
      setBrandingLogo(result.portalBranding?.logo || '');
      setBrandingFavicon(result.portalBranding?.favicon || '');
      showToast('Admin branding saved', 'success');
    } catch (error) {
      showToast(apiMessage(error, 'Unable to save branding'), 'error');
    } finally {
      setSavingBranding(false);
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
      await schoolPortalApi.changePassword({ currentPassword, newPassword });
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

  const handleSaveEmail = async (event) => {
    event.preventDefault();
    setSavingEmail(true);
    try {
      const result = await schoolPortalApi.updateEmailSettings({
        host: smtpHost,
        port: Number(smtpPort),
        user: smtpUser,
        from: smtpFrom,
        pass: smtpPass,
        templateName,
        templateBody,
      });
      const data = result.data || {};
      setSmtpPass('');
      setSmtpPassSet(Boolean(data.smtp?.passSet));
      showToast('Email settings saved', 'success');
    } catch (error) {
      showToast(apiMessage(error, 'Unable to save email settings'), 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  if (loading) {
    return <SkeletonForm fields={6} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Choose a theme, manage admin branding, update your password, and configure school SMTP email."
      />

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'theme' && (
        <section className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Appearance</h3>
              <p className="mt-1 text-xs text-slate-500">
                Switch light or dark mode, then pick a brand color. Sidebar, buttons, and accents update live.
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-primary">Mode</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                disabled={savingTheme}
                onClick={() => handleSaveTheme('light')}
                className={`rounded-2xl border p-5 text-left transition ${
                  !darkMode
                    ? 'border-primary ring-4 ring-primary/10'
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
                disabled={savingTheme}
                onClick={() => handleSaveTheme('dark')}
                className={`rounded-2xl border p-5 text-left transition ${
                  darkMode
                    ? 'border-primary ring-4 ring-primary/10'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                }`}
              >
                <div className="mb-4 h-20 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                  <div className="h-6 bg-slate-800" />
                  <div className="m-3 h-3 w-2/3 rounded bg-slate-700" />
                  <div className="mx-3 h-3 w-1/2 rounded bg-slate-800" />
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                  <Moon className="h-4 w-4 text-primary" />
                  Dark
                </div>
              </button>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-primary">Brand color</h4>
            <div className="flex flex-wrap items-center gap-2.5">
              {ACCENT_PRESETS.map((preset) => {
                const selected = primaryColor === normalizeHex(preset.hex);
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    title={preset.name}
                    disabled={savingTheme}
                    onClick={() => handleSaveAccent(preset.hex)}
                    className={`relative h-10 w-10 rounded-full border-2 transition ${
                      selected ? 'border-slate-900 ring-4 ring-primary/20 dark:border-white' : 'border-white shadow-sm dark:border-slate-800'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {selected && <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />}
                  </button>
                );
              })}
              <label
                className="relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300"
                title="Custom color"
              >
                <Pipette className="h-4 w-4" />
                <input
                  type="color"
                  value={primaryColor.toLowerCase()}
                  onChange={(event) => handlePickerChange(event.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
            <div className="mt-4 flex max-w-xs items-center gap-3">
              <div className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 shadow-inner dark:border-slate-700" style={{ backgroundColor: primaryColor }} />
              <input
                value={hexDraft}
                onChange={(event) => {
                  let next = event.target.value.toUpperCase();
                  if (next && !next.startsWith('#')) next = `#${next}`;
                  if (!/^#[0-9A-F]{0,6}$/.test(next)) return;
                  setHexDraft(next);
                  if (/^#[0-9A-F]{6}$/.test(next)) handlePickerChange(next);
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 font-mono text-sm uppercase outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950"
                maxLength={7}
                spellCheck={false}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white">Primary button</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">Soft chip</span>
              <span className="rounded-full border border-primary px-3 py-1 text-[11px] font-bold text-primary">Outline</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                <Image className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Admin branding</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Upload a logo and favicon shown only in the school admin portal. Other portals keep the default branding.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Portal logo</h4>
                    <p className="mt-1 text-xs text-slate-500">Used in school admin sidebar and login screens.</p>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                    {brandingLogo ? (
                      <img src={brandingLogo} alt="Admin logo preview" className="h-12 w-12 rounded-lg object-contain" />
                    ) : (
                      <Image className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200">
                    <Upload className="h-3.5 w-3.5" />
                    Upload logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleBrandFileChange(event, 'logo')}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setBrandingLogo('')}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                  >
                    Use default
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Portal favicon</h4>
                    <p className="mt-1 text-xs text-slate-500">Shown on the browser tab for school admin pages.</p>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                    {brandingFavicon ? (
                      <img src={brandingFavicon} alt="Admin favicon preview" className="h-10 w-10 rounded-lg object-contain" />
                    ) : (
                      <Image className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200">
                    <Upload className="h-3.5 w-3.5" />
                    Upload favicon
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleBrandFileChange(event, 'favicon')}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setBrandingFavicon('')}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                  >
                    Use default
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={savingBranding}
                onClick={handleSaveBranding}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {savingBranding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save admin branding
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'security' && (
        <form
          onSubmit={handleChangePassword}
          className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change password</h3>
              <p className="mt-1 text-xs text-slate-500">
                Use your current school admin password to set a new one. Minimum 8 characters.
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {savingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              Update password
            </button>
          </div>
        </form>
      )}

      {activeTab === 'email' && (
        <form
          onSubmit={handleSaveEmail}
          className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">SMTP & template</h3>
              <p className="mt-1 text-xs text-slate-500">
                School outgoing email, SMTP password, and the template name used for notices.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field id="smtpHost" label="SMTP host">
              <TextInput
                id="smtpHost"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </Field>
            <Field id="smtpPort" label="SMTP port">
              <TextInput
                id="smtpPort"
                type="number"
                min="1"
                max="65535"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
              />
            </Field>
            <Field id="smtpUser" label="SMTP email">
              <TextInput
                id="smtpUser"
                type="email"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="school@example.com"
              />
            </Field>
            <Field
              id="smtpPass"
              label="SMTP password"
              hint={smtpPassSet ? 'A password is already saved. Leave blank to keep it.' : 'App password or SMTP password.'}
            >
              <PasswordInput
                id="smtpPass"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder={smtpPassSet ? '••••••••' : 'Enter SMTP password'}
              />
            </Field>
            <Field id="smtpFrom" label="From name / email" hint="Shown as the sender on outgoing mail.">
              <TextInput
                id="smtpFrom"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                placeholder="Greenfield School <school@example.com>"
              />
            </Field>
            <Field id="templateName" label="Template name">
              <TextInput
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Fee Receipt"
              />
            </Field>
          </div>

          <Field id="templateBody" label="Template body" hint="Merge tags: {ParentName}, {Amount}, {Date}, {ReceiptNo}">
            <textarea
              id="templateBody"
              rows={7}
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-4 font-mono text-xs font-semibold text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </Field>

          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="submit"
              disabled={savingEmail}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {savingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save email config
            </button>
          </div>
        </form>
      )}

      <ToastComponent />
    </div>
  );
};

export default Settings;

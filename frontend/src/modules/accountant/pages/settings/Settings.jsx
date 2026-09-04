import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { useAccountantAuth } from '../../context/AccountantAuthContext';
import { useAccountantTheme } from '../../context/AccountantThemeContext';
import { useToast } from '../../components/ui/Toast';
import { accountantAuthApi, accountantApi } from '../../../../shared/api/client';
import { Save, Lock, Moon, Sun } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'receipt', label: 'Receipt / Invoice Config' },
  { id: 'notifications', label: 'Notification Preferences' },
  { id: 'security', label: 'Security' },
  { id: 'appearance', label: 'Appearance' },
];

const splitName = (name = '') => {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
};

export const Settings = () => {
  const [tab, setTab] = useState('profile');
  const { user, updateProfile } = useAccountantAuth();
  const { darkMode, toggleTheme } = useAccountantTheme();
  const { showToast, ToastComponent } = useToast();

  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [prefs, setPrefs] = useState({
    receipt: { header: '', footer: '' },
    invoice: { header: '', footer: '' },
    notifications: { payment: true, feeUpdates: true, expenses: true, invoices: true, system: true },
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    accountantAuthApi
      .profile()
      .then((res) => {
        const u = res?.user || {};
        setProfile({
          firstName: u.firstName || splitName(u.name).firstName,
          lastName: u.lastName || splitName(u.name).lastName,
          phone: u.phone || '',
          email: u.email || '',
        });
      })
      .catch(() => {
        const { firstName, lastName } = splitName(user?.name);
        setProfile({ firstName, lastName, phone: user?.phone || '', email: user?.email || '' });
      });

    accountantApi
      .settings()
      .then((res) => {
        const p = res?.data?.preferences || {};
        setPrefs((cur) => ({
          receipt: { ...cur.receipt, ...(p.receipt || {}) },
          invoice: { ...cur.invoice, ...(p.invoice || {}) },
          notifications: { ...cur.notifications, ...(p.notifications || {}) },
        }));
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = (e) => {
    e.preventDefault();
    setSaving(true);
    accountantAuthApi
      .updateProfile({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone })
      .then((res) => {
        const u = res?.user || {};
        updateProfile({ name: u.name || `${profile.firstName} ${profile.lastName}`.trim(), phone: profile.phone });
        showToast('Profile updated', 'success');
      })
      .catch((err) => showToast(err?.response?.data?.message || 'Update failed', 'error'))
      .finally(() => setSaving(false));
  };

  const savePrefs = (e) => {
    e.preventDefault();
    setSaving(true);
    accountantApi
      .updateSettings({ preferences: prefs })
      .then(() => showToast('Settings saved', 'success'))
      .catch((err) => showToast(err?.response?.data?.message || 'Save failed', 'error'))
      .finally(() => setSaving(false));
  };

  const savePassword = (e) => {
    e.preventDefault();
    if (pw.newPassword.length < 8) return showToast('New password must be at least 8 characters', 'error');
    setSaving(true);
    accountantAuthApi
      .changePassword(pw)
      .then(() => {
        showToast('Password updated', 'success');
        setPw({ currentPassword: '', newPassword: '' });
      })
      .catch((err) => showToast(err?.response?.data?.message || 'Password change failed', 'error'))
      .finally(() => setSaving(false));
  };

  const inp = 'w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs';

  return (
    <div className="space-y-6 text-xs font-semibold">
      <PageHeader title="Settings" subtitle="Accountant profile, receipt/invoice configuration, notification preferences and security." />
      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

      {tab === 'profile' && (
        <form onSubmit={saveProfile} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1 block">
              <span>First Name</span>
              <input value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} required className={inp} />
            </label>
            <label className="space-y-1 block">
              <span>Last Name</span>
              <input value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} className={inp} />
            </label>
            <label className="space-y-1 block">
              <span>Email (read-only)</span>
              <input value={profile.email} readOnly className={`${inp} opacity-60`} />
            </label>
            <label className="space-y-1 block">
              <span>Phone</span>
              <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} className={inp} />
            </label>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> Save Profile
            </button>
          </div>
        </form>
      )}

      {tab === 'receipt' && (
        <form onSubmit={savePrefs} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Receipt</p>
            <label className="space-y-1 block">
              <span>Header Text</span>
              <input value={prefs.receipt.header} onChange={(e) => setPrefs((p) => ({ ...p, receipt: { ...p.receipt, header: e.target.value } }))} className={inp} />
            </label>
            <label className="space-y-1 block">
              <span>Footer Text</span>
              <textarea rows={2} value={prefs.receipt.footer} onChange={(e) => setPrefs((p) => ({ ...p, receipt: { ...p.receipt, footer: e.target.value } }))} className={inp} />
            </label>
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Invoice</p>
            <label className="space-y-1 block">
              <span>Header Text</span>
              <input value={prefs.invoice.header} onChange={(e) => setPrefs((p) => ({ ...p, invoice: { ...p.invoice, header: e.target.value } }))} className={inp} />
            </label>
            <label className="space-y-1 block">
              <span>Footer Text</span>
              <textarea rows={2} value={prefs.invoice.footer} onChange={(e) => setPrefs((p) => ({ ...p, invoice: { ...p.invoice, footer: e.target.value } }))} className={inp} />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> Save Configuration
            </button>
          </div>
        </form>
      )}

      {tab === 'notifications' && (
        <form onSubmit={savePrefs} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 max-w-md">
          {[
            ['payment', 'Payment notifications'],
            ['feeUpdates', 'Fee updates'],
            ['expenses', 'Expense updates'],
            ['invoices', 'Invoice updates'],
            ['system', 'System notifications'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={Boolean(prefs.notifications[key])}
                onChange={(e) => setPrefs((p) => ({ ...p, notifications: { ...p.notifications, [key]: e.target.checked } }))}
              />
            </label>
          ))}
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> Save Preferences
            </button>
          </div>
        </form>
      )}

      {tab === 'security' && (
        <form onSubmit={savePassword} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 max-w-xl">
          <label className="space-y-1 block">
            <span>Current Password</span>
            <input type="password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} required className={inp} />
          </label>
          <label className="space-y-1 block">
            <span>New Password (min 8 chars)</span>
            <input type="password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} required className={inp} />
          </label>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold disabled:opacity-50">
              <Lock className="w-3.5 h-3.5" /> Update Password
            </button>
          </div>
        </form>
      )}

      {tab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-md">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon className="w-4 h-4 text-violet-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>Dark Mode</span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-all ${darkMode ? 'bg-violet-600 justify-end' : 'bg-slate-300 justify-start'}`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-sm" />
            </button>
          </div>
        </div>
      )}

      <ToastComponent />
    </div>
  );
};

export default Settings;

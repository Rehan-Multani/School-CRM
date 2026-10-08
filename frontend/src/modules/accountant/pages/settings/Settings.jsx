import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { useAccountantAuth } from '../../context/AccountantAuthContext';
import { useAccountantTheme } from '../../context/AccountantThemeContext';
import { useToast } from '../../components/ui/Toast';
import { accountantAuthApi, accountantApi } from '../../../../shared/api/client';
import { sanitizeMobileInput, isValid10DigitMobile } from '../../../../shared/utils/mobileValidation';
import { Save, Lock, Moon, Sun } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'receipt', label: 'Receipt / Invoice Config' },
  { id: 'notifications', label: 'Notification Preferences' },
  { id: 'security', label: 'Security' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'feePolicy', label: 'Fee Policy' },
];

const FEE_POLICY_DEFAULTS = {
  lateFee: { type: 'NONE', amount: 0, graceDays: 0, maxAmount: 0 },
  defaultDueDay: 10,
};

const LATE_FEE_TYPES = [
  ['NONE', 'No late fee'],
  ['FLAT', 'Flat amount once overdue'],
  ['PER_DAY', 'Per day overdue'],
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
  const [feePolicy, setFeePolicy] = useState(FEE_POLICY_DEFAULTS);

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
      .feeSettings()
      .then((res) => {
        const d = res?.data || {};
        setFeePolicy({
          lateFee: { ...FEE_POLICY_DEFAULTS.lateFee, ...(d.lateFee || {}) },
          defaultDueDay: d.defaultDueDay ?? FEE_POLICY_DEFAULTS.defaultDueDay,
        });
      })
      .catch(() => {});

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
    if (profile.phone && !isValid10DigitMobile(profile.phone, false)) {
      showToast('Phone number must be exactly 10 digits', 'error');
      return;
    }
    setSaving(true);
    accountantAuthApi
      .updateProfile({ firstName: profile.firstName, lastName: profile.lastName, phone: sanitizeMobileInput(profile.phone) })
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

  const saveFeePolicy = (e) => {
    e.preventDefault();
    const dueDay = Number(feePolicy.defaultDueDay);
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) return showToast('Default due day must be between 1 and 28', 'error');
    const lf = feePolicy.lateFee;
    if (lf.type !== 'NONE' && !(Number(lf.amount) > 0)) return showToast('Enter a late fee amount greater than 0', 'error');
    setSaving(true);
    accountantApi
      .updateFeeSettings({
        lateFee: {
          type: lf.type,
          amount: Number(lf.amount) || 0,
          graceDays: Number(lf.graceDays) || 0,
          maxAmount: lf.type === 'PER_DAY' ? Number(lf.maxAmount) || 0 : 0,
        },
        defaultDueDay: dueDay,
      })
      .then(() => showToast('Fee policy saved', 'success'))
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
              <input placeholder="e.g. Rahul" value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} required className={inp} />
            </label>
            <label className="space-y-1 block">
              <span>Last Name</span>
              <input placeholder="e.g. Sharma" value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} className={inp} />
            </label>
            <label className="space-y-1 block">
              <span>Email (read-only)</span>
              <input value={profile.email} readOnly className={`${inp} opacity-60`} />
            </label>
            <label className="space-y-1 block">
              <div className="flex items-center justify-between">
                <span>Phone</span>
                {profile.phone ? (
                  <span className={`text-[10px] font-bold ${profile.phone.length === 10 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {profile.phone.length}/10 digits
                  </span>
                ) : null}
              </div>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: sanitizeMobileInput(e.target.value) }))}
                className={inp}
              />
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
              <input placeholder="e.g. Fee Receipt" value={prefs.receipt.header} onChange={(e) => setPrefs((p) => ({ ...p, receipt: { ...p.receipt, header: e.target.value } }))} className={inp} />
            </label>
            <label className="space-y-1 block">
              <span>Footer Text</span>
              <textarea placeholder="e.g. This is a computer generated receipt" rows={2} value={prefs.receipt.footer} onChange={(e) => setPrefs((p) => ({ ...p, receipt: { ...p.receipt, footer: e.target.value } }))} className={inp} />
            </label>
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Invoice</p>
            <label className="space-y-1 block">
              <span>Header Text</span>
              <input placeholder="e.g. Tax Invoice" value={prefs.invoice.header} onChange={(e) => setPrefs((p) => ({ ...p, invoice: { ...p.invoice, header: e.target.value } }))} className={inp} />
            </label>
            <label className="space-y-1 block">
              <span>Footer Text</span>
              <textarea placeholder="e.g. Payable within 7 days" rows={2} value={prefs.invoice.footer} onChange={(e) => setPrefs((p) => ({ ...p, invoice: { ...p.invoice, footer: e.target.value } }))} className={inp} />
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
            <input placeholder="Enter current password" type="password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} required className={inp} />
          </label>
          <label className="space-y-1 block">
            <span>New Password (min 8 chars)</span>
            <input placeholder="At least 8 characters" type="password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} required className={inp} />
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

      {tab === 'feePolicy' && (
        <form onSubmit={saveFeePolicy} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 max-w-xl">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Late fee</p>
            {LATE_FEE_TYPES.map(([value, label]) => (
              <label key={value} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer">
                <input
                  type="radio"
                  name="lateFeeType"
                  value={value}
                  checked={feePolicy.lateFee.type === value}
                  onChange={() => setFeePolicy((p) => ({ ...p, lateFee: { ...p.lateFee, type: value } }))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {feePolicy.lateFee.type !== 'NONE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1 block">
                <span>{feePolicy.lateFee.type === 'PER_DAY' ? 'Amount per day (₹)' : 'Flat amount (₹)'}</span>
                <input type="number" min="0" step="1" placeholder="e.g. 50" value={feePolicy.lateFee.amount} onChange={(e) => setFeePolicy((p) => ({ ...p, lateFee: { ...p.lateFee, amount: e.target.value } }))} className={inp} />
              </label>
              <label className="space-y-1 block">
                <span>Grace days after due date</span>
                <input type="number" min="0" step="1" placeholder="e.g. 5" value={feePolicy.lateFee.graceDays} onChange={(e) => setFeePolicy((p) => ({ ...p, lateFee: { ...p.lateFee, graceDays: e.target.value } }))} className={inp} />
              </label>
              {feePolicy.lateFee.type === 'PER_DAY' && (
                <label className="space-y-1 block">
                  <span>Maximum late fee per invoice (₹, 0 = no cap)</span>
                  <input type="number" min="0" step="1" placeholder="e.g. 1000" value={feePolicy.lateFee.maxAmount} onChange={(e) => setFeePolicy((p) => ({ ...p, lateFee: { ...p.lateFee, maxAmount: e.target.value } }))} className={inp} />
                </label>
              )}
            </div>
          )}

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Invoice due date</p>
            <label className="space-y-1 block max-w-xs">
              <span>Default due day of the month (1-28)</span>
              <input type="number" min="1" max="28" step="1" value={feePolicy.defaultDueDay} onChange={(e) => setFeePolicy((p) => ({ ...p, defaultDueDay: e.target.value }))} className={inp} />
            </label>
            <p className="text-[10px] text-slate-400">Used when generating scheduled installment invoices without an explicit due date.</p>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> Save Fee Policy
            </button>
          </div>
        </form>
      )}

      <ToastComponent />
    </div>
  );
};

export default Settings;


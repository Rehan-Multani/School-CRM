import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useHRAuth } from '../../context/HRAuthContext';
import { useHRTheme } from '../../context/HRThemeContext';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import {
  Save,
  Sliders,
  Sun,
  Moon,
  Clock,
  Calendar,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Building,
  CheckCircle2,
  CalendarDays,
  BadgeCent,
  Shield,
  User,
  Lock,
  KeyRound,
} from 'lucide-react';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const Settings = () => {
  const { user } = useHRAuth();
  const { darkMode, toggleDarkMode } = useHRTheme();
  const { showToast, ToastComponent } = useToast();

  const [activeTab, setActiveTab] = useState('policy');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Settings State
  const [settings, setSettings] = useState({
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    shiftStartTime: '08:00 AM',
    shiftEndTime: '03:00 PM',
    casualLeaveQuota: 12,
    medicalLeaveQuota: 6,
    paidLeaveQuota: 10,
    lateFineAmount: 0,
    absentDeductionPerDay: 0,
    probationPeriodMonths: 6,
    autoApproveLeaves: false,
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hrApi.settings();
      if (res?.success && res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleWorkingDayToggle = (day) => {
    setSettings((prev) => {
      const current = prev.workingDays || [];
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];
      return { ...prev, workingDays: updated };
    });
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await hrApi.updateSettings({
        workingDays: settings.workingDays,
        shiftStartTime: settings.shiftStartTime,
        shiftEndTime: settings.shiftEndTime,
        casualLeaveQuota: Number(settings.casualLeaveQuota),
        medicalLeaveQuota: Number(settings.medicalLeaveQuota),
        paidLeaveQuota: Number(settings.paidLeaveQuota),
        lateFineAmount: Number(settings.lateFineAmount),
        absentDeductionPerDay: Number(settings.absentDeductionPerDay),
        probationPeriodMonths: Number(settings.probationPeriodMonths),
        autoApproveLeaves: Boolean(settings.autoApproveLeaves),
      });

      if (res?.success) {
        showToast('Institutional HR policy and leave quotas updated!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Profile & Password State
  const [profileForm, setProfileForm] = useState({
    firstName: user?.name?.split(' ')[0] || 'HR',
    lastName: user?.name?.split(' ').slice(1).join(' ') || 'Manager',
    phone: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (activeTab === 'profile') {
      hrApi.profile().then((res) => {
        if (res?.success && res.user) {
          setProfileForm({
            firstName: res.user.firstName || res.user.name?.split(' ')[0] || '',
            lastName: res.user.lastName || '',
            phone: res.user.phone || '',
          });
        }
      }).catch(() => {});
    }
  }, [activeTab]);

  
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await hrApi.updateProfile(profileForm);
      if (res?.success) {
        showToast('Profile information updated successfully!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    setUpdatingPassword(true);
    try {
      await hrApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showToast('Account password updated successfully!', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to update password', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Institutional HR Operations & Policy Settings"
        subtitle="Configure campus shift timings, weekly academic schedules, annual staff leave allowances, and payroll deduction rules."
        actions={
          <button
            onClick={fetchSettings}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'policy', label: 'Shift Timings & Working Days', icon: CalendarDays },
          { id: 'quotas', label: 'Annual Leave Quotas', icon: Calendar },
          { id: 'deductions', label: 'Payroll & Statutory Rules', icon: BadgeCent },
          { id: 'appearance', label: 'Theme & Institution Profile', icon: Shield },
          { id: 'profile', label: 'HR Profile & Security', icon: User },
        ].map((t) => {
          const TabIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-2 ${
                activeTab === t.id
                  ? 'border-b-2 border-indigo-650 text-indigo-650 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchSettings} className="underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* Settings Form Container */}
      <form onSubmit={handleSavePolicy} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
        {/* Tab 1: Policy */}
        {activeTab === 'policy' && (
          <div className="space-y-6 text-xs font-semibold">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Standard Campus Shift Timings</h3>
              <p className="text-xs text-slate-400 mt-0.5">Define mandatory entry and exit hours for daily attendance logging</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Shift Start Time
                </label>
                <input
                  type="text"
                  value={settings.shiftStartTime || '08:00 AM'}
                  onChange={(e) => setSettings({ ...settings, shiftStartTime: e.target.value })}
                  placeholder="08:00 AM"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Shift End Time
                </label>
                <input
                  type="text"
                  value={settings.shiftEndTime || '03:00 PM'}
                  onChange={(e) => setSettings({ ...settings, shiftEndTime: e.target.value })}
                  placeholder="03:00 PM"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Institutional Working Days</h4>
              <p className="text-[11px] text-slate-400 mb-3">Select the active operational schedule for faculty presence</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {WEEKDAYS.map((day) => {
                  const isChecked = (settings.workingDays || []).includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => handleWorkingDayToggle(day)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer font-bold ${
                        isChecked
                          ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="block text-xs">{day.slice(0, 3)}</span>
                      <span className="block text-[9px] mt-0.5 uppercase tracking-wider">{isChecked ? 'Active' : 'Off'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Quotas */}
        {activeTab === 'quotas' && (
          <div className="space-y-6 text-xs font-semibold">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Annual Leave Entitlements</h3>
              <p className="text-xs text-slate-400 mt-0.5">Configured yearly quotas credited to full-time faculty profiles</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Casual Leave (Days / Year)
                </label>
                <input
                  type="number"
                  value={settings.casualLeaveQuota}
                  onChange={(e) => setSettings({ ...settings, casualLeaveQuota: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Medical / Sick Leave (Days / Year)
                </label>
                <input
                  type="number"
                  value={settings.medicalLeaveQuota}
                  onChange={(e) => setSettings({ ...settings, medicalLeaveQuota: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Paid / Earned Leave (Days / Year)
                </label>
                <input
                  type="number"
                  value={settings.paidLeaveQuota}
                  onChange={(e) => setSettings({ ...settings, paidLeaveQuota: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between mt-4">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Auto-Approve Quota-Compliant Leaves</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Automatically approve single-day casual leaves if staff has positive remaining balance</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, autoApproveLeaves: !prev.autoApproveLeaves }))}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.autoApproveLeaves ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    settings.autoApproveLeaves ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Deductions */}
        {activeTab === 'deductions' && (
          <div className="space-y-6 text-xs font-semibold">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compensation & Deduction Parameters</h3>
              <p className="text-xs text-slate-400 mt-0.5">Automated payroll adjustments for unapproved absences and delays</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Unapproved Absent Deduction (₹ / Day)
                </label>
                <input
                  type="number"
                  value={settings.absentDeductionPerDay || 0}
                  onChange={(e) => setSettings({ ...settings, absentDeductionPerDay: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold text-rose-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Standard Probation Period (Months)
                </label>
                <input
                  type="number"
                  value={settings.probationPeriodMonths || 6}
                  onChange={(e) => setSettings({ ...settings, probationPeriodMonths: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Appearance & Institution */}
        {activeTab === 'appearance' && (
          <div className="space-y-6 text-xs font-semibold">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Portal Display & Branding</h3>
              <p className="text-xs text-slate-400 mt-0.5">Custom appearance and tenant institution profile</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Workspace Theme Mode</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Toggle between crisp Light Mode and Dark Mode</p>
              </div>
              <button
                type="button"
                onClick={toggleDarkMode}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                <span>{darkMode ? 'Dark Theme (Active)' : 'Light Theme (Active)'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
              <span className="text-[10px] font-bold text-indigo-650 uppercase tracking-wider block">Institutional Scoping</span>
              <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                {user?.schoolName || 'Greenfield Public School'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Logged in as: {user?.name} ({user?.email})</p>
            </div>
          </div>
        )}

        {/* Tab 5: HR Profile & Security */}
        {activeTab === 'profile' && (
          <div className="space-y-6 text-xs font-semibold">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">HR Officer Profile</h3>
              <p className="text-xs text-slate-400 mt-0.5">Manage your personal credentials and login security</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">First Name</label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Last Name</label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-start">
              <button
                type="button"
                onClick={handleUpdateProfile}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
              >
                {saving ? 'Updating...' : 'Update Personal Details'}
              </button>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Update Security Password</h4>
              <p className="text-xs text-slate-400 mb-4">Ensure your account uses a strong, protected passphrase</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-start mt-4">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={updatingPassword}
                  className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-xs hover:bg-slate-800 cursor-pointer"
                >
                  {updatingPassword ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'profile' && (
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Policy Settings'}</span>
            </button>
          </div>
        )}
      </form>

      <ToastComponent />
    </div>
  );
};

export default Settings;

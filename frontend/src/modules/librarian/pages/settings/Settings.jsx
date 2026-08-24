import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { useLibrarianAuth } from '../../context/LibrarianAuthContext';
import { useToast } from '../../components/ui/Toast';
import { SkeletonForm } from '../../components/ui/SkeletonLoader';
import { Save, User, RefreshCw, ShieldCheck } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';

const ToggleSwitch = ({ checked, onChange, label, description }) => (
  <label className="flex items-center justify-between gap-4 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer">
    <div className="min-w-0">
      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{label}</span>
      {description && <span className="block text-3xs text-slate-400 mt-0.5">{description}</span>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </label>
);

export const Settings = () => {
  const { user, updateUser } = useLibrarianAuth();
  const location = useLocation();
  const toast = useToast();

  const getInitialTab = () => {
    if (location.pathname.includes('/rules') || location.pathname.includes('/fines')) return 'rules';
    return 'profile';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    gender: 'MALE',
    employeeId: '',
    email: '',
  });

  const [settings, setSettings] = useState({
    maxBooksStudent: 3,
    maxBooksTeacher: 5,
    issueDaysStudent: 14,
    issueDaysTeacher: 30,
    fineEnabled: true,
    finePerDay: 5,
    maxFineAmount: 500,
    allowRenewal: true,
    maxRenewals: 2,
    renewalPeriodDays: 14,
    gracePeriodDays: 0,
    blockIssueOnOverdue: true,
    lostBookFineMultiplier: 1.5,
    damagedBookFineMultiplier: 0.5,
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profileRes, settingsRes] = await Promise.allSettled([
        librarianApi.getProfile(),
        librarianApi.settings(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        const p = profileRes.value.data;
        setProfile({
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          phone: p.phone || '',
          gender: p.gender || 'MALE',
          employeeId: p.employeeId || '',
          email: p.email || '',
        });
      } else {
        toast.error('Failed to load profile');
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        setSettings(settingsRes.value.data);
      } else {
        toast.error('Failed to load library rules & fines');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await librarianApi.updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        gender: profile.gender,
      });
      const updated = res.data;
      updateUser({ name: updated.name, phone: updated.phone });
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveRules = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await librarianApi.updateSettings({
        maxBooksStudent: Number(settings.maxBooksStudent) || 3,
        maxBooksTeacher: Number(settings.maxBooksTeacher) || 5,
        issueDaysStudent: Number(settings.issueDaysStudent) || 14,
        issueDaysTeacher: Number(settings.issueDaysTeacher) || 30,
        fineEnabled: Boolean(settings.fineEnabled),
        finePerDay: Number(settings.finePerDay) || 5,
        maxFineAmount: Number(settings.maxFineAmount) || 500,
        allowRenewal: Boolean(settings.allowRenewal),
        maxRenewals: Number(settings.maxRenewals) || 2,
        renewalPeriodDays: Number(settings.renewalPeriodDays) || 14,
        gracePeriodDays: Number(settings.gracePeriodDays) || 0,
        blockIssueOnOverdue: Boolean(settings.blockIssueOnOverdue),
        lostBookFineMultiplier: Number(settings.lostBookFineMultiplier) || 0,
        damagedBookFineMultiplier: Number(settings.damagedBookFineMultiplier) || 0,
      });
      toast.success('Rules & fines saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const settingsTabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'rules', label: 'Rules & Fines' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Manage your personal profile, and configure all library borrowing, renewal, and fine rules in one place."
        actions={
          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* Tabs */}
      <Tabs tabs={settingsTabs} activeTab={activeTab} onChange={setActiveTab} />

      {loading ? (
        <SkeletonForm fields={6} />
      ) : activeTab === 'profile' ? (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <img
                src={user?.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face'}
                alt={user?.name || 'Librarian'}
                className="h-16 w-16 rounded-full border-2 border-indigo-500 shrink-0 object-cover"
              />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{user?.name || 'Librarian'}</h3>
                <p className="text-xs text-slate-500">{user?.role || 'Head Librarian'} • {profile.email}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-3xs font-bold rounded-full">
                  Active Librarian Session
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">First Name *</label>
                <input
                  type="text"
                  required
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">Last Name</label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">Phone Number</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">Gender</label>
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">Employee ID</label>
                <input
                  type="text"
                  disabled
                  value={profile.employeeId}
                  className="w-full h-10 px-3.5 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">Email (Login ID)</label>
                <input
                  type="text"
                  disabled
                  value={profile.email}
                  className="w-full h-10 px-3.5 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">School Institution</label>
                <input
                  type="text"
                  disabled
                  value={user?.schoolName || ''}
                  className="w-full h-10 px-3.5 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">Academic Session</label>
                <input
                  type="text"
                  disabled
                  value={user?.academicSession || ''}
                  className="w-full h-10 px-3.5 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-800 dark:text-indigo-300">
                <span className="font-bold block">Strict School Data Isolation</span>
                All catalog records, borrower requests, and transaction logs are isolated strictly to your school workspace.
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-indigo-900/10 disabled:opacity-50"
            >
              <User className="h-4 w-4" />
              <span>{savingProfile ? 'Saving Profile...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSaveRules} className="space-y-6">
          {/* Issue / Return / Renewal Rules */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Circulation Loan & Renewal Rules
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure lending limits and durations for student and teacher borrowers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">
                  Max Books Allowed (Students) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={settings.maxBooksStudent}
                  onChange={(e) => setSettings({ ...settings, maxBooksStudent: e.target.value })}
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">
                  Max Books Allowed (Teachers/Faculty) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={settings.maxBooksTeacher}
                  onChange={(e) => setSettings({ ...settings, maxBooksTeacher: e.target.value })}
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">
                  Issue Duration for Students (Days) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={settings.issueDaysStudent}
                  onChange={(e) => setSettings({ ...settings, issueDaysStudent: e.target.value })}
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">
                  Issue Duration for Teachers (Days) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={settings.issueDaysTeacher}
                  onChange={(e) => setSettings({ ...settings, issueDaysTeacher: e.target.value })}
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">
                  Max Renewals Allowed Per Loan *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={settings.maxRenewals}
                  onChange={(e) => setSettings({ ...settings, maxRenewals: e.target.value })}
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">
                  Days Added Per Renewal (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.renewalPeriodDays}
                  onChange={(e) => setSettings({ ...settings, renewalPeriodDays: e.target.value })}
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ToggleSwitch
                checked={Boolean(settings.allowRenewal)}
                onChange={(val) => setSettings({ ...settings, allowRenewal: val })}
                label="Allow Renewals"
                description="Let borrowers extend their due date"
              />
              <ToggleSwitch
                checked={Boolean(settings.blockIssueOnOverdue)}
                onChange={(val) => setSettings({ ...settings, blockIssueOnOverdue: val })}
                label="Block Issue on Overdue"
                description="Stop new issues while a borrower has overdue books"
              />
            </div>
          </div>

          {/* Fine Rates & Penalty Rules */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Fine Rates & Penalty Rules
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set daily late fee tariffs, grace periods, and caps for the school library.
              </p>
            </div>

            <ToggleSwitch
              checked={Boolean(settings.fineEnabled)}
              onChange={(val) => setSettings({ ...settings, fineEnabled: val })}
              label="Enable Overdue Fines"
              description="Turn off to stop charging late fees on overdue returns"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">
                  Overdue Tariff (₹ / Day) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  disabled={!settings.fineEnabled}
                  value={settings.finePerDay}
                  onChange={(e) => setSettings({ ...settings, finePerDay: e.target.value })}
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-500 uppercase">
                  Maximum Penalty Cap (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  disabled={!settings.fineEnabled}
                  value={settings.maxFineAmount}
                  onChange={(e) => setSettings({ ...settings, maxFineAmount: e.target.value })}
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-3xs font-bold text-slate-500 uppercase">
                Grace Period (Days Before Fine Starts)
              </label>
              <input
                type="number"
                min="0"
                disabled={!settings.fineEnabled}
                value={settings.gracePeriodDays}
                onChange={(e) => setSettings({ ...settings, gracePeriodDays: e.target.value })}
                className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Lost / Damaged Copy Charges
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-4">
                Charge multiplier applied to the book's catalog price when a copy is returned lost or damaged.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-3xs font-bold text-slate-500 uppercase">
                    Lost Copy Charge Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={settings.lostBookFineMultiplier}
                    onChange={(e) => setSettings({ ...settings, lostBookFineMultiplier: e.target.value })}
                    className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-3xs font-bold text-slate-500 uppercase">
                    Damaged Copy Charge Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={settings.damagedBookFineMultiplier}
                    onChange={(e) => setSettings({ ...settings, damagedBookFineMultiplier: e.target.value })}
                    className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-indigo-900/10 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Rules & Fines'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
export default Settings;

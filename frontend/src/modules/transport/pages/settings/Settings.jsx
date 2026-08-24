import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { useTransportAuth } from '../../context/TransportAuthContext';
import { Save, User, Settings as SettingsIcon, ShieldCheck, Map } from 'lucide-react';

export const Settings = () => {
  const toast = useToast();
  const { user } = useTransportAuth();

  const [profile, setProfile] = useState({
    name: user?.name || 'Manish Dave',
    email: user?.email || 'manish.dave@school.edu',
    phone: '+91-9876543210'
  });

  const [rules, setRules] = useState({
    maxCapacityOverloadLimit: 0, // strict capacity constraint
    notifyParentsOnChange: true,
    weeklyFuelReportEmail: true
  });

  const [mapsKey, setMapsKey] = useState('AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    toast.success('Profile settings updated successfully.');
  };

  const handleSaveRules = (e) => {
    e.preventDefault();
    toast.success('System fleet operation constraints updated.');
  };

  return (
    <div className="space-y-6 text-xs max-w-xl mx-auto animate-fadeIn">
      <PageHeader
        title="Transport Settings"
        subtitle="Manage fleet thresholds, notification rules, profile credentials and Google Maps API keys."
      />

      {/* Profile settings card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-805 rounded-3xl p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <User className="h-4.5 w-4.5 text-cyan-600" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Account Profile</h3>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-550">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550">Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550">Contact Mobile</label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955"
              />
            </div>
          </div>
          <button
            type="submit"
            className="h-10 px-4 bg-cyan-600 hover:bg-cyan-705 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
          >
            <Save className="h-4 w-4" />
            <span>Update Profile</span>
          </button>
        </form>
      </div>

      {/* Fleet Operation Rules */}
      <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-805 rounded-3xl p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <SettingsIcon className="h-4.5 w-4.5 text-cyan-600" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-205 uppercase tracking-wide">Operation Safety Rules</h3>
        </div>
        <form onSubmit={handleSaveRules} className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100">
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-250">Capacity Strict Constraints</p>
              <p className="text-4xs text-slate-450 block mt-0.5">Prevent student allocation if capacity exceeds limit.</p>
            </div>
            <input
              type="checkbox"
              checked={rules.maxCapacityOverloadLimit === 0}
              onChange={(e) => setRules(prev => ({ ...prev, maxCapacityOverloadLimit: e.target.checked ? 0 : 5 }))}
              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-4.5 w-4.5"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100">
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-250">Parent Broadcast Alerts</p>
              <p className="text-4xs text-slate-450 block mt-0.5">Send instant SMS dispatch warnings on route delays.</p>
            </div>
            <input
              type="checkbox"
              checked={rules.notifyParentsOnChange}
              onChange={(e) => setRules(prev => ({ ...prev, notifyParentsOnChange: e.target.checked }))}
              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-4.5 w-4.5"
            />
          </div>

          <button
            type="submit"
            className="h-10 px-4 bg-cyan-600 hover:bg-cyan-705 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
          >
            <Save className="h-4 w-4" />
            <span>Update Thresholds</span>
          </button>
        </form>
      </div>
    </div>
  );
};

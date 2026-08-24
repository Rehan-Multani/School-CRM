import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { usePrincipalAuth } from '../../context/PrincipalAuthContext';
import { usePrincipalTheme } from '../../context/PrincipalThemeContext';
import { useToast } from '../../components/ui/Toast';
import { Save, User, Lock, Bell, Moon, Sun } from 'lucide-react';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, updateProfile } = usePrincipalAuth();
  const { darkMode, toggleTheme } = usePrincipalTheme();
  const { showToast, ToastComponent } = useToast();

  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Pass Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile({ name, email, phone });
    showToast('Principal profile card updated successfully!', 'success');
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    showToast('Principal security password updated!', 'success');
    setCurrentPassword('');
    setNewPassword('');
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings & Parameters" 
        subtitle="Manage principal profile credentials, notification subscription limits, dark mode toggle, and privacy." 
      />

      <Tabs 
        tabs={[
          { id: 'profile', label: 'Principal Profile' },
          { id: 'security', label: 'Security & Password' },
          { id: 'themes', label: 'Theme Toggles' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs font-semibold">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl">
            <img src={user?.photo} alt={user?.name} className="w-16 h-16 rounded-xl object-cover border border-slate-350" />
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Principal photo</span>
              <p className="text-[11px] text-slate-550 mt-1">PNG, JPG formats supported. Max size 2MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label>Authorized Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650" 
              />
            </div>
            <div className="space-y-1">
              <label>Official Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650" 
              />
            </div>
            <div className="space-y-1">
              <label>Direct Contact Phone</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650" 
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button 
              type="submit" 
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <form onSubmit={handleUpdatePassword} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label>Current Active Password</label>
              <input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650" 
              />
            </div>
            <div className="space-y-1">
              <label>New Target Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650" 
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button 
              type="submit" 
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Apply New Password</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'themes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs font-semibold">
          <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block border-b pb-2">Appearance customization</span>
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-2xl max-w-md">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon className="w-4 h-4 text-emerald-450" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>Dark Mode Layout Theme</span>
            </div>
            <button
              onClick={toggleTheme}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-all ${
                darkMode ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-sm"></div>
            </button>
          </div>
        </div>
      )}

      <ToastComponent />
    </div>
  );
};
export default Settings;

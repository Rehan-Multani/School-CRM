import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { useAccountantAuth } from '../../context/AccountantAuthContext';
import { useAccountantTheme } from '../../context/AccountantThemeContext';
import { useToast } from '../../components/ui/Toast';
import { Save, User, Lock, Moon, Sun, Receipt } from 'lucide-react';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, updateProfile } = useAccountantAuth();
  const { darkMode, toggleTheme } = useAccountantTheme();
  const { showToast, ToastComponent } = useToast();

  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Receipt template configurations state
  const [headerText, setHeaderText] = useState('Greenfield Public School');
  const [footerText, setFooterText] = useState('Thank you for choosing Greenfield Public School. Electronic verified copy.');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile({ name, email, phone });
    showToast('Accountant profile card updated successfully!', 'success');
  };

  const handleSaveReceiptTemplate = (e) => {
    e.preventDefault();
    showToast('Receipt template header & footers modified!', 'success');
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    showToast('Accountant security credentials password updated!', 'success');
    setCurrentPassword('');
    setNewPassword('');
  };

  return (
    <div className="space-y-6 text-xs font-semibold">
      <PageHeader 
        title="Settings & Parameters" 
        subtitle="Manage accountant profile info, customize printed receipt templates, and toggle themes." 
      />

      <Tabs 
        tabs={[
          { id: 'profile', label: 'Accountant Profile' },
          { id: 'templates', label: 'Receipt Template Design' },
          { id: 'security', label: 'Security & Password' },
          { id: 'themes', label: 'Theme Toggles' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 dark:bg-slate-955 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl">
            <img src={user?.photo} alt={user?.name} className="w-16 h-16 rounded-xl object-cover border" />
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Accountant Photo</span>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold">PNG, JPG formats supported. Max size 2MB.</p>
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
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605" 
              />
            </div>
            <div className="space-y-1">
              <label>Official Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-955 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605" 
              />
            </div>
            <div className="space-y-1">
              <label>Direct Contact Phone</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-955 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605" 
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button 
              type="submit" 
              className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-750 text-white rounded-xl font-bold shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'templates' && (
        <form onSubmit={handleSaveReceiptTemplate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <label>Receipt Header School Title</label>
            <input 
              type="text" 
              value={headerText} 
              onChange={(e) => setHeaderText(e.target.value)} 
              required 
              className="w-full bg-slate-50 dark:bg-slate-955 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605" 
            />
          </div>

          <div className="space-y-1">
            <label>Receipt Footer Terms Declaration</label>
            <textarea 
              rows={3}
              value={footerText} 
              onChange={(e) => setFooterText(e.target.value)} 
              required 
              className="w-full bg-slate-50 dark:bg-slate-955 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605" 
            />
          </div>

          <div className="flex justify-end pt-3">
            <button 
              type="submit" 
              className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-750 text-white rounded-xl font-bold shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Template Configurations</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <form onSubmit={handleUpdatePassword} className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label>Current Active Password</label>
              <input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-955 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605" 
              />
            </div>
            <div className="space-y-1">
              <label>New Target Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-955 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605" 
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button 
              type="submit" 
              className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-750 text-white rounded-xl font-bold shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Apply New Password</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'themes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block border-b pb-2">Appearance Layout customization</span>
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-955 border border-slate-100 rounded-2xl max-w-md">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon className="w-4 h-4 text-violet-405" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>Dark Mode Layout Theme</span>
            </div>
            <button
              onClick={toggleTheme}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-all ${
                darkMode ? 'bg-violet-605 justify-end' : 'bg-slate-300 justify-start'
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

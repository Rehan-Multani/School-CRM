import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  Settings, 
  Lock, 
  Bell, 
  Languages, 
  Eye, 
  LogOut, 
  KeyRound,
  ShieldCheck
} from 'lucide-react';

export const StudentSettings = () => {
  const { logout } = useStudentAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Settings form states
  const [language, setLanguage] = useState('English');
  const [notifPreferences, setNotifPreferences] = useState({
    attendance: true,
    homework: true,
    exams: true,
    results: true,
    fees: true,
    messages: true
  });
  
  // Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleTogglePreference = (key) => {
    setNotifPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChangePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New Password and Confirm Password do not match!');
      return;
    }
    alert('Password updated successfully! (Mock)');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of your student portal?')) {
      logout();
      navigate('/student/login');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Settings list column */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Appearance & Language */}
        <Card className="p-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border flex items-center gap-2">
            <Languages className="w-4 h-4 text-primary" />
            <span>Preferences</span>
          </h3>

          <div className="space-y-5 text-xs">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-foreground block">Portal Interface Theme</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Switch between dark and light themes</span>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 shrink-0 border border-border">
                {['light', 'dark'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize select-none transition-all ${
                      theme === t 
                        ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm' 
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Select */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <span className="font-bold text-foreground block">Primary Language</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Select your preferred system language</span>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="English">English</option>
                <option value="Hindi">हिन्दी (Hindi)</option>
                <option value="Spanish">Español (Spanish)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Notifications Preferences */}
        <Card className="p-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span>Notification Subscriptions</span>
          </h3>

          <div className="space-y-4 text-xs font-medium">
            {Object.entries(notifPreferences).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="capitalize text-foreground">{key} Updates</span>
                <button
                  onClick={() => handleTogglePreference(key)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 shrink-0 ${
                    enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Security Actions column */}
      <div className="lg:col-span-1 space-y-6">
        {/* Password Reset */}
        <Card className="p-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            <span>Update Password</span>
          </h3>

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-xs font-semibold shadow-premium transition-all active:scale-95 duration-100 select-none"
            >
              Update Password
            </button>
          </form>
        </Card>

        {/* Danger zone log out */}
        <Card className="p-6 border border-rose-500/20 bg-rose-500/5">
          <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-3">Session Management</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            Signing out will clear local authentication token states. Securely close browser sessions.
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 duration-100 select-none"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </Card>
      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { useParentTheme } from '../context/ParentThemeContext';
import { useParentAuth } from '../context/ParentAuthContext';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  Moon, Sun, Bell, Globe, Lock, LogOut,
  Check, Eye, EyeOff, ShieldCheck
} from 'lucide-react';

export const ParentSettings = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useParentTheme();
  const { logout } = useParentAuth();

  const [language, setLanguage] = useState('English');
  const [notifs, setNotifs] = useState({
    attendance: true,
    homework: true,
    results: true,
    fees: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    newPw: '',
    confirm: '',
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleToggleNotif = (key) => {
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Preferences updated!');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPw !== passwordForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPw.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    await new Promise(r => setTimeout(r, 800));
    setIsChangingPassword(false);
    setPasswordForm({ current: '', newPw: '', confirm: '' });
    toast.success('Password changed successfully!');
  };

  const handleConfirmLogout = () => {
    logout();
    navigate('/parent/login');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-black text-foreground">Portal Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">Manage credentials, notifications settings, and portal styling options</p>
      </div>

      {/* Theme Setting */}
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Display Mode</h3>
            <p className="text-[10px] text-slate-400">Toggle dark or light theme interface preferences</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-border">
          <span className="text-xs font-bold text-foreground">Dark Mode</span>
          <button
            onClick={toggleTheme}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
              theme === 'dark' ? 'bg-primary' : 'bg-slate-350 dark:bg-slate-700'
            }`}
            id="parent-settings-theme"
          >
            <span
              className={`w-4 h-4 bg-white rounded-full absolute transition-all ${
                theme === 'dark' ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Notifications Preferences */}
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Push Alert Preferences</h3>
            <p className="text-[10px] text-slate-400">Choose topics you wish to receive notifications about</p>
          </div>
        </div>
        <div className="space-y-2">
          {Object.entries(notifs).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-border capitalize">
              <div>
                <span className="text-xs font-bold text-foreground">{key} alerts</span>
                <p className="text-[9px] text-slate-400">Receive alerts related to child {key}</p>
              </div>
              <button
                onClick={() => handleToggleNotif(key)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                  enabled ? 'bg-primary' : 'bg-slate-350 dark:bg-slate-700'
                }`}
                id={`parent-settings-notif-${key}`}
              >
                <span
                  className={`w-4 h-4 bg-white rounded-full absolute transition-all ${
                    enabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Language */}
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Display Language</h3>
            <p className="text-[10px] text-slate-400">Select language options for menu options and tables</p>
          </div>
        </div>
        <div>
          <select
            value={language}
            onChange={(e) => { setLanguage(e.target.value); toast.success('Language updated!'); }}
            className="w-full px-4 py-3 rounded-2xl border border-border bg-white dark:bg-slate-900 text-sm focus:outline-none"
            id="parent-settings-lang"
          >
            <option>English</option>
            <option>Hindi</option>
            <option>Spanish</option>
          </select>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Security & Password</h3>
            <p className="text-[10px] text-slate-400">Update your parent account access password</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {[
            { id: 'current', label: 'Current Password', value: passwordForm.current, show: showCurrent, toggle: () => setShowCurrent(p => !p) },
            { id: 'newPw', label: 'New Password', value: passwordForm.newPw, show: showNew, toggle: () => setShowNew(p => !p) },
            { id: 'confirm', label: 'Confirm Password', value: passwordForm.confirm, show: showConfirm, toggle: () => setShowConfirm(p => !p) },
          ].map((field) => (
            <div key={field.id}>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {field.label}
              </label>
              <div className="relative">
                <input
                  type={field.show ? 'text' : 'password'}
                  required
                  value={field.value}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, [field.id]: e.target.value }))}
                  className="w-full px-4 py-3 pr-11 rounded-2xl border border-border bg-white dark:bg-slate-900 text-sm focus:outline-none"
                  placeholder="••••••••"
                  id={`parent-settings-pw-${field.id}`}
                />
                <button
                  type="button"
                  onClick={field.toggle}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                >
                  {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={isChangingPassword}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-70 text-white py-3.5 rounded-2xl text-sm font-bold shadow-premium transition-all active:scale-95 select-none"
            id="parent-settings-pw-submit"
          >
            {isChangingPassword ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <><Check className="w-4.5 h-4.5" /> Save Changes</>
            )}
          </button>
        </form>
      </Card>

      {/* Session/Logout */}
      <Card className="border-rose-250 bg-rose-500/5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider">Account Access</h3>
            <p className="text-[10px] text-rose-500/70">Logout of parent session on this device</p>
          </div>
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3.5 rounded-2xl text-sm font-bold transition-colors select-none"
          id="parent-settings-logout"
        >
          Sign Out of Portal
        </button>
      </Card>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Confirm Portal Logout"
        message="Are you sure you want to sign out of your parent account?"
        confirmLabel="Logout"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        variant="danger"
      />
    </div>
  );
};

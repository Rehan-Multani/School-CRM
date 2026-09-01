import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { 
  Lock, 
  User, 
  KeyRound, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  RotateCcw,
  Monitor,
  Smartphone
} from 'lucide-react';
import BrandLogo from '../ui/BrandLogo';

export const UniversalLogin = () => {
  const navigate = useNavigate();
  const { authenticateUser, resetPasswordByOTP } = useAppStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetId, setResetId] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const WEB_PANELS = [
    { 
      role: 'Super Admin', 
      label: 'Global SaaS Super Admin', 
      id: 'superadmin@gmail.com', 
      pass: '123', 
      target: '/super-admin/dashboard', 
      color: 'bg-slate-800/60 text-slate-200 border-slate-700/60 hover:bg-slate-800/90 hover:border-slate-500',
      isComplete: true 
    },
    { 
      role: 'Admin', 
      label: 'Vikramaditya (Admin)', 
      id: 'admin', 
      pass: 'admin123', 
      target: '/school-admin/dashboard', 
      color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25 hover:border-indigo-400',
      isComplete: true 
    },
    { 
      role: 'Accountant', 
      label: 'Virender Mehta (Accountant)', 
      id: 'accountant', 
      pass: 'accountant123', 
      target: '/accountant/dashboard', 
      color: 'bg-teal-500/15 text-teal-300 border-teal-500/30 hover:bg-teal-500/25 hover:border-teal-400',
      isComplete: false 
    },
    { 
      role: 'Library', 
      label: 'Sanjay Kumar (Librarian)', 
      id: 'librarian', 
      pass: 'lib123', 
      target: '/librarian/dashboard', 
      color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25 hover:border-cyan-400',
      isComplete: true 
    },
    { 
      role: 'Staff', 
      label: 'Meenakshi Iyer (HR & Staff)', 
      id: 'hr', 
      pass: 'hr123', 
      target: '/hr/dashboard', 
      color: 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-400',
      isComplete: false 
    },
    { 
      role: 'Principal', 
      label: 'Dr. S. Chatterjee (Principal)', 
      id: 'principal', 
      pass: 'principal123', 
      target: '/principal/dashboard', 
      color: 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-400',
      isComplete: false 
    }
  ];

  const APK_PANELS = [
    { 
      role: 'Parents', 
      label: 'Mr. Rajesh Sharma (Parent)', 
      id: 'rajesh.sharma@gmail.com', 
      pass: 'password123', 
      target: '/parent/dashboard', 
      color: 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25 hover:border-purple-400',
      isComplete: false 
    },
    { 
      role: 'Students', 
      label: 'Aarav Sharma (Student)', 
      id: 'STU108902', 
      pass: 'password123', 
      target: '/student/dashboard', 
      color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-400',
      isComplete: false 
    },
    { 
      role: 'Teacher', 
      label: 'Mr. Rajesh Kumar (Teacher)', 
      id: 'EMP101', 
      pass: 'password123', 
      target: '/teacher/dashboard', 
      color: 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25 hover:border-blue-400',
      isComplete: false 
    },
    { 
      role: 'Transport', 
      label: 'Manish Dave (Transport)', 
      id: 'transport', 
      pass: 'transport123', 
      target: '/transport/dashboard', 
      color: 'bg-orange-500/15 text-orange-300 border-orange-500/30 hover:bg-orange-500/25 hover:border-orange-400',
      isComplete: false 
    }
  ];

  const DEMO_PRESETS = [...WEB_PANELS, ...APK_PANELS];

  const handleLogin = (e) => {
    e?.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const res = authenticateUser(identifier, password);
      setIsLoading(false);

      if (res.success) {
        const role = res.user.role;
        // Sync role session in localStorage for individual module auth contexts
        const storageKeys = {
          'student': 'student-user',
          'teacher': 'teacher-user',
          'parent': 'parent-user',
          'school-admin': 'school-admin-user',
          'principal': 'principal-user',
          'accountant': 'accountant-user',
          'hr': 'hr-user',
          'librarian': 'librarian_user',
          'transport': 'transport_user',
          'super-admin': 'super_admin_user'
        };

        const key = storageKeys[role] || `${role}-user`;
        localStorage.setItem(key, JSON.stringify(res.user));
        if (role === 'parent' && res.user.children) {
          localStorage.setItem('parent-selected-child', res.user.children[0]);
        }

        // Route to dashboard
        const routeMap = {
          'student': '/student/dashboard',
          'teacher': '/teacher/dashboard',
          'parent': '/parent/dashboard',
          'school-admin': '/school-admin/dashboard',
          'principal': '/principal/dashboard',
          'accountant': '/accountant/dashboard',
          'hr': '/hr/dashboard',
          'librarian': '/librarian/dashboard',
          'transport': '/transport/dashboard',
          'super-admin': '/super-admin/dashboard'
        };

        navigate(routeMap[role] || '/');
      } else {
        setError(res.message || 'Invalid username or password');
      }
    }, 300);
  };

  const handleQuickDemo = (preset) => {
    setIdentifier(preset.id);
    setPassword(preset.pass);
    setError('');

    setIsLoading(true);
    setTimeout(() => {
      const res = authenticateUser(preset.id, preset.pass);
      setIsLoading(false);
      if (res.success) {
        const storageKeys = {
          'student': 'student-user',
          'teacher': 'teacher-user',
          'parent': 'parent-user',
          'school-admin': 'school-admin-user',
          'principal': 'principal-user',
          'accountant': 'accountant-user',
          'hr': 'hr-user',
          'librarian': 'librarian_user',
          'transport': 'transport_user',
          'super-admin': 'super_admin_user'
        };
        const key = storageKeys[res.user.role];
        if (key) localStorage.setItem(key, JSON.stringify(res.user));
        if (res.user.role === 'parent' && res.user.children) {
          localStorage.setItem('parent-selected-child', res.user.children[0]);
        }
        navigate(preset.target);
      }
    }, 200);
  };

  const handleSendOTP = (e) => {
    e.preventDefault();
    if (!resetId) return;
    setOtpSent(true);
    setOtpCode('749210'); // Simulated OTP
  };

  const handleVerifyReset = (e) => {
    e.preventDefault();
    if (!newPassword) return;
    const ok = resetPasswordByOTP(resetId, newPassword);
    if (ok) {
      setResetSuccess(true);
      setTimeout(() => {
        setForgotModalOpen(false);
        setResetSuccess(false);
        setOtpSent(false);
        setIdentifier(resetId);
        setPassword(newPassword);
      }, 1500);
    } else {
      setError('User not found. Check student ID or email.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-900 text-slate-100 font-sans">
      {/* Left Brand Visual Panel */}
      <div className="lg:w-1/2 p-8 lg:p-14 flex flex-col justify-between bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border-b lg:border-b-0 lg:border-r border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <BrandLogo className="h-11 w-11 rounded-xl shadow-lg shadow-black/40" />
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">Greenfield Public School</h1>
              <span className="text-xs text-indigo-300 font-semibold">SaaS Multi-Role Cloud Portal</span>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Coordinated 10-Role System (FRD Aligned)</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-white leading-tight">
              Single Sign-On for Students, Teachers & Administrators.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
              Authenticate using your Student ID, Employee ID, Email, or Mobile Number. The system automatically verifies role credentials and routes you to your authorized workspace.
            </p>
          </div>
        </div>

        {/* 1-Click Role Jumpers for instant evaluation */}
        <div className="mt-8 pt-5 border-t border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡</span> Quick Demo Accounts (1-Click Switch)
            </span>
            <span className="text-[10px] text-slate-400 font-semibold bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
              Web & App Split
            </span>
          </div>

          {/* Web Panels */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-bold text-indigo-200 tracking-wide uppercase">
                  Web Panels
                </span>
              </div>
              <span className="text-[10px] text-indigo-300/80 font-medium bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                Desktop Portals
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WEB_PANELS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickDemo(preset)}
                  className={`text-left p-2.5 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 duration-100 ${preset.color}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold truncate">{preset.role}</span>
                    {preset.isComplete && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        Complete
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-white/80 font-medium truncate mt-0.5">{preset.id}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Apks (Mobile Apps) */}
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-bold text-purple-200 tracking-wide uppercase">
                  Apks
                </span>
              </div>
              <span className="text-[10px] text-purple-300/80 font-medium bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                Mobile Apps
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {APK_PANELS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickDemo(preset)}
                  className={`text-left p-2.5 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 duration-100 ${preset.color}`}
                >
                  <div className="font-bold truncate">{preset.role}</div>
                  <div className="text-[10px] text-white/80 font-medium truncate mt-0.5">{preset.id}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="lg:w-1/2 p-8 lg:p-14 flex items-center justify-center bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Portal Authentication</h3>
            <p className="text-xs text-slate-400 mt-1">Enter your registered institution credentials to proceed</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                User Identifier (Student ID / Employee ID / Email / Mobile)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. STU108902, EMP101, or admin"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs font-semibold text-indigo-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating Credentials...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Role-Based Access Enforcement (RBAC)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              New accounts created by School Admin in User Management or HR Employee Wizard can be logged into directly using the assigned email/ID and password.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password OTP Modal (FRD §6.2) */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-black text-white">Reset Account Password</h4>
                <p className="text-xs text-slate-400 mt-0.5">Verification code will be dispatched to your registered contact</p>
              </div>
              <button 
                onClick={() => setForgotModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {resetSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-2 text-emerald-400">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <div className="text-xs font-bold">Password Updated Successfully!</div>
                <div className="text-[11px] text-emerald-300">You can now sign in with your new credentials.</div>
              </div>
            ) : !otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">Registered Email / Student ID / Mobile</label>
                  <input
                    type="text"
                    value={resetId}
                    onChange={(e) => setResetId(e.target.value)}
                    placeholder="e.g. STU108902 or rajesh.kumar@greenfield.edu"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                >
                  Send OTP Verification Code
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyReset} className="space-y-4">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
                  <span>Demo OTP Sent! Simulated code: </span>
                  <strong className="font-mono font-bold text-white bg-indigo-600 px-2 py-0.5 rounded">{otpCode}</strong>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-widest text-center text-sm font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                >
                  Confirm & Update Password
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default UniversalLogin;

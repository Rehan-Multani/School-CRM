import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../context/TeacherAuthContext';
import { BookOpenCheck, ArrowRight, ShieldAlert, Eye, EyeOff } from 'lucide-react';

export const TeacherLogin = () => {
  const [employeeId, setEmployeeId] = useState('EMP-2019-045');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useTeacherAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const res = login(employeeId, password);
    setLoading(false);
    if (res.success) {
      navigate('/teacher/dashboard');
    } else {
      setError(res.message);
    }
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const res = login('EMP-2019-045', 'password123');
    setLoading(false);
    if (res.success) navigate('/teacher/dashboard');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Left Panel — Brand / Illustration */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-primary via-indigo-600 to-accent p-12 relative overflow-hidden">
        {/* Abstract blobs */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute left-0 bottom-0 w-80 h-80 bg-secondary/20 rounded-full blur-3xl -ml-20 -mb-20" />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-2xl">
            <BookOpenCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight leading-none">School Management</h1>
            <span className="text-white/70 text-[11px] font-medium tracking-wider uppercase">School Management</span>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/90 text-[11px] font-semibold">Teacher Portal Active</span>
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Your classroom,<br />at your fingertips.
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm">
            Manage attendance, homework, marks, and student communication — all in one beautifully designed workspace.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            {['Mark Attendance', 'Create Homework', 'Upload Marks', 'Chat with Parents', 'View Timetable'].map(f => (
              <span key={f} className="bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[10px] font-semibold px-3 py-1.5 rounded-full">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative">
          <p className="text-white/50 text-[11px] font-medium">© 2025 School Management. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
            <BookOpenCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-foreground leading-none">School Management</h1>
            <span className="text-slate-400 text-[11px] font-medium tracking-wider uppercase">Teacher Portal</span>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-foreground mb-1.5">Welcome back 👋</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sign in with your employee credentials to continue.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-2xl text-xs font-medium mb-6">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Employee ID
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP-2019-045"
                className="w-full px-4 py-3 rounded-2xl border border-border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                id="teacher-login-id"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-2xl border border-border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                  id="teacher-login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <button type="button" className="text-[11px] text-primary font-semibold hover:underline">Forgot Password?</button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-70 text-white py-3.5 rounded-2xl text-sm font-bold shadow-premium transition-all duration-150 active:scale-95 select-none mt-2"
              id="teacher-login-submit"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-border" />
            <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or</span>
            <div className="flex-grow border-t border-border" />
          </div>

          <button
            onClick={handleQuickLogin}
            disabled={loading}
            className="w-full border-2 border-primary/30 text-primary dark:border-primary/40 py-3 rounded-2xl text-sm font-bold transition-all duration-150 active:scale-95 select-none hover:bg-primary/5"
            id="teacher-quick-login"
          >
            🚀 Quick Demo Login
          </button>

          <p className="text-center text-[11px] text-slate-400 mt-6">
            This portal is for authorized teachers only.<br />Contact admin for access issues.
          </p>
        </div>
      </div>
    </div>
  );
};

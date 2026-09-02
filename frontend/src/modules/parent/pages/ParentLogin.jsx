import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useParentAuth } from '../context/ParentAuthContext';
import { GraduationCap, ArrowRight, ShieldAlert, Eye, EyeOff, LayoutGrid } from 'lucide-react';

export const ParentLogin = () => {
  const [email, setEmail] = useState('rajesh.sharma@gmail.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useParentAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Parent Portal Login | School CRM';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const res = login(email, password);
    setLoading(false);
    if (res.success) {
      navigate('/parent/dashboard');
    } else {
      setError(res.message);
    }
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const res = login('rajesh.sharma@gmail.com', 'password123');
    setLoading(false);
    if (res.success) navigate('/parent/dashboard');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Left Panel — Brand / Illustration */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-primary via-indigo-600 to-accent p-12 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute left-0 bottom-0 w-80 h-80 bg-secondary/20 rounded-full blur-3xl -ml-20 -mb-20" />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-2xl">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight leading-none">School Management</h1>
            <span className="text-white/70 text-[11px] font-medium tracking-wider uppercase">Parent Portal</span>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/90 text-[11px] font-semibold">Parent Portal Active</span>
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Stay involved in<br />your child's journey.
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm">
            Monitor attendance, track grades, communicate with teachers, and pay tuition fees securely in one place.
          </p>
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
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-foreground leading-none">School Management</h1>
            <span className="text-slate-400 text-[11px] font-medium tracking-wider uppercase">Parent Portal</span>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-6">
            {/* Prominent Role Identifier Badge */}
            <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 shadow-sm">
              <GraduationCap className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              PARENT PORTAL
            </span>
            <h2 className="text-2xl font-black text-foreground mb-1">Parent Portal Login</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sign in with your registered parent email to continue</p>
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
                Parent Registered Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rajesh.sharma@gmail.com"
                className="w-full px-4 py-3 rounded-2xl border border-border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                id="parent-login-email"
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
                  id="parent-login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-70 text-white py-3.5 rounded-2xl text-sm font-bold shadow-premium transition-all duration-150 active:scale-95 select-none mt-2"
              id="parent-login-submit"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Parent Portal</span>
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
            id="parent-quick-login"
          >
            🚀 Demo Parent Account Sign In
          </button>

          <div className="mt-6 flex flex-col items-center gap-1.5 text-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Looking for another panel?</span>
              <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                <LayoutGrid className="w-3 h-3" /> All 6+ Web Panels & Portals →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentLogin;

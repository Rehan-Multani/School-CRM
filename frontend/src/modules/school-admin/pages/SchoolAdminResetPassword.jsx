import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldAlert, Sun, Moon } from 'lucide-react';
import { SchoolAdminBrandingEffect } from '../components/layout/SchoolAdminBrandingEffect';
import SchoolAdminBrandLogo from '../components/ui/SchoolAdminBrandLogo';
import { useSchoolAdminTheme } from '../context/SchoolAdminThemeContext';
import { schoolAdminAuthApi } from '../../../shared/api/client';

const inputClass =
  'h-12 w-full rounded-xl border border-slate-300 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-950/80 pl-11 pr-11 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-indigo-500/15 dark:focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60';

export default function SchoolAdminResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { darkMode, toggleTheme } = useSchoolAdminTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(token ? '' : 'This reset link is missing a token.');
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = 'Reset Password | School Admin';
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.trim().length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await schoolAdminAuthApi.resetPassword(token, password.trim());
      setDone(true);
      setTimeout(() => navigate('/school-admin/login?reset=1', { replace: true }), 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 text-slate-900 dark:text-slate-100">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute top-4 right-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs"
      >
        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <SchoolAdminBrandingEffect />
      <div className="w-full max-w-[400px]">
        <div className="mb-5 flex flex-col items-center text-center">
          <SchoolAdminBrandLogo className="mb-3 h-11 w-11 rounded-xl ring-1 ring-slate-200 dark:ring-white/10 shadow-xs" />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Choose a new password</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">This link works once and expires in 30 minutes.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-t-2 border-t-indigo-600 dark:border-t-blue-500 bg-white dark:bg-slate-900 p-6 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/40 backdrop-blur-xl">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-300"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {done ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Password updated. Redirecting to sign in…</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  New password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (error) setError('');
                    }}
                    required
                    minLength={8}
                    disabled={loading || !token}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((open) => !open)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      if (error) setError('');
                    }}
                    required
                    minLength={8}
                    disabled={loading || !token}
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    Save password
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center">
          <Link to="/school-admin/login" className="text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:text-indigo-600 dark:hover:text-blue-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}


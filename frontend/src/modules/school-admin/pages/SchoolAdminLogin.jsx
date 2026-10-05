import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  Users,
  Wallet,
  School,
  LayoutGrid,
  Sun,
  Moon,
} from 'lucide-react';
import SchoolAdminBrandLogo from '../components/ui/SchoolAdminBrandLogo';
import { SchoolAdminBrandingEffect } from '../components/layout/SchoolAdminBrandingEffect';
import { useSchoolAdminAuth } from '../context/SchoolAdminAuthContext';
import { useSchoolAdminTheme } from '../context/SchoolAdminThemeContext';
import { schoolAdminAuthApi } from '../../../shared/api/client';

const HIGHLIGHTS = [
  { icon: Users, text: 'Admissions, students, teachers, and staff in one place' },
  { icon: BookOpen, text: 'Academics, attendance, exams, and communication' },
  { icon: Wallet, text: 'Fees, plans, and school operations from your portal' },
];

const inputClass =
  'h-12 w-full rounded-xl border border-slate-300 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-950/80 pl-11 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-indigo-500/15 dark:focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60';

export const SchoolAdminLogin = () => {
  const { login } = useSchoolAdminAuth();
  const { darkMode, toggleTheme } = useSchoolAdminTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [view, setView] = useState('login');
  const [email, setEmail] = useState('admin@greenfield.edu');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(searchParams.get('reset') === '1' ? 'Password updated. Sign in with your new password.' : '');
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  useEffect(() => {
    document.title = 'School Admin Portal Login | School CRM';
  }, []);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const nextUser = await login(email.trim(), password);
      navigate(nextUser?.hasPlan ? '/school-admin/dashboard' : '/school-admin/plans');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResetUrl('');

    try {
      const result = await schoolAdminAuthApi.forgotPassword(email.trim());
      setEmailSent(Boolean(result.emailSent));
      setResetUrl(result.resetUrl || '');
      setView('sent');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to send reset instructions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 lg:grid lg:grid-cols-2">
      <SchoolAdminBrandingEffect />
      <section className="relative hidden h-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100/90 via-indigo-50/50 to-slate-200/60 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-10 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(79,70,229,0.12),_transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(79,70,229,0.22),_transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(14,165,233,0.08),_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom,_rgba(14,165,233,0.10),_transparent_48%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22] dark:opacity-[0.16]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.22) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-blue-400/30 bg-indigo-50 dark:bg-indigo-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-blue-300">
            <School className="h-3.5 w-3.5" />
            School Admin Portal
          </span>
          <div className="rounded-3xl bg-white/90 dark:bg-indigo-600/50 p-2.5 shadow-xl shadow-indigo-500/10 dark:shadow-[0_0_80px_rgba(79,70,229,0.28)] ring-1 ring-slate-200/80 dark:ring-white/10">
            <SchoolAdminBrandLogo className="h-40 w-40 rounded-[1.15rem]" useAuth={false} />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            School Administration
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Sign in to run your school – students, staff, academics, and billing.
          </p>
          <ul className="mt-6 w-full space-y-2.5 text-left">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-3 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm px-3.5 py-2.5 shadow-2xs"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-blue-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative flex h-full items-center justify-center overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 lg:border-l">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="absolute top-4 right-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="w-full max-w-[420px]">
          <div className="mb-5 flex flex-col items-center text-center">
            <SchoolAdminBrandLogo className="mb-3 h-11 w-11 rounded-xl ring-1 ring-slate-200 dark:ring-white/10 shadow-xs" useAuth={false} />
            
            {/* Prominent Role Identifier Badge */}
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-blue-500/40 bg-indigo-50 dark:bg-indigo-500/20 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-blue-300 shadow-2xs">
              <School className="h-3.5 w-3.5 text-indigo-600 dark:text-blue-400" />
              SCHOOL ADMIN PANEL
            </span>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {view === 'login' && 'School Admin Login'}
              {view === 'forgot' && 'Reset Admin Password'}
              {view === 'sent' && 'Check Your Email'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {view === 'login' && 'Sign in with your institutional administrator email'}
              {view === 'forgot' && 'We will send a secure link to your admin email'}
              {view === 'sent' && 'Follow the link to choose a new password'}
            </p>
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

            {notice && view === 'login' && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {view === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="sa-admin-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Admin email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      id="sa-admin-email"
                      type="email"
                      autoComplete="username"
                      autoFocus
                      placeholder="admin@school.edu"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (error) setError('');
                      }}
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="sa-admin-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setView('forgot');
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      id="sa-admin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (error) setError('');
                      }}
                      required
                      disabled={loading}
                      className={`${inputClass} pr-11`}
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

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in to School Admin...
                    </>
                  ) : (
                    <>
                      Sign In to School Admin
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {view === 'forgot' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="sa-reset-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Admin email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      id="sa-reset-email"
                      type="email"
                      autoComplete="username"
                      autoFocus
                      placeholder="admin@school.edu"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (error) setError('');
                      }}
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setView('login');
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
              </form>
            )}

            {view === 'sent' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-200">
                  If <span className="font-semibold">{email}</span> is registered, reset instructions are on the way.
                  {emailSent
                    ? ' Check your inbox and spam folder.'
                    : resetUrl
                      ? ' SMTP is not configured, so use the local reset link below.'
                      : ' If you do not see it, wait a minute and try again.'}
                </div>

                {resetUrl && (
                  <Link
                    to={(() => {
                      try {
                        const parsed = new URL(resetUrl, window.location.origin);
                        return `${parsed.pathname}${parsed.search}`;
                      } catch {
                        return '/school-admin/login';
                      }
                    })()}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
                  >
                    Open reset link
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setView('login');
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
            <p className="text-[11px] tracking-wide text-slate-500 dark:text-slate-400">
              Authorized school administrators only · Encrypted sign-in
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Looking for another panel?</span>
              <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-blue-400 hover:text-indigo-700 dark:hover:text-blue-300 hover:underline">
                <LayoutGrid className="w-3 h-3" /> All 6+ Web Panels & Portals →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SchoolAdminLogin;


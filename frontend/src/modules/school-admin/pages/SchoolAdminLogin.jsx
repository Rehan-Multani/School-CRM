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
} from 'lucide-react';
import SchoolAdminBrandLogo from '../components/ui/SchoolAdminBrandLogo';
import { SchoolAdminBrandingEffect } from '../components/layout/SchoolAdminBrandingEffect';
import { useSchoolAdminAuth } from '../context/SchoolAdminAuthContext';
import { schoolAdminAuthApi } from '../../../shared/api/client';

const HIGHLIGHTS = [
  { icon: Users, text: 'Admissions, students, teachers, and staff in one place' },
  { icon: BookOpen, text: 'Academics, attendance, exams, and communication' },
  { icon: Wallet, text: 'Fees, plans, and school operations from your portal' },
];

const inputClass =
  'h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-11 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-950 focus:ring-4 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-60';

export const SchoolAdminLogin = () => {
  const { login } = useSchoolAdminAuth();
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
    document.title = 'School Admin Login | School CRM';
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
    <div className="dark h-dvh overflow-hidden bg-slate-950 text-slate-100 lg:grid lg:grid-cols-2">
      <SchoolAdminBrandingEffect />
      <section className="relative hidden h-full items-center justify-center overflow-hidden px-10 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(79,70,229,0.22),_transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(14,165,233,0.10),_transparent_48%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
          <span className="mb-4 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
            School Admin Portal
          </span>
          <div className="rounded-3xl bg-slate-900/50 p-2.5 shadow-[0_0_80px_rgba(79,70,229,0.28)] ring-1 ring-white/10">
            <SchoolAdminBrandLogo className="h-40 w-40 rounded-[1.15rem]" useAuth={false} />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">
            School CRM
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
            Sign in to run your school — students, staff, academics, and billing.
          </p>
          <ul className="mt-6 w-full space-y-2.5 text-left">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-slate-300">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative flex h-full items-center justify-center overflow-hidden border-slate-800 bg-slate-950 px-4 lg:border-l">
        <div className="w-full max-w-[400px]">
          <div className="mb-5 flex flex-col items-center text-center">
            <SchoolAdminBrandLogo className="mb-3 h-11 w-11 rounded-xl ring-1 ring-white/10" useAuth={false} />
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {view === 'login' && 'Welcome back'}
              {view === 'forgot' && 'Reset password'}
              {view === 'sent' && 'Check your email'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              {view === 'login' && 'Sign in with your school admin email'}
              {view === 'forgot' && 'We will send a secure link to your admin email'}
              {view === 'sent' && 'Follow the link to choose a new password'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-300"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {notice && view === 'login' && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {view === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="sa-admin-email" className="block text-sm font-medium text-slate-300">
                    Admin email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
                    <label htmlFor="sa-admin-password" className="block text-sm font-medium text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setView('forgot');
                      }}
                      className="text-xs font-semibold text-indigo-400 transition hover:text-indigo-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {view === 'forgot' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="sa-reset-email" className="block text-sm font-medium text-slate-300">
                    Admin email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:pointer-events-none disabled:opacity-50"
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
                  className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
              </form>
            )}

            {view === 'sent' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-200">
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
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
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
                  className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] tracking-wide text-slate-500">
            Authorized school administrators only · Encrypted sign-in
          </p>
        </div>
      </section>
    </div>
  );
};

export default SchoolAdminLogin;

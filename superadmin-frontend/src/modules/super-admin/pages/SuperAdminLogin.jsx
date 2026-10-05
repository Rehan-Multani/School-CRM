import React, { useEffect, useState } from 'react';
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldAlert,
  School,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import BrandLogo from '../../../shared/ui/BrandLogo';

const HIGHLIGHTS = [
  { icon: School, text: 'Manage every school tenant from one console' },
  { icon: CreditCard, text: 'Track subscriptions, billing, and revenue' },
  { icon: ShieldCheck, text: 'Secure access for platform administrators' },
];

const inputClass =
  'h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition duration-150 hover:border-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-60 shadow-2xs';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('superadmin@gmail.com');
  const [password, setPassword] = useState('123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useSuperAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Super Admin Login | School CRM';
    // Ensure Super Admin Login page is presented in clean light version
    const root = window.document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.remove('dark');

    return () => {
      // Restore dark mode if previously set when leaving login
      if (hadDark && localStorage.getItem('super_admin_theme') === 'dark') {
        root.classList.add('dark');
      }
    };
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email.trim(), password);
      navigate('/super-admin/dashboard');
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Unable to reach the authentication service.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh h-dvh overflow-hidden bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white lg:grid lg:grid-cols-2">
      {/* Left Brand Showcase (Desktop) */}
      <section className="relative hidden h-full items-center justify-center overflow-hidden border-r border-slate-200/80 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-blue-50/50 px-10 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.12),_transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(14,165,233,0.08),_transparent_50%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.16) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/90 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700 shadow-2xs">
            Platform Console
          </span>
          <div className="rounded-3xl bg-white p-3 ring-1 ring-slate-200/80 shadow-[0_16px_40px_-10px_rgba(79,70,229,0.14),0_2px_8px_rgba(0,0,0,0.04)]">
            <BrandLogo className="h-36 w-36 rounded-2xl" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">School CRM</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
            One place to create schools, control subscriptions, and run the platform.
          </p>
          <ul className="mt-7 w-full space-y-2.5 text-left">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-3.5 rounded-xl border border-slate-200/90 bg-white/80 backdrop-blur-sm px-4 py-3 shadow-2xs transition duration-200 hover:border-indigo-200 hover:bg-white hover:shadow-xs"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-slate-700">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Right Login Form */}
      <section className="relative flex h-full items-center justify-center overflow-y-auto bg-slate-50/40 px-4 py-10 lg:bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.04),_transparent_50%)]" />

        <div className="relative z-10 w-full max-w-[420px]">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-xs">
              <BrandLogo className="h-9 w-9 rounded-lg" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-1.5 text-sm text-slate-500">Sign in with your super admin account</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.07),0_2px_8px_rgba(0,0,0,0.04)]">
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-3 text-sm text-rose-700 shadow-2xs"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="sa-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="sa-email"
                    type="email"
                    autoComplete="username"
                    autoFocus
                    placeholder="admin@schoolcrm.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    required
                    disabled={loading}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="sa-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="sa-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    required
                    disabled={loading}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((open) => !open)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="mt-3 h-12 w-full gap-2 text-sm font-semibold shadow-md shadow-indigo-500/20"
                disabled={loading}
              >
                {loading ? (
                  'Signing in...'
                ) : (
                  <>
                    Sign in to Console
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
            <span>Authorized personnel only · Encrypted sign-in</span>
          </p>
        </div>
      </section>
    </div>
  );
}

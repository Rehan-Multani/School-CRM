import React, { useEffect, useState } from 'react';
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
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
  'h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-11 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-950 focus:ring-4 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-60';

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
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
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
    <div className="dark h-dvh overflow-hidden bg-slate-950 text-slate-100 lg:grid lg:grid-cols-2">
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
            Platform Console
          </span>
          <div className="rounded-3xl bg-slate-900/50 p-2.5 ring-1 ring-white/10 shadow-[0_0_80px_rgba(79,70,229,0.28)]">
            <BrandLogo className="h-40 w-40 rounded-[1.15rem]" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">School CRM</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
            One place to create schools, control subscriptions, and run the platform.
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
            <BrandLogo className="mb-3 h-11 w-11 rounded-xl ring-1 ring-white/10" />
            <h2 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h2>
            <p className="mt-1.5 text-sm text-slate-400">Sign in with your super admin account</p>
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

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="sa-email" className="block text-sm font-medium text-slate-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
                <label htmlFor="sa-password" className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="mt-2 h-12 w-full gap-2 text-sm font-semibold" disabled={loading}>
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
              </Button>
            </form>
          </div>

          <p className="mt-4 text-center text-[11px] tracking-wide text-slate-500">
            Authorized personnel only · Encrypted sign-in
          </p>
        </div>
      </section>
    </div>
  );
}

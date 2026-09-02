import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLibrarianAuth } from '../context/LibrarianAuthContext';
import { Lock, User as UserIcon, AlertCircle, ArrowRight, ArrowLeft, Eye, EyeOff, Loader2, BookOpen, CheckCircle2, Users, Mail, LayoutGrid } from 'lucide-react';
import BrandLogo from '../../../shared/ui/BrandLogo';

export const LibrarianLogin = () => {
  const { login } = useLibrarianAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('meenakshi.lib@greenfield.edu');
  const [password, setPassword] = useState('Password@123');
  const [email, setEmail] = useState('');
  const [view, setView] = useState('login'); // 'login', 'forgot', 'sent'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = 'Librarian Portal Login | School CRM';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/librarian/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setView('sent');
    }, 600);
  };

  return (
    <div className="dark h-dvh overflow-hidden bg-slate-950 text-slate-100 lg:grid lg:grid-cols-2">
      {/* Left section: branding/features */}
      <section className="relative hidden h-full items-center justify-center overflow-hidden px-10 lg:flex">
        {/* Glow Effects */}
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
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-300">
            <BookOpen className="h-3.5 w-3.5" />
            Library Management Portal
          </span>
          <div className="rounded-3xl bg-slate-900/50 p-2.5 shadow-[0_0_80px_rgba(79,70,229,0.28)] ring-1 ring-white/10">
            <BrandLogo className="h-40 w-40 rounded-[1.15rem]" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">Library Desk</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
            One place to catalog books, track loans and returns, and manage student library accounts.
          </p>
          <ul className="mt-6 w-full space-y-2.5 text-left">
            <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="text-sm text-slate-300">Catalog Directory: Manage book copies, categories, and authors</span>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="text-sm text-slate-300">Circulation Desk: Track book issues, due dates, and check-in logs</span>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
                <Users className="h-4 w-4" />
              </span>
              <span className="text-sm text-slate-300">Membership Cards: Oversee library memberships and outstanding fines</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Right section: form */}
      <section className="relative flex h-full items-center justify-center overflow-hidden border-slate-800 bg-slate-950 px-4 lg:border-l">
        <div className="w-full max-w-[420px]">
          <div className="mb-5 flex flex-col items-center text-center">
            <BrandLogo className="mb-3 h-11 w-11 rounded-xl ring-1 ring-white/10" />
            
            {/* Prominent Role Identifier Badge */}
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/20 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-300 shadow-sm">
              <BookOpen className="h-3.5 w-3.5 text-blue-400" />
              LIBRARIAN PANEL
            </span>

            <h2 className="text-2xl font-bold tracking-tight text-white">
              {view === 'login' ? 'Librarian Login' : 'Reset Library Password'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {view === 'login' ? 'Sign in to manage library catalog, book issues, and returns' : 'Reset your library account password'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 border-t-2 border-t-blue-500 bg-slate-900/75 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {view === 'login' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">Librarian Email</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="librarian@greenfield.edu"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-11 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition hover:border-slate-600 focus:border-blue-500 focus:bg-slate-950 focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setView('forgot');
                      }}
                      className="text-xs font-semibold text-blue-400 transition hover:text-blue-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-11 pr-11 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition hover:border-slate-600 focus:border-blue-500 focus:bg-slate-950 focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((open) => !open)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in to Library Desk...
                    </>
                  ) : (
                    <>
                      Sign In to Librarian Portal
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {view === 'forgot' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      placeholder="librarian@greenfield.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-11 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition hover:border-slate-600 focus:border-blue-500 focus:bg-slate-950 focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition disabled:pointer-events-none disabled:opacity-50"
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
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-300">
                  If <span className="font-semibold">{email}</span> is registered in our database, reset instructions will be sent shortly. Check your inbox.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setEmail('');
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
            <p className="text-[11px] tracking-wide text-slate-500">
              Authorized librarians only · Secure database connection
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Looking for another panel?</span>
              <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300 hover:underline">
                <LayoutGrid className="w-3 h-3" /> All 6+ Web Panels & Portals →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LibrarianLogin;

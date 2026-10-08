import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePrincipalAuth } from '../context/PrincipalAuthContext';
import { usePrincipalTheme } from '../context/PrincipalThemeContext';
import { principalAuthApi } from '../../../shared/api/client';
import { Lock, User, AlertCircle, ArrowRight, ArrowLeft, Eye, EyeOff, Loader2, BookOpen, CheckCircle2, Users, Mail, Award, LayoutGrid, Sun, Moon, KeyRound, ShieldCheck } from 'lucide-react';
import BrandLogo from '../../../shared/ui/BrandLogo';

export const PrincipalLogin = () => {
  const { login } = usePrincipalAuth();
  const { darkMode, toggleTheme } = usePrincipalTheme();
  const navigate = useNavigate();

  const [username, setUsername] = useState('principal@greenfield.edu');
  const [password, setPassword] = useState('Password@123');
  const [email, setEmail] = useState('');
  const [view, setView] = useState('login'); // 'login', 'forgot', 'otp', 'reset'
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot-password (OTP) flow state
  const [otp, setOtp] = useState('');
  const [otpLength, setOtpLength] = useState(6);
  const [resendIn, setResendIn] = useState(0);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const timerRef = useRef(null);

  const MIN_PASSWORD_LEN = 8;

  useEffect(() => {
    document.title = 'Principal Portal Login | School CRM';
  }, []);

  const resendActive = resendIn > 0;
  useEffect(() => {
    if (!resendActive) return undefined;
    timerRef.current = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(timerRef.current);
  }, [resendActive]);

  const apiMessage = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

  const resetFlowState = () => {
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setResendIn(0);
    setError(null);
  };

  const goTo = (next) => {
    setError(null);
    if (next === 'login') {
      resetFlowState();
      setEmail('');
    }
    setView(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate('/principal/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid Principal credentials');
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    const res = await principalAuthApi.forgotPassword(email);
    const data = res?.data || {};
    if (data.otpLength) setOtpLength(Number(data.otpLength));
    setResendIn(Number(data.resendIn) || 30);
    return data;
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await sendOtp();
      setOtp('');
      setView('otp');
    } catch (err) {
      setError(apiMessage(err, 'Could not send OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendIn > 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      await sendOtp();
      setOtp('');
    } catch (err) {
      setError(apiMessage(err, 'Could not resend OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (otp.length !== otpLength) {
      setError(`Enter the ${otpLength}-digit OTP sent to your mobile`);
      return;
    }
    setLoading(true);
    try {
      const res = await principalAuthApi.verifyResetOtp(email, otp);
      const token = res?.data?.resetToken;
      if (!token) throw new Error('Could not verify OTP. Please try again.');
      setResetToken(token);
      setView('reset');
    } catch (err) {
      setError(apiMessage(err, 'The OTP is invalid or has expired'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword.trim().length < MIN_PASSWORD_LEN) {
      setError(`Password must be at least ${MIN_PASSWORD_LEN} characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await principalAuthApi.resetPassword(resetToken, newPassword);
      setSuccess(res?.message || 'Password updated. You can now sign in with your new password.');
      setUsername(email);
      setPassword('');
      goTo('login');
    } catch (err) {
      const code = err?.response?.data?.code;
      setError(apiMessage(err, 'Could not reset password. Please try again.'));
      if (code === 'RESET_TOKEN_INVALID') {
        resetFlowState();
        setView('forgot');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'h-12 w-full rounded-xl border border-slate-300 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-950/80 pl-11 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-indigo-500/15 dark:focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="relative min-h-dvh h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 lg:grid lg:grid-cols-2">
      {/* Left section: branding/features */}
      <section className="relative hidden h-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100/90 via-indigo-50/50 to-slate-200/60 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-10 lg:flex">
        {/* Glow Effects */}
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
            <Award className="h-3.5 w-3.5" />
            Principal Operations Portal
          </span>
          <div className="rounded-3xl bg-white/90 dark:bg-indigo-600/50 p-2.5 shadow-xl shadow-indigo-500/10 dark:shadow-[0_0_80px_rgba(79,70,229,0.28)] ring-1 ring-slate-200/80 dark:ring-white/10">
            <BrandLogo className="h-40 w-40 rounded-[1.15rem]" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Principal Desk</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Sign in to oversee school-wide academic quality, manage staff performance, and guide institutional policies.
          </p>
          <ul className="mt-6 w-full space-y-2.5 text-left">
            <li className="flex items-start gap-3 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm px-3.5 py-2.5 shadow-2xs">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-blue-300">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Academic Control: Review schedules, curriculum standards, and exam systems</span>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm px-3.5 py-2.5 shadow-2xs">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-blue-300">
                <Users className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Staff Supervision: Approve payroll, leaves, and evaluate teacher metrics</span>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm px-3.5 py-2.5 shadow-2xs">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-blue-300">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Strategic Decisions: Monitor school-wide operations, performance, and compliance</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Right section: form */}
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
            <BrandLogo className="mb-3 h-11 w-11 rounded-xl ring-1 ring-slate-200 dark:ring-white/10 shadow-xs" />
            
            {/* Prominent Role Identifier Badge */}
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-blue-500/40 bg-indigo-50 dark:bg-indigo-500/20 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-blue-300 shadow-2xs">
              <Award className="h-3.5 w-3.5 text-indigo-600 dark:text-blue-400" />
              PRINCIPAL PORTAL
            </span>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {view === 'login' && 'Principal Login'}
              {view === 'forgot' && 'Forgot Password'}
              {view === 'otp' && 'Verify OTP'}
              {view === 'reset' && 'Set New Password'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {view === 'login' && 'Sign in with your principal credentials for institutional leadership'}
              {view === 'forgot' && 'Enter your login ID and we will send an OTP to your registered mobile'}
              {view === 'otp' && `Enter the ${otpLength}-digit OTP sent to your registered mobile number`}
              {view === 'reset' && 'Choose a new password for your principal account'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-t-2 border-t-indigo-600 dark:border-t-blue-500 bg-white dark:bg-slate-900 p-6 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/40 backdrop-blur-xl space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && view === 'login' && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {view === 'login' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      placeholder="principal@greenfield.edu"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setSuccess(null);
                        goTo('forgot');
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((open) => !open)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in to Principal Desk...
                    </>
                  ) : (
                    <>
                      Sign In to Principal Portal
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {view === 'forgot' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Login ID (Email)</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      placeholder="principal@greenfield.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className={inputClass}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    If an account matches, an OTP is sent to its registered mobile number.
                  </p>
                </div>

                <button type="submit" disabled={loading} className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition disabled:pointer-events-none disabled:opacity-50">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button type="button" onClick={() => goTo('login')} className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
              </form>
            )}

            {view === 'otp' && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                  If <span className="font-semibold">{email}</span> is registered, an OTP has been sent to its registered mobile number. It expires in 5 minutes.
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">One-time password</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder={'•'.repeat(otpLength)}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, otpLength))}
                      maxLength={otpLength}
                      required
                      autoFocus
                      className={`${inputClass} tracking-[0.4em] font-semibold`}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading || otp.length !== otpLength} className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition disabled:pointer-events-none disabled:opacity-50">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify OTP
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => goTo('forgot')} className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition">
                    <ArrowLeft className="h-4 w-4" />
                    Change login ID
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading || resendIn > 0}
                    className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-blue-400 dark:hover:text-blue-300 transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}

            {view === 'reset' && (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">New password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={MIN_PASSWORD_LEN}
                      autoComplete="new-password"
                      required
                      autoFocus
                      className={`${inputClass} pr-11`}
                    />
                    <button type="button" onClick={() => setShowNewPassword((open) => !open)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm new password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={MIN_PASSWORD_LEN}
                      autoComplete="new-password"
                      required
                      className={inputClass}
                    />
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-300">Passwords do not match</p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition disabled:pointer-events-none disabled:opacity-50">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button type="button" onClick={() => goTo('login')} className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition">
                  <ArrowLeft className="h-4 w-4" />
                  Cancel and back to sign in
                </button>
              </form>
            )}
          </div>

          <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
            <p className="text-[11px] tracking-wide text-slate-500 dark:text-slate-400">
              Authorized institutional leadership only · Secure connection
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

export default PrincipalLogin;



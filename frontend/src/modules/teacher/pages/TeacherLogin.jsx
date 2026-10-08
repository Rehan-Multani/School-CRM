import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTeacherAuth } from '../context/TeacherAuthContext';
import { useTeacherTheme } from '../context/TeacherThemeContext';
import { teacherAuthApi } from '../../../shared/api/client';
import { BookOpenCheck, ArrowRight, ArrowLeft, ShieldAlert, ShieldCheck, CheckCircle2, Eye, EyeOff, LayoutGrid, Sun, Moon } from 'lucide-react';

const MIN_PASSWORD_LEN = 8;
const FIELD_CLASS =
  'w-full px-4 py-3 rounded-2xl border border-border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all';
const LABEL_CLASS = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';
const SUBMIT_CLASS =
  'w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-70 text-white py-3.5 rounded-2xl text-sm font-bold shadow-premium transition-all duration-150 active:scale-95 select-none mt-2';
const LINK_BTN_CLASS =
  'inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors';

const apiMessage = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

export const TeacherLogin = () => {
  const [employeeId, setEmployeeId] = useState('EMP-2019-045');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useTeacherAuth();
  const { theme, toggleTheme } = useTeacherTheme();
  const navigate = useNavigate();

  // Forgot-password (OTP) flow state
  const [view, setView] = useState('login'); // 'login' | 'forgot' | 'otp' | 'reset'
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [otpLength, setOtpLength] = useState(6);
  const [resendIn, setResendIn] = useState(0);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    document.title = 'Teacher Portal Login | School CRM';
  }, []);

  const resendActive = resendIn > 0;
  useEffect(() => {
    if (!resendActive) return undefined;
    const id = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendActive]);

  const resetFlowState = () => {
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setResendIn(0);
  };

  const goTo = (next) => {
    setError('');
    if (next === 'login') {
      resetFlowState();
      setIdentifier('');
    }
    setView(next);
  };

  const sendOtp = async () => {
    const data = (await teacherAuthApi.forgotPassword(identifier))?.data || {};
    if (data.otpLength) setOtpLength(Number(data.otpLength));
    setResendIn(Number(data.resendIn) || 30);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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
    setError('');
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
    setError('');
    if (otp.length !== otpLength) {
      setError(`Enter the ${otpLength}-digit OTP sent to your email`);
      return;
    }
    setLoading(true);
    try {
      const res = await teacherAuthApi.verifyResetOtp(identifier, otp);
      const token = res?.data?.resetToken;
      if (!token) throw new Error('Could not verify OTP. Please try again.');
      setResetToken(token);
      setView('reset');
    } catch (err) {
      const code = err?.response?.data?.code;
      setError(apiMessage(err, 'The OTP is invalid or has expired'));
      if (code === 'OTP_LOCKED') {
        resetFlowState();
        setView('forgot');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
      const res = await teacherAuthApi.resetPassword(resetToken, newPassword);
      setSuccess(res?.message || 'Password updated. You can now sign in with your new password.');
      setEmployeeId(identifier);
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
      {/* Left Panel – Brand / Illustration */}
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
            <span className="text-white/70 text-[11px] font-medium tracking-wider uppercase">Teacher Portal</span>
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
            Manage attendance, homework, marks, and student communication – all in one beautifully designed workspace.
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

      {/* Right Panel – Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 relative">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="absolute top-4 right-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

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
          <div className="mb-6">
            {/* Prominent Role Identifier Badge */}
            <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-indigo-500/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 shadow-sm">
              <BookOpenCheck className="h-3.5 w-3.5" />
              TEACHER PORTAL
            </span>
            <h2 className="text-2xl font-black text-foreground mb-1">
              {view === 'login' && 'Teacher Portal Login'}
              {view === 'forgot' && 'Forgot Password'}
              {view === 'otp' && 'Verify OTP'}
              {view === 'reset' && 'Set New Password'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {view === 'login' && 'Sign in with your employee ID to manage classroom & academics'}
              {view === 'forgot' && 'Enter your email or employee ID and we will send an OTP to your registered email address'}
              {view === 'otp' && `Enter the ${otpLength}-digit OTP sent to your email`}
              {view === 'reset' && 'Choose a new password for your teacher account'}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-indigo-600/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-2xl text-xs font-medium mb-6">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && view === 'login' && (
            <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-3.5 rounded-2xl text-xs font-medium mb-6">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className={LABEL_CLASS} htmlFor="teacher-forgot-id">Email or Employee ID</label>
                <input
                  id="teacher-forgot-id"
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. teacher@school.edu or EMP-2019-045"
                  className={FIELD_CLASS}
                />
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  If an account matches, an OTP is sent to its registered email address.
                </p>
              </div>
              <button type="submit" disabled={loading} className={SUBMIT_CLASS}>
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <div className="flex justify-center">
                <button type="button" onClick={() => goTo('login')} className={LINK_BTN_CLASS}>
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </button>
              </div>
            </form>
          )}

          {view === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-xs text-emerald-700 dark:text-emerald-300">
                If <span className="font-semibold">{identifier}</span> is registered, an OTP has been sent to its registered email address. It expires in 5 minutes. Check your inbox and spam folder.
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="teacher-forgot-otp">One-time password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="teacher-forgot-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    autoFocus
                    maxLength={otpLength}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, otpLength))}
                    placeholder={'•'.repeat(otpLength)}
                    className={`${FIELD_CLASS} pl-11 tracking-[0.4em] font-semibold`}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading || otp.length !== otpLength} className={SUBMIT_CLASS}>
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => goTo('forgot')} className={LINK_BTN_CLASS}>
                  <ArrowLeft className="w-4 h-4" />
                  Change ID
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendIn > 0}
                  className="text-xs text-primary font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                >
                  {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className={LABEL_CLASS} htmlFor="teacher-new-password">New password</label>
                <div className="relative">
                  <input
                    id="teacher-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    minLength={MIN_PASSWORD_LEN}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
                    className={`${FIELD_CLASS} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="teacher-confirm-password">Confirm new password</label>
                <input
                  id="teacher-confirm-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={MIN_PASSWORD_LEN}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={FIELD_CLASS}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">Passwords do not match</p>
                )}
              </div>
              <button type="submit" disabled={loading} className={SUBMIT_CLASS}>
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Reset Password</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
              <div className="flex justify-center">
                <button type="button" onClick={() => goTo('login')} className={LINK_BTN_CLASS}>
                  <ArrowLeft className="w-4 h-4" />
                  Cancel and back to sign in
                </button>
              </div>
            </form>
          )}

          {view === 'login' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Teacher Employee ID
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
                <button
                  type="button"
                  onClick={() => {
                    setSuccess('');
                    setIdentifier('');
                    goTo('forgot');
                  }}
                  className="text-[11px] text-primary font-semibold hover:underline"
                >
                  Forgot Password?
                </button>
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
                  <span>Sign In to Teacher Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          )}

          {view === 'login' && (
          <>
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
          </>
          )}

          <div className="mt-6 flex flex-col items-center gap-1.5 text-center">
            <p className="text-[11px] text-slate-400">
              This portal is for authorized teachers only.<br />Contact admin for access issues.
            </p>
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



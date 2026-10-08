import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { schoolPortalApi } from '../../../../shared/api/client';

const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/**
 * Verify the parent's OTP for a pickup. Used for a pickup that was just started
 * and for one that was ALREADY in progress (`resumeInfo` is then set): the admin
 * can enter the OTP the parent already has, resend a fresh one, or cancel the
 * pickup to start over.
 */
export const OtpVerificationModal = ({ student, sessionId, isPrincipal = false, resumeInfo = null, onVerified, onCancelled, onClose }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(''); // '' | 'resend' | 'cancel'
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState(false);
  const [maskedMobile, setMaskedMobile] = useState(resumeInfo?.maskedMobile || student?.maskedParentPhone || '');
  const [cooldown, setCooldown] = useState(resumeInfo?.resendCooldownSeconds || 0);
  const [resendsLeft, setResendsLeft] = useState(resumeInfo?.resendsLeft ?? null);
  const [secondsLeft, setSecondsLeft] = useState(resumeInfo?.otpSecondsRemaining ?? null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // One ticking clock for the resend cooldown and the OTP expiry countdown.
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
      setSecondsLeft((s) => (s === null ? s : s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const payload = { sessionId, otp };
      const response = isPrincipal
        ? await schoolPortalApi.principalVerifySafePickupOtp(payload)
        : await schoolPortalApi.verifySafePickupOtp(payload);
      if (response?.success) {
        setSuccess(true);
        setTimeout(() => onVerified(), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setBusy('resend');
    try {
      const payload = { sessionId };
      const response = isPrincipal
        ? await schoolPortalApi.principalResendSafePickupOtp(payload)
        : await schoolPortalApi.resendSafePickupOtp(payload);
      const d = response?.data || {};
      if (d.maskedMobile) setMaskedMobile(d.maskedMobile);
      setCooldown(d.resendCooldownSeconds ?? 30);
      setResendsLeft(d.resendsLeft ?? null);
      setSecondsLeft(d.otpSecondsRemaining ?? null);
      setOtp('');
      setNotice(`A new OTP has been sent to the parent${d.maskedMobile ? ` (${d.maskedMobile})` : ''}. The previous OTP no longer works.`);
      inputRef.current?.focus();
    } catch (err) {
      const wait = err.response?.status === 429 ? err.response?.data?.message : '';
      setError(wait || err.response?.data?.message || 'Could not resend the OTP');
    } finally {
      setBusy('');
    }
  };

  const handleCancelPickup = async () => {
    if (!window.confirm(`Cancel the pickup for ${student?.name || 'this student'}? You can start a new one afterwards.`)) return;
    setError('');
    setNotice('');
    setBusy('cancel');
    try {
      const payload = { sessionId };
      if (isPrincipal) await schoolPortalApi.principalCancelSafePickup(payload);
      else await schoolPortalApi.cancelSafePickup(payload);
      onCancelled?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel the pickup');
      setBusy('');
    }
  };

  const disabled = loading || Boolean(busy);

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 max-w-md w-full p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Safe Pickup Completed</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{student.name} has been marked as safely picked up.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 max-w-md w-full">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Verify Parent OTP</h2>
          <button
            onClick={onClose}
            disabled={disabled}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Already in progress */}
          {resumeInfo && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900 dark:text-amber-200">
                A pickup verification is already in progress for this student. Enter the OTP the parent received, or
                resend a new OTP. To start over, cancel this pickup.
              </p>
            </div>
          )}

          {/* Student Info */}
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Student</p>
            <p className="font-semibold text-slate-900 dark:text-white mb-2">{student.name}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {student.className} - {student.sectionName}
            </p>
          </div>

          {/* OTP Info */}
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              OTP sent to parent mobile ending {maskedMobile || '****'}
            </p>
            {secondsLeft !== null && (
              <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                {secondsLeft > 0 ? `OTP expires in ${fmtClock(secondsLeft)}` : 'This OTP has expired. Resend a new OTP or cancel the pickup.'}
              </p>
            )}
          </div>

          {/* Notice */}
          {notice && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-900 dark:text-green-200">{notice}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* OTP Input Form */}
          <form onSubmit={handleVerifyOtp}>
            <div className="mb-4">
              <label htmlFor="otp" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Enter OTP
              </label>
              <input
                ref={inputRef}
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  if (error) setError('');
                }}
                maxLength="6"
                disabled={disabled}
                className="w-full px-4 py-3 text-center text-2xl font-semibold tracking-widest border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            {/* Resend + cancel pickup */}
            <div className="mb-4 flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={handleResend}
                disabled={disabled || cooldown > 0 || resendsLeft === 0}
                className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {busy === 'resend' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : resendsLeft === 0 ? 'Resend limit reached' : 'Resend OTP'}
              </button>
              <button
                type="button"
                onClick={handleCancelPickup}
                disabled={disabled}
                className="font-medium text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
              >
                {busy === 'cancel' ? 'Cancelling…' : 'Cancel pickup'}
              </button>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={disabled}
                className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={disabled || otp.length < 6}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationModal;

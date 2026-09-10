ï»¿import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, Loader2, X, CheckCircle2, RotateCcw, LogIn } from 'lucide-react';
import { teacherPickupApi } from '../../../shared/api/client';

/**
 * STAGING DEMO Ã¢â¬â drives the real Student Safe Pickup API from the mock teacher
 * web panel. Logs in for real (its own token), lists eligible students, and runs
 * initiate Ã¢â â OTP Ã¢â â verify Ã¢â â handover Ã¢â â complete. Production teacher UI is the
 * Flutter APK; this page just proves the end-to-end flow.
 */
function msg(e, fb) {
  return e?.response?.data?.message || e?.message || fb;
}
function code(e) {
  return e?.response?.data?.code || '';
}

function OtpInput({ value, onChange, disabled }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');
  const set = (i, d) => {
    const next = value.split('');
    next[i] = d.replace(/\D/g, '').slice(-1) || '';
    const joined = next.join('').slice(0, 6);
    onChange(joined);
    if (d && refs.current[i + 1]) refs.current[i + 1].focus();
  };
  return (
    <div className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={d.trim()}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d.trim() && refs.current[i - 1]) refs.current[i - 1].focus();
          }}
          onPaste={(e) => {
            const p = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
            if (p) {
              e.preventDefault();
              onChange(p);
            }
          }}
          className="h-14 w-11 rounded-xl border-2 border-slate-200 text-center text-xl font-bold text-slate-800 focus:border-emerald-500 focus:outline-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      ))}
    </div>
  );
}

function Sheet({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-indigo-600 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

const RELATIONSHIPS = ['Parent', 'Guardian', 'Relative', 'Family Friend', 'Authorized Person', 'Other'];

export function TeacherPickupDemo() {
  const [token, setToken] = useState(() => localStorage.getItem('pickup_demo_token') || '');
  const [creds, setCreds] = useState({ identifier: 'teacher@greenfield.edu', password: 'Teacher@123' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);
  const [stage, setStage] = useState('list'); // list | confirm | otp | handover | done
  const [active, setActive] = useState(null); // { student, session }
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [handover, setHandover] = useState({ pickupPersonName: '', pickupPersonRelationship: 'Parent', handoverConfirmed: false });

  const loadStudents = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const res = await teacherPickupApi.eligibleStudents({});
      setStudents(res.data || []);
    } catch (e) {
      setError(msg(e, 'Failed to load students'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadStudents();
  }, [token, loadStudents]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const doLogin = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await teacherPickupApi.login(creds.identifier, creds.password);
      setToken(res.token);
    } catch (e) {
      setError(msg(e, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  const startPickup = (student) => {
    setActive({ student, session: null });
    setStage('confirm');
    setError('');
  };

  const sendOtp = async () => {
    setBusy(true);
    setError('');
    try {
      const key = `demo-${active.student.id}-${Date.now()}`;
      const res = await teacherPickupApi.initiate(active.student.id, key);
      setActive((a) => ({ ...a, session: res.data }));
      setCooldown(res.data.resendCooldownSeconds || 30);
      setOtp('');
      setStage('otp');
    } catch (e) {
      setError(`${msg(e, 'Could not start pickup')}${code(e) ? ` (${code(e)})` : ''}`);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await teacherPickupApi.verify(active.session.id, otp);
      setActive((a) => ({ ...a, session: res.data }));
      setStage('handover');
    } catch (e) {
      setError(`${msg(e, 'Verification failed')}${code(e) ? ` (${code(e)})` : ''}`);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setBusy(true);
    setError('');
    try {
      const res = await teacherPickupApi.resend(active.session.id);
      setActive((a) => ({ ...a, session: res.data }));
      setCooldown(res.data.resendCooldownSeconds || 30);
      setOtp('');
    } catch (e) {
      setError(msg(e, 'Resend failed'));
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await teacherPickupApi.complete(active.session.id, handover);
      setActive((a) => ({ ...a, session: res.data }));
      setStage('done');
    } catch (e) {
      setError(`${msg(e, 'Could not complete')}${code(e) ? ` (${code(e)})` : ''}`);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (active?.session?.id) {
      try {
        await teacherPickupApi.cancel(active.session.id);
      } catch {
        /* ignore */
      }
    }
    setStage('list');
    setActive(null);
    setHandover({ pickupPersonName: '', pickupPersonRelationship: 'Parent', handoverConfirmed: false });
    loadStudents();
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-sm space-y-4 p-6">
        <div className="flex items-center gap-2 text-emerald-600">
          <ShieldCheck className="h-6 w-6" />
          <h1 className="text-lg font-bold">Safe Pickup Ã¢â¬â demo</h1>
        </div>
        <p className="text-sm text-slate-500">Staging demo. Sign in with a real teacher account.</p>
        <input
          value={creds.identifier}
          onChange={(e) => setCreds((c) => ({ ...c, identifier: e.target.value }))}
          placeholder="teacher email / employee id"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-indigo-600"
        />
        <input
          type="password"
          value={creds.password}
          onChange={(e) => setCreds((c) => ({ ...c, password: e.target.value }))}
          placeholder="password"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-indigo-600"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="button"
          onClick={doLogin}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-600">
          <ShieldCheck className="h-5 w-5" />
          <h1 className="text-base font-bold">Safe Pickup</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            teacherPickupApi.logout();
            setToken('');
          }}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Sign out
        </button>
      </div>

      {error && stage === 'list' && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {busy && stage === 'list' ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <ul className="space-y-2">
          {students.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
              No eligible students. Check the school/class pickup settings.
            </li>
          )}
          {students.map((s) => {
            const blocked = !s.pickupEnabled || !s.hasGuardianMobile || s.alreadyPickedUpToday;
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-indigo-600/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">{s.name}</p>
                  <p className="text-xs text-slate-400">
                    {[s.className, s.sectionName].filter(Boolean).join(' ')} ÃÂ· Roll {s.rollNumber || 'Ã¢â¬â'} ÃÂ·{' '}
                    {s.attendanceStatus}
                  </p>
                </div>
                {s.alreadyPickedUpToday ? (
                  <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-indigo-600">
                    Picked up
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => startPickup(s)}
                    className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-indigo-600"
                  >
                    Pickup
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {stage === 'confirm' && active && (
        <Sheet onClose={cancel}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Student Pickup</h2>
            <button type="button" onClick={cancel}>
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Student</dt>
              <dd className="font-semibold text-slate-700 dark:text-slate-100">{active.student.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Class</dt>
              <dd className="text-slate-600 dark:text-slate-300">
                {[active.student.className, active.student.sectionName].filter(Boolean).join(' ')}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-slate-500">
            An OTP will be sent to the registered parent / guardian. Ask the person collecting the child for that OTP.
          </p>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={cancel} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300">
              Cancel
            </button>
            <button
              type="button"
              onClick={sendOtp}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send OTP
            </button>
          </div>
        </Sheet>
      )}

      {stage === 'otp' && active?.session && (
        <Sheet onClose={cancel}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Pickup Verification</h2>
            <button type="button" onClick={cancel}>
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
          <p className="mb-4 text-sm text-slate-500">
            OTP sent to <span className="font-semibold">{active.session.maskedMobile}</span>. Enter the code the
            parent/authorized person provides.
          </p>
          <OtpInput value={otp} onChange={setOtp} disabled={busy} />
          {error && <p className="mt-3 text-center text-sm text-rose-600">{error}</p>}
          <button
            type="button"
            onClick={verify}
            disabled={busy || otp.replace(/\D/g, '').length !== 6}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify OTP
          </button>
          <div className="mt-3 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0 || busy}
              className="flex items-center gap-1 text-slate-500 disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            </button>
            <button type="button" onClick={cancel} className="text-rose-500">
              Cancel pickup
            </button>
          </div>
        </Sheet>
      )}

      {stage === 'handover' && active?.session && (
        <Sheet onClose={cancel}>
          <div className="mb-2 flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-base font-bold">Parent authorization verified</h2>
          </div>
          <p className="mb-4 text-sm text-slate-500">
            Now confirm you have physically handed <span className="font-semibold">{active.student.name}</span> over.
          </p>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Pickup person name (optional)
            <input
              placeholder="e.g. Uncle Ramesh"
              value={handover.pickupPersonName}
              onChange={(e) => setHandover((h) => ({ ...h, pickupPersonName: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-indigo-600"
            />
          </label>
          <label className="mb-3 block text-xs font-semibold text-slate-500">
            Relationship
            <select
              value={handover.pickupPersonRelationship}
              onChange={(e) => setHandover((h) => ({ ...h, pickupPersonRelationship: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-indigo-600"
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="mb-3 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={handover.handoverConfirmed}
              onChange={(e) => setHandover((h) => ({ ...h, handoverConfirmed: e.target.checked }))}
              className="mt-0.5 h-4 w-4"
            />
            I confirm the student has been handed over.
          </label>
          {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
          <button
            type="button"
            onClick={complete}
            disabled={busy || !handover.handoverConfirmed}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Complete Pickup
          </button>
        </Sheet>
      )}

      {stage === 'done' && active && (
        <Sheet onClose={cancel}>
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-100">Student pickup completed</h2>
            <p className="mt-1 text-sm text-slate-500">
              {active.student.name} Ã¢â¬â verified by parent OTP and handed over.
            </p>
            <button
              type="button"
              onClick={cancel}
              className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Done
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export default TeacherPickupDemo;


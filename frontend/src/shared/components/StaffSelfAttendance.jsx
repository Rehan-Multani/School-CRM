import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Fingerprint, Loader2, LocateFixed, MapPin, ShieldAlert } from 'lucide-react';
import { Skeleton } from '../ui/SkeletonLoader';

/**
 * "Mark Present" for staff who work in the web panels (Accountant / HR /
 * Librarian). The School Admin sets a school location + radius; the staff
 * member can mark present only while inside it. The browser supplies the GPS
 * fix, the server decides whether it is inside the circle.
 *
 * `api` = { today(), checkIn(body) } bound to the panel's own client.
 */
const errText = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

function getFix() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser cannot read your location. Use Chrome / Edge on a device with location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) =>
        reject(
          new Error(
            err.code === 1
              ? 'Location permission is blocked. Allow location for this site in the browser address bar, then try again.'
              : 'Could not get your location. Turn on location / Wi-Fi and try again.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

export default function StaffSelfAttendance({ api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.today();
      setData(res?.data || null);
      setError('');
    } catch (err) {
      setError(errText(err, 'Unable to load your attendance'));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const markPresent = async () => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      const fix = await getFix();
      const res = await api.checkIn(fix);
      setDone(res?.message || 'Marked present');
      await load();
    } catch (err) {
      setError(errText(err, 'Could not mark attendance'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  const cfg = data?.config || {};
  const rec = data?.record;
  const marked = Boolean(rec?.checkedIn);
  const locked = rec && !marked && ['LEAVE', 'HOLIDAY'].includes(rec.status);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
          <Fingerprint className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Mark Present</h1>
          <p className="text-xs text-slate-500">
            Mark your own attendance for today. You must be inside the school area set by your School Admin.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{data?.date}</span>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
              marked
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {marked ? 'Present' : rec?.status ? rec.status.replace('_', ' ') : 'Not marked'}
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Marked present at</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{marked ? rec.clockIn : '--:--'}</div>
          {marked && rec.distanceMeters != null ? (
            <div className="mt-1 text-xs text-slate-500">{rec.distanceMeters} m from school</div>
          ) : null}
        </div>

        {!cfg.enabled ? (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Self attendance is not enabled for your school yet. Please ask your School Admin to set the school location
            (Settings → Attendance Location).
          </div>
        ) : locked ? (
          <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Today is marked as {String(rec.status).toLowerCase()}, so you do not need to mark present.
          </div>
        ) : marked ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> You are marked present for today.
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={markPresent}
              disabled={busy}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              {busy ? 'Checking your location…' : 'Mark Present'}
            </button>
            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              Must be within {cfg.radiusMeters} m of {cfg.label || 'the school'}
            </p>
          </>
        )}

        {done && !error ? <p className="mt-3 text-sm font-semibold text-emerald-600">{done}</p> : null}
        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { schoolPortalApi } from '../../../../shared/api/client';
import { SkeletonForm } from '../../components/ui/SkeletonLoader';
import { ExternalLink, Fingerprint, Loader2, LocateFixed, MapPin, Save } from 'lucide-react';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

const DEFAULTS = {
  enabled: false,
  latitude: '',
  longitude: '',
  radiusMeters: 100,
  requireBiometric: true,
  studentAttendanceInRadius: true,
  label: '',
};

function Toggle({ checked, onChange, label, hint, icon: Icon }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <span className="flex-1">
        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
          {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
          {label}
        </span>
        {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
      </span>
    </label>
  );
}

export function AttendanceLocation({ showToast }) {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await schoolPortalApi.attendanceGeofence();
      const d = res?.data || {};
      setForm({
        enabled: Boolean(d.enabled),
        latitude: d.latitude ?? '',
        longitude: d.longitude ?? '',
        radiusMeters: d.radiusMeters || 100,
        requireBiometric: d.requireBiometric !== false,
        studentAttendanceInRadius: d.studentAttendanceInRadius !== false,
        label: d.label || '',
      });
    } catch (err) {
      showToast(err?.response?.data?.message || 'Unable to load attendance location', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      showToast('This browser cannot read your location', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
        setLocating(false);
        showToast(`Location captured (±${Math.round(pos.coords.accuracy)} m). Save to apply.`, 'success');
      },
      () => {
        setLocating(false);
        showToast('Location permission denied. Allow it in the browser, or type the coordinates.', 'error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const hasPoint = form.latitude !== '' && form.longitude !== '';

  const save = async (e) => {
    e.preventDefault();
    if (form.enabled && !hasPoint) {
      showToast('Set the school location before enabling self attendance', 'error');
      return;
    }
    setSaving(true);
    try {
      await schoolPortalApi.updateAttendanceGeofence({
        enabled: form.enabled,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
        radiusMeters: Number(form.radiusMeters),
        requireBiometric: form.requireBiometric,
        studentAttendanceInRadius: form.studentAttendanceInRadius,
        label: form.label,
      });
      showToast('Attendance location saved', 'success');
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Unable to save attendance location', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SkeletonForm />;

  return (
    <form
      onSubmit={save}
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Teacher attendance location</h3>
          <p className="mt-1 text-xs text-slate-500">
            Teachers can mark their own attendance from the app only while they are inside this circle, after a
            fingerprint check. Stand at the school gate or office and tap &ldquo;Use my current location&rdquo;.
          </p>
        </div>
      </div>

      <div className="grid max-w-2xl gap-4">
        <Toggle
          checked={form.enabled}
          onChange={(v) => set({ enabled: v })}
          label="Enable teacher self attendance"
          hint="When off, teachers see that self attendance is not available."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Latitude</label>
            <input
              className={inputClass}
              type="number"
              step="any"
              min="-90"
              max="90"
              value={form.latitude}
              onChange={(e) => set({ latitude: e.target.value })}
              placeholder="e.g. 19.076090"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Longitude</label>
            <input
              className={inputClass}
              type="number"
              step="any"
              min="-180"
              max="180"
              value={form.longitude}
              onChange={(e) => set({ longitude: e.target.value })}
              placeholder="e.g. 72.877426"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
            Use my current location
          </button>
          {hasPoint ? (
            <a
              href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Check on map
            </a>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>Allowed radius</span>
            <span className="text-primary">{Number(form.radiusMeters) || 0} m</span>
          </label>
          <input
            type="range"
            min="20"
            max="1000"
            step="10"
            value={Math.min(1000, Number(form.radiusMeters) || 20)}
            onChange={(e) => set({ radiusMeters: Number(e.target.value) })}
            className="w-full accent-primary"
          />
          <div className="flex items-center gap-2">
            <input
              className={`${inputClass} max-w-[140px]`}
              type="number"
              min="20"
              max="5000"
              step="10"
              value={form.radiusMeters}
              onChange={(e) => set({ radiusMeters: e.target.value })}
            />
            <span className="text-[11px] text-slate-400">
              20 – 5000 m. Keep some margin (GPS can drift 10–30 m), 100–150 m works for most campuses.
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Location name (optional)</label>
          <input
            className={inputClass}
            value={form.label}
            maxLength={80}
            onChange={(e) => set({ label: e.target.value })}
            placeholder="e.g. Main campus"
          />
        </div>

        <Toggle
          checked={form.requireBiometric}
          onChange={(v) => set({ requireBiometric: v })}
          icon={Fingerprint}
          label="Require fingerprint / phone lock"
          hint="The teacher must pass the phone's fingerprint (or face / screen lock) before marking present."
        />

        <Toggle
          checked={form.studentAttendanceInRadius}
          onChange={(v) => set({ studentAttendanceInRadius: v })}
          label="Student attendance only inside this radius"
          hint="Teachers can save or edit student attendance from the app only while they are inside the circle."
        />
      </div>

      <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save attendance location
        </button>
      </div>
    </form>
  );
}

export default AttendanceLocation;

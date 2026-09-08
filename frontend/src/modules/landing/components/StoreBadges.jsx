import React from 'react';
import { Download } from 'lucide-react';
import { useAppConfig } from '../data/siteContent';

const GooglePlayGlyph = (props) => (
  <svg viewBox="0 0 512 512" width="20" height="20" aria-hidden="true" {...props}>
    <path
      fill="#00c3ff"
      d="M65.4 44.6c-4.9 5.3-7.9 13.3-7.9 23.7v375.4c0 10.5 3 18.5 8 23.8l1.3 1.2 210.2-210.2v-5L66.7 43.4z"
    />
    <path
      fill="#00e676"
      d="M347 337.9l-70-70v-5l70.1-70.1 1.6 1L432 241c23.7 13.5 23.7 35.5 0 49l-83.4 47.4z"
    />
    <path fill="#ffcd00" d="M348.6 336.9L277 265.4 65.4 467.6c7.8 8.3 20.7 9.3 35.2 1.1l248-141" />
    <path fill="#ff3a44" d="M348.6 194.1l-248-141c-14.5-8.3-27.4-7.2-35.2 1.1L277 258.4z" />
  </svg>
);

// Google Play badge + direct APK download. The URLs are managed by the
// Super Admin (Settings -> Mobile app) and served from /platform/app-config;
// until they are set, the badges render in a non-navigating "coming soon"
// state.
export const StoreBadges = ({ className = '' }) => {
  const { playStoreUrl, apkUrl } = useAppConfig();
  const playUnset = !playStoreUrl;
  const apkUnset = !apkUrl;

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${className}`}>
      <a
        href={playUnset ? undefined : playStoreUrl}
        target={playUnset ? undefined : '_blank'}
        rel="noreferrer"
        aria-disabled={playUnset || undefined}
        title={playUnset ? 'Google Play listing coming soon' : 'Open in Google Play'}
        onClick={playUnset ? (e) => e.preventDefault() : undefined}
        className={`inline-flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-white ring-1 ring-white/15 transition hover:bg-slate-800 ${
          playUnset ? 'cursor-default' : ''
        }`}
      >
        <GooglePlayGlyph />
        <span className="text-left leading-tight">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-white/65">
            Get it on
          </span>
          <span className="block text-[15px] font-bold">Google Play</span>
        </span>
      </a>

      <a
        href={apkUnset ? undefined : apkUrl}
        download={apkUnset ? undefined : ''}
        aria-disabled={apkUnset || undefined}
        title={apkUnset ? 'APK provided to your school on onboarding' : 'Download the Android APK'}
        onClick={apkUnset ? (e) => e.preventDefault() : undefined}
        className={`inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 ${
          apkUnset ? 'cursor-default' : ''
        }`}
      >
        <Download className="h-4 w-4" />
        Download APK
      </a>
    </div>
  );
};

export default StoreBadges;

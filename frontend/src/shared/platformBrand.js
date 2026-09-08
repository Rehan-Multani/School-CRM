import { useEffect, useState } from 'react';
import axios from 'axios';

// Platform-wide brand assets the Super Admin manages via /platform/app-config
// (logo is a data:image/webp;base64 string). This read is PUBLIC — it runs on
// the landing page and every login screen before any token exists — so it uses
// a bare axios call, not the authenticated apiClient.

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
const http = axios.create({ baseURL: API_BASE, timeout: 8000 });

const LS_KEY = 'platform_brand_logo';

function readStoredLogo() {
  try {
    return localStorage.getItem(LS_KEY) || null;
  } catch {
    return null;
  }
}

function writeStoredLogo(logoUrl) {
  try {
    if (logoUrl) localStorage.setItem(LS_KEY, logoUrl);
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* localStorage unavailable */
  }
}

// In-tab subscribers so a logo change in Settings updates every mounted
// <BrandLogo> without a reload.
const listeners = new Set();
function notify(logoUrl) {
  listeners.forEach((fn) => {
    try {
      fn(logoUrl);
    } catch {
      /* ignore */
    }
  });
}

let configPromise = null;

/** Shared, de-duped fetch of the public platform config. Never rejects. */
export function fetchPlatformConfig() {
  if (!configPromise) {
    configPromise = http
      .get('/platform/app-config')
      .then((res) => res.data?.data || null)
      .then((data) => {
        if (data && typeof data.logoUrl === 'string') {
          writeStoredLogo(data.logoUrl || null);
          notify(data.logoUrl || null);
        }
        return data;
      })
      .catch(() => null);
  }
  return configPromise;
}

/** Point the browser-tab favicon at `url` (no-op when falsy). */
export function applyPlatformFavicon(url) {
  if (!url || typeof document === 'undefined') return;
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

/**
 * Call after the Super Admin uploads or resets the logo: update the cache,
 * persist, and push the new value to every mounted <BrandLogo> in this tab.
 * `nextLogoUrl` — the data URI, or '' / null to fall back to the bundled asset.
 */
export function bustPlatformConfigCache(nextLogoUrl) {
  configPromise = null;
  const normalized = nextLogoUrl || null;
  writeStoredLogo(normalized);
  notify(normalized);
  applyPlatformFavicon(normalized);
}

/** Current platform logo as a URL string, or null → callers use their bundled fallback. */
export function usePlatformLogo() {
  const [logo, setLogo] = useState(readStoredLogo);

  useEffect(() => {
    listeners.add(setLogo);
    fetchPlatformConfig();
    return () => {
      listeners.delete(setLogo);
    };
  }, []);

  return logo;
}

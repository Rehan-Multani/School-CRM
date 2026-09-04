import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { applyAccent, DEFAULT_PRIMARY, normalizeHex } from './accent';
import { schoolThemeApi } from '../api/client';
import './accent.css';

// Reusable per-portal brand-accent wiring.
//
// Every role portal keeps its ThemeProvider OUTSIDE its AuthProvider, so the
// accent can't be read through an auth hook. Instead we read the persisted
// `<key>-user` blob (written by the panel's AuthProvider) for `primaryColor`
// + `schoolId`, and refresh from the public `school-theme` endpoint on focus so
// a color the school admin changes elsewhere propagates without a re-login.
//
// @param {object}  opts
// @param {boolean} opts.active     Whether this portal's routes are mounted.
// @param {string}  opts.scope      Panel scope class, e.g. 'principal-theme'.
// @param {string}  opts.storageKey Panel key, e.g. 'principal'. Caches the
//                                  resolved color under `<storageKey>-accent`.
// @param {string}  [opts.userKey]  localStorage key of the persisted auth blob
//                                  (default `<storageKey>-user`; some portals
//                                  use `<name>_user`).
// @param {string}  [opts.pathname] Current path; pass it so a login redirect
//                                  re-reads the freshly persisted user blob.
export function usePanelAccent({ active, scope, storageKey, userKey: userKeyProp, pathname }) {
  const userKey = userKeyProp || `${storageKey}-user`;
  const accentKey = `${storageKey}-accent`;

  const readUser = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(userKey) || '{}') || {};
    } catch {
      return {};
    }
  }, [userKey]);

  const [primaryColor, setPrimaryColorState] = useState(() => {
    try {
      const cached = localStorage.getItem(accentKey);
      if (cached) return normalizeHex(cached);
    } catch {
      /* ignore */
    }
    return normalizeHex(readUser().primaryColor || DEFAULT_PRIMARY);
  });

  const setPrimaryColor = useCallback(
    (hex) => {
      const next = normalizeHex(hex);
      setPrimaryColorState(next);
      try {
        localStorage.setItem(accentKey, next);
      } catch {
        /* ignore */
      }
    },
    [accentKey]
  );

  // Paint (or clear) the accent whenever this portal toggles or the color moves.
  useLayoutEffect(() => {
    applyAccent(primaryColor, { scope, enabled: active });
  }, [primaryColor, scope, active]);

  // Pull the freshest color: cached user blob first, then the live endpoint.
  // Pre-auth (login screen), fall back to a `?school=` hint in the URL.
  const refreshing = useRef(false);
  const syncFromSource = useCallback(() => {
    const stored = readUser();
    if (stored.primaryColor) setPrimaryColor(stored.primaryColor);

    let schoolId = stored.schoolId || stored.school || '';
    if (!schoolId && typeof window !== 'undefined') {
      try {
        schoolId = new URLSearchParams(window.location.search).get('school') || '';
      } catch {
        schoolId = '';
      }
    }
    if (!schoolId || refreshing.current) return;
    refreshing.current = true;
    schoolThemeApi
      .get(schoolId)
      .then((data) => {
        if (data?.primaryColor) setPrimaryColor(data.primaryColor);
      })
      .catch(() => {
        /* offline / not found -> keep current */
      })
      .finally(() => {
        refreshing.current = false;
      });
  }, [readUser, setPrimaryColor]);

  useEffect(() => {
    if (!active) return undefined;
    syncFromSource();

    const onFocus = () => syncFromSource();
    const onStorage = (event) => {
      if (event.key === userKey || event.key === accentKey) syncFromSource();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
    // `pathname` is intentionally a dep: a login redirect within the portal
    // must re-read the user blob the AuthProvider just wrote.
  }, [active, syncFromSource, userKey, accentKey, pathname]);

  return { primaryColor, setPrimaryColor };
}

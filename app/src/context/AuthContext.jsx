import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken, setSubscriptionBlockedHandler, setUnauthorizedHandler } from '../api/client';
import { ROLES } from '../api/roles';
import { toast } from '../lib/notify';

const STORAGE_KEY = 'schoolcrm.session';

const AuthContext = createContext(null);

// SecureStore is meant for small secrets. A school logo can be a multi-MB
// data URI, so it stays in memory only; ThemeContext re-fetches it on launch.
const isDataUri = (v) => typeof v === 'string' && v.startsWith('data:');
function forStorage(session) {
  const b = session.school?.branding;
  if (!b || (!isDataUri(b.logo) && !isDataUri(b.favicon))) return session;
  return {
    ...session,
    school: {
      ...session.school,
      branding: { ...b, logo: isDataUri(b.logo) ? '' : b.logo, favicon: isDataUri(b.favicon) ? '' : b.favicon },
    },
  };
}

// Session = { token, role, user, school }. One 7-day token per login, no
// refresh token in any APK flow — on 401 we simply drop the session.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  // Message from a 402 (school subscription expired) — shown full-screen, no logout.
  const [blocked, setBlocked] = useState(null);

  const persist = useCallback(async (next) => {
    setAuthToken(next?.token || null);
    setSession(next);
    if (next) await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(forStorage(next)));
    else await SecureStore.deleteItemAsync(STORAGE_KEY);
  }, []);

  const clear = useCallback(() => persist(null), [persist]);

  useEffect(() => {
    // A 401 on a live session = token revoked (logout/password change on
    // another device) or account disabled. Say why, once, then drop the session.
    let notified = false;
    setUnauthorizedHandler((code) => {
      if (!notified) {
        notified = true;
        toast.warning(
          ['TEACHER_INACTIVE', 'STUDENT_INACTIVE', 'PARENT_INACTIVE', 'TRANSPORT_DRIVER_INACTIVE'].includes(code)
            ? 'Your account is inactive. Please contact the school office.'
            : 'Your session has ended. Please log in again.',
          'Signed out',
        );
        setTimeout(() => {
          notified = false;
        }, 3000);
      }
      clear();
    });
    setSubscriptionBlockedHandler((msg) => setBlocked(msg || 'School subscription expired. Please contact the school office.'));
  }, [clear]);

  // Restore saved session, then refresh user/school from `me` (also validates the token).
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        const role = ROLES[saved?.role];
        if (!saved?.token || !role) return clear();
        setAuthToken(saved.token);
        setSession(saved);
        try {
          const { data } = await api.get(role.mePath);
          await persist({ ...saved, user: data.user || saved.user, school: data.school || saved.school });
        } catch (err) {
          // Offline: keep the cached session. 401 is already handled by the client;
          // 402 (subscription) keeps the session and shows the blocked screen.
          if (err.status && err.status !== 401 && err.status !== 402 && err.status !== 429 && err.status < 500) await clear();
        }
      } catch {
        await clear();
      } finally {
        setBooting(false);
      }
    })();
  }, [clear, persist]);

  const login = useCallback(
    async (roleKey, identifier, password) => {
      const role = ROLES[roleKey];
      const res = await api.post(role.loginPath, { identifier: identifier.trim(), password });
      // Teacher/student/parent login spread the payload at the top level
      // (`{ success, token, user, school }`); driver wraps it in `data`.
      const payload = res.data && res.data.token ? res.data : res;
      // `extra` keeps role-specific login fields (e.g. parent `children[]`).
      // eslint-disable-next-line no-unused-vars
      const { success, message, token, user, school, ...extra } = payload;
      if (!token) throw new Error('Login response did not include a token.');
      const next = { token, role: roleKey, user, school, extra };
      await persist(next);
      return next;
    },
    [persist],
  );

  // Merge live school fields (theme/color/logo) into the session; no-op if nothing changed.
  const updateSchool = useCallback(
    async (patch) => {
      if (!session) return;
      const current = session.school || {};
      const changed = Object.keys(patch).some((k) => JSON.stringify(current[k]) !== JSON.stringify(patch[k]));
      if (!changed) return;
      await persist({ ...session, school: { ...current, ...patch } });
    },
    [session, persist],
  );

  // Pull-to-refresh: re-read `me` (profile + school theme/logo snapshot).
  const refreshSession = useCallback(async () => {
    const role = ROLES[session?.role];
    if (!role) return;
    const { data } = await api.get(role.mePath);
    await persist({
      ...session,
      user: data.user || session.user,
      school: data.school ? { ...session.school, ...data.school } : session.school,
    });
  }, [session, persist]);

  // Password change revokes every old token and hands back a fresh one.
  const setToken = useCallback(
    async (token) => {
      if (session && token) await persist({ ...session, token });
    },
    [session, persist],
  );

  // "Try again" on the subscription screen: re-read `me`; a 402 re-blocks.
  const retryBlocked = useCallback(async () => {
    setBlocked(null);
    try {
      await refreshSession();
    } catch {
      // a 402 sets `blocked` again via the client handler
    }
  }, [refreshSession]);

  const logout = useCallback(async () => {
    const role = ROLES[session?.role];
    if (role?.logoutPath) {
      try {
        await api.post(role.logoutPath);
      } catch {
        // best effort — local logout must always succeed
      }
    }
    setBlocked(null);
    await clear();
  }, [session, clear]);

  const value = useMemo(
    () => ({
      booting,
      session,
      role: session?.role || null,
      user: session?.user || null,
      school: session?.school || null,
      login,
      logout,
      updateSchool,
      refreshSession,
      setToken,
      // Drop the session locally without calling the logout API (e.g. after
      // the account was deleted and every token is already revoked).
      clearSession: clear,
      blocked,
      retryBlocked,
    }),
    [booting, session, login, logout, updateSchool, refreshSession, setToken, clear, blocked, retryBlocked],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

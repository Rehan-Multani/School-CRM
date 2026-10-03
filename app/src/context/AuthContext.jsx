import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken, setSubscriptionBlockedHandler, setUnauthorizedHandler } from '../api/client';
import { ROLES } from '../api/roles';
import { toast } from '../lib/notify';
import { onPushReceived } from '../lib/pushRouting';
import { onAppForeground } from '../lib/foreground';
import { clearCache, setCacheScope } from '../lib/cache';

const STORAGE_KEY = 'schoolcrm.session';

const AuthContext = createContext(null);

const INACTIVE_CODES = ['TEACHER_INACTIVE', 'STUDENT_INACTIVE', 'PARENT_INACTIVE', 'TRANSPORT_MANAGER_INACTIVE'];

// Was this session ended by an administrator's "force logout"? The backend
// keeps the admin's message per role + school; it only counts when it is newer
// than this login. Resolves to the message, or '' for an ordinary 401.
async function forcedLogoutMessage(ended) {
  if (!ended?.role) return '';
  try {
    const { data } = await api.get('/app-config/logout-notice', { role: ended.role, schoolId: ended.school?.id });
    if (!data?.at) return '';
    const since = ended.loginAt ? new Date(ended.loginAt).getTime() : 0;
    return new Date(data.at).getTime() > since ? data.message || '' : '';
  } catch {
    return '';
  }
}

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

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Saved screen data (lib/cache) belongs to exactly one signed-in account.
const cacheScopeOf = (s) => (s ? `${s.role}:${s.school?.id || ''}:${s.user?.id || s.user?._id || ''}` : '');

// Session = { token, role, user, school }. One 7-day token per login, no
// refresh token in any APK flow — on 401 we simply drop the session.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  // Message from a 402 (school subscription expired) — shown full-screen, no logout.
  const [blocked, setBlocked] = useState(null);
  // Message of an administrator's force logout — shown as a popup over the
  // login screen (see ForcedLogoutNotice) until the user dismisses it.
  const [signedOut, setSignedOut] = useState(null);
  // The live session for callbacks that outlive a render (the 401 handler).
  const sessionRef = useRef(null);

  const persist = useCallback(async (next) => {
    setAuthToken(next?.token || null);
    setCacheScope(cacheScopeOf(next));
    sessionRef.current = next;
    setSession(next);
    if (next) await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(forStorage(next)));
    else {
      // Logout / revoked session: the token and every saved screen leave the phone.
      await Promise.all([SecureStore.deleteItemAsync(STORAGE_KEY), clearCache()]);
    }
  }, []);

  const clear = useCallback(() => persist(null), [persist]);

  useEffect(() => {
    // A 401 on a live session = token revoked (logout/password change on
    // another device) or account disabled. Say why, once, then drop the session.
    let notified = false;
    setUnauthorizedHandler((code) => {
      const ended = sessionRef.current;
      clear();
      if (notified) return;
      notified = true;
      setTimeout(() => {
        notified = false;
      }, 3000);
      if (INACTIVE_CODES.includes(code)) {
        toast.warning('Your account is inactive. Please contact the school office.', 'Signed out');
        return;
      }
      forcedLogoutMessage(ended).then((message) => {
        if (message) setSignedOut({ message });
        else toast.warning('Your session has ended. Please log in again.', 'Signed out');
      });
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
        setCacheScope(cacheScopeOf(saved));
        sessionRef.current = saved;
        setSession(saved);
        try {
          const { data } = await api.get(role.mePath);
          const next = { ...saved, user: data.user || saved.user, school: data.school || saved.school };
          // Nothing changed since the last launch (the usual case): keep the
          // session object, so the app is not re-rendered and re-saved for nothing.
          if (!sameJson(forStorage(next), saved)) await persist(next);
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

  // Turn a login response into the saved session. Used by the password login
  // below and by the mobile-OTP login (student / parent — see login.jsx).
  const adoptSession = useCallback(
    async (roleKey, res) => {
      // Teacher login spreads the payload at the top level
      // (`{ success, token, user, school }`); the OTP login wraps it in `data`.
      const payload = res.data && res.data.token ? res.data : res;
      // `extra` keeps role-specific login fields (e.g. parent `children[]`).
      // eslint-disable-next-line no-unused-vars
      const { success, message, token, user, school, ...extra } = payload;
      if (!token) throw new Error('Login response did not include a token.');
      // `loginAt` tells an administrator's force logout apart from an older one.
      const next = { token, role: roleKey, user, school, extra, loginAt: new Date().toISOString() };
      await persist(next);
      return next;
    },
    [persist],
  );

  const login = useCallback(
    async (roleKey, identifier, password) => {
      const res = await api.post(ROLES[roleKey].loginPath, { identifier: identifier.trim(), password });
      return adoptSession(roleKey, res);
    },
    [adoptSession],
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
    const next = {
      ...session,
      user: data.user || session.user,
      school: data.school ? { ...session.school, ...data.school } : session.school,
    };
    if (!sameJson(next, session)) await persist(next);
  }, [session, persist]);

  // An administrator's force logout takes effect on the next request. Ask the
  // server right away when its push arrives, and whenever the app is reopened,
  // instead of waiting for the user's next tap — a 401 here runs the handler above.
  const hasSession = Boolean(session);
  useEffect(() => {
    if (!hasSession) return undefined;
    const check = () => {
      const role = ROLES[sessionRef.current?.role];
      if (role) api.get(role.mePath).catch(() => {});
    };
    const offPush = onPushReceived((data) => data?.type === 'force_logout' && check());
    const offForeground = onAppForeground(check);
    return () => {
      offPush();
      offForeground();
    };
  }, [hasSession]);

  // Password change revokes every old token and hands back a fresh one.
  const setToken = useCallback(
    async (token) => {
      if (session && token) await persist({ ...session, token, loginAt: new Date().toISOString() });
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
      adoptSession,
      logout,
      updateSchool,
      refreshSession,
      setToken,
      // Drop the session locally without calling the logout API (e.g. after
      // the account was deleted and every token is already revoked).
      clearSession: clear,
      blocked,
      retryBlocked,
      signedOut,
      dismissSignedOut: () => setSignedOut(null),
    }),
    [booting, session, login, adoptSession, logout, updateSchool, refreshSession, setToken, clear, blocked, retryBlocked, signedOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

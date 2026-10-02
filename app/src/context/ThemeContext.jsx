import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { conditionalGet } from '../api/client';
import { FOREGROUND_MIN_GAP_MS } from '../lib/foreground';
import { brandTheme, buildTheme } from '../theme';
import { useAuth } from './AuthContext';

// How often to re-check the school's theme while the app stays open. A theme
// changes rarely, and changes made in the admin panel also apply whenever the
// app returns to the foreground — so this is only a slow safety net, not a
// request every few seconds for the whole session.
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

const ThemeContext = createContext(brandTheme);

export function ThemeProvider({ children }) {
  const { session, updateSchool } = useAuth();
  const school = session?.school;
  const schoolId = school?.id;

  // Keyed on the colour/mode only: a new session object (pull-to-refresh, token
  // refresh) must not rebuild the theme and restyle every mounted screen.
  const signedIn = Boolean(session);
  const theme = useMemo(
    () => (signedIn ? buildTheme(school?.primaryColor, school?.theme) : brandTheme),
    [signedIn, school?.primaryColor, school?.theme],
  );

  // Keep the latest updater in a ref so the sync effect only restarts on school change.
  const updateRef = useRef(updateSchool);
  updateRef.current = updateSchool;

  useEffect(() => {
    if (!schoolId) return undefined;
    let cancelled = false;
    // With the ETag an unchanged theme is an empty 304 on every poll.
    let etag = null;

    let syncedAt = 0;
    const sync = async () => {
      syncedAt = Date.now();
      try {
        const res = await conditionalGet(`/school-theme/${encodeURIComponent(schoolId)}`, etag);
        if (cancelled || res.notModified) return;
        etag = res.etag;
        const data = res.json?.data;
        if (!data) return;
        updateRef.current({
          primaryColor: data.primaryColor,
          theme: data.theme,
          branding: data.branding,
          ...(data.schoolName ? { name: data.schoolName } : {}),
        });
      } catch {
        // offline / server down — keep the last known theme
      }
    };

    let timer = null;
    const start = () => {
      // "active" also fires after every picker / permission dialog (see lib/foreground).
      if (Date.now() - syncedAt >= FOREGROUND_MIN_GAP_MS) sync();
      if (!timer) timer = setInterval(sync, SYNC_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    start();
    const sub = AppState.addEventListener('change', (state) => (state === 'active' ? start() : stop()));
    return () => {
      cancelled = true;
      stop();
      sub.remove();
    };
  }, [schoolId]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Theme-aware StyleSheet: `const styles = useStyles(makeStyles)` where
// makeStyles = (t) => StyleSheet.create({...}). Recomputed only when the theme changes.
export function useStyles(factory) {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { conditionalGet } from '../api/client';
import { brandTheme, buildTheme } from '../theme';
import { useAuth } from './AuthContext';

// How often to re-check the school's theme while the app is open. Changes
// made in the admin panel also apply instantly whenever the app returns to
// the foreground.
const SYNC_INTERVAL_MS = 15000;

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
    // The theme payload can carry the school logo as a multi-MB data URI;
    // with the ETag an unchanged theme is an empty 304 on every poll.
    let etag = null;

    const sync = async () => {
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
      sync();
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

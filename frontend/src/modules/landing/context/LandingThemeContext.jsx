import React, { createContext, useCallback, useContext, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Standalone theme controller for the public marketing site.
//
// Every role portal mounts its own theme provider that only toggles the
// `.dark` class on <html> while its own route is active (see e.g.
// student/context/ThemeContext.jsx). None of them are active on the public
// pages ("/", "/about", ...), so the landing site owns `.dark` here and
// re-asserts it on every landing route change.

const LandingThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

const STORAGE_KEY = 'landing-theme';

function readInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function applyThemeClass(isDark) {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
}

export const LandingThemeProvider = ({ children }) => {
  const location = useLocation();
  const [theme, setTheme] = useState(readInitialTheme);

  useLayoutEffect(() => {
    applyThemeClass(theme === 'dark');
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme, location.pathname]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <LandingThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </LandingThemeContext.Provider>
  );
};

export const useLandingTheme = () => useContext(LandingThemeContext);

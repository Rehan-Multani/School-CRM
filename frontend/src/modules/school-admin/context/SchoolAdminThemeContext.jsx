import React, { createContext, useState, useContext, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  applySchoolAdminAccent,
  DEFAULT_PRIMARY,
  normalizeHex,
} from '../utils/themeColors';
import '../styles/theme.css';

const SchoolAdminThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('school-admin-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('school-admin-theme', 'light');
  }
}

export const SchoolAdminThemeProvider = ({ children }) => {
  const location = useLocation();
  const isSchoolAdmin = location.pathname.startsWith('/school-admin');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('school-admin-theme');
    return saved
      ? saved === 'dark'
      : typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [primaryColor, setPrimaryColorState] = useState(() =>
    normalizeHex(localStorage.getItem('school-admin-accent') || DEFAULT_PRIMARY)
  );

  useLayoutEffect(() => {
    if (isSchoolAdmin) applyThemeClass(darkMode);
  }, [isSchoolAdmin, darkMode]);

  useLayoutEffect(() => {
    applySchoolAdminAccent(primaryColor, isSchoolAdmin);
  }, [primaryColor, isSchoolAdmin]);

  const setTheme = useCallback((theme) => {
    const isDark = theme === 'dark';
    setDarkMode(isDark);
    if (isSchoolAdmin) applyThemeClass(isDark);
  }, [isSchoolAdmin]);

  const setAccentColor = useCallback(
    (hex) => {
      const next = normalizeHex(hex);
      setPrimaryColorState(next);
      localStorage.setItem('school-admin-accent', next);
      if (isSchoolAdmin) applySchoolAdminAccent(next, true);
    },
    [isSchoolAdmin]
  );

  const toggleTheme = useCallback(() => {
    setDarkMode((current) => {
      const next = !current;
      if (isSchoolAdmin) applyThemeClass(next);
      return next;
    });
  }, [isSchoolAdmin]);

  return (
    <SchoolAdminThemeContext.Provider
      value={{ darkMode, toggleTheme, setTheme, primaryColor, setAccentColor }}
    >
      {children}
    </SchoolAdminThemeContext.Provider>
  );
};

export const useSchoolAdminTheme = () => useContext(SchoolAdminThemeContext);

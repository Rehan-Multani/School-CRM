import React, { createContext, useState, useContext, useLayoutEffect, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  applySchoolAdminAccent,
  DEFAULT_PRIMARY,
  normalizeHex,
} from '../utils/themeColors';
import { getSharedTheme, setSharedTheme, subscribeSharedTheme } from '../../../shared/theme/themeSync';
import '../../../shared/theme/accent.css';
import '../styles/theme.css';

const SchoolAdminThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const SchoolAdminThemeProvider = ({ children }) => {
  const location = useLocation();
  const isSchoolAdmin = location.pathname.startsWith('/school-admin');
  const [darkMode, setDarkMode] = useState(getSharedTheme);
  const [primaryColor, setPrimaryColorState] = useState(() =>
    normalizeHex(localStorage.getItem('school-admin-accent') || DEFAULT_PRIMARY)
  );

  useEffect(() => {
    return subscribeSharedTheme((isDark) => {
      setDarkMode(isDark);
    });
  }, []);

  useLayoutEffect(() => {
    if (isSchoolAdmin) {
      const activeTheme = getSharedTheme();
      if (activeTheme !== darkMode) {
        setDarkMode(activeTheme);
      }
      applyThemeClass(activeTheme);
    }
  }, [isSchoolAdmin, darkMode]);

  useLayoutEffect(() => {
    applySchoolAdminAccent(primaryColor, isSchoolAdmin);
  }, [primaryColor, isSchoolAdmin]);

  const setTheme = useCallback((theme) => {
    const isDark = theme === 'dark';
    setDarkMode(isDark);
    setSharedTheme(isDark);
  }, []);

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
      setSharedTheme(next);
      return next;
    });
  }, []);

  return (
    <SchoolAdminThemeContext.Provider
      value={{ darkMode, toggleTheme, setTheme, primaryColor, setAccentColor }}
    >
      {children}
    </SchoolAdminThemeContext.Provider>
  );
};

export const useSchoolAdminTheme = () => useContext(SchoolAdminThemeContext);


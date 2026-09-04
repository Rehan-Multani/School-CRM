import React, { createContext, useState, useContext, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
import '../styles/theme.css';

const ThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const ThemeProvider = ({ children }) => {
  const location = useLocation();
  const isStudent = location.pathname.startsWith('/student');

  const { primaryColor, setPrimaryColor } = usePanelAccent({
    active: isStudent,
    scope: 'student-theme',
    storageKey: 'student',
    pathname: location.pathname,
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('student-theme') || 'light';
  });

  useLayoutEffect(() => {
    if (isStudent) {
      applyThemeClass(theme === 'dark');
      localStorage.setItem('student-theme', theme);
    }
  }, [isStudent, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (isStudent) applyThemeClass(next === 'dark');
      return next;
    });
  }, [isStudent]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, primaryColor, setAccentColor: setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

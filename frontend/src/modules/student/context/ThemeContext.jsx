import React, { createContext, useState, useContext, useLayoutEffect, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
import { getSharedTheme, setSharedTheme, subscribeSharedTheme } from '../../../shared/theme/themeSync';
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

  const [theme, setTheme] = useState(() => (getSharedTheme() ? 'dark' : 'light'));

  useEffect(() => {
    return subscribeSharedTheme((isDark) => {
      setTheme(isDark ? 'dark' : 'light');
    });
  }, []);

  useLayoutEffect(() => {
    if (isStudent) {
      const activeTheme = getSharedTheme() ? 'dark' : 'light';
      if (activeTheme !== theme) {
        setTheme(activeTheme);
      }
      applyThemeClass(activeTheme === 'dark');
    }
  }, [isStudent, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      setSharedTheme(next === 'dark');
      return next;
    });
  }, []);

  const handleSetTheme = useCallback((nextTheme) => {
    setTheme(nextTheme);
    setSharedTheme(nextTheme === 'dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, toggleTheme, primaryColor, setAccentColor: setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);


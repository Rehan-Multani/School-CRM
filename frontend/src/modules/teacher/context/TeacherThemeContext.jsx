import React, { createContext, useState, useContext, useLayoutEffect, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
import { getSharedTheme, setSharedTheme, subscribeSharedTheme } from '../../../shared/theme/themeSync';
import '../styles/theme.css';

const TeacherThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const TeacherThemeProvider = ({ children }) => {
  const location = useLocation();
  const isTeacher = location.pathname.startsWith('/teacher');

  const { primaryColor, setPrimaryColor } = usePanelAccent({
    active: isTeacher,
    scope: 'teacher-theme',
    storageKey: 'teacher',
    pathname: location.pathname,
  });

  const [theme, setTheme] = useState(() => (getSharedTheme() ? 'dark' : 'light'));

  useEffect(() => {
    return subscribeSharedTheme((isDark) => {
      setTheme(isDark ? 'dark' : 'light');
    });
  }, []);

  useLayoutEffect(() => {
    if (isTeacher) {
      const activeTheme = getSharedTheme() ? 'dark' : 'light';
      if (activeTheme !== theme) {
        setTheme(activeTheme);
      }
      applyThemeClass(activeTheme === 'dark');
    }
  }, [isTeacher, theme]);

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
    <TeacherThemeContext.Provider value={{ theme, setTheme: handleSetTheme, toggleTheme, primaryColor, setAccentColor: setPrimaryColor }}>
      {children}
    </TeacherThemeContext.Provider>
  );
};

export const useTeacherTheme = () => useContext(TeacherThemeContext);


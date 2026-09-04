import React, { createContext, useState, useContext, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
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

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('teacher-theme') || 'light';
  });

  useLayoutEffect(() => {
    if (isTeacher) {
      applyThemeClass(theme === 'dark');
      localStorage.setItem('teacher-theme', theme);
    }
  }, [isTeacher, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (isTeacher) applyThemeClass(next === 'dark');
      return next;
    });
  }, [isTeacher]);

  return (
    <TeacherThemeContext.Provider value={{ theme, setTheme, toggleTheme, primaryColor, setAccentColor: setPrimaryColor }}>
      {children}
    </TeacherThemeContext.Provider>
  );
};

export const useTeacherTheme = () => useContext(TeacherThemeContext);

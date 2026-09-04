import React, { createContext, useState, useContext, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
import '../styles/theme.css';

const ParentThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const ParentThemeProvider = ({ children }) => {
  const location = useLocation();
  const isParent = location.pathname.startsWith('/parent');

  const { primaryColor, setPrimaryColor } = usePanelAccent({
    active: isParent,
    scope: 'parent-theme',
    storageKey: 'parent',
    pathname: location.pathname,
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('parent-theme') || 'light';
  });

  useLayoutEffect(() => {
    if (isParent) {
      applyThemeClass(theme === 'dark');
      localStorage.setItem('parent-theme', theme);
    }
  }, [isParent, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (isParent) applyThemeClass(next === 'dark');
      return next;
    });
  }, [isParent]);

  return (
    <ParentThemeContext.Provider value={{ theme, setTheme, toggleTheme, primaryColor, setAccentColor: setPrimaryColor }}>
      {children}
    </ParentThemeContext.Provider>
  );
};

export const useParentTheme = () => useContext(ParentThemeContext);

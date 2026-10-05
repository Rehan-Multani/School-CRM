import React, { createContext, useState, useContext, useLayoutEffect, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
import { getSharedTheme, setSharedTheme, subscribeSharedTheme } from '../../../shared/theme/themeSync';
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

  const [theme, setTheme] = useState(() => (getSharedTheme() ? 'dark' : 'light'));

  useEffect(() => {
    return subscribeSharedTheme((isDark) => {
      setTheme(isDark ? 'dark' : 'light');
    });
  }, []);

  useLayoutEffect(() => {
    if (isParent) {
      const activeTheme = getSharedTheme() ? 'dark' : 'light';
      if (activeTheme !== theme) {
        setTheme(activeTheme);
      }
      applyThemeClass(activeTheme === 'dark');
    }
  }, [isParent, theme]);

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
    <ParentThemeContext.Provider value={{ theme, setTheme: handleSetTheme, toggleTheme, primaryColor, setAccentColor: setPrimaryColor }}>
      {children}
    </ParentThemeContext.Provider>
  );
};

export const useParentTheme = () => useContext(ParentThemeContext);


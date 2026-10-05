import React, { createContext, useState, useContext, useLayoutEffect, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
import { getSharedTheme, setSharedTheme, subscribeSharedTheme } from '../../../shared/theme/themeSync';
import '../styles/theme.css';

const LibrarianThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const LibrarianThemeProvider = ({ children }) => {
  const location = useLocation();
  const isLibrarian = location.pathname.startsWith('/librarian') || location.pathname.startsWith('/school-admin/library');

  const { primaryColor, setPrimaryColor } = usePanelAccent({
    active: isLibrarian,
    scope: 'librarian-theme',
    storageKey: 'librarian',
    userKey: 'librarian_user',
    pathname: location.pathname,
  });

  const [darkMode, setDarkMode] = useState(getSharedTheme);

  useEffect(() => {
    return subscribeSharedTheme((isDark) => {
      setDarkMode(isDark);
    });
  }, []);

  useLayoutEffect(() => {
    if (isLibrarian) {
      const activeTheme = getSharedTheme();
      if (activeTheme !== darkMode) {
        setDarkMode(activeTheme);
      }
      applyThemeClass(activeTheme);
    }
  }, [isLibrarian, darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      setSharedTheme(next);
      return next;
    });
  }, []);

  return (
    <LibrarianThemeContext.Provider
      value={{ darkMode, toggleDarkMode, primaryColor, setAccentColor: setPrimaryColor }}
    >
      {children}
    </LibrarianThemeContext.Provider>
  );
};

export const useLibrarianTheme = () => {
  const context = useContext(LibrarianThemeContext);
  if (!context) {
    throw new Error('useLibrarianTheme must be used within a LibrarianThemeProvider');
  }
  return context;
};


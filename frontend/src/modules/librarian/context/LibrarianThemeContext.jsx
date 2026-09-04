import React, { createContext, useState, useContext, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
import '../styles/theme.css';

const LibrarianThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('librarian_darkMode', 'true');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('librarian_darkMode', 'false');
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

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('librarian_darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useLayoutEffect(() => {
    if (isLibrarian) {
      applyThemeClass(darkMode);
    }
  }, [isLibrarian, darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      if (isLibrarian) applyThemeClass(next);
      return next;
    });
  }, [isLibrarian]);

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

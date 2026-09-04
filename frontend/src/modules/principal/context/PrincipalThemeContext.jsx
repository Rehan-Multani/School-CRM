import React, { createContext, useState, useContext, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
import '../styles/theme.css';

const PrincipalThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('principal-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('principal-theme', 'light');
  }
}

export const PrincipalThemeProvider = ({ children }) => {
  const location = useLocation();
  const isPrincipal = location.pathname.startsWith('/principal');

  const { primaryColor, setPrimaryColor } = usePanelAccent({
    active: isPrincipal,
    scope: 'principal-theme',
    storageKey: 'principal',
    pathname: location.pathname,
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('principal-theme');
    return saved ? saved === 'dark' : false;
  });

  useLayoutEffect(() => {
    if (isPrincipal) {
      applyThemeClass(darkMode);
    }
  }, [isPrincipal, darkMode]);

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      if (isPrincipal) applyThemeClass(next);
      return next;
    });
  }, [isPrincipal]);

  return (
    <PrincipalThemeContext.Provider value={{ darkMode, toggleTheme, primaryColor, setAccentColor: setPrimaryColor }}>
      {children}
    </PrincipalThemeContext.Provider>
  );
};

export const usePrincipalTheme = () => useContext(PrincipalThemeContext);
export default PrincipalThemeContext;

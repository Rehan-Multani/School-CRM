import React, { createContext, useState, useContext, useLayoutEffect, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
import { getSharedTheme, setSharedTheme, subscribeSharedTheme } from '../../../shared/theme/themeSync';
import '../styles/theme.css';

const PrincipalThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
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

  const [darkMode, setDarkMode] = useState(getSharedTheme);

  useEffect(() => {
    return subscribeSharedTheme((isDark) => {
      setDarkMode(isDark);
    });
  }, []);

  useLayoutEffect(() => {
    if (isPrincipal) {
      const activeTheme = getSharedTheme();
      if (activeTheme !== darkMode) {
        setDarkMode(activeTheme);
      }
      applyThemeClass(activeTheme);
    }
  }, [isPrincipal, darkMode]);

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      setSharedTheme(next);
      return next;
    });
  }, []);

  return (
    <PrincipalThemeContext.Provider value={{ darkMode, toggleTheme, primaryColor, setAccentColor: setPrimaryColor }}>
      {children}
    </PrincipalThemeContext.Provider>
  );
};

export const usePrincipalTheme = () => useContext(PrincipalThemeContext);
export default PrincipalThemeContext;


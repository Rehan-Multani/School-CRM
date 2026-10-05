import React, { createContext, useState, useContext, useEffect, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
import { getSharedTheme, setSharedTheme, subscribeSharedTheme } from '../../../shared/theme/themeSync';
import '../styles/theme.css';

const HRThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const HRThemeProvider = ({ children }) => {
  const location = useLocation();
  const isHR = location.pathname.startsWith('/hr');

  const { primaryColor, setPrimaryColor } = usePanelAccent({
    active: isHR,
    scope: 'hr-theme',
    storageKey: 'hr',
    userKey: 'hr_user',
    pathname: location.pathname,
  });

  const [darkMode, setDarkMode] = useState(getSharedTheme);

  useEffect(() => {
    return subscribeSharedTheme((isDark) => {
      setDarkMode(isDark);
    });
  }, []);

  useLayoutEffect(() => {
    if (isHR) {
      const activeTheme = getSharedTheme();
      if (activeTheme !== darkMode) {
        setDarkMode(activeTheme);
      }
      applyThemeClass(activeTheme);
    }
  }, [isHR, darkMode]);

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      setSharedTheme(next);
      return next;
    });
  }, []);

  const toggleDarkMode = toggleTheme;

  return (
    <HRThemeContext.Provider
      value={{ darkMode, toggleTheme, toggleDarkMode, primaryColor, setAccentColor: setPrimaryColor }}
    >
      {children}
    </HRThemeContext.Provider>
  );
};

export const useHRTheme = () => useContext(HRThemeContext);
export default HRThemeContext;


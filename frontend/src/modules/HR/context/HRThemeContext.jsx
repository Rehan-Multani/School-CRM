import React, { createContext, useState, useContext, useEffect, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
import '../styles/theme.css';

const HRThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('hr-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('hr-theme', 'light');
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

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('hr-theme');
    return saved ? saved === 'dark' : false;
  });

  useLayoutEffect(() => {
    if (isHR) {
      applyThemeClass(darkMode);
    }
  }, [isHR, darkMode]);

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      if (isHR) applyThemeClass(next);
      return next;
    });
  }, [isHR]);

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

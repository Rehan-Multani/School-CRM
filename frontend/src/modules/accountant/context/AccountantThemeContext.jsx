import React, { createContext, useState, useContext, useLayoutEffect, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePanelAccent } from '../../../shared/theme/usePanelAccent';
import { getSharedTheme, setSharedTheme, subscribeSharedTheme } from '../../../shared/theme/themeSync';
import '../styles/theme.css';

const AccountantThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const AccountantThemeProvider = ({ children }) => {
  const location = useLocation();
  const isAccountant = location.pathname.startsWith('/accountant');

  const { primaryColor, setPrimaryColor } = usePanelAccent({
    active: isAccountant,
    scope: 'accountant-theme',
    storageKey: 'accountant',
    pathname: location.pathname,
  });

  const [darkMode, setDarkMode] = useState(getSharedTheme);

  useEffect(() => {
    return subscribeSharedTheme((isDark) => {
      setDarkMode(isDark);
    });
  }, []);

  useLayoutEffect(() => {
    if (isAccountant) {
      const activeTheme = getSharedTheme();
      if (activeTheme !== darkMode) {
        setDarkMode(activeTheme);
      }
      applyThemeClass(activeTheme);
    }
  }, [isAccountant, darkMode]);

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      setSharedTheme(next);
      return next;
    });
  }, []);

  return (
    <AccountantThemeContext.Provider value={{ darkMode, toggleTheme, primaryColor, setAccentColor: setPrimaryColor }}>
      {children}
    </AccountantThemeContext.Provider>
  );
};

export const useAccountantTheme = () => useContext(AccountantThemeContext);
export default AccountantThemeContext;


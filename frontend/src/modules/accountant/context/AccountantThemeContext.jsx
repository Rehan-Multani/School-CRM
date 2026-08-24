import React, { createContext, useState, useContext, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const AccountantThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('accountant-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('accountant-theme', 'light');
  }
}

export const AccountantThemeProvider = ({ children }) => {
  const location = useLocation();
  const isAccountant = location.pathname.startsWith('/accountant');

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('accountant-theme');
    return saved ? saved === 'dark' : false;
  });

  useLayoutEffect(() => {
    if (isAccountant) {
      applyThemeClass(darkMode);
    }
  }, [isAccountant, darkMode]);

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      if (isAccountant) applyThemeClass(next);
      return next;
    });
  }, [isAccountant]);

  return (
    <AccountantThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </AccountantThemeContext.Provider>
  );
};

export const useAccountantTheme = () => useContext(AccountantThemeContext);
export default AccountantThemeContext;

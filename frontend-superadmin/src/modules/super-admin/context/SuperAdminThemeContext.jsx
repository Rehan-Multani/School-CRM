import React, { createContext, useContext, useState, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const SuperAdminThemeContext = createContext(null);

export const SuperAdminThemeProvider = ({ children }) => {
  const location = useLocation();
  const isSuperAdmin = location.pathname.startsWith('/super-admin');

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('super_admin_theme');
    return savedTheme || 'light';
  });

  useLayoutEffect(() => {
    if (isSuperAdmin) {
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('super_admin_theme', theme);
    }
  }, [isSuperAdmin, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (isSuperAdmin) {
        if (next === 'dark') window.document.documentElement.classList.add('dark');
        else window.document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, [isSuperAdmin]);

  return (
    <SuperAdminThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </SuperAdminThemeContext.Provider>
  );
};

export const useSuperAdminTheme = () => {
  const context = useContext(SuperAdminThemeContext);
  if (!context) {
    throw new Error('useSuperAdminTheme must be used within a SuperAdminThemeProvider');
  }
  return context;
};

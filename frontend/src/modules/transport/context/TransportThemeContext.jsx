import React, { createContext, useState, useContext, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const TransportThemeContext = createContext();

function applyThemeClass(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('transport_darkMode', 'true');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('transport_darkMode', 'false');
  }
}

export const TransportThemeProvider = ({ children }) => {
  const location = useLocation();
  const isTransport = location.pathname.startsWith('/transport');

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('transport_darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useLayoutEffect(() => {
    if (isTransport) {
      applyThemeClass(darkMode);
    }
  }, [isTransport, darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      if (isTransport) applyThemeClass(next);
      return next;
    });
  }, [isTransport]);

  return (
    <TransportThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </TransportThemeContext.Provider>
  );
};

export const useTransportTheme = () => {
  const context = useContext(TransportThemeContext);
  if (!context) {
    throw new Error('useTransportTheme must be used within a TransportThemeProvider');
  }
  return context;
};

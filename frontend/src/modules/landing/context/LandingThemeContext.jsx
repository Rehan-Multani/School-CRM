import React, { createContext, useCallback, useContext, useLayoutEffect, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSharedTheme, setSharedTheme, subscribeSharedTheme } from '../../../shared/theme/themeSync';

const LandingThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

export const LandingThemeProvider = ({ children }) => {
  const location = useLocation();
  const [theme, setTheme] = useState(() => (getSharedTheme() ? 'dark' : 'light'));

  useEffect(() => {
    return subscribeSharedTheme((isDark) => {
      setTheme(isDark ? 'dark' : 'light');
    });
  }, []);

  useLayoutEffect(() => {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, location.pathname]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      setSharedTheme(next === 'dark');
      return next;
    });
  }, []);

  return (
    <LandingThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </LandingThemeContext.Provider>
  );
};

export const useLandingTheme = () => useContext(LandingThemeContext);


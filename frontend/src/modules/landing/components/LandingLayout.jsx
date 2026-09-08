import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LandingThemeProvider } from '../context/LandingThemeContext';
import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';

const ScrollManager = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        // Let the page paint first so the target has a layout position.
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  }, [pathname, hash]);

  return null;
};

export const LandingLayout = () => (
  <LandingThemeProvider>
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      <ScrollManager />
      <LandingNav />
      <main>
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  </LandingThemeProvider>
);

export default LandingLayout;

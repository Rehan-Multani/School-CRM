import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Moon, Smartphone, Sun } from 'lucide-react';
import BrandLogo from '../../../shared/ui/BrandLogo';
import { LandingThemeProvider, useLandingTheme } from '../context/LandingThemeContext';
import PortalCard from '../components/PortalCard';
import { APP_ROLES, PRODUCT, WEB_PORTALS } from '../data/content';

const ThemeButton = () => {
  const { theme, toggleTheme } = useLandingTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-indigo-600"
    >
      {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
};

const PortalPicker = () => {
  useEffect(() => {
    document.title = `Sign in – ${PRODUCT.name}`;
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandLogo className="h-9 w-9 shadow-sm" />
            <span className="text-[15px] font-black tracking-tight text-slate-900 dark:text-white">
              {PRODUCT.name}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-indigo-600"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to home</span>
            </Link>
            <ThemeButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:py-16">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
            Staff portals
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Sign in to your portal
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-400">
            Choose the workspace built for your role. Office staff sign in here on the web – each
            portal has its own login and password reset.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WEB_PORTALS.map((portal) => (
            <PortalCard key={portal.key} portal={portal} />
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white">
                <Smartphone className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">On mobile?</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Teachers, students, parents and transport staff use the {PRODUCT.name} Android
                  app. Open a web preview below.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {APP_ROLES.map((role) => (
                <Link
                  key={role.key}
                  to={role.href}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:text-indigo-300"
                >
                  {role.name}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {PRODUCT.name}</p>
          <p className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-slate-800 dark:hover:text-slate-300">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-800 dark:hover:text-slate-300">Terms</Link>
            <Link to="/contact" className="hover:text-slate-800 dark:hover:text-slate-300">Contact</Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export const PortalPickerPage = () => (
  <LandingThemeProvider>
    <PortalPicker />
  </LandingThemeProvider>
);

export default PortalPickerPage;


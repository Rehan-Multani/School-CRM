import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Menu, Moon, Sun, X } from 'lucide-react';
import BrandLogo from '../../../shared/ui/BrandLogo';
import { useLandingTheme } from '../context/LandingThemeContext';
import { PRODUCT } from '../data/content';

const SECTIONS = [
  { label: 'Features', to: '/#features' },
  { label: 'Portals', to: '/#portals' },
  { label: 'Workflow', to: '/#workflow' },
  { label: 'FAQ', to: '/#faq' },
];

const PAGES = [
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

const ThemeButton = ({ className = '' }) => {
  const { theme, toggleTheme } = useLandingTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-indigo-600 ${className}`}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
};

export const LandingNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  const handleSectionClick = (event, to) => {
    const [, hash] = to.split('#');
    if (location.pathname === '/') {
      event.preventDefault();
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', `#${hash}`);
      }
      setOpen(false);
    } else {
      event.preventDefault();
      navigate(to);
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled || open
          ? 'border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandLogo className="h-9 w-9 shadow-sm" />
          <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
            {PRODUCT.name}
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((item) => (
            <a
              key={item.to}
              href={item.to}
              onClick={(e) => handleSectionClick(e, item.to)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {item.label}
            </a>
          ))}
          {PAGES.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-600 dark:text-slate-300'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeButton />

          <Link
            to="/login"
            className="hidden sm:inline-flex items-center rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-indigo-600"
          >
            Staff Sign In
          </Link>

          <Link
            to="/contact"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500 hover:shadow-indigo-500/30"
          >
            <span>Get Started</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:hidden"
          >
            <div className="space-y-1 px-4 py-4 sm:px-6">
              {SECTIONS.map((item) => (
                <a
                  key={item.to}
                  href={item.to}
                  onClick={(e) => handleSectionClick(e, item.to)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-indigo-600"
                >
                  {item.label}
                </a>
              ))}
              {PAGES.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-indigo-600"
                >
                  {item.label}
                </Link>
              ))}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="w-full text-center rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-800 dark:border-slate-800 dark:text-slate-200"
                >
                  Staff Sign In
                </Link>
                <Link
                  to="/contact"
                  className="w-full text-center rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white shadow-md"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default LandingNav;


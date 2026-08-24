import React from 'react';
import { Sun, Moon } from 'lucide-react';

// Canonical merged ThemeToggle — PARTIAL merge.
// student/teacher/parent each read from a *different* React Context
// (student's own ThemeContext, TeacherThemeContext, ParentThemeContext)
// because every portal mounts its own independent theme provider in
// App.jsx. That state wiring is genuinely per-module and can't be
// centralized without changing the call sites. What *is* identical is the
// button markup/styling, so that part is centralized here as a small
// presentational component, and each module's shim binds it to its own
// theme hook via `createThemeToggle`.
export const ThemeToggleBase = ({ theme, toggleTheme, id }) => (
  <button
    onClick={toggleTheme}
    className="p-2 rounded-xl border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
    aria-label="Toggle theme"
    id={id}
  >
    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
  </button>
);

// Factory: given a module's `useTheme`-style hook (must return
// `{ theme, toggleTheme }`), returns a ready-to-render <ThemeToggle />.
export const createThemeToggle = (useThemeHook, id) => {
  const ThemeToggle = () => {
    const { theme, toggleTheme } = useThemeHook();
    return <ThemeToggleBase theme={theme} toggleTheme={toggleTheme} id={id} />;
  };
  return ThemeToggle;
};

export default ThemeToggleBase;

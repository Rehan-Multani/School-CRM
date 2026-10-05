// Shared application-wide theme state & synchronization.
// Keeps theme across public pages (/login), role login screens, and all role portals in sync.

const GLOBAL_THEME_KEY = 'app-theme';
const THEME_CHANGE_EVENT = 'school-crm-theme-change';

export const ROLE_THEME_KEYS = [
  'landing-theme',
  'school-admin-theme',
  'principal-theme',
  'accountant-theme',
  'hr-theme',
  'librarian_darkMode',
  'teacher-theme',
  'student-theme',
  'parent-theme',
];

/**
 * Returns true if dark mode is active, false for light mode.
 */
export function getSharedTheme() {
  if (typeof window === 'undefined') return false;
  try {
    // 1. Primary unified key
    const globalVal = window.localStorage.getItem(GLOBAL_THEME_KEY);
    if (globalVal === 'dark') return true;
    if (globalVal === 'light') return false;

    // 2. Landing theme key (set by /login or landing pages)
    const landingVal = window.localStorage.getItem('landing-theme');
    if (landingVal === 'dark') return true;
    if (landingVal === 'light') return false;

    // 3. Check any role-specific key
    for (const key of ROLE_THEME_KEYS) {
      const val = window.localStorage.getItem(key);
      if (val === 'dark' || val === 'true') return true;
    }

    // 4. Live DOM check
    if (document.documentElement.classList.contains('dark')) return true;

    // 5. System preference
    return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  } catch {
    return false;
  }
}

/**
 * Set theme globally across all keys, DOM, and notify all mounted providers.
 */
export function setSharedTheme(isDark) {
  if (typeof window === 'undefined') return;
  const themeStr = isDark ? 'dark' : 'light';

  try {
    window.localStorage.setItem(GLOBAL_THEME_KEY, themeStr);
    window.localStorage.setItem('landing-theme', themeStr);
    window.localStorage.setItem('school-admin-theme', themeStr);
    window.localStorage.setItem('principal-theme', themeStr);
    window.localStorage.setItem('accountant-theme', themeStr);
    window.localStorage.setItem('hr-theme', themeStr);
    window.localStorage.setItem('librarian_darkMode', isDark ? 'true' : 'false');
    window.localStorage.setItem('teacher-theme', themeStr);
    window.localStorage.setItem('student-theme', themeStr);
    window.localStorage.setItem('parent-theme', themeStr);
  } catch {
    /* ignore localStorage errors */
  }

  // Update HTML class
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Broadcast to all mounted contexts
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, { detail: { isDark, theme: themeStr } })
  );
}

/**
 * Subscribe to theme changes from other components/providers.
 */
export function subscribeSharedTheme(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    callback(Boolean(e.detail?.isDark));
  };
  window.addEventListener(THEME_CHANGE_EVENT, handler);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, handler);
}

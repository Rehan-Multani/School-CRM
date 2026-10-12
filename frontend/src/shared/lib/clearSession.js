// Wipes everything a signed-in user left in the browser: tokens, cached user
// blobs, per-school brand/accent caches, notification read-state, demo data,
// impersonation, selected child, and all of sessionStorage.
//
// Kept on purpose (device preferences, not session data):
//   - the light / dark theme (`app-theme`, `<panel>-theme`, `landing-theme`, ...)
//   - sidebar collapsed state (`<panel>_sidebar_collapsed`)
//   - the public platform logo cache (`platform_brand_logo`)
//
// Every panel's logout() and the 401 auto-logout call this instead of removing
// a hand-picked list of keys, so a new key added later is cleared as well.
const KEEP_EXACT = new Set(['app-theme', 'landing-theme', 'librarian_darkMode', 'platform_brand_logo']);
const KEEP_PATTERNS = [/-theme$/, /_sidebar_collapsed$/];

const isPreference = (key) => KEEP_EXACT.has(key) || KEEP_PATTERNS.some((re) => re.test(key));

export function clearSession() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
    keys.filter((key) => key && !isPreference(key)).forEach((key) => localStorage.removeItem(key));
  } catch {
    /* localStorage unavailable (private mode / blocked) */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}

export default clearSession;

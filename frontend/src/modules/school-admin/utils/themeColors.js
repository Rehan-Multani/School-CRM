// School-admin thin wrapper over the shared brand-accent core.
// Kept as a module-local entry point so existing imports don't churn.
export {
  DEFAULT_PRIMARY,
  ACCENT_PRESETS,
  normalizeHex,
  hexToRgb,
  accentCssVars,
} from '../../../shared/theme/accent';

import { applyAccent } from '../../../shared/theme/accent';

const SCOPE = 'school-admin-theme';

// Legacy CSS vars / storage keys from an earlier full-palette theming attempt.
// Strip them so a stale value can't linger over the accent-only model.
const LEGACY_VARS = [
  '--bg-color',
  '--card-bg',
  '--muted-bg',
  '--sidebar-bg',
  '--header-bg',
  '--text-color',
  '--text-muted',
  '--border-color',
  '--input-bg',
  '--input-border',
];

export function applySchoolAdminAccent(hex, enabled) {
  const root = document.documentElement;
  LEGACY_VARS.forEach((key) => root.style.removeProperty(key));
  try {
    localStorage.removeItem('school-admin-background');
  } catch {
    /* ignore */
  }
  applyAccent(hex, { scope: SCOPE, enabled });
}

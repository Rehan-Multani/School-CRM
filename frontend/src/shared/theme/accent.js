// Shared brand-accent core.
// Every role portal (school-admin, principal, teacher, student, parent,
// librarian, accountant, transport, HR) resolves its school's `primaryColor`
// and calls `applyAccent()` to push it onto the page as CSS variables.
// Panel-specific hue aliasing (e.g. indigo-600 -> primary) lives in each
// module's own styles/theme.css, keyed by the scope class passed here.

export const DEFAULT_PRIMARY = '#4F46E5';

export const ACCENT_PRESETS = [
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Sky', hex: '#0284C7' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Green', hex: '#059669' },
  { name: 'Amber', hex: '#D97706' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Rose', hex: '#E11D48' },
  { name: 'Pink', hex: '#DB2777' },
  { name: 'Violet', hex: '#7C3AED' },
];

export function normalizeHex(value, fallback = DEFAULT_PRIMARY) {
  if (!value || typeof value !== 'string') return fallback;
  let hex = value.trim();
  if (!hex.startsWith('#')) hex = `#${hex}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return fallback;
  return hex.toUpperCase();
}

function clamp(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function hexToRgb(hex) {
  const normalized = normalizeHex(hex).slice(1);
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function mix(hex, target, amount) {
  const from = hexToRgb(hex);
  return {
    r: clamp(from.r + (target.r - from.r) * amount),
    g: clamp(from.g + (target.g - from.g) * amount),
    b: clamp(from.b + (target.b - from.b) * amount),
  };
}

function rgbSpace({ r, g, b }) {
  return `${r} ${g} ${b}`;
}

// Returns the three tokens the Tailwind `primary` color scale is wired to
// (see tailwind.config.js -> colors.primary).
export function accentCssVars(hex) {
  const color = normalizeHex(hex);
  const base = hexToRgb(color);
  const hover = mix(color, { r: 0, g: 0, b: 0 }, 0.14);
  const light = mix(color, { r: 255, g: 255, b: 255 }, 0.9);
  return {
    '--primary': rgbSpace(base),
    '--primary-hover': rgbSpace(hover),
    '--primary-light': rgbSpace(light),
  };
}

// Current resolved accent as a hex string, read from the live `--primary`
// CSS variable. For SVG / canvas / Recharts where CSS var() can't be used
// directly. Re-read per render so it tracks the active portal's color.
export function readAccentColor(fallback = DEFAULT_PRIMARY) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    if (!raw) return fallback;
    const parts = raw.split(/[\s,/]+/).map(Number).filter((n) => !Number.isNaN(n));
    if (parts.length < 3) return fallback;
    return `#${parts
      .slice(0, 3)
      .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'))
      .join('')}`.toUpperCase();
  } catch {
    return fallback;
  }
}

// Constant class that activates the shared `.brand-accent` utility layer
// (shared/theme/accent.css). Always toggled alongside the panel scope class.
export const BRAND_ACCENT_CLASS = 'brand-accent';

const ACCENT_VARS = ['--primary', '--primary-hover', '--primary-light'];

/**
 * Push (or clear) a brand accent color onto <html>.
 *
 * @param {string} hex        The school's primaryColor.
 * @param {object} options
 * @param {string} options.scope    Panel scope class, e.g. 'school-admin-theme'.
 * @param {boolean} options.enabled Whether this panel is currently active.
 */
export function applyAccent(hex, { scope = '', enabled = true } = {}) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const classes = [BRAND_ACCENT_CLASS, scope].filter(Boolean);

  if (!enabled) {
    classes.forEach((cls) => root.classList.remove(cls));
    ACCENT_VARS.forEach((key) => root.style.removeProperty(key));
    return;
  }

  classes.forEach((cls) => root.classList.add(cls));
  Object.entries(accentCssVars(hex)).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

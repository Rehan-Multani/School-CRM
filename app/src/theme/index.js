// Theme = fixed neutral palette (light or dark) + one accent color.
// Before login the accent is the platform brand (logo blue). After login the
// school admin controls both the accent (`primaryColor`) and light/dark
// (`theme`) from the admin panel — see ThemeContext for the live sync.

export const BRAND_PRIMARY = '#1D4ED8';
export const BRAND_SECONDARY = '#16A34A';
export const DEFAULT_SCHOOL_PRIMARY = '#4F46E5';
// Pre-auth hero gradient (login, forgot password).
export const BRAND_HERO_COLORS = ['#0A1A3F', '#122E73', '#1D4ED8'];

const light = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  white: '#FFFFFF',
  shadow: '#0F172A',
};

const dark = {
  bg: '#0B1120',
  surface: '#141C2F',
  surfaceAlt: '#1E293B',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#263247',
  danger: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
  white: '#FFFFFF',
  shadow: '#000000',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 18, xl: 28, pill: 999 };
export const font = { xs: 11, sm: 12, md: 14, lg: 16, xl: 20, xxl: 26, xxxl: 32 };

export function isHex(color) {
  return typeof color === 'string' && /^#([0-9a-f]{6})$/i.test(color);
}

// Mix hex color `a` toward hex color `b` by amount 0..1.
export function mix(a, b, amount) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => {
    const ca = (pa >> shift) & 255;
    const cb = (pb >> shift) & 255;
    return Math.round(ca + (cb - ca) * amount);
  };
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

// Hex + alpha (0..1) → #RRGGBBAA
export function alpha(hex, a) {
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
}

// Pick readable text (white/black) for a background color.
function readableOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.65 ? '#0F172A' : '#FFFFFF';
}

export function buildTheme(primaryColor, mode = 'light') {
  const isDark = mode === 'dark';
  const base = isDark ? dark : light;
  const primary = isHex(primaryColor) ? primaryColor : DEFAULT_SCHOOL_PRIMARY;
  return {
    ...base,
    mode: isDark ? 'dark' : 'light',
    isDark,
    primary,
    primaryDark: mix(primary, '#000000', 0.25),
    primarySoft: isDark ? mix(primary, base.bg, 0.78) : mix(primary, '#FFFFFF', 0.88),
    onPrimary: readableOn(primary),
  };
}

export const brandTheme = buildTheme(BRAND_PRIMARY, 'light');

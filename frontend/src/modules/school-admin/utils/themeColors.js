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

export function applySchoolAdminAccent(hex, enabled) {
  const root = document.documentElement;
  const leftover = [
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
  leftover.forEach((key) => root.style.removeProperty(key));
  localStorage.removeItem('school-admin-background');

  if (!enabled) {
    root.classList.remove('school-admin-theme');
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-hover');
    root.style.removeProperty('--primary-light');
    return;
  }

  root.classList.add('school-admin-theme');
  Object.entries(accentCssVars(hex)).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

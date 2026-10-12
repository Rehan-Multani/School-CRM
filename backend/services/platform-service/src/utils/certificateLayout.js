// Sanitiser for the free-form canvas layout stored in CertificateTemplate.design.layout.
// Everything is whitelisted and clamped: the layout is rendered into printable HTML on
// other users' screens, so nothing user-supplied may reach it unchecked.

const HEX = /^#[0-9a-fA-F]{6}$/;
const IMG = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_ELEMENTS = 120;
const MAX_IMAGE_CHARS = 600000;
const MAX_TOTAL_CHARS = 2500000;

export const LAYOUT_FONTS = [
  'serif', 'sans', 'script', 'mono', 'times', 'georgia', 'arial', 'verdana', 'tahoma', 'trebuchet', 'garamond', 'palatino',
  'courier', 'impact', 'comic', 'cursive',
];
const SHAPES = ['rect', 'ellipse', 'line', 'diamond', 'triangle'];
const ALIGN = ['left', 'center', 'right', 'justify'];
const VALIGN = ['top', 'middle', 'bottom'];
const FIT = ['contain', 'cover', 'fill'];
const TYPES = ['text', 'image', 'shape', 'qr', 'timetable', 'feeTable'];
const SIZES = { A4: [210, 297], A5: [148, 210], A3: [297, 420], LETTER: [215.9, 279.4], LEGAL: [215.9, 355.6] };

const num = (v, min, max, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100));
};
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const hex = (v, fallback) => (typeof v === 'string' && HEX.test(v) ? v : fallback);
const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);
const bool = (v, fallback = false) => (typeof v === 'boolean' ? v : fallback);

function image(v) {
  if (v === 'SCHOOL_LOGO' || v === 'SIGNATURE') return v;
  if (typeof v === 'string' && v.length <= MAX_IMAGE_CHARS && IMG.test(v)) return v;
  return '';
}

function sanitizeElement(el, index) {
  if (!el || typeof el !== 'object' || !TYPES.includes(el.type)) return null;
  const out = {
    id: str(el.id, 40) || `el${index}`,
    type: el.type,
    x: num(el.x, -400, 800, 0),
    y: num(el.y, -400, 800, 0),
    w: num(el.w, 1, 800, 40),
    h: num(el.h, 0.5, 800, 20),
    rotation: num(el.rotation, -360, 360, 0),
    opacity: num(el.opacity, 0, 1, 1),
    locked: bool(el.locked),
    hidden: bool(el.hidden),
    name: str(el.name, 40),
  };
  if (el.type === 'text') {
    Object.assign(out, {
      text: str(el.text, 3000),
      fontFamily: pick(el.fontFamily, LAYOUT_FONTS, 'serif'),
      fontSize: num(el.fontSize, 3, 120, 14), // pt
      bold: bool(el.bold),
      italic: bool(el.italic),
      underline: bool(el.underline),
      uppercase: bool(el.uppercase),
      align: pick(el.align, ALIGN, 'left'),
      valign: pick(el.valign, VALIGN, 'top'),
      lineHeight: num(el.lineHeight, 0.8, 3, 1.3),
      letterSpacing: num(el.letterSpacing, -2, 20, 0),
      color: hex(el.color, '#1f2937'),
      background: el.background === '' ? '' : hex(el.background, ''),
      padding: num(el.padding, 0, 30, 0),
      borderColor: el.borderColor === '' ? '' : hex(el.borderColor, ''),
      borderWidth: num(el.borderWidth, 0, 5, 0),
      radius: num(el.radius, 0, 100, 0),
    });
  } else if (el.type === 'image') {
    Object.assign(out, { src: image(el.src), fit: pick(el.fit, FIT, 'contain'), radius: num(el.radius, 0, 200, 0) });
  } else if (el.type === 'shape') {
    Object.assign(out, {
      shape: pick(el.shape, SHAPES, 'rect'),
      fill: el.fill === '' ? '' : hex(el.fill, '#e5e7eb'),
      stroke: el.stroke === '' ? '' : hex(el.stroke, ''),
      strokeWidth: num(el.strokeWidth, 0, 10, 0.5),
      radius: num(el.radius, 0, 200, 0),
    });
  } else if (el.type === 'qr') {
    Object.assign(out, { color: hex(el.color, '#000000') });
  } else {
    // timetable / feeTable: one set of table-styling options
    Object.assign(out, {
      fontFamily: pick(el.fontFamily, LAYOUT_FONTS, 'sans'),
      fontSize: num(el.fontSize, 4, 40, 9),
      headerBg: hex(el.headerBg, '#1e3a8a'),
      headerColor: hex(el.headerColor, '#ffffff'),
      color: hex(el.color, '#1f2937'),
      borderColor: hex(el.borderColor, '#cbd5e1'),
      zebra: bool(el.zebra, true),
      zebraColor: hex(el.zebraColor, '#f1f5f9'),
      padding: num(el.padding, 0, 10, 1.5),
      showTeacher: bool(el.showTeacher, true),
      showTime: bool(el.showTime, true),
      showFrequency: bool(el.showFrequency, true),
      showTotal: bool(el.showTotal, true),
      showRoom: bool(el.showRoom, false),
      showOptional: bool(el.showOptional, true),
    });
  }
  return out;
}

export function sanitizeLayout(input) {
  if (!input || typeof input !== 'object') return null;
  const pageIn = input.page && typeof input.page === 'object' ? input.page : {};
  const size = pick(String(pageIn.size || '').toUpperCase(), [...Object.keys(SIZES), 'CUSTOM'], 'A4');
  const orientation = pick(pageIn.orientation, ['landscape', 'portrait'], 'landscape');
  let [w, h] = size === 'CUSTOM' ? [num(pageIn.w, 50, 600, 210), num(pageIn.h, 50, 600, 297)] : SIZES[size];
  // `w`/`h` are the portrait dimensions; landscape swaps them.
  if (orientation === 'landscape' && w < h) [w, h] = [h, w];
  if (orientation === 'portrait' && w > h) [w, h] = [h, w];

  const elements = (Array.isArray(input.elements) ? input.elements : [])
    .slice(0, MAX_ELEMENTS)
    .map(sanitizeElement)
    .filter(Boolean);

  // unique ids, so editing and rendering never collide
  const seen = new Set();
  elements.forEach((el, i) => {
    if (seen.has(el.id)) el.id = `${el.id}-${i}`;
    seen.add(el.id);
  });

  const layout = {
    version: 1,
    page: {
      size,
      orientation,
      w,
      h,
      background: hex(pageIn.background, '#ffffff'),
      backgroundImage: image(pageIn.backgroundImage) === 'SCHOOL_LOGO' ? '' : image(pageIn.backgroundImage),
    },
    elements,
  };
  if (JSON.stringify(layout).length > MAX_TOTAL_CHARS) return null;
  return layout;
}

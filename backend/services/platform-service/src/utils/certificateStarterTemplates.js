import { sanitizeLayout } from './certificateLayout.js';

/**
 * Ready-made designs every school starts with (CertificateTemplate rows built from
 * free-form layouts). All sizes are millimetres. {{variables}} are filled when a
 * certificate is issued (see the designer's field list).
 */

let n = 0;
const id = () => `s${(n += 1)}`;

const text = (x, y, w, h, value, o = {}) => ({
  id: id(), type: 'text', x, y, w, h, text: value, fontFamily: 'serif', fontSize: 14, color: '#1f2937', align: 'left', ...o,
});
const rect = (x, y, w, h, o = {}) => ({ id: id(), type: 'shape', shape: 'rect', x, y, w, h, fill: '', stroke: '', strokeWidth: 0, ...o });
const shape = (kind, x, y, w, h, o = {}) => ({ id: id(), type: 'shape', shape: kind, x, y, w, h, fill: '', stroke: '', strokeWidth: 0, ...o });
const logo = (x, y, s = 22, o = {}) => ({ id: id(), type: 'image', src: 'SCHOOL_LOGO', x, y, w: s, h: s, fit: 'contain', ...o });
const qr = (x, y, s = 16) => ({ id: id(), type: 'qr', x, y, w: s, h: s });

/** Signature block: a line to sign on by hand after printing, with name / designation under it. */
function signatory(x, y, color = '#1f2937', w = 58) {
  return [
    rect(x, y + 18, w, 0.35, { fill: color }),
    text(x, y + 19.5, w, 12, '{{signatoryName}}\n{{designation}}', { fontFamily: 'sans', fontSize: 10, bold: true, align: 'center', lineHeight: 1.4, color }),
  ];
}

/** A row of small diamonds, used as a divider ornament. */
const ornament = (cx, y, color) => [
  rect(cx - 36, y + 1.1, 30, 0.5, { fill: color }),
  shape('diamond', cx - 2, y, 4, 4, { fill: color }),
  rect(cx + 6, y + 1.1, 30, 0.5, { fill: color }),
];

const L = { size: 'A4', orientation: 'landscape' };
const P = { size: 'A4', orientation: 'portrait' };

/* ------------------------------ certificates ------------------------------ */

function royal() {
  const W = 297;
  const H = 210;
  const gold = '#c9a227';
  const navy = '#1e3a8a';
  return {
    page: { ...L, background: '#fffdf6' },
    elements: [
      rect(6, 6, W - 12, H - 12, { stroke: gold, strokeWidth: 1.8 }),
      rect(10, 10, W - 20, H - 20, { stroke: navy, strokeWidth: 0.5 }),
      ...[[10, 10], [W - 10, 10], [10, H - 10], [W - 10, H - 10]].map(([x, y]) => shape('diamond', x - 4, y - 4, 8, 8, { fill: gold, stroke: navy, strokeWidth: 0.4 })),
      logo(W / 2 - 13, 16, 26),
      text(30, 44, W - 60, 10, '{{schoolName}}', { fontSize: 18, bold: true, uppercase: true, letterSpacing: 1.5, align: 'center', color: navy }),
      text(30, 60, W - 60, 18, '{{title}}', { fontSize: 36, bold: true, uppercase: true, letterSpacing: 3, align: 'center', color: navy }),
      ...ornament(W / 2, 82, gold),
      text(30, 92, W - 60, 8, 'This is proudly presented to', { fontSize: 14, italic: true, align: 'center', color: '#64748b' }),
      text(40, 102, W - 80, 20, '{{recipientName}}', { fontFamily: 'script', fontSize: 40, align: 'center', color: '#111827' }),
      rect(80, 123, W - 160, 0.5, { fill: gold }),
      text(40, 129, W - 80, 28, '{{certificateText}}', { fontSize: 14, align: 'center', lineHeight: 1.6 }),
      qr(22, 164, 18),
      text(44, 166, 80, 14, 'Date: {{issueDate}}\nCertificate no: {{certificateNumber}}', { fontFamily: 'sans', fontSize: 9, lineHeight: 1.6 }),
      ...signatory(W - 86, 154, '#1f2937'),
    ],
  };
}

function ocean() {
  const W = 297;
  const H = 210;
  const blue = '#0b5ed7';
  const cyan = '#06b6d4';
  return {
    page: { ...L, background: '#ffffff' },
    elements: [
      shape('ellipse', -40, -50, 150, 110, { fill: blue, opacity: 0.12 }),
      shape('ellipse', W - 110, H - 70, 170, 120, { fill: cyan, opacity: 0.15 }),
      rect(0, 0, 18, H, { fill: blue }),
      rect(18, 0, 2.5, H, { fill: cyan }),
      logo(34, 16, 24),
      text(62, 20, W - 130, 10, '{{schoolName}}', { fontFamily: 'sans', fontSize: 20, bold: true, color: blue }),
      text(62, 32, W - 130, 7, '{{schoolAddress}}', { fontFamily: 'sans', fontSize: 9, color: '#64748b' }),
      text(34, 62, W - 70, 20, '{{title}}', { fontFamily: 'sans', fontSize: 38, bold: true, uppercase: true, letterSpacing: 2, color: '#0f172a' }),
      rect(34, 86, 60, 1.6, { fill: cyan }),
      text(34, 96, W - 70, 8, 'is presented to', { fontFamily: 'sans', fontSize: 13, color: '#64748b' }),
      text(34, 106, W - 70, 18, '{{recipientName}}', { fontSize: 32, bold: true, italic: true, color: blue }),
      text(34, 128, W - 110, 28, '{{certificateText}}', { fontFamily: 'sans', fontSize: 12.5, lineHeight: 1.65, color: '#334155' }),
      text(34, 172, 100, 14, '{{issueDate}}\n{{certificateNumber}}', { fontFamily: 'sans', fontSize: 9, lineHeight: 1.6, color: '#475569' }),
      qr(W - 44, 20, 20),
      ...signatory(W - 92, 156, '#0f172a', 56),
    ],
  };
}

function crimson() {
  const W = 297;
  const H = 210;
  const red = '#7f1d1d';
  const gold = '#c9a227';
  return {
    page: { ...L, background: '#fffaf5' },
    elements: [
      rect(5, 5, W - 10, H - 10, { stroke: red, strokeWidth: 3 }),
      rect(9.5, 9.5, W - 19, H - 19, { stroke: gold, strokeWidth: 0.8 }),
      logo(W / 2 - 12, 15, 24),
      rect(40, 52, W - 80, 20, { fill: red }),
      text(40, 52, W - 80, 20, '{{title}}', { fontSize: 30, bold: true, uppercase: true, letterSpacing: 3, align: 'center', valign: 'middle', color: '#fff7e6' }),
      text(30, 80, W - 60, 8, 'Awarded to', { fontSize: 14, italic: true, align: 'center', color: '#6b7280' }),
      text(40, 90, W - 80, 20, '{{recipientName}}', { fontSize: 34, bold: true, align: 'center', color: red }),
      ...ornament(W / 2, 114, gold),
      text(36, 124, W - 72, 30, '{{certificateText}}', { fontSize: 14, align: 'center', lineHeight: 1.6 }),
      text(24, 168, 90, 16, '{{issueDate}}\nNo. {{certificateNumber}}', { fontFamily: 'sans', fontSize: 9, lineHeight: 1.6 }),
      qr(W / 2 - 9, 160, 18),
      ...signatory(W - 86, 154, red),
    ],
  };
}

function champion() {
  const W = 297;
  const H = 210;
  const green = '#065f46';
  const lime = '#84cc16';
  return {
    page: { ...L, background: '#f7fdf9' },
    elements: [
      shape('triangle', 0, 0, 70, 60, { fill: green }),
      shape('triangle', W - 70, H - 60, 70, 60, { fill: green }),
      shape('triangle', 0, 0, 40, 34, { fill: lime }),
      shape('triangle', W - 40, H - 34, 40, 34, { fill: lime }),
      rect(14, 14, W - 28, H - 28, { stroke: green, strokeWidth: 0.6 }),
      logo(W / 2 - 12, 18, 24),
      text(30, 46, W - 60, 8, '{{schoolName}}', { fontFamily: 'sans', fontSize: 13, bold: true, uppercase: true, letterSpacing: 2, align: 'center', color: green }),
      text(30, 58, W - 60, 20, 'Certificate of Sports Excellence', { fontSize: 32, bold: true, align: 'center', color: green }),
      text(30, 86, W - 60, 8, 'is awarded to', { fontFamily: 'sans', fontSize: 13, align: 'center', color: '#64748b' }),
      text(40, 96, W - 80, 20, '{{recipientName}}', { fontFamily: 'script', fontSize: 38, align: 'center', color: '#111827' }),
      rect(90, 118, W - 180, 0.5, { fill: lime }),
      text(40, 124, W - 80, 28, '{{certificateText}}', { fontSize: 14, align: 'center', lineHeight: 1.6 }),
      text(30, 168, 90, 16, 'Date: {{issueDate}}\nNo. {{certificateNumber}}', { fontFamily: 'sans', fontSize: 9, lineHeight: 1.6 }),
      qr(W / 2 - 9, 160, 18),
      ...signatory(W - 96, 154, green),
    ],
  };
}

function elegant() {
  const W = 297;
  const H = 210;
  return {
    page: { ...L, background: '#ffffff' },
    elements: [
      rect(12, 12, W - 24, H - 24, { stroke: '#111827', strokeWidth: 0.4 }),
      shape('line', W / 2 - 30, 34, 60, 1, { stroke: '#111827', strokeWidth: 0.4 }),
      text(30, 40, W - 60, 10, '{{schoolName}}', { fontSize: 13, uppercase: true, letterSpacing: 4, align: 'center', color: '#111827' }),
      text(30, 62, W - 60, 22, 'Certificate of Appreciation', { fontFamily: 'garamond', fontSize: 40, align: 'center', color: '#111827' }),
      text(30, 92, W - 60, 8, 'presented with gratitude to', { fontSize: 13, italic: true, align: 'center', color: '#6b7280' }),
      text(40, 104, W - 80, 20, '{{recipientName}}', { fontFamily: 'garamond', fontSize: 36, bold: true, align: 'center', color: '#111827' }),
      shape('line', W / 2 - 50, 128, 100, 1, { stroke: '#9ca3af', strokeWidth: 0.3 }),
      text(50, 134, W - 100, 26, '{{certificateText}}', { fontFamily: 'garamond', fontSize: 14, align: 'center', lineHeight: 1.7, color: '#374151' }),
      text(30, 170, 90, 14, '{{issueDate}}', { fontFamily: 'sans', fontSize: 9, color: '#6b7280' }),
      ...signatory(W - 90, 152, '#111827', 60),
    ],
  };
}

function midnight() {
  const W = 297;
  const H = 210;
  const gold = '#d4af37';
  return {
    page: { ...L, background: '#0f172a' },
    elements: [
      rect(8, 8, W - 16, H - 16, { stroke: gold, strokeWidth: 1.2 }),
      rect(12, 12, W - 24, H - 24, { stroke: gold, strokeWidth: 0.3 }),
      logo(W / 2 - 12, 18, 24),
      text(30, 46, W - 60, 8, '{{schoolName}}', { fontFamily: 'sans', fontSize: 12, bold: true, uppercase: true, letterSpacing: 3, align: 'center', color: gold }),
      text(30, 60, W - 60, 18, 'Certificate of Completion', { fontSize: 34, bold: true, align: 'center', color: '#f8fafc' }),
      ...ornament(W / 2, 84, gold),
      text(30, 94, W - 60, 8, 'This certifies that', { fontSize: 13, italic: true, align: 'center', color: '#94a3b8' }),
      text(40, 104, W - 80, 20, '{{recipientName}}', { fontFamily: 'script', fontSize: 40, align: 'center', color: gold }),
      text(40, 130, W - 80, 26, '{{certificateText}}', { fontSize: 14, align: 'center', lineHeight: 1.6, color: '#e2e8f0' }),
      text(26, 170, 90, 14, '{{issueDate}}\nNo. {{certificateNumber}}', { fontFamily: 'sans', fontSize: 9, lineHeight: 1.6, color: '#94a3b8' }),
      qr(W / 2 - 9, 160, 18),
      ...signatory(W - 88, 154, '#f8fafc'),
    ],
  };
}

/* --------------------------------- letters --------------------------------- */

function letterHead(primary) {
  return [
    logo(18, 14, 24),
    text(46, 16, 146, 10, '{{schoolName}}', { fontSize: 20, bold: true, uppercase: true, color: primary }),
    text(46, 27, 146, 8, '{{schoolAddress}} · {{schoolPhone}}', { fontFamily: 'sans', fontSize: 9, color: '#475569' }),
    rect(18, 42, 174, 0.8, { fill: primary }),
  ];
}

function bonafide() {
  const primary = '#1e3a8a';
  return {
    page: { ...P, background: '#ffffff' },
    elements: [
      ...letterHead(primary),
      text(18, 54, 174, 12, 'Bonafide Certificate', { fontSize: 22, bold: true, underline: true, uppercase: true, align: 'center', color: '#111827' }),
      text(18, 74, 80, 7, 'Ref. No: {{certificateNumber}}', { fontFamily: 'sans', fontSize: 10 }),
      text(112, 74, 80, 7, 'Date: {{issueDate}}', { fontFamily: 'sans', fontSize: 10, align: 'right' }),
      text(24, 92, 162, 90, 'This is to certify that {{recipientName}} {{certificateText}}', { fontSize: 14, lineHeight: 1.9, align: 'justify', color: '#111827' }),
      qr(18, 232, 20),
      ...signatory(128, 212, '#111827', 64),
    ],
  };
}

function character() {
  const primary = '#14532d';
  return {
    page: { ...P, background: '#ffffff' },
    elements: [
      ...letterHead(primary),
      text(18, 54, 174, 12, 'Character Certificate', { fontSize: 22, bold: true, uppercase: true, align: 'center', color: primary }),
      shape('line', 60, 69, 90, 1, { stroke: primary, strokeWidth: 0.5 }),
      text(18, 78, 80, 7, 'Date: {{issueDate}}', { fontFamily: 'sans', fontSize: 10 }),
      text(24, 96, 162, 90, 'This is to certify that {{recipientName}} {{certificateText}}\n\nHe/She has been regular in conduct and discipline. We wish {{recipientName}} all the very best for the future.', { fontSize: 14, lineHeight: 1.9, align: 'justify', color: '#111827' }),
      ...signatory(128, 212, '#111827', 64),
    ],
  };
}

/* ------------------------------ class documents ----------------------------- */

function timetable() {
  const W = 297;
  const primary = '#1e3a8a';
  return {
    page: { ...L, background: '#ffffff' },
    elements: [
      logo(12, 9, 20),
      text(36, 10, W - 72, 10, '{{schoolName}}', { fontSize: 22, bold: true, uppercase: true, color: primary }),
      text(36, 21, W - 72, 7, '{{schoolAddress}}', { fontFamily: 'sans', fontSize: 9, color: '#475569' }),
      rect(12, 33, W - 24, 0.8, { fill: primary }),
      text(12, 37, W - 24, 12, 'Class Timetable — Class {{className}} {{sectionName}}', { fontFamily: 'sans', fontSize: 18, bold: true, align: 'center', color: '#111827' }),
      { id: id(), type: 'timetable', x: 12, y: 54, w: W - 24, h: 128, headerBg: primary },
      text(12, 192, 120, 8, 'Printed on {{today}}', { fontFamily: 'sans', fontSize: 9, color: '#64748b' }),
      text(W - 82, 190, 70, 12, 'Principal', { fontFamily: 'sans', fontSize: 11, bold: true, align: 'center' }),
    ],
  };
}

function feeStructure() {
  const primary = '#1e3a8a';
  return {
    page: { ...P, background: '#ffffff' },
    elements: [
      logo(15, 12, 22),
      text(40, 13, 155, 10, '{{schoolName}}', { fontSize: 22, bold: true, uppercase: true, color: primary }),
      text(40, 24, 155, 8, '{{schoolAddress}}', { fontFamily: 'sans', fontSize: 9, color: '#475569' }),
      rect(15, 38, 180, 0.8, { fill: primary }),
      text(15, 46, 180, 12, 'Fee Structure — Class {{className}}', { fontFamily: 'sans', fontSize: 20, bold: true, align: 'center', color: '#111827' }),
      text(15, 60, 180, 8, 'Academic year {{academicYear}}', { fontFamily: 'sans', fontSize: 12, align: 'center', color: '#475569' }),
      { id: id(), type: 'feeTable', x: 15, y: 74, w: 180, h: 110, headerBg: primary },
      text(15, 196, 180, 20, 'Fees once paid are not refundable. Fees are due by the 10th of every month.', { fontFamily: 'sans', fontSize: 9, color: '#64748b', lineHeight: 1.5 }),
      text(130, 250, 65, 12, 'Principal', { fontFamily: 'sans', fontSize: 11, bold: true, align: 'center' }),
    ],
  };
}

const D = (name, title, type, text_, build, extra = {}) => ({ name, title, type, text: text_, build, ...extra });

export const DEFAULT_TEMPLATES = [
  D('Achievement — Royal Gold', 'Certificate of Achievement', 'ACHIEVEMENT',
    'has shown outstanding performance and dedication in {{courseName}} organized by {{schoolName}}, and is hereby recognised for this remarkable achievement.', royal),
  D('Participation — Ocean Blue', 'Certificate of Participation', 'PARTICIPATION',
    'has actively participated in {{courseName}} organized by {{schoolName}} during the academic session {{session}}.', ocean),
  D('Merit — Crimson Classic', 'Certificate of Merit', 'MERIT',
    'of Class {{classSection}} has secured a place of merit in {{courseName}} for the session {{session}}, and has brought pride to {{schoolName}}.', crimson),
  D('Sports — Champion Green', 'Certificate of Sports Excellence', 'SPORTS',
    'has displayed exceptional sportsmanship and skill in {{courseName}} held at {{schoolName}}.', champion),
  D('Appreciation — Minimal Elegant', 'Certificate of Appreciation', 'APPRECIATION',
    'is sincerely appreciated for the valuable contribution and commitment shown towards {{schoolName}}.', elegant, { applicableTo: 'TEACHER' }),
  D('Completion — Midnight Gold', 'Certificate of Completion', 'COMPLETION',
    'has successfully completed {{courseName}} at {{schoolName}} with dedication and sincerity.', midnight),
  D('Bonafide Certificate', 'Bonafide Certificate', 'BONAFIDE',
    'son/daughter of {{fatherName}}, is a bonafide student of {{schoolName}}, studying in Class {{classSection}} during the academic session {{session}}. The student bears a good moral character.', bonafide),
  D('Character Certificate', 'Character Certificate', 'CUSTOM',
    'son/daughter of {{fatherName}}, has been a student of {{schoolName}} in Class {{classSection}} during the session {{session}} and bears a good moral character.', character),
  D('Class Timetable', 'Class Timetable', 'TIMETABLE', 'Class timetable', timetable),
  D('Fee Structure', 'Fee Structure', 'FEE_STRUCTURE', 'Fee structure', feeStructure),
];

/** Template rows (without schoolId) ready for CertificateTemplate.create. */
export function buildDefaultTemplates(brand = {}) {
  return DEFAULT_TEMPLATES.map((t) => {
    n = 0;
    const layout = sanitizeLayout({ version: 1, ...t.build() });
    return {
      name: t.name,
      title: t.title,
      type: t.type,
      text: t.text,
      applicableTo: t.applicableTo || 'STUDENT',
      signatoryName: brand.signatoryName || '',
      designation: brand.designation || 'Principal',
      design: { layout, showQr: true },
      status: 'PUBLISHED',
    };
  });
}

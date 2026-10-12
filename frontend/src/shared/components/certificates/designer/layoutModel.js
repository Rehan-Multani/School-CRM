// Data model of the free-form document designer: a page plus absolutely positioned
// elements, everything in millimetres. Stored in CertificateTemplate.design.layout
// (the backend re-validates it in utils/certificateLayout.js).

export const FONT_STACKS = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: 'Arial, Helvetica, sans-serif',
  script: '"Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive',
  mono: '"Courier New", Courier, monospace',
  times: '"Times New Roman", Times, serif',
  georgia: 'Georgia, serif',
  arial: 'Arial, Helvetica, sans-serif',
  verdana: 'Verdana, Geneva, sans-serif',
  tahoma: 'Tahoma, Geneva, sans-serif',
  trebuchet: '"Trebuchet MS", Helvetica, sans-serif',
  garamond: 'Garamond, "Times New Roman", serif',
  palatino: '"Palatino Linotype", Palatino, serif',
  courier: '"Courier New", Courier, monospace',
  impact: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
  comic: '"Comic Sans MS", "Comic Sans", cursive',
  cursive: '"Segoe Script", "Lucida Handwriting", cursive',
};

export const FONT_OPTIONS = [
  ['serif', 'Serif (Georgia)'],
  ['times', 'Times New Roman'],
  ['garamond', 'Garamond'],
  ['palatino', 'Palatino'],
  ['sans', 'Sans (Arial)'],
  ['verdana', 'Verdana'],
  ['tahoma', 'Tahoma'],
  ['trebuchet', 'Trebuchet'],
  ['script', 'Script'],
  ['cursive', 'Handwriting'],
  ['impact', 'Impact'],
  ['mono', 'Monospace'],
  ['comic', 'Comic'],
];

export const PAGE_SIZES = {
  A4: { label: 'A4 (210 × 297 mm)', w: 210, h: 297 },
  A5: { label: 'A5 (148 × 210 mm)', w: 148, h: 210 },
  A3: { label: 'A3 (297 × 420 mm)', w: 297, h: 420 },
  LETTER: { label: 'Letter (216 × 279 mm)', w: 215.9, h: 279.4 },
  LEGAL: { label: 'Legal (216 × 356 mm)', w: 215.9, h: 355.6 },
  CUSTOM: { label: 'Custom size', w: 210, h: 297 },
};

export function pageDimensions(page = {}) {
  const base = PAGE_SIZES[page.size] || PAGE_SIZES.A4;
  let w = page.size === 'CUSTOM' ? Number(page.w) || base.w : base.w;
  let h = page.size === 'CUSTOM' ? Number(page.h) || base.h : base.h;
  const landscape = page.orientation !== 'portrait';
  if (landscape && w < h) [w, h] = [h, w];
  if (!landscape && w > h) [w, h] = [h, w];
  return { w, h };
}

export const isLayoutDoc = (type) => type === 'TIMETABLE' || type === 'FEE_STRUCTURE';

let counter = 0;
export const newId = () => `e${Date.now().toString(36)}${(counter += 1).toString(36)}`;

const COMMON = { x: 20, y: 20, rotation: 0, opacity: 1, locked: false, hidden: false, name: '' };

export function newElement(type, overrides = {}) {
  const id = newId();
  switch (type) {
    case 'text':
      return {
        ...COMMON, id, type, w: 80, h: 14, text: 'Double-click to edit',
        fontFamily: 'serif', fontSize: 16, bold: false, italic: false, underline: false, uppercase: false,
        align: 'left', valign: 'top', lineHeight: 1.3, letterSpacing: 0, color: '#1f2937',
        background: '', padding: 0, borderColor: '', borderWidth: 0, radius: 0, ...overrides,
      };
    case 'image':
      return { ...COMMON, id, type, w: 40, h: 30, src: '', fit: 'contain', radius: 0, ...overrides };
    case 'shape':
      return { ...COMMON, id, type, w: 60, h: 30, shape: 'rect', fill: '#e5e7eb', stroke: '#1e3a8a', strokeWidth: 0.5, radius: 0, ...overrides };
    case 'qr':
      return { ...COMMON, id, type, w: 22, h: 22, color: '#000000', ...overrides };
    case 'timetable':
      return {
        ...COMMON, id, type, w: 250, h: 120, fontFamily: 'sans', fontSize: 9, headerBg: '#1e3a8a', headerColor: '#ffffff',
        color: '#1f2937', borderColor: '#cbd5e1', zebra: true, zebraColor: '#f1f5f9', padding: 1.5,
        showTeacher: true, showTime: true, showRoom: false, ...overrides,
      };
    case 'feeTable':
      return {
        ...COMMON, id, type, w: 170, h: 100, fontFamily: 'sans', fontSize: 10, headerBg: '#1e3a8a', headerColor: '#ffffff',
        color: '#1f2937', borderColor: '#cbd5e1', zebra: true, zebraColor: '#f1f5f9', padding: 2,
        showFrequency: true, showTotal: true, showOptional: true, ...overrides,
      };
    default:
      return { ...COMMON, id, type, w: 40, h: 20, ...overrides };
  }
}

export const ELEMENT_LABEL = {
  text: 'Text',
  image: 'Image',
  shape: 'Shape',
  qr: 'Verification QR',
  timetable: 'Timetable table',
  feeTable: 'Fee table',
};

// Variables a designer can drop into any text. Filled per person when issued.
export const DOC_VARIABLES = [
  ['recipientName', 'Recipient name', 'CERTIFICATE'],
  ['title', 'Certificate title', 'CERTIFICATE'],
  ['certificateText', 'Certificate wording', 'CERTIFICATE'],
  ['certificateNumber', 'Certificate no.', 'CERTIFICATE'],
  ['issueDate', 'Issue date', 'CERTIFICATE'],
  ['validUntil', 'Valid until', 'CERTIFICATE'],
  ['courseName', 'Course / event', 'CERTIFICATE'],
  ['signatoryName', 'Signatory name', 'CERTIFICATE'],
  ['designation', 'Signatory designation', 'CERTIFICATE'],
  ['fatherName', "Father's name", 'CERTIFICATE'],
  ['classSection', 'Class + section', 'CERTIFICATE'],
  ['admissionNumber', 'Admission no.', 'CERTIFICATE'],
  ['rollNumber', 'Roll no.', 'CERTIFICATE'],
  ['dob', 'Date of birth', 'CERTIFICATE'],
  ['employeeId', 'Employee ID', 'CERTIFICATE'],
  ['department', 'Department', 'CERTIFICATE'],
  ['schoolName', 'School name', 'ALL'],
  ['schoolAddress', 'School address', 'ALL'],
  ['schoolPhone', 'School phone', 'ALL'],
  ['session', 'Academic session', 'ALL'],
  ['today', "Today's date", 'ALL'],
  ['className', 'Class', 'DOC'],
  ['sectionName', 'Section', 'DOC'],
  ['academicYear', 'Academic year', 'DOC'],
];

export const SAMPLE = {
  recipientName: 'Ali Raza',
  studentName: 'Ali Raza',
  title: 'Certificate of Achievement',
  certificateText:
    'has shown outstanding performance and dedication in Annual Sports Day, and is hereby recognised for this remarkable achievement.',
  certificateNumber: 'CERT-2026-0001',
  issueDate: '12 October 2026',
  validUntil: '',
  courseName: 'Annual Sports Day',
  signatoryName: 'Principal Name',
  designation: 'Principal',
  fatherName: 'Imran Raza',
  classSection: '10 - A',
  className: '10',
  sectionName: 'A',
  admissionNumber: 'ADM-1001',
  rollNumber: '1',
  dob: '14 May 2010',
  employeeId: 'EMP-101',
  department: 'Academics',
  session: '2026-2027',
  academicYear: '2026-2027',
  today: '12 October 2026',
  schoolName: 'Your School Name',
  schoolAddress: 'School address, City',
  schoolPhone: '+91 00000 00000',
};

export const SAMPLE_TIMETABLE = {
  className: '10',
  sectionName: 'A',
  days: [
    { key: 'MON', label: 'Monday' }, { key: 'TUE', label: 'Tuesday' }, { key: 'WED', label: 'Wednesday' },
    { key: 'THU', label: 'Thursday' }, { key: 'FRI', label: 'Friday' },
  ],
  periods: [
    { number: 1, start: '08:00', end: '08:45' }, { number: 2, start: '08:45', end: '09:30' },
    { number: 3, start: '09:30', end: '10:15' }, { number: 4, start: '10:30', end: '11:15' },
    { number: 5, start: '11:15', end: '12:00' },
  ],
  cells: Object.fromEntries(
    ['MON', 'TUE', 'WED', 'THU', 'FRI'].flatMap((d, di) =>
      [1, 2, 3, 4, 5].map((p) => [
        `${d}-${p}`,
        { subject: ['Maths', 'English', 'Science', 'Hindi', 'Social'][(di + p) % 5], teacher: 'Teacher name', room: `R${p}` },
      ])
    )
  ),
};

export const SAMPLE_FEES = {
  className: '10',
  academicYear: '2026-2027',
  structureName: 'Class 10 Fee Structure',
  items: [
    { head: 'Tuition Fee', frequency: 'MONTHLY', amount: 2500, optional: false },
    { head: 'Admission Fee', frequency: 'ONE_TIME', amount: 5000, optional: false },
    { head: 'Exam Fee', frequency: 'HALF_YEARLY', amount: 800, optional: false },
    { head: 'Transport', frequency: 'MONTHLY', amount: 1200, optional: true },
  ],
  total: 8300,
};

/* ------------------------------ starter layouts ----------------------------- */

const text = (o) => newElement('text', o);
const shape = (o) => newElement('shape', o);

function certificateFrame(W, H, primary, accent) {
  return [
    shape({ x: 6, y: 6, w: W - 12, h: H - 12, shape: 'rect', fill: '', stroke: accent, strokeWidth: 1.6, name: 'Outer border' }),
    shape({ x: 9, y: 9, w: W - 18, h: H - 18, shape: 'rect', fill: '', stroke: primary, strokeWidth: 0.5, name: 'Inner border' }),
  ];
}

export const STARTERS = [
  {
    key: 'certificate-classic',
    label: 'Classic certificate',
    kind: 'CERTIFICATE',
    page: { size: 'A4', orientation: 'landscape', background: '#fffdf6' },
    build: ({ primary = '#1e3a8a', accent = '#c9a227' } = {}) => {
      const W = 297;
      return [
        ...certificateFrame(W, 210, primary, accent),
        newElement('image', { x: 20, y: 16, w: 22, h: 22, src: 'SCHOOL_LOGO', name: 'Logo' }),
        text({ x: 46, y: 18, w: W - 92, h: 12, text: '{{schoolName}}', fontFamily: 'serif', fontSize: 24, bold: true, uppercase: true, align: 'center', color: primary, letterSpacing: 1, name: 'School name' }),
        text({ x: 46, y: 31, w: W - 92, h: 8, text: '{{schoolAddress}}', fontFamily: 'sans', fontSize: 9, align: 'center', color: '#64748b', name: 'Address' }),
        text({ x: 30, y: 50, w: W - 60, h: 18, text: '{{title}}', fontFamily: 'serif', fontSize: 38, bold: true, uppercase: true, align: 'center', color: primary, letterSpacing: 2, name: 'Title' }),
        shape({ x: W / 2 - 25, y: 71, w: 50, h: 1, shape: 'rect', fill: accent, stroke: '', strokeWidth: 0, name: 'Divider' }),
        text({ x: 30, y: 80, w: W - 60, h: 9, text: 'This is to certify that', fontFamily: 'serif', fontSize: 15, italic: true, align: 'center', color: '#64748b', name: 'Intro' }),
        text({ x: 40, y: 91, w: W - 80, h: 20, text: '{{recipientName}}', fontFamily: 'script', fontSize: 40, align: 'center', color: '#1f2937', name: 'Recipient' }),
        shape({ x: 70, y: 112, w: W - 140, h: 0.5, shape: 'rect', fill: accent, stroke: '', strokeWidth: 0, name: 'Name line' }),
        text({ x: 35, y: 118, w: W - 70, h: 32, text: '{{certificateText}}', fontFamily: 'serif', fontSize: 15, align: 'center', lineHeight: 1.6, color: '#1f2937', name: 'Wording' }),
        text({ x: 20, y: 168, w: 90, h: 16, text: 'Date of issue: {{issueDate}}\nCertificate no: {{certificateNumber}}', fontFamily: 'sans', fontSize: 10, lineHeight: 1.6, color: '#1f2937', name: 'Issue details' }),
        newElement('qr', { x: 20, y: 150, w: 16, h: 16, name: 'Verify QR' }),
        shape({ x: W - 80, y: 168, w: 56, h: 0.35, shape: 'rect', fill: '#1f2937', stroke: '', strokeWidth: 0, name: 'Signature line' }),
        text({ x: W - 80, y: 169.5, w: 56, h: 12, text: '{{signatoryName}}\n{{designation}}', fontFamily: 'sans', fontSize: 10, bold: true, align: 'center', lineHeight: 1.4, color: '#1f2937', name: 'Signatory' }),
      ];
    },
  },
  {
    key: 'certificate-modern',
    label: 'Modern certificate',
    kind: 'CERTIFICATE',
    page: { size: 'A4', orientation: 'landscape', background: '#ffffff' },
    build: ({ primary = '#4338ca', accent = '#06b6d4' } = {}) => {
      const W = 297;
      return [
        shape({ x: 0, y: 0, w: 22, h: 210, shape: 'rect', fill: primary, stroke: '', strokeWidth: 0, name: 'Side band' }),
        shape({ x: 22, y: 0, w: 3, h: 210, shape: 'rect', fill: accent, stroke: '', strokeWidth: 0, name: 'Accent band' }),
        newElement('image', { x: 38, y: 16, w: 24, h: 24, src: 'SCHOOL_LOGO', name: 'Logo' }),
        text({ x: 66, y: 20, w: W - 110, h: 10, text: '{{schoolName}}', fontFamily: 'sans', fontSize: 22, bold: true, color: primary, name: 'School name' }),
        text({ x: 66, y: 31, w: W - 110, h: 7, text: '{{schoolAddress}}', fontFamily: 'sans', fontSize: 9, color: '#64748b', name: 'Address' }),
        text({ x: 38, y: 62, w: W - 80, h: 22, text: '{{title}}', fontFamily: 'sans', fontSize: 40, bold: true, color: primary, uppercase: true, letterSpacing: 2, name: 'Title' }),
        text({ x: 38, y: 92, w: W - 80, h: 8, text: 'is proudly presented to', fontFamily: 'sans', fontSize: 13, color: '#64748b', name: 'Intro' }),
        text({ x: 38, y: 102, w: W - 80, h: 18, text: '{{recipientName}}', fontFamily: 'serif', fontSize: 34, bold: true, italic: true, color: '#111827', name: 'Recipient' }),
        shape({ x: 38, y: 122, w: 90, h: 1.2, shape: 'rect', fill: accent, stroke: '', strokeWidth: 0, name: 'Accent line' }),
        text({ x: 38, y: 128, w: W - 100, h: 28, text: '{{certificateText}}', fontFamily: 'sans', fontSize: 13, lineHeight: 1.6, color: '#374151', name: 'Wording' }),
        text({ x: 38, y: 170, w: 100, h: 14, text: '{{issueDate}}\n{{certificateNumber}}', fontFamily: 'sans', fontSize: 10, lineHeight: 1.6, color: '#374151', name: 'Issue details' }),
        shape({ x: W - 92, y: 174, w: 56, h: 0.35, shape: 'rect', fill: '#111827', stroke: '', strokeWidth: 0, name: 'Signature line' }),
        text({ x: W - 92, y: 175.5, w: 56, h: 12, text: '{{signatoryName}}\n{{designation}}', fontFamily: 'sans', fontSize: 10, bold: true, align: 'center', lineHeight: 1.4, color: '#111827', name: 'Signatory' }),
        newElement('qr', { x: W - 36, y: 18, w: 18, h: 18, name: 'Verify QR' }),
      ];
    },
  },
  {
    key: 'bonafide',
    label: 'Bonafide / letter',
    kind: 'CERTIFICATE',
    page: { size: 'A4', orientation: 'portrait', background: '#ffffff' },
    build: ({ primary = '#1e3a8a' } = {}) => [
      newElement('image', { x: 20, y: 15, w: 24, h: 24, src: 'SCHOOL_LOGO', name: 'Logo' }),
      text({ x: 48, y: 17, w: 142, h: 10, text: '{{schoolName}}', fontFamily: 'serif', fontSize: 22, bold: true, uppercase: true, color: primary, name: 'School name' }),
      text({ x: 48, y: 28, w: 142, h: 8, text: '{{schoolAddress}} · {{schoolPhone}}', fontFamily: 'sans', fontSize: 9, color: '#475569', name: 'Address' }),
      shape({ x: 20, y: 44, w: 170, h: 0.8, shape: 'rect', fill: primary, stroke: '', strokeWidth: 0, name: 'Header line' }),
      text({ x: 20, y: 56, w: 170, h: 12, text: '{{title}}', fontFamily: 'serif', fontSize: 22, bold: true, underline: true, uppercase: true, align: 'center', color: '#111827', name: 'Title' }),
      text({ x: 20, y: 76, w: 80, h: 7, text: 'Ref. No: {{certificateNumber}}', fontFamily: 'sans', fontSize: 10, color: '#1f2937', name: 'Reference' }),
      text({ x: 110, y: 76, w: 80, h: 7, text: 'Date: {{issueDate}}', fontFamily: 'sans', fontSize: 10, align: 'right', color: '#1f2937', name: 'Date' }),
      text({ x: 25, y: 96, w: 160, h: 80, text: 'This is to certify that {{recipientName}} {{certificateText}}', fontFamily: 'serif', fontSize: 14, lineHeight: 1.9, align: 'justify', color: '#111827', name: 'Body' }),
      text({ x: 125, y: 238, w: 65, h: 14, text: '{{signatoryName}}\n{{designation}}', fontFamily: 'sans', fontSize: 11, bold: true, align: 'center', lineHeight: 1.4, color: '#111827', name: 'Signatory' }),
      newElement('qr', { x: 20, y: 232, w: 20, h: 20, name: 'Verify QR' }),
    ],
  },
  {
    key: 'timetable',
    label: 'Class timetable',
    kind: 'TIMETABLE',
    page: { size: 'A4', orientation: 'landscape', background: '#ffffff' },
    build: ({ primary = '#1e3a8a' } = {}) => {
      const W = 297;
      return [
        newElement('image', { x: 12, y: 10, w: 20, h: 20, src: 'SCHOOL_LOGO', name: 'Logo' }),
        text({ x: 36, y: 11, w: W - 72, h: 10, text: '{{schoolName}}', fontFamily: 'serif', fontSize: 22, bold: true, uppercase: true, color: primary, name: 'School name' }),
        text({ x: 36, y: 22, w: W - 72, h: 7, text: '{{schoolAddress}}', fontFamily: 'sans', fontSize: 9, color: '#475569', name: 'Address' }),
        shape({ x: 12, y: 33, w: W - 24, h: 0.8, shape: 'rect', fill: primary, stroke: '', strokeWidth: 0, name: 'Header line' }),
        text({ x: 12, y: 38, w: W - 24, h: 12, text: 'Class Timetable — Class {{className}} {{sectionName}}', fontFamily: 'sans', fontSize: 18, bold: true, align: 'center', color: '#111827', name: 'Title' }),
        newElement('timetable', { x: 12, y: 54, w: W - 24, h: 130, headerBg: primary, name: 'Timetable' }),
        text({ x: 12, y: 192, w: 120, h: 8, text: 'Printed on {{today}}', fontFamily: 'sans', fontSize: 9, color: '#64748b', name: 'Footer' }),
        text({ x: W - 82, y: 190, w: 70, h: 12, text: 'Principal', fontFamily: 'sans', fontSize: 11, bold: true, align: 'center', color: '#111827', name: 'Principal sign' }),
      ];
    },
  },
  {
    key: 'fee-structure',
    label: 'Fee structure',
    kind: 'FEE_STRUCTURE',
    page: { size: 'A4', orientation: 'portrait', background: '#ffffff' },
    build: ({ primary = '#1e3a8a' } = {}) => [
      newElement('image', { x: 15, y: 12, w: 22, h: 22, src: 'SCHOOL_LOGO', name: 'Logo' }),
      text({ x: 40, y: 13, w: 155, h: 10, text: '{{schoolName}}', fontFamily: 'serif', fontSize: 22, bold: true, uppercase: true, color: primary, name: 'School name' }),
      text({ x: 40, y: 24, w: 155, h: 8, text: '{{schoolAddress}}', fontFamily: 'sans', fontSize: 9, color: '#475569', name: 'Address' }),
      shape({ x: 15, y: 38, w: 180, h: 0.8, shape: 'rect', fill: primary, stroke: '', strokeWidth: 0, name: 'Header line' }),
      text({ x: 15, y: 46, w: 180, h: 12, text: 'Fee Structure — Class {{className}}', fontFamily: 'sans', fontSize: 20, bold: true, align: 'center', color: '#111827', name: 'Title' }),
      text({ x: 15, y: 60, w: 180, h: 8, text: 'Academic year {{academicYear}}', fontFamily: 'sans', fontSize: 12, align: 'center', color: '#475569', name: 'Session' }),
      newElement('feeTable', { x: 15, y: 74, w: 180, h: 110, headerBg: primary, name: 'Fee table' }),
      text({ x: 15, y: 196, w: 180, h: 20, text: 'Fees once paid are not refundable. Fees are due by the 10th of every month.', fontFamily: 'sans', fontSize: 9, color: '#64748b', lineHeight: 1.5, name: 'Note' }),
      text({ x: 130, y: 250, w: 65, h: 12, text: 'Principal', fontFamily: 'sans', fontSize: 11, bold: true, align: 'center', color: '#111827', name: 'Principal sign' }),
    ],
  },
  {
    key: 'blank',
    label: 'Blank page',
    kind: 'ANY',
    page: { size: 'A4', orientation: 'portrait', background: '#ffffff' },
    build: () => [],
  },
];

export function buildStarter(key, ctx = {}) {
  const starter = STARTERS.find((s) => s.key === key) || STARTERS[STARTERS.length - 1];
  return {
    version: 1,
    page: { size: 'A4', orientation: 'landscape', background: '#ffffff', backgroundImage: '', ...starter.page },
    elements: starter.build(ctx),
  };
}

export const emptyLayout = () => buildStarter('blank');

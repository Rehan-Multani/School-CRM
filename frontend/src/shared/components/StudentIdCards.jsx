import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Printer, Search, Loader2, IdCard as IdCardIcon, RefreshCw, Palette, Save, RotateCcw } from 'lucide-react';
import { assetUrl } from '../api/client';

/**
 * Student ID cards, shared by the School Admin, Principal and HR panels.
 * `api` is { options(), students(params), saveDesign(design) } bound to the
 * panel's own client.
 *
 * Cards are drawn with inline styles / SVG in millimetres so the on-screen
 * preview and the printed sheet are the same markup. "Print / Save as PDF"
 * opens a clean print window: the browser dialog lists connected printers and
 * "Save as PDF", so one button covers both. The look is fully editable and is
 * saved per school.
 */

// Vertical (portrait) is 54 x 86 mm, horizontal (landscape) is the same card turned: 86 x 54 mm.
const CARD_W = 54;
const CARD_H = 86;
const cardSize = (d) => (d?.orientation === 'horizontal' ? { W: CARD_H, H: CARD_W } : { W: CARD_W, H: CARD_H });

const FIELD_OPTIONS = [
  { key: 'rollNo', label: 'Roll no' },
  { key: 'phone', label: 'Parent phone' },
  { key: 'gender', label: 'Gender' },
  { key: 'dob', label: 'Date of birth' },
  { key: 'parent', label: 'Parent name' },
  { key: 'house', label: 'House' },
  { key: 'address', label: 'Address' },
];

const BASE_DESIGN = {
  template: 'classic',
  orientation: 'vertical',
  primaryColor: '#1e3a8a',
  secondaryColor: '',
  accentColor: '#c9a227',
  textColor: '#0f1f4d',
  headerTextColor: '#ffffff',
  cardBg: '#ffffff',
  footerBg: '',
  borderColor: '#cbd5e1',
  showBorder: true,
  headerStyle: 'curved',
  headerGradient: true,
  showAddress: true,
  tagline: '',
  schoolNameSize: 'm',
  nameFont: 'serif',
  logoPosition: 'badge',
  logoShape: 'circle',
  photoShape: 'circle',
  photoSize: 'm',
  photoRing: true,
  nameSize: 'm',
  nameCase: 'upper',
  classStyle: 'pill',
  showIcons: true,
  cornerRadius: 'm',
  pattern: 'none',
  lanyardSlot: true,
  cardTitle: 'STUDENT ID CARD',
  footerLeft: 'phone',
  footerRight: 'session',
  signature: false,
  signatureLabel: 'Principal',
  backSide: false,
  backText: 'This card is the property of the school. If found, please return it to the address given.',
  fields: { rollNo: true, phone: true, gender: false, dob: false, parent: false, house: false, address: false },
};

// One-click starting points; they only touch the look, never the text / fields.
const TEMPLATES = {
  classic: {
    label: 'Classic',
    values: { headerStyle: 'curved', headerGradient: true, nameFont: 'serif', photoShape: 'circle', classStyle: 'pill', pattern: 'none', cardBg: '#ffffff', cornerRadius: 'm', logoPosition: 'badge', accentColor: '#c9a227' },
  },
  modern: {
    label: 'Modern',
    values: { headerStyle: 'wave', headerGradient: true, nameFont: 'sans', photoShape: 'rounded', classStyle: 'pill', pattern: 'dots', cardBg: '#ffffff', cornerRadius: 'l', logoPosition: 'badge', accentColor: '#14b8a6' },
  },
  minimal: {
    label: 'Minimal',
    values: { headerStyle: 'flat', headerGradient: false, nameFont: 'sans', photoShape: 'square', classStyle: 'outline', pattern: 'none', cardBg: '#ffffff', cornerRadius: 's', logoPosition: 'header', accentColor: '#94a3b8' },
  },
  bold: {
    label: 'Bold',
    values: { headerStyle: 'slant', headerGradient: true, nameFont: 'sans', photoShape: 'circle', classStyle: 'pill', pattern: 'lines', cardBg: '#f8fafc', cornerRadius: 'm', logoPosition: 'badge', accentColor: '#f59e0b' },
  },
};

const buildDefaultDesign = (school) => ({
  ...BASE_DESIGN,
  fields: { ...BASE_DESIGN.fields },
  primaryColor: school?.primaryColor || BASE_DESIGN.primaryColor,
});

const mergeDesign = (base, saved) => ({
  ...base,
  ...(saved || {}),
  fields: { ...base.fields, ...(saved?.fields || {}) },
});

const SAMPLE_STUDENT = {
  id: 'sample',
  name: 'Ali Raza',
  admissionNumber: 'ADM-1001',
  rollNumber: '1',
  className: '10',
  sectionName: 'A',
  academicYear: '2026-2027',
  gender: 'MALE',
  dateOfBirth: '2010-05-14',
  parentName: 'Imran Raza',
  parentPhone: '9876543210',
  address: '12 Education Avenue, Noida',
  house: 'Blue House',
  photo: '',
  validTill: null,
};

// Mixes a #rrggbb color with black (amount 0..1) or white (negative).
function shade(hex, amount) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (shift) => {
    const v = (n >> shift) & 255;
    const out = amount >= 0 ? v * (1 - amount) : v + (255 - v) * -amount;
    return Math.max(0, Math.min(255, Math.round(out)));
  };
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

// A src that also works inside the about:blank print window.
function absoluteSrc(src) {
  if (!src || /^(data:|blob:|https?:)/i.test(src)) return src;
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const truncate = (text, max) => (text && text.length > max ? `${text.slice(0, max - 1)}...` : text);
const titleCase = (text = '') => text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const prettyGender = (g) => (g ? titleCase(String(g)) : '');

const RADIUS = { s: 1.6, m: 3.2, l: 5 };
const SCHOOL_NAME_MM = { s: 2.7, m: 3.3, l: 3.9 };
const NAME_MM = { s: 3.1, m: 3.6, l: 4.2 };
const PHOTO_MM = { s: 17, m: 20, l: 23 };

const ICON_PATHS = {
  idcard: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="9" cy="11" r="2" fill="#fff" />
      <path d="M13 10h5M13 14h5M6.5 16c.6-1.6 4.4-1.6 5 0" stroke="#fff" strokeWidth="1.6" fill="none" />
    </>
  ),
  list: <path d="M5 7h2M10 7h9M5 12h2M10 12h9M5 17h2M10 17h9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />,
  phone: (
    <path d="M7 4h3l1.5 4-2 1.3a10 10 0 0 0 5.2 5.2L16 12.5l4 1.5v3a2 2 0 0 1-2 2A14 14 0 0 1 5 6a2 2 0 0 1 2-2z" fill="#fff" />
  ),
  cake: <path d="M5 11h14v8H5zM8 11V8M12 11V7M16 11V8" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" fill="#fff" />
      <path d="M5 20c.8-4.5 13.2-4.5 14 0z" fill="#fff" />
    </>
  ),
  home: <path d="M4 11l8-6 8 6v8h-5v-5H9v5H4z" fill="#fff" />,
  pin: <path d="M12 21s6-6.2 6-11a6 6 0 0 0-12 0c0 4.8 6 11 6 11z" fill="#fff" />,
};

function Row({ icon, label, value, color, textColor, height, showIcons, labelWidth = 11.5 }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2mm', height: `${height}mm` }}>
      {showIcons ? (
        <svg
          viewBox="0 0 24 24"
          style={{ width: '3.2mm', height: '3.2mm', flexShrink: 0, background: color, borderRadius: '0.8mm', padding: '0.5mm', boxSizing: 'border-box' }}
        >
          {ICON_PATHS[icon]}
        </svg>
      ) : null}
      <span style={{ width: `${labelWidth}mm`, flexShrink: 0, fontWeight: 700, color: textColor, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontWeight: 400, color: textColor, flexShrink: 0 }}>:</span>
      <span style={{ fontWeight: 600, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </span>
    </div>
  );
}

function backgroundFor(d) {
  const p = d.primaryColor;
  const layers = [];
  if (d.pattern === 'dots') layers.push(`radial-gradient(${p}30 0.3mm, transparent 0.38mm) 0 0 / 2.6mm 2.6mm`);
  if (d.pattern === 'grid') {
    layers.push(`linear-gradient(${p}1c 0.15mm, transparent 0.15mm) 0 0 / 3mm 3mm`);
    layers.push(`linear-gradient(90deg, ${p}1c 0.15mm, transparent 0.15mm) 0 0 / 3mm 3mm`);
  }
  if (d.pattern === 'lines') layers.push(`repeating-linear-gradient(135deg, ${p}16 0 0.25mm, transparent 0.25mm 2.8mm)`);
  layers.push(`radial-gradient(circle at 18% 80%, ${p}12, transparent 55%)`);
  layers.push(`radial-gradient(circle at 88% 42%, ${d.accentColor}16, transparent 50%)`);
  layers.push(d.cardBg);
  return layers.join(', ');
}

function HeaderShape({ d, headerH, dark, gradientEnd, amp = 1 }) {
  const { W } = cardSize(d);
  const base = headerH - 6;
  const fill = d.headerGradient ? 'url(#idcard-hdr)' : d.primaryColor;
  let accentPath;
  let mainPath;
  if (d.headerStyle === 'curved') {
    accentPath = `M0 0H${W}V${base - 0.5}Q${W / 2} ${headerH + 6} 0 ${base - 0.5}Z`;
    mainPath = `M0 0H${W}V${base - 2.2}Q${W / 2} ${headerH + 3.6} 0 ${base - 2.2}Z`;
  } else if (d.headerStyle === 'wave') {
    accentPath = `M0 0H${W}V${base + 0.5}C${W * 0.8} ${base + 7 * amp} ${W * 0.62} ${base - 4 * amp} ${W / 2} ${base + 1.5}S${W * 0.2} ${base + 7 * amp} 0 ${base + 0.5}Z`;
    mainPath = `M0 0H${W}V${base - 1.3}C${W * 0.8} ${base + 5.2 * amp} ${W * 0.62} ${base - 5.8 * amp} ${W / 2} ${base - 0.3}S${W * 0.2} ${base + 5.2 * amp} 0 ${base - 1.3}Z`;
  } else if (d.headerStyle === 'slant') {
    accentPath = `M0 0H${W}V${base - 4}L0 ${base + 6.5}Z`;
    mainPath = `M0 0H${W}V${base - 5.8}L0 ${base + 4.7}Z`;
  } else {
    accentPath = `M0 0H${W}V${base + 1}H0Z`;
    mainPath = `M0 0H${W}V${base - 0.4}H0Z`;
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${headerH + 8}`}
      style={{ position: 'absolute', top: 0, left: 0, width: `${W}mm`, height: `${headerH + 8}mm` }}
    >
      <defs>
        <linearGradient id="idcard-hdr" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={d.primaryColor} />
          <stop offset="1" stopColor={gradientEnd || dark} />
        </linearGradient>
      </defs>
      <path d={accentPath} fill={d.accentColor} />
      <path d={mainPath} fill={fill} />
    </svg>
  );
}

function LogoMark({ logo, school, d, size, withRing }) {
  const radius = d.logoShape === 'circle' ? '50%' : '2mm';
  return (
    <div
      style={{
        width: `${size}mm`,
        height: `${size}mm`,
        borderRadius: radius,
        background: '#fff',
        border: withRing ? `0.6mm solid ${d.accentColor}` : 'none',
        boxShadow: withRing ? `0 0 0 0.5mm ${shade(d.primaryColor, 0.45)}` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {logo ? (
        <img src={logo} alt="" style={{ width: `${size * 0.76}mm`, height: `${size * 0.76}mm`, objectFit: 'contain' }} />
      ) : (
        <span style={{ fontWeight: 800, fontSize: `${size * 0.3}mm`, color: d.primaryColor }}>{initials(school?.name)}</span>
      )}
    </div>
  );
}

function cardShell(d) {
  const { W, H } = cardSize(d);
  return {
    position: 'relative',
    width: `${W}mm`,
    height: `${H}mm`,
    boxSizing: 'border-box',
    border: d.showBorder ? `0.4mm solid ${d.borderColor}` : 'none',
    borderRadius: `${RADIUS[d.cornerRadius] || 3.2}mm`,
    overflow: 'hidden',
    background: backgroundFor(d),
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '2.3mm',
    pageBreakInside: 'avoid',
    breakInside: 'avoid',
  };
}

function headerBlock({ d, school, logo }) {
  const serif = d.nameFont === 'serif';
  const nameMm = SCHOOL_NAME_MM[d.schoolNameSize] || 3.3;
  const inHeaderLogo = d.logoPosition === 'header' && (logo || school?.name);
  return (
    <div
      style={{
        position: 'absolute',
        top: d.lanyardSlot ? '5mm' : '3.2mm',
        left: 0,
        right: 0,
        color: d.headerTextColor,
        padding: '0 3mm',
        display: 'flex',
        alignItems: 'center',
        gap: '1.6mm',
        justifyContent: 'center',
        textAlign: inHeaderLogo ? 'left' : 'center',
      }}
    >
      {inHeaderLogo ? <LogoMark logo={logo} school={school} d={d} size={9} withRing={false} /> : null}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: serif ? 'Georgia, "Times New Roman", serif' : 'Arial, Helvetica, sans-serif',
            fontWeight: 700,
            fontSize: `${nameMm}mm`,
            lineHeight: 1.12,
            letterSpacing: serif ? '0.05mm' : '0.1mm',
            textTransform: 'uppercase',
          }}
        >
          {school?.name}
        </div>
        {d.tagline ? (
          <div style={{ fontSize: '1.7mm', fontStyle: 'italic', marginTop: '0.4mm', opacity: 0.95 }}>{d.tagline}</div>
        ) : null}
        {d.showAddress && school?.address ? (
          <div style={{ fontSize: '1.6mm', lineHeight: 1.25, marginTop: '0.7mm', opacity: 0.92 }}>
            {truncate(school.address, 70)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function footerBar({ d, school, student }) {
  const dark = d.footerBg || shade(d.primaryColor, 0.45);
  const pick = (kind) => {
    if (kind === 'phone') return school?.phone ? `Ph: ${school.phone}` : '';
    if (kind === 'website') return school?.website || '';
    if (kind === 'email') return school?.email || '';
    if (kind === 'session') return student?.academicYear ? `Session ${student.academicYear}` : '';
    if (kind === 'validTill') return student?.validTill ? `Valid till ${formatDate(student.validTill)}` : '';
    return '';
  };
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '6mm',
        background: dark,
        borderTop: `0.4mm solid ${d.accentColor}`,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 3mm',
        fontSize: '2mm',
        fontWeight: 600,
        boxSizing: 'border-box',
        gap: '2mm',
      }}
    >
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pick(d.footerLeft)}</span>
      <span style={{ whiteSpace: 'nowrap' }}>{pick(d.footerRight)}</span>
    </div>
  );
}

function buildRows(student, d) {
  return [
    { icon: 'idcard', label: 'Adm. No', value: student.admissionNumber },
    d.fields.rollNo && { icon: 'list', label: 'Roll No', value: student.rollNumber },
    d.fields.phone && { icon: 'phone', label: 'Phone', value: student.parentPhone },
    d.fields.gender && { icon: 'user', label: 'Gender', value: prettyGender(student.gender) },
    d.fields.dob && { icon: 'cake', label: 'DOB', value: formatDate(student.dateOfBirth) },
    d.fields.parent && { icon: 'user', label: 'Parent', value: truncate(student.parentName, 22) },
    d.fields.house && { icon: 'home', label: 'House', value: student.house },
    d.fields.address && { icon: 'pin', label: 'Address', value: truncate(student.address, 26) },
  ].filter((row) => row && row.value);
}

// Landscape card (86 x 54 mm): school header on top, photo on the left,
// name / class / details on the right, title ribbon + footer at the bottom.
function IdCardHorizontal({ student, school, design }) {
  const d = design;
  const { W, H } = cardSize(d);
  const logo = school?.logo ? absoluteSrc(assetUrl(school.logo)) : '';
  const photo = student.photo ? absoluteSrc(assetUrl(student.photo)) : '';
  const className = (student.className || '').replace(/^class\s+/i, '').trim();
  const classLine = [className, student.sectionName].filter(Boolean).join(' - ');
  const dark = d.footerBg || shade(d.primaryColor, 0.45);
  const gradientEnd = d.secondaryColor || shade(d.primaryColor, 0.45);
  const wave = d.headerStyle === 'wave';
  const headerH = wave ? 23 : 19;
  const rows = buildRows(student, d);

  const ribbonTop = H - 6 - 3.6;
  const contentTop = wave ? 21.4 : 19.4;
  const bottomLimit = (d.cardTitle ? ribbonTop - 0.6 : H - 6.5) - (d.signature ? 4.4 : 0);
  const hasClass = d.classStyle !== 'hidden' && Boolean(classLine);

  const photoSize = Math.max(14, Math.min(PHOTO_MM[d.photoSize] || 20, bottomLimit - contentTop));
  const photoW = d.photoShape === 'circle' ? photoSize : photoSize * 0.85;
  const photoRadius = d.photoShape === 'circle' ? '50%' : d.photoShape === 'rounded' ? '2.2mm' : '0.6mm';
  const nameMm = NAME_MM[d.nameSize] || 3.6;
  const displayName = d.nameCase === 'upper' ? (student.name || '').toUpperCase() : titleCase(student.name || '');

  const colLeft = 4.5 + photoW + 4;
  const colWidth = W - 4 - colLeft;
  const rowsTop = contentTop + 4.6 + (hasClass ? 6.4 : 1);
  const avail = bottomLimit - rowsTop;
  const twoCols = rows.length > 1 && avail / rows.length < 3;
  const perCol = twoCols ? Math.ceil(rows.length / 2) : rows.length;
  const rowH = Math.max(2.4, Math.min(3.8, avail / Math.max(perCol, 1)));
  const rowFont = Math.min(2.4, rowH * 0.62);

  const classStyle = {
    display: 'inline-block',
    marginTop: '0.8mm',
    padding: '0.5mm 3.2mm',
    borderRadius: '2.4mm',
    fontWeight: 800,
    fontSize: '2.2mm',
    letterSpacing: '0.1mm',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    ...(d.classStyle === 'pill'
      ? { background: d.primaryColor, border: `0.4mm solid ${d.accentColor}`, color: '#fff' }
      : d.classStyle === 'outline'
        ? { background: 'transparent', border: `0.4mm solid ${d.primaryColor}`, color: d.primaryColor }
        : { background: 'transparent', border: 'none', color: d.primaryColor, padding: '0.5mm 0' }),
  };

  const renderRow = (row) => (
    <Row
      key={row.label}
      {...row}
      color={d.primaryColor}
      textColor={d.textColor}
      height={rowH}
      showIcons={d.showIcons && !twoCols}
      labelWidth={twoCols ? 8.2 : 11.5}
    />
  );

  return (
    <div style={cardShell(d)}>
      <HeaderShape d={d} headerH={headerH} dark={dark} gradientEnd={gradientEnd} amp={wave ? 0.45 : 1} />

      {d.lanyardSlot && (
        <div
          style={{
            position: 'absolute',
            top: '1.2mm',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '10mm',
            height: '2.2mm',
            borderRadius: '1.1mm',
            background: '#f1f5f9',
            border: '0.3mm solid #cbd5e1',
          }}
        />
      )}

      {headerBlock({ d: { ...d, logoPosition: d.logoPosition === 'none' ? 'none' : 'header' }, school, logo })}

      {/* Photo */}
      <div style={{ position: 'absolute', top: `${contentTop + (bottomLimit - contentTop - photoSize) / 2}mm`, left: '4.5mm' }}>
        <div
          style={{
            width: `${photoW}mm`,
            height: `${photoSize}mm`,
            borderRadius: photoRadius,
            border: `0.7mm solid ${d.primaryColor}`,
            boxShadow: d.photoRing ? `0 0 0 0.6mm ${d.accentColor}` : 'none',
            overflow: 'hidden',
            background: '#e2e8f0',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {photo ? (
            <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontWeight: 800, fontSize: `${photoSize * 0.3}mm`, color: '#475569' }}>{initials(student.name)}</span>
          )}
        </div>
      </div>

      {/* Name + class */}
      <div style={{ position: 'absolute', top: `${contentTop}mm`, left: `${colLeft}mm`, width: `${colWidth}mm` }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: `${nameMm}mm`,
            lineHeight: 1.1,
            color: d.textColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </div>
        {hasClass ? <div style={classStyle}>Class {classLine}</div> : null}
      </div>

      {/* Details */}
      <div
        style={{
          position: 'absolute',
          top: `${rowsTop}mm`,
          left: `${colLeft}mm`,
          width: `${colWidth}mm`,
          fontSize: `${rowFont}mm`,
          display: twoCols ? 'grid' : 'block',
          gridTemplateColumns: twoCols ? '1fr 1fr' : undefined,
          gridAutoFlow: twoCols ? 'column' : undefined,
          gridTemplateRows: twoCols ? `repeat(${perCol}, ${rowH}mm)` : undefined,
          columnGap: twoCols ? '2mm' : undefined,
        }}
      >
        {rows.map(renderRow)}
      </div>

      {d.signature && (
        <div style={{ position: 'absolute', right: '4mm', top: `${ribbonTop - 4.2}mm`, width: '17mm', textAlign: 'center' }}>
          <div style={{ borderTop: `0.25mm solid ${d.textColor}`, marginTop: '2.2mm', paddingTop: '0.4mm', fontSize: '1.7mm', color: d.textColor, fontWeight: 600 }}>
            {d.signatureLabel || 'Principal'}
          </div>
        </div>
      )}

      {d.cardTitle ? (
        <div
          style={{
            position: 'absolute',
            top: `${ribbonTop}mm`,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '30mm',
            height: '3.7mm',
            background: d.accentColor,
            clipPath: 'polygon(7% 0, 93% 0, 100% 100%, 0 100%)',
            color: shade(d.accentColor, 0.65),
            fontWeight: 800,
            fontSize: '1.9mm',
            letterSpacing: '0.15mm',
            textAlign: 'center',
            lineHeight: '3.7mm',
            textTransform: 'uppercase',
          }}
        >
          {d.cardTitle}
        </div>
      ) : null}
      {footerBar({ d, school, student })}
    </div>
  );
}

// Back of the landscape card.
function IdCardBackHorizontal({ school, design }) {
  const d = design;
  const dark = d.footerBg || shade(d.primaryColor, 0.45);
  const gradientEnd = d.secondaryColor || shade(d.primaryColor, 0.45);
  const logo = school?.logo ? absoluteSrc(assetUrl(school.logo)) : '';
  const lines = [
    school?.address,
    school?.phone && `Phone: ${school.phone}`,
    school?.email && `Email: ${school.email}`,
    school?.website,
  ].filter(Boolean);
  return (
    <div style={cardShell(d)}>
      <HeaderShape d={d} headerH={11} dark={dark} gradientEnd={gradientEnd} />
      <div style={{ position: 'absolute', top: '15mm', left: '6mm' }}>
        <LogoMark logo={logo} school={school} d={d} size={15} withRing />
      </div>
      <div style={{ position: 'absolute', top: '14mm', left: '26mm', right: '6mm', color: d.textColor }}>
        <div style={{ fontWeight: 800, fontSize: '2.8mm', textTransform: 'uppercase', color: d.primaryColor, lineHeight: 1.15 }}>
          {school?.name}
        </div>
        <div style={{ height: '0.4mm', width: '14mm', background: d.accentColor, margin: '1.2mm 0' }} />
        <div style={{ fontSize: '2mm', lineHeight: 1.35 }}>{d.backText}</div>
        <div style={{ marginTop: '1.8mm', fontSize: '1.9mm', lineHeight: 1.4, fontWeight: 600 }}>
          {lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', right: '6mm', bottom: '8.5mm', width: '28mm', textAlign: 'center' }}>
        <div style={{ borderTop: `0.25mm solid ${d.textColor}`, paddingTop: '0.5mm', fontSize: '1.8mm', color: d.textColor, fontWeight: 600 }}>
          {d.signatureLabel || 'Authorised Signatory'}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '6mm',
          background: dark,
          borderTop: `0.4mm solid ${d.accentColor}`,
        }}
      />
    </div>
  );
}

export function IdCard({ student, school, design }) {
  const d = design;
  if (d.orientation === 'horizontal') return <IdCardHorizontal student={student} school={school} design={d} />;
  const logo = school?.logo ? absoluteSrc(assetUrl(school.logo)) : '';
  const photo = student.photo ? absoluteSrc(assetUrl(student.photo)) : '';
  // Class names are often saved as "Class 10" already - don't print "Class Class 10".
  const className = (student.className || '').replace(/^class\s+/i, '').trim();
  const classLine = [className, student.sectionName].filter(Boolean).join(' - ');
  const dark = d.footerBg || shade(d.primaryColor, 0.45);
  const gradientEnd = d.secondaryColor || shade(d.primaryColor, 0.45);
  const headerH = 26;
  const showBadge = d.logoPosition === 'badge';

  const rows = buildRows(student, d);

  // Vertical layout is computed: a bigger photo / more rows / a signature
  // line shrink the photo first, so the card never overflows.
  const photoTop = showBadge ? 32 : 29.5;
  const ribbonTop = 76.4;
  const bottomLimit = d.signature ? ribbonTop - 5 : ribbonTop;
  const hasClass = d.classStyle !== 'hidden' && Boolean(classLine);
  const blockBelowPhoto = hasClass ? 13.6 : 8.6;
  let photoSize = PHOTO_MM[d.photoSize] || 20;
  const rowHeightFor = (size) => (bottomLimit - (photoTop + size + blockBelowPhoto) - 0.4) / Math.max(rows.length, 1);
  while (photoSize > 12 && rowHeightFor(photoSize) < 3.3) photoSize -= 1;
  const rowsTop = photoTop + photoSize + blockBelowPhoto;
  const rowH = Math.max(2.6, Math.min(3.8, rowHeightFor(photoSize)));
  const isCircle = d.photoShape === 'circle';
  const photoW = d.photoShape === 'circle' ? photoSize : photoSize * 0.85;
  const photoRadius = d.photoShape === 'circle' ? '50%' : d.photoShape === 'rounded' ? '2.2mm' : '0.6mm';
  const nameMm = NAME_MM[d.nameSize] || 3.6;
  const displayName = d.nameCase === 'upper' ? (student.name || '').toUpperCase() : titleCase(student.name || '');

  const classStyle = {
    display: 'inline-block',
    marginTop: '1mm',
    padding: '0.6mm 3.6mm',
    borderRadius: '2.4mm',
    fontWeight: 800,
    fontSize: '2.3mm',
    letterSpacing: '0.1mm',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    ...(d.classStyle === 'pill'
      ? { background: d.primaryColor, border: `0.4mm solid ${d.accentColor}`, color: '#fff' }
      : d.classStyle === 'outline'
        ? { background: 'transparent', border: `0.4mm solid ${d.primaryColor}`, color: d.primaryColor }
        : { background: 'transparent', border: 'none', color: d.primaryColor, padding: '0.6mm 0' }),
  };

  return (
    <div style={cardShell(d)}>
      <HeaderShape d={d} headerH={headerH} dark={dark} gradientEnd={gradientEnd} />

      {d.lanyardSlot && (
        <div
          style={{
            position: 'absolute',
            top: '1.6mm',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '10mm',
            height: '2.2mm',
            borderRadius: '1.1mm',
            background: '#f1f5f9',
            border: '0.3mm solid #cbd5e1',
          }}
        />
      )}

      {headerBlock({ d, school, logo })}

      {showBadge && (
        <div style={{ position: 'absolute', top: '19.6mm', left: '50%', transform: 'translateX(-50%)' }}>
          <LogoMark logo={logo} school={school} d={d} size={11} withRing />
        </div>
      )}

      {/* Photo */}
      <div style={{ position: 'absolute', top: `${photoTop}mm`, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: `${photoW}mm`,
            height: `${photoSize}mm`,
            borderRadius: photoRadius,
            border: `0.7mm solid ${d.primaryColor}`,
            boxShadow: d.photoRing ? `0 0 0 0.6mm ${d.accentColor}` : 'none',
            overflow: 'hidden',
            background: '#e2e8f0',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {photo ? (
            <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontWeight: 800, fontSize: `${photoSize * 0.3}mm`, color: '#475569' }}>{initials(student.name)}</span>
          )}
        </div>
      </div>

      {/* Name + class */}
      <div style={{ position: 'absolute', top: `${photoTop + photoSize + 1.6}mm`, left: 0, right: 0, textAlign: 'center', padding: '0 2mm' }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: `${nameMm}mm`,
            lineHeight: 1.1,
            color: d.textColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </div>
        {hasClass ? <div style={classStyle}>Class {classLine}</div> : null}
      </div>

      {/* Details */}
      <div style={{ position: 'absolute', top: `${rowsTop}mm`, left: '4.5mm', right: '3mm', fontSize: `${Math.min(2.4, rowH * 0.62)}mm` }}>
        {rows.map((row) => (
          <Row key={row.label} {...row} color={d.primaryColor} textColor={d.textColor} height={rowH} showIcons={d.showIcons} />
        ))}
      </div>

      {d.signature && (
        <div style={{ position: 'absolute', right: '4mm', top: `${ribbonTop - 4.6}mm`, width: '17mm', textAlign: 'center' }}>
          <div style={{ borderTop: `0.25mm solid ${d.textColor}`, marginTop: '2.6mm', paddingTop: '0.4mm', fontSize: '1.7mm', color: d.textColor, fontWeight: 600 }}>
            {d.signatureLabel || 'Principal'}
          </div>
        </div>
      )}

      {d.cardTitle ? (
        <div
          style={{
            position: 'absolute',
            top: `${ribbonTop}mm`,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '30mm',
            height: '3.7mm',
            background: d.accentColor,
            clipPath: 'polygon(7% 0, 93% 0, 100% 100%, 0 100%)',
            color: shade(d.accentColor, 0.65),
            fontWeight: 800,
            fontSize: '1.9mm',
            letterSpacing: '0.15mm',
            textAlign: 'center',
            lineHeight: '3.7mm',
            textTransform: 'uppercase',
          }}
        >
          {d.cardTitle}
        </div>
      ) : null}
      {footerBar({ d, school, student })}
    </div>
  );
}

// Back of the card: terms text + school contact + signature.
export function IdCardBack({ school, design }) {
  const d = design;
  if (d.orientation === 'horizontal') return <IdCardBackHorizontal school={school} design={d} />;
  const dark = d.footerBg || shade(d.primaryColor, 0.45);
  const gradientEnd = d.secondaryColor || shade(d.primaryColor, 0.45);
  const logo = school?.logo ? absoluteSrc(assetUrl(school.logo)) : '';
  const lines = [
    school?.address,
    school?.phone && `Phone: ${school.phone}`,
    school?.email && `Email: ${school.email}`,
    school?.website,
  ].filter(Boolean);
  return (
    <div style={cardShell(d)}>
      <HeaderShape d={d} headerH={16} dark={dark} gradientEnd={gradientEnd} />
      <div style={{ position: 'absolute', top: '4mm', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <LogoMark logo={logo} school={school} d={d} size={10} withRing />
      </div>
      <div style={{ position: 'absolute', top: '23mm', left: '5mm', right: '5mm', textAlign: 'center', color: d.textColor }}>
        <div style={{ fontWeight: 800, fontSize: '2.9mm', textTransform: 'uppercase', color: d.primaryColor, lineHeight: 1.15 }}>
          {school?.name}
        </div>
        <div style={{ height: '0.4mm', width: '14mm', background: d.accentColor, margin: '1.6mm auto' }} />
        <div style={{ fontSize: '2.1mm', lineHeight: 1.4 }}>{d.backText}</div>
        <div style={{ marginTop: '3mm', fontSize: '2mm', lineHeight: 1.5, fontWeight: 600 }}>
          {lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: '8mm', right: '8mm', bottom: '10mm', textAlign: 'center' }}>
        <div style={{ borderTop: `0.25mm solid ${d.textColor}`, paddingTop: '0.5mm', fontSize: '1.9mm', color: d.textColor, fontWeight: 600 }}>
          {d.signatureLabel || 'Authorised Signatory'}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '6mm',
          background: dark,
          borderTop: `0.4mm solid ${d.accentColor}`,
        }}
      />
    </div>
  );
}

function printCards(win, students, school, design) {
  const markup = renderToStaticMarkup(
    <>
      <div className="sheet">
        {students.map((student) => (
          <div className="slot" key={student.id}>
            <IdCard student={student} school={school} design={design} />
          </div>
        ))}
      </div>
      {design.backSide && (
        <div className="sheet back">
          {students.map((student) => (
            <div className="slot" key={`back-${student.id}`}>
              <IdCardBack school={school} design={design} />
            </div>
          ))}
        </div>
      )}
    </>
  );
  const { W } = cardSize(design);
  const cols = design.orientation === 'horizontal' ? 2 : 3;
  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Student ID Cards</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; background: #fff; }
  .sheet { display: grid; grid-template-columns: repeat(${cols}, ${W}mm); gap: 6mm; justify-content: center; }
  .sheet.back { break-before: page; page-break-before: always; }
  .slot { break-inside: avoid; page-break-inside: avoid; }
</style></head><body>${markup}</body></html>`);
  win.document.close();
  // Let the photos / logo load before the dialog opens.
  const images = Array.from(win.document.images);
  const ready = Promise.all(
    images.map((img) => (img.complete ? null : new Promise((resolve) => { img.onload = img.onerror = resolve; })))
  );
  Promise.race([ready, new Promise((resolve) => setTimeout(resolve, 5000))]).then(() => {
    win.focus();
    win.print();
  });
}

/* ------------------------------- editor UI ------------------------------- */

const selectClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400';

function ColorField({ label, value, onChange, allowAuto }) {
  const isAuto = allowAuto && !value;
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900">
        <input
          type="color"
          value={value || '#1e3a8a'}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span className="flex-1 font-mono text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
          {isAuto ? 'Auto' : value}
        </span>
        {allowAuto && value ? (
          <button type="button" onClick={() => onChange('')} className="text-[11px] font-bold text-indigo-600">
            Auto
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Choice({ label, value, onChange, options }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([val, text]) => (
          <option key={val} value={val}>{text}</option>
        ))}
      </select>
    </div>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
      <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, max, multiline }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <Tag
        className={`${selectClass} ${multiline ? 'h-20 py-2' : ''}`}
        maxLength={max}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

const SECTIONS = [
  ['template', 'Template'],
  ['colors', 'Colors'],
  ['header', 'Header & logo'],
  ['photo', 'Photo & name'],
  ['details', 'Details'],
  ['footer', 'Footer & back'],
];

function DesignEditor({ design, patch, patchField, applyTemplate }) {
  const [section, setSection] = useState('template');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              section === key
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'template' && (
        <div>
          <label className={labelClass}>Card format</label>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ['vertical', 'Vertical (portrait)', '54 × 86 mm'],
              ['horizontal', 'Horizontal (landscape)', '86 × 54 mm'],
            ].map(([key, title, size]) => (
              <button
                key={key}
                type="button"
                onClick={() => patch({ orientation: key })}
                className={`flex items-center gap-3 rounded-xl border px-4 py-2 text-left transition ${
                  (design.orientation || 'vertical') === key
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className={`block rounded-sm border-2 ${key === 'vertical' ? 'h-6 w-4' : 'h-4 w-6'} ${
                    (design.orientation || 'vertical') === key ? 'border-white' : 'border-slate-400'
                  }`}
                />
                <span>
                  <span className="block text-sm font-bold">{title}</span>
                  <span className="block text-[11px] opacity-80">{size}</span>
                </span>
              </button>
            ))}
          </div>
          <label className={labelClass}>Start from a template</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TEMPLATES).map(([key, tpl]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                  design.template === key
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {tpl.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            A template sets the header, photo, pattern and accent look. Your colors, texts and fields stay as they are.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Choice label="Corners" value={design.cornerRadius} onChange={(v) => patch({ cornerRadius: v })} options={[['s', 'Slightly rounded'], ['m', 'Rounded'], ['l', 'Very rounded']]} />
            <Choice label="Background pattern" value={design.pattern} onChange={(v) => patch({ pattern: v })} options={[['none', 'None'], ['dots', 'Dots'], ['grid', 'Grid'], ['lines', 'Diagonal lines']]} />
            <div className="flex flex-col justify-end gap-2 pb-2">
              <Check label="Card border" checked={design.showBorder} onChange={(v) => patch({ showBorder: v })} />
              <Check label="Lanyard slot" checked={design.lanyardSlot} onChange={(v) => patch({ lanyardSlot: v })} />
            </div>
          </div>
        </div>
      )}

      {section === 'colors' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <ColorField label="Main color" value={design.primaryColor} onChange={(v) => patch({ primaryColor: v })} />
          <ColorField label="Gradient end color" value={design.secondaryColor} allowAuto onChange={(v) => patch({ secondaryColor: v })} />
          <ColorField label="Accent color" value={design.accentColor} onChange={(v) => patch({ accentColor: v })} />
          <ColorField label="Header text color" value={design.headerTextColor} onChange={(v) => patch({ headerTextColor: v })} />
          <ColorField label="Text color" value={design.textColor} onChange={(v) => patch({ textColor: v })} />
          <ColorField label="Card background" value={design.cardBg} onChange={(v) => patch({ cardBg: v })} />
          <ColorField label="Footer color" value={design.footerBg} allowAuto onChange={(v) => patch({ footerBg: v })} />
          <ColorField label="Border color" value={design.borderColor} onChange={(v) => patch({ borderColor: v })} />
        </div>
      )}

      {section === 'header' && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <Choice label="Header shape" value={design.headerStyle} onChange={(v) => patch({ headerStyle: v })} options={[['curved', 'Curved'], ['wave', 'Wave'], ['slant', 'Slanted'], ['flat', 'Flat']]} />
            <Choice label="School name font" value={design.nameFont} onChange={(v) => patch({ nameFont: v })} options={[['serif', 'Classic (serif)'], ['sans', 'Modern (sans)']]} />
            <Choice label="School name size" value={design.schoolNameSize} onChange={(v) => patch({ schoolNameSize: v })} options={[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']]} />
            <TextField label="Tagline" value={design.tagline} max={60} placeholder="e.g. Excellence in Education" onChange={(v) => patch({ tagline: v })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Choice label="Logo position" value={design.logoPosition} onChange={(v) => patch({ logoPosition: v })} options={[['badge', 'Badge under header'], ['header', 'Inside header'], ['none', 'Hide logo']]} />
            <Choice label="Logo shape" value={design.logoShape} onChange={(v) => patch({ logoShape: v })} options={[['circle', 'Circle'], ['square', 'Rounded square']]} />
            <div className="flex flex-col justify-end gap-2 pb-2">
              <Check label="Gradient header" checked={design.headerGradient} onChange={(v) => patch({ headerGradient: v })} />
              <Check label="Show school address" checked={design.showAddress} onChange={(v) => patch({ showAddress: v })} />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">The logo is taken from the school profile automatically.</p>
        </div>
      )}

      {section === 'photo' && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Choice label="Photo shape" value={design.photoShape} onChange={(v) => patch({ photoShape: v })} options={[['circle', 'Circle'], ['rounded', 'Rounded square'], ['square', 'Square']]} />
          <Choice label="Photo size" value={design.photoSize} onChange={(v) => patch({ photoSize: v })} options={[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']]} />
          <Choice label="Student name size" value={design.nameSize} onChange={(v) => patch({ nameSize: v })} options={[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']]} />
          <Choice label="Student name case" value={design.nameCase} onChange={(v) => patch({ nameCase: v })} options={[['upper', 'ALL CAPS'], ['title', 'Title Case']]} />
          <Choice label="Class label" value={design.classStyle} onChange={(v) => patch({ classStyle: v })} options={[['pill', 'Filled pill'], ['outline', 'Outlined'], ['text', 'Plain text'], ['hidden', 'Hide']]} />
          <div className="flex flex-col justify-end gap-2 pb-2">
            <Check label="Accent ring around photo" checked={design.photoRing} onChange={(v) => patch({ photoRing: v })} />
          </div>
        </div>
      )}

      {section === 'details' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Show on card</label>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {FIELD_OPTIONS.map((field) => (
                <Check key={field.key} label={field.label} checked={design.fields[field.key]} onChange={(v) => patchField(field.key, v)} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Check label="Icons before details" checked={design.showIcons} onChange={(v) => patch({ showIcons: v })} />
            <Check label="Signature line on front" checked={design.signature} onChange={(v) => patch({ signature: v })} />
          </div>
          <p className="text-[11px] text-slate-400">
            Admission no, name, class and school logo are always shown. With many details selected the photo shrinks to fit.
          </p>
        </div>
      )}

      {section === 'footer' && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Card title (ribbon)" value={design.cardTitle} max={30} placeholder="STUDENT ID CARD" onChange={(v) => patch({ cardTitle: v })} />
            <Choice label="Footer - left" value={design.footerLeft} onChange={(v) => patch({ footerLeft: v })} options={[['phone', 'School phone'], ['website', 'Website'], ['email', 'Email'], ['none', 'Nothing']]} />
            <Choice label="Footer - right" value={design.footerRight} onChange={(v) => patch({ footerRight: v })} options={[['session', 'Session'], ['validTill', 'Valid till'], ['none', 'Nothing']]} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Signature label" value={design.signatureLabel} max={30} placeholder="Principal" onChange={(v) => patch({ signatureLabel: v })} />
            <div className="flex flex-col justify-end gap-2 pb-2">
              <Check label="Print back side too" checked={design.backSide} onChange={(v) => patch({ backSide: v })} />
            </div>
          </div>
          {design.backSide && (
            <TextField label="Back side text" value={design.backText} max={240} multiline onChange={(v) => patch({ backText: v })} />
          )}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 24;

export default function StudentIdCards({ api }) {
  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  // id -> student, kept across pages so a selection can span the whole result.
  const [selected, setSelected] = useState(() => new Map());
  const [design, setDesign] = useState(null);
  const [designOpen, setDesignOpen] = useState(false);
  const [savingDesign, setSavingDesign] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .options()
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        setOptions(data);
        setDesign(mergeDesign(buildDefaultDesign(data.school), data.design));
        const current = data.academicYears.find((year) => year.isCurrent) || data.academicYears[0];
        setYearId(current ? current.id : 'none');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Unable to load school data');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const classes = useMemo(
    () => (options?.classes || []).filter((cls) => !yearId || yearId === 'none' || !cls.academicYearId || cls.academicYearId === yearId),
    [options, yearId]
  );
  const sections = useMemo(
    () => (options?.sections || []).filter((section) => section.classId === classId),
    [options, classId]
  );

  const filterParams = useCallback(() => {
    const params = {};
    if (yearId && yearId !== 'none') params.academicYearId = yearId;
    if (classId) params.classId = classId;
    if (sectionId) params.sectionId = sectionId;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [yearId, classId, sectionId, debouncedSearch]);

  // Filters apply by themselves: there is no "load" button.
  useEffect(() => {
    if (!yearId) return undefined;
    let cancelled = false;
    setLoading(true);
    api
      .students({ ...filterParams(), page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setError('');
        setStudents(res.data || []);
        setPagination(res.pagination || { page: 1, total: 0, totalPages: 1 });
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Unable to load students');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, filterParams, page, yearId]);

  const toggle = (student) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(student.id)) next.delete(student.id);
      else next.set(student.id, student);
      return next;
    });

  const pageAllSelected = students.length > 0 && students.every((s) => selected.has(s.id));
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      students.forEach((s) => (pageAllSelected ? next.delete(s.id) : next.set(s.id, s)));
      return next;
    });

  const handlePrint = async () => {
    // Opened first: browsers block a window that is opened after an await.
    const win = window.open('', '_blank');
    if (!win) {
      setError('The print window was blocked. Allow pop-ups for this site and try again.');
      return;
    }
    win.document.write('<p style="font-family:Arial;padding:24px">Preparing ID cards...</p>');
    setPrinting(true);
    setError('');
    try {
      let list = Array.from(selected.values());
      if (!list.length) {
        const res = await api.students({ ...filterParams(), all: 1 });
        list = res.data || [];
      }
      if (!list.length) {
        win.close();
        setError('There are no students to print.');
        return;
      }
      printCards(win, list, options.school, design);
    } catch (err) {
      win.close();
      setError(err.response?.data?.message || err.message || 'Unable to prepare the cards');
    } finally {
      setPrinting(false);
    }
  };

  // Any manual tweak means the card is no longer a pure template.
  // Switching the card format alone does not make the card "custom".
  const patchDesign = (patch) =>
    setDesign((prev) => ({
      ...prev,
      ...(Object.keys(patch).every((k) => k === 'orientation') ? {} : { template: 'custom' }),
      ...patch,
    }));
  const patchField = (key, value) =>
    setDesign((prev) => ({ ...prev, fields: { ...prev.fields, [key]: value } }));
  const applyTemplate = (key) =>
    setDesign((prev) => ({ ...prev, ...TEMPLATES[key].values, template: key }));

  const saveDesign = async () => {
    setSavingDesign(true);
    setError('');
    setNotice('');
    try {
      await api.saveDesign(design);
      setNotice('Design saved for your school.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save the design');
    } finally {
      setSavingDesign(false);
    }
  };

  const resetDesign = () => setDesign(buildDefaultDesign(options.school));

  const previewStudent = students[0] || SAMPLE_STUDENT;
  const total = pagination.total || 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <IdCardIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Student ID Cards</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filter by class and section, then print the cards or save them as a PDF.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDesignOpen((open) => !open)}
          className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <Palette className="h-4 w-4" />
          {designOpen ? 'Hide design' : 'Customize design'}
        </button>
      </div>

      {designOpen && design && options && (
        <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <DesignEditor design={design} patch={patchDesign} patchField={patchField} applyTemplate={applyTemplate} />
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={saveDesign}
                disabled={savingDesign}
                className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingDesign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save design
              </button>
              <button
                type="button"
                onClick={resetDesign}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className={labelClass}>Live preview</span>
            <div className="flex flex-wrap justify-center gap-3">
              <IdCard student={previewStudent} school={options.school} design={design} />
              {design.backSide && <IdCardBack school={options.school} design={design} />}
            </div>
          </div>
        </div>
      )}

      {/* Filters apply instantly */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Academic year</label>
          <select
            className={selectClass}
            value={yearId === 'none' ? '' : yearId}
            onChange={(e) => {
              setYearId(e.target.value);
              setClassId('');
              setSectionId('');
              setPage(1);
            }}
          >
            {!options && <option>Loading...</option>}
            {(options?.academicYears || []).map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}{year.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Class</label>
          <select
            className={selectClass}
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId('');
              setPage(1);
            }}
          >
            <option value="">All classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Section</label>
          <select
            className={selectClass}
            value={sectionId}
            disabled={!classId}
            onChange={(e) => {
              setSectionId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>{section.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name / admission no"
              className={`${selectClass} pl-9`}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          {notice}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={pageAllSelected} onChange={togglePage} disabled={!students.length} className="h-4 w-4 accent-indigo-600" />
            Select this page
          </label>
          <span className="text-xs font-medium text-slate-500">
            {total} student{total === 1 ? '' : 's'}
            {selected.size ? ` - ${selected.size} selected` : ''}
          </span>
          {selected.size > 0 && (
            <button type="button" onClick={() => setSelected(new Map())} className="text-xs font-bold text-indigo-600">
              Clear selection
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handlePrint}
          disabled={printing || (selected.size === 0 && total === 0)}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          {selected.size ? `Print selected (${selected.size})` : `Print all (${total})`} / Save PDF
        </button>
      </div>

      {loading && !students.length ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading students...
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm font-semibold text-slate-400 dark:border-slate-800">
          No active students match these filters.
        </div>
      ) : design ? (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div
            className="grid justify-items-center gap-5"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${design.orientation === 'horizontal' ? 86 : 54}mm, 1fr))` }}
          >
            {students.map((student) => (
              <div key={student.id} className="relative">
                <label className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-white/90 shadow">
                  <input
                    type="checkbox"
                    checked={selected.has(student.id)}
                    onChange={() => toggle(student)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                </label>
                <IdCard student={student} school={options.school} design={design} />
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

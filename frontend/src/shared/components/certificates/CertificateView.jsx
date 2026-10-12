import React from 'react';
import { assetUrl } from '../../api/client';
import { LayoutPage } from './designer/LayoutRenderer';

/**
 * A single printable certificate, drawn in millimetres (A4). The same markup is
 * used for the on-screen preview (scaled down) and for the print / PDF sheet.
 */

export const CERT_SIZES = {
  landscape: { w: 297, h: 210 },
  portrait: { w: 210, h: 297 },
};

export const CERT_TYPES = [
  ['ACHIEVEMENT', 'Achievement'],
  ['PARTICIPATION', 'Participation'],
  ['COMPLETION', 'Course Completion'],
  ['MERIT', 'Merit'],
  ['SPORTS', 'Sports'],
  ['APPRECIATION', 'Appreciation'],
  ['BONAFIDE', 'Bonafide'],
  ['CUSTOM', 'Custom'],
  ['TIMETABLE', 'Timetable (class)'],
  ['FEE_STRUCTURE', 'Fee structure (class)'],
];

// Starter wording for each type; {{variables}} are filled in when issuing.
export const TYPE_DEFAULTS = {
  ACHIEVEMENT: {
    title: 'Certificate of Achievement',
    text: 'has shown outstanding performance and dedication in {{courseName}} organized by {{schoolName}}, and is hereby recognised for this remarkable achievement.',
    showRecipientBlock: true,
  },
  PARTICIPATION: {
    title: 'Certificate of Participation',
    text: 'has actively participated in {{courseName}} organized by {{schoolName}} during the academic session {{session}}.',
    showRecipientBlock: true,
  },
  COMPLETION: {
    title: 'Certificate of Completion',
    text: 'has successfully completed {{courseName}} at {{schoolName}} with dedication and sincerity.',
    showRecipientBlock: true,
  },
  MERIT: {
    title: 'Certificate of Merit',
    text: 'of Class {{classSection}} has secured a place of merit in {{courseName}} for the session {{session}}, and has brought pride to {{schoolName}}.',
    showRecipientBlock: true,
  },
  SPORTS: {
    title: 'Certificate of Sports Excellence',
    text: 'has displayed exceptional sportsmanship and skill in {{courseName}} held at {{schoolName}}.',
    showRecipientBlock: true,
  },
  APPRECIATION: {
    title: 'Certificate of Appreciation',
    text: 'is sincerely appreciated for the valuable contribution and commitment shown towards {{schoolName}}.',
    showRecipientBlock: true,
  },
  BONAFIDE: {
    title: 'Bonafide Certificate',
    text: 'This is to certify that {{studentName}}, {{sonDaughter}} of {{fatherName}}, is a bonafide student of {{schoolName}}, studying in Class {{classSection}} during the academic session {{session}}. {{heShe}} bears a good moral character.',
    showRecipientBlock: false,
  },
  TIMETABLE: {
    title: 'Class Timetable',
    text: 'Class timetable',
    showRecipientBlock: false,
  },
  FEE_STRUCTURE: {
    title: 'Fee Structure',
    text: 'Fee structure',
    showRecipientBlock: false,
  },
  CUSTOM: {
    title: 'Certificate',
    text: 'This is to certify that {{studentName}} of {{schoolName}} ...',
    showRecipientBlock: false,
  },
};

export const VARIABLES = [
  ['studentName', 'Recipient name'],
  ['fatherName', "Father's name"],
  ['sonDaughter', 'son / daughter'],
  ['heShe', 'he / she'],
  ['schoolName', 'School name'],
  ['className', 'Class'],
  ['section', 'Section'],
  ['classSection', 'Class + section'],
  ['session', 'Academic session'],
  ['issueDate', 'Issue date'],
  ['validUntil', 'Valid until'],
  ['certificateNumber', 'Certificate no.'],
  ['courseName', 'Course / event'],
  ['principalName', 'Signatory name'],
  ['admissionNumber', 'Admission no.'],
  ['rollNumber', 'Roll no.'],
  ['employeeId', 'Employee ID'],
  ['department', 'Department'],
  ['dob', 'Date of birth'],
];

const BASE = {
  orientation: 'landscape',
  borderStyle: 'ornate',
  primaryColor: '#1e3a8a',
  accentColor: '#c9a227',
  textColor: '#1f2937',
  backgroundColor: '#fffdf6',
  titleFont: 'serif',
  nameStyle: 'script',
  textSize: 'm',
  showLogo: true,
  showSeal: true,
  showQr: true,
  showRecipientBlock: true,
  showWatermark: true,
  secondSignatory: false,
  secondSignatoryLabel: 'Class Teacher',
};

export const PRESETS = {
  royal: { label: 'Royal Gold', values: { ...BASE, preset: 'royal' } },
  emerald: {
    label: 'Emerald',
    values: { ...BASE, preset: 'emerald', primaryColor: '#065f46', accentColor: '#b8860b', backgroundColor: '#f7fdf9', borderStyle: 'double' },
  },
  crimson: {
    label: 'Crimson',
    values: { ...BASE, preset: 'crimson', primaryColor: '#7f1d1d', accentColor: '#c9a227', backgroundColor: '#fffaf5', borderStyle: 'classic' },
  },
  modern: {
    label: 'Modern',
    values: {
      ...BASE,
      preset: 'modern',
      primaryColor: '#4338ca',
      accentColor: '#06b6d4',
      backgroundColor: '#ffffff',
      borderStyle: 'modern',
      titleFont: 'sans',
      nameStyle: 'sans',
    },
  },
  minimal: {
    label: 'Minimal',
    values: {
      ...BASE,
      preset: 'minimal',
      primaryColor: '#111827',
      accentColor: '#9ca3af',
      backgroundColor: '#ffffff',
      borderStyle: 'none',
      titleFont: 'sans',
      nameStyle: 'serif',
      showWatermark: false,
    },
  },
};

export const defaultDesign = (primaryColor) => ({
  ...PRESETS.royal.values,
  ...(primaryColor ? { primaryColor } : {}),
});

export const mergeDesign = (design) => ({ ...BASE, ...(design || {}) });

export function renderText(text, variables) {
  return String(text || '').replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = variables?.[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

export const SAMPLE_VARIABLES = {
  studentName: 'Ali Raza',
  recipientName: 'Ali Raza',
  fatherName: 'Imran Raza',
  sonDaughter: 'son',
  heShe: 'he',
  schoolName: 'Your School Name',
  className: '10',
  section: 'A',
  classSection: '10 - A',
  session: '2026-2027',
  issueDate: '12 October 2026',
  validUntil: '',
  certificateNumber: 'CERT-2026-0001',
  courseName: 'Annual Sports Day',
  principalName: 'Principal Name',
  admissionNumber: 'ADM-1001',
  rollNumber: '1',
  employeeId: 'EMP-101',
  department: 'Academics',
  dob: '14 May 2010',
};

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

function absoluteSrc(src) {
  if (!src || /^(data:|blob:|https?:)/i.test(src)) return src;
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

const FONT = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: 'Arial, Helvetica, sans-serif',
  script: '"Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive',
};
const TEXT_MM = { s: 4.1, m: 4.7, l: 5.4 };

function Corner({ x, y, rotate, d }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path d="M0 0H20V1.3H1.3V20H0Z" fill={d.accentColor} />
      <path d="M3.2 3.2H14V4H4V14H3.2Z" fill={d.primaryColor} />
      <circle cx="6.4" cy="6.4" r="2" fill={d.primaryColor} />
      <circle cx="6.4" cy="6.4" r="0.8" fill={d.accentColor} />
    </g>
  );
}

function Border({ d, W, H }) {
  const style = d.borderStyle;
  if (style === 'ornate') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: `${W}mm`, height: `${H}mm` }}>
        <rect x="6" y="6" width={W - 12} height={H - 12} fill="none" stroke={d.accentColor} strokeWidth="1.6" />
        <rect x="9" y="9" width={W - 18} height={H - 18} fill="none" stroke={d.primaryColor} strokeWidth="0.5" />
        <Corner x={6} y={6} rotate={0} d={d} />
        <Corner x={W - 6} y={6} rotate={90} d={d} />
        <Corner x={W - 6} y={H - 6} rotate={180} d={d} />
        <Corner x={6} y={H - 6} rotate={270} d={d} />
      </svg>
    );
  }
  if (style === 'double') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: `${W}mm`, height: `${H}mm` }}>
        <rect x="7" y="7" width={W - 14} height={H - 14} fill="none" stroke={d.primaryColor} strokeWidth="1.4" />
        <rect x="10" y="10" width={W - 20} height={H - 20} fill="none" stroke={d.accentColor} strokeWidth="0.6" />
      </svg>
    );
  }
  if (style === 'classic') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: `${W}mm`, height: `${H}mm` }}>
        <rect x="8" y="8" width={W - 16} height={H - 16} fill="none" stroke={d.primaryColor} strokeWidth="2.4" />
        <rect x="11.5" y="11.5" width={W - 23} height={H - 23} fill="none" stroke={d.accentColor} strokeWidth="0.7" />
      </svg>
    );
  }
  if (style === 'modern') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: `${W}mm`, height: `${H}mm` }}>
        <rect x="0" y="0" width="16" height={H} fill={d.primaryColor} />
        <rect x="16" y="0" width="2.2" height={H} fill={d.accentColor} />
        <rect x="26" y="9" width={W - 35} height={H - 18} fill="none" stroke={d.primaryColor} strokeOpacity="0.25" strokeWidth="0.5" />
      </svg>
    );
  }
  return null;
}

function Seal({ d, logo, name }) {
  return (
    <div style={{ position: 'relative', width: '27mm', height: '27mm' }}>
      <svg viewBox="0 0 54 54" style={{ position: 'absolute', inset: 0, width: '27mm', height: '27mm' }}>
        <circle cx="27" cy="27" r="25" fill="#fff" stroke={d.accentColor} strokeWidth="1.6" />
        <circle cx="27" cy="27" r="21.5" fill="none" stroke={d.primaryColor} strokeWidth="0.6" strokeDasharray="1.2 1.2" />
        <circle cx="27" cy="27" r="17" fill="none" stroke={d.accentColor} strokeWidth="0.5" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {logo ? (
          <img src={logo} alt="" style={{ width: '15mm', height: '15mm', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontWeight: 800, fontSize: '6mm', color: d.primaryColor, fontFamily: FONT.serif }}>{initials(name)}</span>
        )}
      </div>
    </div>
  );
}

/**
 * cert: { title, text, recipientName, certificateNumber, issueDate, validUntil,
 *         signatoryName, designation, signatureImage, design }
 * school: { name, logo, address }   qr: data-URL of the verification QR (optional)
 */
export function CertificateView({ cert, school, qr, scale = 1 }) {
  // A design made in the free-form designer: drawn by the layout renderer instead.
  if (cert.design?.layout) {
    const today = formatDate(new Date());
    const vars = {
      ...(cert.variables || {}),
      schoolName: school?.name || '',
      schoolAddress: school?.address || '',
      schoolPhone: school?.phone || '',
      title: cert.title || '',
      certificateText: cert.text || '',
      recipientName: cert.recipientName || cert.variables?.recipientName || cert.variables?.studentName || '',
      certificateNumber: cert.certificateNumber || '',
      issueDate: formatDate(cert.issueDate),
      validUntil: formatDate(cert.validUntil),
      signatoryName: cert.signatoryName || '',
      designation: cert.designation || '',
      today,
      ...(cert.docVars || {}),
    };
    return (
      <LayoutPage
        layout={cert.design.layout}
        vars={vars}
        school={school}
        qr={qr}
        signatureImage={cert.signatureImage || ''}
        timetable={cert.timetable}
        fees={cert.fees}
        scale={scale}
      />
    );
  }
  const d = mergeDesign(cert.design);
  const { w: W, h: H } = CERT_SIZES[d.orientation] || CERT_SIZES.landscape;
  const landscape = W > H;
  const logo = school?.logo ? absoluteSrc(assetUrl(school.logo)) : '';
  const signature = cert.signatureImage || '';
  const sidePad = d.borderStyle === 'modern' ? { left: 34, right: 18 } : { left: 20, right: 20 };
  const textMm = TEXT_MM[d.textSize] || 4.7;
  const titleMm = landscape ? 12 : 11;
  const nameMm = d.nameStyle === 'script' ? (landscape ? 15 : 14) : landscape ? 11 : 10;

  const inner = (
    <div
      style={{
        position: 'relative',
        width: `${W}mm`,
        height: `${H}mm`,
        background: d.backgroundColor,
        color: d.textColor,
        overflow: 'hidden',
        fontFamily: FONT.serif,
        boxSizing: 'border-box',
        transform: scale === 1 ? undefined : `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      <Border d={d} W={W} H={H} />

      {d.showWatermark && logo ? (
        <img
          src={logo}
          alt=""
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: `${Math.min(W, H) * 0.5}mm`,
            height: `${Math.min(W, H) * 0.5}mm`,
            objectFit: 'contain',
            transform: 'translate(-50%, -50%)',
            opacity: 0.06,
          }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          top: '16mm',
          bottom: '15mm',
          left: `${sidePad.left}mm`,
          right: `${sidePad.right}mm`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4mm' }}>
          {d.showLogo && logo ? (
            <img src={logo} alt="" style={{ width: '18mm', height: '18mm', objectFit: 'contain' }} />
          ) : null}
          <div>
            <div
              style={{
                fontSize: landscape ? '6.4mm' : '6mm',
                fontWeight: 700,
                color: d.primaryColor,
                textTransform: 'uppercase',
                letterSpacing: '0.4mm',
                lineHeight: 1.15,
              }}
            >
              {school?.name}
            </div>
            {school?.address ? (
              <div style={{ fontSize: '2.7mm', color: '#64748b', marginTop: '0.8mm', fontFamily: FONT.sans }}>
                {school.address}
              </div>
            ) : null}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            marginTop: landscape ? '9mm' : '14mm',
            fontSize: `${titleMm}mm`,
            fontFamily: FONT[d.titleFont] || FONT.serif,
            fontWeight: 800,
            color: d.primaryColor,
            textTransform: d.titleFont === 'script' ? 'none' : 'uppercase',
            letterSpacing: d.titleFont === 'script' ? '0' : '0.8mm',
            lineHeight: 1.1,
          }}
        >
          {cert.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2mm', margin: '3mm 0' }}>
          <div style={{ width: '22mm', height: '0.5mm', background: d.accentColor }} />
          <div style={{ width: '2.6mm', height: '2.6mm', background: d.accentColor, transform: 'rotate(45deg)' }} />
          <div style={{ width: '22mm', height: '0.5mm', background: d.accentColor }} />
        </div>

        {d.showRecipientBlock ? (
          <>
            <div style={{ fontSize: '4.2mm', fontStyle: 'italic', color: '#64748b' }}>This is to certify that</div>
            <div
              style={{
                marginTop: '2mm',
                fontFamily: FONT[d.nameStyle] || FONT.serif,
                fontSize: `${nameMm}mm`,
                fontWeight: d.nameStyle === 'script' ? 400 : 700,
                fontStyle: d.nameStyle === 'serif' ? 'italic' : 'normal',
                color: d.textColor,
                lineHeight: 1.2,
                borderBottom: `0.5mm solid ${d.accentColor}`,
                padding: '0 10mm 1mm',
                minWidth: '70mm',
              }}
            >
              {cert.recipientName}
            </div>
          </>
        ) : null}

        <div
          style={{
            marginTop: d.showRecipientBlock ? '5mm' : '8mm',
            fontSize: `${textMm}mm`,
            lineHeight: 1.6,
            maxWidth: landscape ? '82%' : '90%',
            whiteSpace: 'pre-line',
          }}
        >
          {cert.text}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'end',
            gap: '4mm',
            fontFamily: FONT.sans,
            fontSize: '3mm',
          }}
        >
          <div style={{ textAlign: 'left', display: 'flex', gap: '3mm', alignItems: 'flex-end' }}>
            {d.showQr && qr ? (
              <div style={{ textAlign: 'center' }}>
                <img src={qr} alt="" style={{ width: '17mm', height: '17mm', display: 'block' }} />
                <div style={{ fontSize: '1.9mm', color: '#64748b' }}>Scan to verify</div>
              </div>
            ) : null}
            <div style={{ lineHeight: 1.55 }}>
              <div><span style={{ color: '#64748b' }}>Date of issue: </span><b>{formatDate(cert.issueDate)}</b></div>
              {cert.certificateNumber ? (
                <div><span style={{ color: '#64748b' }}>Certificate no: </span><b>{cert.certificateNumber}</b></div>
              ) : null}
              {cert.validUntil ? (
                <div><span style={{ color: '#64748b' }}>Valid until: </span><b>{formatDate(cert.validUntil)}</b></div>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {d.showSeal ? <Seal d={d} logo={logo} name={school?.name} /> : null}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8mm' }}>
            {d.secondSignatory ? (
              <div style={{ textAlign: 'center', minWidth: '34mm' }}>
                <div style={{ height: '14mm' }} />
                <div style={{ borderTop: `0.35mm solid ${d.textColor}`, paddingTop: '1mm', fontWeight: 700 }}>
                  {d.secondSignatoryLabel || 'Class Teacher'}
                </div>
              </div>
            ) : null}
            <div style={{ textAlign: 'center', minWidth: '40mm' }}>
              <div style={{ height: '14mm', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {signature ? (
                  <img src={signature} alt="" style={{ maxHeight: '14mm', maxWidth: '40mm', objectFit: 'contain' }} />
                ) : null}
              </div>
              <div style={{ borderTop: `0.35mm solid ${d.textColor}`, paddingTop: '1mm' }}>
                <div style={{ fontWeight: 700 }}>{cert.signatoryName || 'Authorised Signatory'}</div>
                {cert.designation ? <div style={{ color: '#64748b' }}>{cert.designation}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (scale === 1) return inner;
  // Reserve the scaled size so the layout around it is correct.
  return (
    <div style={{ width: `${W * scale}mm`, height: `${H * scale}mm`, overflow: 'hidden', flexShrink: 0 }}>{inner}</div>
  );
}

export default CertificateView;

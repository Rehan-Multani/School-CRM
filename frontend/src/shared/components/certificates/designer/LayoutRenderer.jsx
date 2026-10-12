import React from 'react';
import { assetUrl } from '../../../api/client';
import { FONT_STACKS, SAMPLE_FEES, SAMPLE_TIMETABLE, pageDimensions } from './layoutModel';

/**
 * Draws a designed page in millimetres. The designer canvas, the live preview and
 * the print sheet all use this one renderer, so what is designed is what prints.
 */

export function fillVariables(text, vars = {}) {
  return String(text || '').replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

function absoluteSrc(src) {
  if (!src || /^(data:|blob:|https?:)/i.test(src)) return src;
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const FREQ = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEARLY: 'Half-yearly', YEARLY: 'Yearly', ONE_TIME: 'One time' };

function ShapeBody({ el }) {
  const { w, h } = el;
  const sw = el.strokeWidth || 0;
  const fill = el.fill || 'none';
  const stroke = el.stroke || 'none';
  const inset = sw / 2;
  let node;
  if (el.shape === 'ellipse') {
    node = <ellipse cx={w / 2} cy={h / 2} rx={Math.max(0.1, w / 2 - inset)} ry={Math.max(0.1, h / 2 - inset)} fill={fill} stroke={stroke} strokeWidth={sw} />;
  } else if (el.shape === 'line') {
    node = <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={el.stroke || el.fill || '#111827'} strokeWidth={Math.max(sw, 0.2)} />;
  } else if (el.shape === 'diamond') {
    node = <polygon points={`${w / 2},${inset} ${w - inset},${h / 2} ${w / 2},${h - inset} ${inset},${h / 2}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
  } else if (el.shape === 'triangle') {
    node = <polygon points={`${w / 2},${inset} ${w - inset},${h - inset} ${inset},${h - inset}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
  } else {
    node = (
      <rect x={inset} y={inset} width={Math.max(0.1, w - sw)} height={Math.max(0.1, h - sw)} rx={Math.min(el.radius || 0, w / 2, h / 2)} fill={fill} stroke={stroke} strokeWidth={sw} />
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={`${w}mm`} height={`${h}mm`} style={{ display: 'block', overflow: 'visible' }} preserveAspectRatio="none">
      {node}
    </svg>
  );
}

function TimetableBody({ el, data }) {
  const d = data || SAMPLE_TIMETABLE;
  const cell = {
    border: `0.25mm solid ${el.borderColor}`,
    padding: `${el.padding}mm`,
    textAlign: 'center',
    verticalAlign: 'middle',
    fontSize: `${el.fontSize}pt`,
  };
  const days = d.days || [];
  const periods = d.periods || [];
  if (!periods.length) {
    return <div style={{ fontSize: `${el.fontSize}pt`, color: '#64748b', padding: '2mm' }}>No timetable has been set for this section yet.</div>;
  }
  return (
    <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontFamily: FONT_STACKS[el.fontFamily] || FONT_STACKS.sans, color: el.color, tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <th style={{ ...cell, background: el.headerBg, color: el.headerColor, width: '14%' }}>Day / Period</th>
          {periods.map((p) => (
            <th key={p.number} style={{ ...cell, background: el.headerBg, color: el.headerColor }}>
              <div>Period {p.number}</div>
              {el.showTime ? <div style={{ fontWeight: 400, fontSize: `${Math.max(4, el.fontSize - 2)}pt` }}>{p.start} – {p.end}</div> : null}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {days.map((day, i) => (
          <tr key={day.key} style={{ background: el.zebra && i % 2 === 1 ? el.zebraColor : 'transparent' }}>
            <td style={{ ...cell, fontWeight: 700 }}>{day.label}</td>
            {periods.map((p) => {
              const c = d.cells?.[`${day.key}-${p.number}`];
              return (
                <td key={p.number} style={cell}>
                  {c ? (
                    <>
                      <div style={{ fontWeight: 700 }}>{c.subject}</div>
                      {el.showTeacher && c.teacher ? <div style={{ fontSize: `${Math.max(4, el.fontSize - 2)}pt`, opacity: 0.8 }}>{c.teacher}</div> : null}
                      {el.showRoom && c.room ? <div style={{ fontSize: `${Math.max(4, el.fontSize - 2)}pt`, opacity: 0.7 }}>{c.room}</div> : null}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FeeBody({ el, data }) {
  const d = data || SAMPLE_FEES;
  const cell = { border: `0.25mm solid ${el.borderColor}`, padding: `${el.padding}mm`, fontSize: `${el.fontSize}pt`, verticalAlign: 'middle' };
  const items = (d.items || []).filter((i) => el.showOptional || !i.optional);
  if (!items.length) {
    return <div style={{ fontSize: `${el.fontSize}pt`, color: '#64748b', padding: '2mm' }}>No fee structure has been set for this class yet.</div>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT_STACKS[el.fontFamily] || FONT_STACKS.sans, color: el.color }}>
      <thead>
        <tr>
          <th style={{ ...cell, background: el.headerBg, color: el.headerColor, textAlign: 'left', width: '8%' }}>#</th>
          <th style={{ ...cell, background: el.headerBg, color: el.headerColor, textAlign: 'left' }}>Fee head</th>
          {el.showFrequency ? <th style={{ ...cell, background: el.headerBg, color: el.headerColor, textAlign: 'left' }}>Frequency</th> : null}
          <th style={{ ...cell, background: el.headerBg, color: el.headerColor, textAlign: 'right' }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={`${it.head}-${i}`} style={{ background: el.zebra && i % 2 === 1 ? el.zebraColor : 'transparent' }}>
            <td style={cell}>{i + 1}</td>
            <td style={cell}>
              {it.head}
              {it.optional ? <span style={{ opacity: 0.6 }}> (optional)</span> : null}
            </td>
            {el.showFrequency ? <td style={cell}>{FREQ[it.frequency] || it.frequency}</td> : null}
            <td style={{ ...cell, textAlign: 'right' }}>{money(it.amount)}</td>
          </tr>
        ))}
        {el.showTotal ? (
          <tr style={{ fontWeight: 800 }}>
            <td style={cell} colSpan={el.showFrequency ? 3 : 2}>Total (excluding optional fees)</td>
            <td style={{ ...cell, textAlign: 'right' }}>{money(d.total)}</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

/** One element's contents (the box itself is positioned by the caller). */
export function ElementBody({ el, vars, school, qr, signatureImage, timetable, fees, designMode = false }) {
  if (el.type === 'text') {
    const justify = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[el.valign] || 'flex-start';
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: justify,
          boxSizing: 'border-box',
          padding: `${el.padding || 0}mm`,
          background: el.background || 'transparent',
          border: el.borderWidth && el.borderColor ? `${el.borderWidth}mm solid ${el.borderColor}` : undefined,
          borderRadius: el.radius ? `${el.radius}mm` : undefined,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontFamily: FONT_STACKS[el.fontFamily] || FONT_STACKS.serif,
            fontSize: `${el.fontSize}pt`,
            fontWeight: el.bold ? 700 : 400,
            fontStyle: el.italic ? 'italic' : 'normal',
            textDecoration: el.underline ? 'underline' : 'none',
            textTransform: el.uppercase ? 'uppercase' : 'none',
            textAlign: el.align,
            lineHeight: el.lineHeight,
            letterSpacing: `${el.letterSpacing || 0}pt`,
            color: el.color,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {fillVariables(el.text, vars)}
        </div>
      </div>
    );
  }
  if (el.type === 'image') {
    let src = el.src;
    if (src === 'SCHOOL_LOGO') src = school?.logo ? absoluteSrc(assetUrl(school.logo)) : '';
    else if (src === 'SIGNATURE') src = signatureImage || '';
    if (!src) {
      // An empty slot is only drawn while designing; printed pages stay clean.
      if (!designMode) return null;
      return (
        <div style={{ width: '100%', height: '100%', border: '0.3mm dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '3mm', fontFamily: FONT_STACKS.sans }}>
          {el.src === 'SIGNATURE' ? 'Signature' : el.src === 'SCHOOL_LOGO' ? 'Logo' : 'Image'}
        </div>
      );
    }
    return <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: el.fit, borderRadius: el.radius ? `${el.radius}mm` : undefined, display: 'block' }} />;
  }
  if (el.type === 'shape') return <ShapeBody el={el} />;
  if (el.type === 'qr') {
    return qr ? (
      <img src={qr} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
    ) : (
      <div style={{ width: '100%', height: '100%', border: '0.3mm solid #111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_STACKS.sans, fontSize: '2.6mm', color: '#111827', background: 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 1mm,#fff 1mm,#fff 2mm)' }}>
        QR
      </div>
    );
  }
  if (el.type === 'timetable') return <TimetableBody el={el} data={timetable} />;
  if (el.type === 'feeTable') return <FeeBody el={el} data={fees} />;
  return null;
}

export function boxStyle(el) {
  return {
    position: 'absolute',
    left: `${el.x}mm`,
    top: `${el.y}mm`,
    width: `${el.w}mm`,
    height: `${el.h}mm`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    transformOrigin: 'center center',
    opacity: el.opacity,
  };
}

/**
 * layout: { page, elements }. `vars` fills {{variables}}. `scale` shrinks the
 * whole page for on-screen previews (print uses scale 1).
 */
export function LayoutPage({ layout, vars, school, qr, signatureImage, timetable, fees, scale = 1 }) {
  const { w, h } = pageDimensions(layout?.page);
  const page = layout?.page || {};
  const elements = (layout?.elements || []).filter((el) => !el.hidden);
  const inner = (
    <div
      style={{
        position: 'relative',
        width: `${w}mm`,
        height: `${h}mm`,
        background: page.background || '#ffffff',
        backgroundImage: page.backgroundImage ? `url(${page.backgroundImage})` : undefined,
        backgroundSize: '100% 100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transform: scale === 1 ? undefined : `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {elements.map((el) => (
        <div key={el.id} style={boxStyle(el)}>
          <ElementBody el={el} vars={vars} school={school} qr={qr} signatureImage={signatureImage} timetable={timetable} fees={fees} />
        </div>
      ))}
    </div>
  );
  if (scale === 1) return inner;
  return <div style={{ width: `${w * scale}mm`, height: `${h * scale}mm`, overflow: 'hidden', flexShrink: 0 }}>{inner}</div>;
}

export default LayoutPage;

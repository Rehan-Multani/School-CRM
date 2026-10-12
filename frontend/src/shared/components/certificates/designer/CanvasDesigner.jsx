import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignLeft, AlignRight,
  AlignStartHorizontal, AlignStartVertical, BringToFront, Bold, CalendarDays, Circle, Copy, Diamond, Eye, EyeOff,
  Grid3x3, Image as ImageIcon, Italic, Layers, Lock, Magnet, Minus, Plus, QrCode, Redo2, Save, SendToBack, Square, Table2, Trash2,
  Triangle, Type, Underline, Undo2, Unlock, Wallet, X, ZoomIn, ZoomOut, Maximize, LayoutTemplate, Variable, Upload,
} from 'lucide-react';
import { ElementBody, boxStyle } from './LayoutRenderer';
import {
  DOC_VARIABLES, ELEMENT_LABEL, FONT_OPTIONS, PAGE_SIZES, SAMPLE, STARTERS, buildStarter, newElement, newId, pageDimensions,
} from './layoutModel';

const PX_PER_MM = 3.7795;
const HISTORY_LIMIT = 80;
const SNAP_PX = 6;

const field =
  'h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';
const label = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400';
const iconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent';
const chip =
  'rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100';

const clone = (v) => JSON.parse(JSON.stringify(v));
const r2 = (n) => Math.round(n * 100) / 100;

/** Reads an image file, shrinks it, and returns a data URI small enough for the backend. */
function readImage(file, maxDim = 1400) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      reject(new Error('Use a PNG, JPG or WEBP image.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not open the image.'));
      img.onload = () => {
        const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const keepAlpha = /png|webp/i.test(file.type);
        let out = keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.88);
        for (let q = 0.8; out.length > 560000 && q > 0.3; q -= 0.1) out = canvas.toDataURL('image/jpeg', q);
        if (out.length > 580000) reject(new Error('That image is too large. Try a smaller one.'));
        else resolve(out);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function Num({ value, onChange, step = 1, min, max, suffix }) {
  return (
    <div className="relative">
      <input
        type="number"
        className={field}
        value={Number.isFinite(value) ? value : ''}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
      {suffix ? <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">{suffix}</span> : null}
    </div>
  );
}

function ColorField({ value, onChange, allowNone = false }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value || '') ? value : '#ffffff'}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-9 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
      />
      <input className={field} value={value || ''} placeholder={allowNone ? 'none' : '#000000'} onChange={(e) => onChange(e.target.value)} />
      {allowNone && value ? (
        <button type="button" className="text-[10px] font-bold text-rose-500" onClick={() => onChange('')}>
          none
        </button>
      ) : null}
    </div>
  );
}

function Toggle({ on, onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-bold transition ${
        on ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="border-b border-slate-100 px-3 py-3">
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{title}</div>
      {children}
    </div>
  );
}

const TYPE_ICON = { text: Type, image: ImageIcon, shape: Square, qr: QrCode, timetable: CalendarDays, feeTable: Wallet };

export default function CanvasDesigner({ initialLayout, school, docKind = 'CERTIFICATE', signatureImage = '', onApply, onClose }) {
  const [layout, setLayout] = useState(() => clone(initialLayout || buildStarter('certificate-classic', { primary: school?.primaryColor })));
  const [sel, setSel] = useState([]);
  const [zoom, setZoom] = useState(0.55);
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [preview, setPreview] = useState(false);
  const [editing, setEditing] = useState(null);
  const [guides, setGuides] = useState([]);
  const [leftTab, setLeftTab] = useState('add');
  const [error, setError] = useState('');
  const [hist, setHist] = useState({ u: 0, r: 0 });
  const bump = useCallback(() => setHist({ u: past.current.length, r: future.current.length }), []);

  const past = useRef([]);
  const future = useRef([]);
  const clipboard = useRef([]);
  const layoutRef = useRef(layout);
  const selRef = useRef(sel);
  useEffect(() => {
    layoutRef.current = layout;
    selRef.current = sel;
  });
  const stageRef = useRef(null);
  const fileRef = useRef(null);
  const fileTarget = useRef(null);

  const { w: PW, h: PH } = pageDimensions(layout.page);
  const scalePx = PX_PER_MM * zoom;

  /* ------------------------------ history ------------------------------ */
  const commit = useCallback((next) => {
    past.current.push(clone(layoutRef.current));
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    // eslint-disable-next-line react-hooks/immutability
    future.current.length = 0;
    setLayout(next);
    bump();
  }, []);

  const undo = useCallback(() => {
    if (!past.current.length) return;
    future.current.push(clone(layoutRef.current));
    setLayout(past.current.pop());
    bump();
  }, []);
  const redo = useCallback(() => {
    if (!future.current.length) return;
    past.current.push(clone(layoutRef.current));
    setLayout(future.current.pop());
    bump();
  }, []);

  const elements = layout.elements;
  const selected = elements.filter((e) => sel.includes(e.id));
  const one = selected.length === 1 ? selected[0] : null;

  const mapSelected = (fn) =>
    commit({ ...layoutRef.current, elements: layoutRef.current.elements.map((e) => (selRef.current.includes(e.id) && !e.locked ? fn(e) : e)) });
  const patchOne = (patch) => mapSelected((e) => ({ ...e, ...patch }));

  const addElement = (type, overrides = {}) => {
    const el = newElement(type, overrides);
    const { w, h } = pageDimensions(layoutRef.current.page);
    el.x = r2(Math.max(0, (w - el.w) / 2));
    el.y = r2(Math.max(0, Math.min(h - el.h, h * 0.3)));
    commit({ ...layoutRef.current, elements: [...layoutRef.current.elements, el] });
    setSel([el.id]);
    return el;
  };

  const removeSelected = useCallback(() => {
    const ids = selRef.current;
    if (!ids.length) return;
    commit({ ...layoutRef.current, elements: layoutRef.current.elements.filter((e) => !ids.includes(e.id) || e.locked) });
    setSel([]);
  }, [commit]);

  const duplicate = useCallback(() => {
    const src = layoutRef.current.elements.filter((e) => selRef.current.includes(e.id));
    if (!src.length) return;
    const copies = src.map((e) => ({ ...clone(e), id: newId(), x: r2(e.x + 5), y: r2(e.y + 5), locked: false }));
    commit({ ...layoutRef.current, elements: [...layoutRef.current.elements, ...copies] });
    setSel(copies.map((c) => c.id));
  }, [commit]);

  const order = (dir) => {
    const list = [...layoutRef.current.elements];
    const ids = selRef.current;
    if (dir === 'front') {
      const moved = list.filter((e) => ids.includes(e.id));
      commit({ ...layoutRef.current, elements: [...list.filter((e) => !ids.includes(e.id)), ...moved] });
    } else if (dir === 'back') {
      const moved = list.filter((e) => ids.includes(e.id));
      commit({ ...layoutRef.current, elements: [...moved, ...list.filter((e) => !ids.includes(e.id))] });
    } else if (dir === 'up') {
      for (let i = list.length - 2; i >= 0; i -= 1) {
        if (ids.includes(list[i].id) && !ids.includes(list[i + 1].id)) [list[i], list[i + 1]] = [list[i + 1], list[i]];
      }
      commit({ ...layoutRef.current, elements: list });
    } else {
      for (let i = 1; i < list.length; i += 1) {
        if (ids.includes(list[i].id) && !ids.includes(list[i - 1].id)) [list[i], list[i - 1]] = [list[i - 1], list[i]];
      }
      commit({ ...layoutRef.current, elements: list });
    }
  };

  const align = (mode) => {
    const els = layoutRef.current.elements.filter((e) => selRef.current.includes(e.id));
    if (!els.length) return;
    const box =
      els.length > 1
        ? {
            x1: Math.min(...els.map((e) => e.x)), y1: Math.min(...els.map((e) => e.y)),
            x2: Math.max(...els.map((e) => e.x + e.w)), y2: Math.max(...els.map((e) => e.y + e.h)),
          }
        : { x1: 0, y1: 0, x2: PW, y2: PH };
    mapSelected((e) => {
      switch (mode) {
        case 'left': return { ...e, x: r2(box.x1) };
        case 'right': return { ...e, x: r2(box.x2 - e.w) };
        case 'centerH': return { ...e, x: r2((box.x1 + box.x2) / 2 - e.w / 2) };
        case 'top': return { ...e, y: r2(box.y1) };
        case 'bottom': return { ...e, y: r2(box.y2 - e.h) };
        default: return { ...e, y: r2((box.y1 + box.y2) / 2 - e.h / 2) };
      }
    });
  };

  /* --------------------------- keyboard shortcuts --------------------------- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = String(e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && key === 'y') { e.preventDefault(); redo(); return; }
      if (mod && key === 'd') { e.preventDefault(); duplicate(); return; }
      if (mod && key === 'a') { e.preventDefault(); setSel(layoutRef.current.elements.filter((x) => !x.locked && !x.hidden).map((x) => x.id)); return; }
      if (mod && key === 'c') {
        clipboard.current = clone(layoutRef.current.elements.filter((x) => selRef.current.includes(x.id)));
        return;
      }
      if (mod && key === 'v' && clipboard.current.length) {
        e.preventDefault();
        const copies = clipboard.current.map((x) => ({ ...clone(x), id: newId(), x: r2(x.x + 6), y: r2(x.y + 6) }));
        commit({ ...layoutRef.current, elements: [...layoutRef.current.elements, ...copies] });
        setSel(copies.map((c) => c.id));
        return;
      }
      if (key === 'delete' || key === 'backspace') { e.preventDefault(); removeSelected(); return; }
      if (key === 'escape') { setSel([]); setEditing(null); return; }
      if (key.startsWith('arrow') && selRef.current.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
        const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
        mapSelected((x) => ({ ...x, x: r2(x.x + dx), y: r2(x.y + dy) }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, duplicate, removeSelected, commit]);

  /* ------------------------------ pointer work ------------------------------ */
  const drag = useRef(null);
  const [dragging, setDragging] = useState(false);

  const snapLines = useCallback(
    (movingIds) => {
      const xs = [0, PW / 2, PW];
      const ys = [0, PH / 2, PH];
      layoutRef.current.elements.forEach((e) => {
        if (movingIds.includes(e.id) || e.hidden) return;
        xs.push(e.x, e.x + e.w / 2, e.x + e.w);
        ys.push(e.y, e.y + e.h / 2, e.y + e.h);
      });
      return { xs, ys };
    },
    [PW, PH]
  );

  const beginDrag = (ev, el) => {
    if (preview || editing === el.id) return;
    ev.stopPropagation();
    let ids = selRef.current;
    if (ev.shiftKey) {
      ids = ids.includes(el.id) ? ids.filter((i) => i !== el.id) : [...ids, el.id];
      setSel(ids);
      return;
    }
    if (!ids.includes(el.id)) {
      ids = [el.id];
      setSel(ids);
    }
    if (el.locked) return;
    const start = clone(layoutRef.current);
    const origin = Object.fromEntries(start.elements.filter((e) => ids.includes(e.id)).map((e) => [e.id, { x: e.x, y: e.y, w: e.w, h: e.h }]));
    drag.current = { kind: 'move', sx: ev.clientX, sy: ev.clientY, start, origin, ids, moved: false };
    attach();
  };

  const beginResize = (ev, el, handle) => {
    ev.stopPropagation();
    const start = clone(layoutRef.current);
    drag.current = {
      kind: 'resize', handle, sx: ev.clientX, sy: ev.clientY, start, id: el.id,
      origin: { x: el.x, y: el.y, w: el.w, h: el.h }, moved: false,
    };
    attach();
  };

  const beginRotate = (ev, el) => {
    ev.stopPropagation();
    const rect = stageRef.current.getBoundingClientRect();
    const cx = rect.left + (el.x + el.w / 2) * scalePx;
    const cy = rect.top + (el.y + el.h / 2) * scalePx;
    drag.current = { kind: 'rotate', start: clone(layoutRef.current), id: el.id, cx, cy, moved: false };
    attach();
  };

  const onMove = useCallback(
    (ev) => {
      const d = drag.current;
      if (!d) return;
      if (d.kind === 'rotate') {
        let deg = (Math.atan2(ev.clientY - d.cy, ev.clientX - d.cx) * 180) / Math.PI + 90;
        if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
        deg = Math.round(((deg + 540) % 360) - 180);
        d.moved = true;
        setLayout({ ...d.start, elements: d.start.elements.map((e) => (e.id === d.id ? { ...e, rotation: deg } : e)) });
        return;
      }
      const dx = (ev.clientX - d.sx) / scalePx;
      const dy = (ev.clientY - d.sy) / scalePx;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 0.3) return;
      d.moved = true;
      const thr = SNAP_PX / scalePx;

      if (d.kind === 'move') {
        let mx = dx;
        let my = dy;
        const first = d.origin[d.ids[0]];
        const found = [];
        if (snap && !ev.altKey) {
          const { xs, ys } = snapLines(d.ids);
          const cand = (a, lines) => {
            let best = null;
            for (const edge of a) for (const line of lines) {
              const diff = line - edge;
              if (Math.abs(diff) <= thr && (best === null || Math.abs(diff) < Math.abs(best.diff))) best = { diff, line };
            }
            return best;
          };
          const nx = first.x + dx;
          const ny = first.y + dy;
          const bx = cand([nx, nx + first.w / 2, nx + first.w], xs);
          const by = cand([ny, ny + first.h / 2, ny + first.h], ys);
          if (bx) { mx += bx.diff; found.push({ axis: 'x', at: bx.line }); }
          if (by) { my += by.diff; found.push({ axis: 'y', at: by.line }); }
        }
        setGuides(found);
        setLayout({
          ...d.start,
          elements: d.start.elements.map((e) => (d.ids.includes(e.id) && !e.locked ? { ...e, x: r2(d.origin[e.id].x + mx), y: r2(d.origin[e.id].y + my) } : e)),
        });
        return;
      }

      // resize
      const { handle, origin } = d;
      let { x, y, w, h } = origin;
      const keep = ev.shiftKey && handle.length === 2;
      if (handle.includes('e')) w = origin.w + dx;
      if (handle.includes('s')) h = origin.h + dy;
      if (handle.includes('w')) { w = origin.w - dx; x = origin.x + dx; }
      if (handle.includes('n')) { h = origin.h - dy; y = origin.y + dy; }
      if (keep) {
        const ratio = origin.w / origin.h;
        if (Math.abs(w - origin.w) > Math.abs(h - origin.h)) {
          const nh = w / ratio;
          if (handle.includes('n')) y = origin.y + origin.h - nh;
          h = nh;
        } else {
          const nw = h * ratio;
          if (handle.includes('w')) x = origin.x + origin.w - nw;
          w = nw;
        }
      }
      if (w < 2) { if (handle.includes('w')) x -= 2 - w; w = 2; }
      if (h < 1) { if (handle.includes('n')) y -= 1 - h; h = 1; }
      setLayout({ ...d.start, elements: d.start.elements.map((e) => (e.id === d.id ? { ...e, x: r2(x), y: r2(y), w: r2(w), h: r2(h) } : e)) });
    },
    [scalePx, snap, snapLines]
  );

  const onUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    setGuides([]);
    if (d?.moved) {
      past.current.push(d.start);
      if (past.current.length > HISTORY_LIMIT) past.current.shift();
      // eslint-disable-next-line react-hooks/immutability
      future.current.length = 0;
      bump();
    }
  }, [bump]);

  // Window listeners exist only while a drag is running.
  useEffect(() => {
    if (!dragging) return undefined;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, onMove, onUp]);

  function attach() {
    setDragging(true);
  }

  /* -------------------------------- uploads -------------------------------- */
  const pickImage = (target) => {
    fileTarget.current = target;
    fileRef.current?.click();
  };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUri = await readImage(file, fileTarget.current === 'page' ? 2200 : 1400);
      setError('');
      if (fileTarget.current === 'page') {
        commit({ ...layoutRef.current, page: { ...layoutRef.current.page, backgroundImage: dataUri } });
      } else if (fileTarget.current === 'new') {
        addElement('image', { src: dataUri, w: 50, h: 38 });
      } else if (fileTarget.current === 'replace') {
        patchOne({ src: dataUri });
      }
    } catch (err) {
      setError(err.message || 'Could not use that image.');
    }
  };

  /* ------------------------------- variables ------------------------------- */
  const insertVariable = (key) => {
    const token = `{{${key}}}`;
    if (one && one.type === 'text') {
      patchOne({ text: `${one.text}${one.text && !/\s$/.test(one.text) ? ' ' : ''}${token}` });
    } else {
      addElement('text', { text: token, w: 70, h: 10 });
    }
  };

  const vars = useMemo(() => {
    const base = {
      ...SAMPLE,
      schoolName: school?.name || SAMPLE.schoolName,
      schoolAddress: school?.address || SAMPLE.schoolAddress,
      schoolPhone: school?.phone || SAMPLE.schoolPhone,
    };
    if (showTokens && !preview) return new Proxy({}, { get: (_, k) => `{{${String(k)}}}` });
    return base;
  }, [school, showTokens, preview]);

  const variableList = DOC_VARIABLES.filter(([, , g]) => g === 'ALL' || (docKind === 'CERTIFICATE' ? g === 'CERTIFICATE' : g === 'DOC'));

  /* --------------------------------- zoom ---------------------------------- */
  const fit = useCallback(() => {
    const box = stageRef.current?.parentElement?.parentElement;
    if (!box) return;
    const aw = box.clientWidth - 64;
    const ah = box.clientHeight - 64;
    setZoom(Math.max(0.2, Math.min(2, Math.min(aw / (PW * PX_PER_MM), ah / (PH * PX_PER_MM)))));
  }, [PW, PH]);
  useEffect(() => {
    const id = setTimeout(fit, 60);
    return () => clearTimeout(id);
  }, [fit]);

  const setPage = (patch) => commit({ ...layoutRef.current, page: { ...layoutRef.current.page, ...patch } });

  const applyStarter = (key) => {
    if (elements.length && !window.confirm('Replace the current design with this starter? You can undo it.')) return;
    commit(buildStarter(key, { primary: school?.primaryColor }));
    setSel([]);
  };

  const save = () => {
    onApply(clone(layoutRef.current));
  };

  /* --------------------------------- UI ---------------------------------- */
  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const handlePos = {
    nw: { l: 0, t: 0, c: 'nwse-resize' }, n: { l: 0.5, t: 0, c: 'ns-resize' }, ne: { l: 1, t: 0, c: 'nesw-resize' },
    e: { l: 1, t: 0.5, c: 'ew-resize' }, se: { l: 1, t: 1, c: 'nwse-resize' }, s: { l: 0.5, t: 1, c: 'ns-resize' },
    sw: { l: 0, t: 1, c: 'nesw-resize' }, w: { l: 0, t: 0.5, c: 'ew-resize' },
  };
  const px = (n) => `${n / zoom / PX_PER_MM}mm`; // n screen pixels, expressed inside the scaled page

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-100 text-slate-800">
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />

      {/* top bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-2">
        <div className="mr-2 text-sm font-extrabold text-slate-900">Designer</div>
        <button type="button" className={iconBtn} title="Undo (Ctrl+Z)" onClick={undo} disabled={!hist.u}><Undo2 className="h-4 w-4" /></button>
        <button type="button" className={iconBtn} title="Redo (Ctrl+Y)" onClick={redo} disabled={!hist.r}><Redo2 className="h-4 w-4" /></button>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <button type="button" className={iconBtn} title="Zoom out" onClick={() => setZoom((z) => Math.max(0.2, r2(z - 0.1)))}><ZoomOut className="h-4 w-4" /></button>
        <span className="w-10 text-center text-xs font-bold text-slate-500">{Math.round(zoom * 100)}%</span>
        <button type="button" className={iconBtn} title="Zoom in" onClick={() => setZoom((z) => Math.min(2.5, r2(z + 0.1)))}><ZoomIn className="h-4 w-4" /></button>
        <button type="button" className={iconBtn} title="Fit to screen" onClick={fit}><Maximize className="h-4 w-4" /></button>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <Toggle on={snap} onClick={() => setSnap((v) => !v)} title="Snap to guides and edges (hold Alt to bypass)"><Magnet className="mr-1 h-3.5 w-3.5" />Snap</Toggle>
        <Toggle on={grid} onClick={() => setGrid((v) => !v)} title="Show grid"><Grid3x3 className="mr-1 h-3.5 w-3.5" />Grid</Toggle>
        <Toggle on={showTokens} onClick={() => setShowTokens((v) => !v)} title="Show {{variable}} names instead of sample values"><Variable className="mr-1 h-3.5 w-3.5" />Variables</Toggle>
        <Toggle on={preview} onClick={() => { setPreview((v) => !v); setSel([]); }} title="Preview without handles">
          {preview ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}Preview
        </Toggle>

        {sel.length > 0 && !preview ? (
          <>
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <button type="button" className={iconBtn} title="Align left" onClick={() => align('left')}><AlignStartVertical className="h-4 w-4" /></button>
            <button type="button" className={iconBtn} title="Center horizontally" onClick={() => align('centerH')}><AlignCenterVertical className="h-4 w-4" /></button>
            <button type="button" className={iconBtn} title="Align right" onClick={() => align('right')}><AlignEndVertical className="h-4 w-4" /></button>
            <button type="button" className={iconBtn} title="Align top" onClick={() => align('top')}><AlignStartHorizontal className="h-4 w-4" /></button>
            <button type="button" className={iconBtn} title="Center vertically" onClick={() => align('middle')}><AlignCenterHorizontal className="h-4 w-4" /></button>
            <button type="button" className={iconBtn} title="Align bottom" onClick={() => align('bottom')}><AlignEndHorizontal className="h-4 w-4" /></button>
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <button type="button" className={iconBtn} title="Bring to front" onClick={() => order('front')}><BringToFront className="h-4 w-4" /></button>
            <button type="button" className={iconBtn} title="Send to back" onClick={() => order('back')}><SendToBack className="h-4 w-4" /></button>
            <button type="button" className={iconBtn} title="Duplicate (Ctrl+D)" onClick={duplicate}><Copy className="h-4 w-4" /></button>
            <button type="button" className={`${iconBtn} text-rose-600`} title="Delete (Del)" onClick={removeSelected}><Trash2 className="h-4 w-4" /></button>
          </>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={onClose}>
            Close
          </button>
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700" onClick={save}>
            <Save className="h-4 w-4" /> Apply design
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-between bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600">
          {error}
          <button type="button" onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* left panel */}
        {!preview ? (
          <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
            <div className="grid grid-cols-4 border-b border-slate-100 text-[11px] font-bold">
              {[['add', 'Add', Plus], ['vars', 'Fields', Variable], ['layers', 'Layers', Layers], ['starters', 'Starters', LayoutTemplate]].map(([key, text, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLeftTab(key)}
                  className={`flex flex-col items-center gap-0.5 py-2 ${leftTab === key ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500'}`}
                >
                  <Icon className="h-4 w-4" />
                  {text}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {leftTab === 'add' ? (
                <div className="space-y-4 p-3">
                  <div>
                    <div className={label}>Text</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className="rounded-xl border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50" onClick={() => addElement('text', { text: 'Heading', fontSize: 28, bold: true, w: 120, h: 14, fontFamily: 'serif' })}>
                        <Type className="mb-1 h-4 w-4 text-indigo-600" />Heading
                      </button>
                      <button type="button" className="rounded-xl border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50" onClick={() => addElement('text', { text: 'Write your text here', fontSize: 13, w: 90, h: 16 })}>
                        <Type className="mb-1 h-4 w-4 text-slate-500" />Paragraph
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className={label}>Images</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className="rounded-xl border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50" onClick={() => pickImage('new')}>
                        <Upload className="mb-1 h-4 w-4 text-indigo-600" />Upload image
                      </button>
                      <button type="button" className="rounded-xl border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50" onClick={() => addElement('image', { src: 'SCHOOL_LOGO', w: 28, h: 28 })}>
                        <ImageIcon className="mb-1 h-4 w-4 text-indigo-600" />School logo
                      </button>
                      <button type="button" className="rounded-xl border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50" onClick={() => addElement('qr')}>
                        <QrCode className="mb-1 h-4 w-4 text-indigo-600" />Verify QR
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className={label}>Shapes</div>
                    <div className="grid grid-cols-5 gap-2">
                      {[['rect', Square], ['ellipse', Circle], ['line', Minus], ['diamond', Diamond], ['triangle', Triangle]].map(([shape, Icon]) => (
                        <button
                          key={shape}
                          type="button"
                          title={shape}
                          className="flex h-10 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
                          onClick={() => addElement('shape', shape === 'line' ? { shape, w: 80, h: 1, stroke: '#111827', fill: '', strokeWidth: 0.6 } : { shape })}
                        >
                          <Icon className="h-4 w-4 text-slate-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className={label}>Data tables</div>
                    <div className="space-y-2">
                      <button type="button" className="flex w-full items-center gap-2 rounded-xl border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50" onClick={() => addElement('timetable', { w: Math.min(PW - 20, 250), h: 110 })}>
                        <Table2 className="h-4 w-4 text-indigo-600" />Timetable table
                      </button>
                      <button type="button" className="flex w-full items-center gap-2 rounded-xl border border-slate-200 p-3 text-left text-xs font-bold hover:bg-slate-50" onClick={() => addElement('feeTable', { w: Math.min(PW - 20, 170), h: 90 })}>
                        <Wallet className="h-4 w-4 text-indigo-600" />Fee structure table
                      </button>
                      <p className="text-[10px] leading-snug text-slate-400">Tables fill with the class or section you choose when you print.</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {leftTab === 'vars' ? (
                <div className="p-3">
                  <p className="mb-2 text-[11px] leading-snug text-slate-500">
                    Click a field to add it to the selected text (or as a new text box). It is filled automatically for each person / class.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {variableList.map(([key, text]) => (
                      <button key={key} type="button" title={text} className={chip} onClick={() => insertVariable(key)}>
                        {`{{${key}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {leftTab === 'layers' ? (
                <ul className="p-2">
                  {elements.length === 0 ? <li className="p-3 text-xs text-slate-400">Nothing here yet. Add something from the Add tab.</li> : null}
                  {[...elements].reverse().map((el) => {
                    const Icon = TYPE_ICON[el.type] || Square;
                    const active = sel.includes(el.id);
                    return (
                      <li key={el.id}>
                        <div
                          className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs ${active ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`}
                        >
                          <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={(e) => setSel(e.shiftKey ? [...new Set([...sel, el.id])] : [el.id])}>
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate font-semibold">
                              {el.name || (el.type === 'text' ? String(el.text || 'Text').slice(0, 26) : ELEMENT_LABEL[el.type])}
                            </span>
                          </button>
                          <button type="button" title={el.hidden ? 'Show' : 'Hide'} className="text-slate-400 hover:text-slate-700" onClick={() => commit({ ...layout, elements: elements.map((x) => (x.id === el.id ? { ...x, hidden: !x.hidden } : x)) })}>
                            {el.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button type="button" title={el.locked ? 'Unlock' : 'Lock'} className="text-slate-400 hover:text-slate-700" onClick={() => commit({ ...layout, elements: elements.map((x) => (x.id === el.id ? { ...x, locked: !x.locked } : x)) })}>
                            {el.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {leftTab === 'starters' ? (
                <div className="space-y-2 p-3">
                  <p className="text-[11px] leading-snug text-slate-500">Start from a ready layout, then change anything.</p>
                  {STARTERS.map((s) => (
                    <button key={s.key} type="button" className="w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50" onClick={() => applyStarter(s.key)}>
                      <div className="text-xs font-extrabold text-slate-800">{s.label}</div>
                      <div className="text-[10px] text-slate-400">
                        {s.page.orientation === 'landscape' ? 'Landscape' : 'Portrait'} · {s.kind === 'ANY' ? 'empty' : s.kind.toLowerCase().replace('_', ' ')}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}

        {/* canvas */}
        <main
          className="min-w-0 flex-1 overflow-auto"
          onPointerDown={() => {
            if (!preview) { setSel([]); setEditing(null); }
          }}
        >
          <div className="flex min-h-full min-w-full items-start justify-center p-8">
            <div style={{ width: PW * scalePx, height: PH * scalePx, flexShrink: 0 }} className="relative shadow-2xl">
              <div
                ref={stageRef}
                style={{ width: `${PW}mm`, height: `${PH}mm`, transform: `scale(${zoom})`, transformOrigin: 'top left', position: 'absolute', left: 0, top: 0 }}
              >
                <div
                  style={{
                    position: 'absolute', inset: 0, background: layout.page.background || '#fff',
                    backgroundImage: layout.page.backgroundImage ? `url(${layout.page.backgroundImage})` : undefined, backgroundSize: '100% 100%',
                  }}
                />
                {grid && !preview ? (
                  <div
                    style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35,
                      backgroundImage: 'linear-gradient(#94a3b8 0.15mm, transparent 0.15mm), linear-gradient(90deg, #94a3b8 0.15mm, transparent 0.15mm)',
                      backgroundSize: '10mm 10mm',
                    }}
                  />
                ) : null}

                {elements.map((el) => {
                  if (el.hidden) return null;
                  const active = sel.includes(el.id) && !preview;
                  return (
                    <div
                      key={el.id}
                      style={{ ...boxStyle(el), cursor: preview ? 'default' : el.locked ? 'not-allowed' : 'move', touchAction: 'none' }}
                      onPointerDown={(e) => !preview && beginDrag(e, el)}
                      onDoubleClick={(e) => {
                        if (preview || el.locked) return;
                        e.stopPropagation();
                        if (el.type === 'text') setEditing(el.id);
                        else if (el.type === 'image' && el.src !== 'SCHOOL_LOGO' && el.src !== 'SIGNATURE') pickImage('replace');
                      }}
                    >
                      <ElementBody el={el} vars={vars} school={school} signatureImage={signatureImage} designMode />
                      {!preview ? (
                        <div
                          style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none',
                            outline: active ? `${px(2)} solid #4f46e5` : undefined,
                          }}
                        />
                      ) : null}
                      {editing === el.id ? (
                        <textarea
                          autoFocus
                          value={el.text}
                          onPointerDown={(e) => e.stopPropagation()}
                          onChange={(e) => setLayout({ ...layoutRef.current, elements: layoutRef.current.elements.map((x) => (x.id === el.id ? { ...x, text: e.target.value } : x)) })}
                          onFocus={() => { past.current.push(clone(layoutRef.current)); future.current.length = 0; }}
                          onBlur={() => { setEditing(null); bump(); }}
                          style={{
                            position: 'absolute', inset: 0, width: '100%', height: '100%', resize: 'none', outline: '0.4mm solid #4f46e5',
                            background: 'rgba(255,255,255,0.96)', color: '#111827', fontSize: '4mm', lineHeight: 1.3, padding: '1mm', fontFamily: 'Arial, sans-serif',
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}

                {/* selection handles (single element) */}
                {!preview && one && !one.locked && editing !== one.id ? (
                  <div style={{ ...boxStyle({ ...one, opacity: 1 }), pointerEvents: 'none' }}>
                    {handles.map((h) => {
                      const p = handlePos[h];
                      return (
                        <div
                          key={h}
                          onPointerDown={(e) => beginResize(e, one, h)}
                          style={{
                            position: 'absolute', width: px(9), height: px(9), background: '#fff', border: `${px(1.5)} solid #4f46e5`,
                            borderRadius: '50%', pointerEvents: 'auto', cursor: p.c, touchAction: 'none', boxSizing: 'border-box',
                            left: `${p.l * 100}%`, top: `${p.t * 100}%`, transform: 'translate(-50%, -50%)',
                          }}
                        />
                      );
                    })}
                    <div
                      onPointerDown={(e) => beginRotate(e, one)}
                      title="Rotate (Shift = 15° steps)"
                      style={{
                        position: 'absolute', left: '50%', top: `-${px(22)}`, width: px(11), height: px(11), transform: 'translateX(-50%)',
                        background: '#4f46e5', borderRadius: '50%', pointerEvents: 'auto', cursor: 'grab', touchAction: 'none',
                      }}
                    />
                  </div>
                ) : null}

                {guides.map((g, i) =>
                  g.axis === 'x' ? (
                    <div key={i} style={{ position: 'absolute', left: `${g.at}mm`, top: 0, bottom: 0, width: '0.2mm', background: '#f43f5e', pointerEvents: 'none' }} />
                  ) : (
                    <div key={i} style={{ position: 'absolute', top: `${g.at}mm`, left: 0, right: 0, height: '0.2mm', background: '#f43f5e', pointerEvents: 'none' }} />
                  )
                )}
              </div>
            </div>
          </div>
        </main>

        {/* right panel */}
        {!preview ? (
          <aside className="w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white">
            {one ? (
              <Properties
                el={one}
                patch={patchOne}
                onReplaceImage={() => pickImage('replace')}
                onDelete={removeSelected}
                onDuplicate={duplicate}
              />
            ) : selected.length > 1 ? (
              <Section title={`${selected.length} items selected`}>
                <p className="text-xs text-slate-500">Use the toolbar to align, reorder, duplicate or delete them together. Arrow keys nudge (Shift = 10 mm).</p>
              </Section>
            ) : (
              <PageSettings page={layout.page} setPage={setPage} onPickBackground={() => pickImage('page')} />
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------ page settings ------------------------------ */

function PageSettings({ page, setPage, onPickBackground }) {
  return (
    <>
      <Section title="Page">
        <div className="space-y-3">
          <div>
            <label className={label}>Paper size</label>
            <select className={field} value={page.size || 'A4'} onChange={(e) => setPage({ size: e.target.value })}>
              {Object.entries(PAGE_SIZES).map(([key, s]) => (
                <option key={key} value={key}>{s.label}</option>
              ))}
            </select>
          </div>
          {page.size === 'CUSTOM' ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Width (mm)</label>
                <Num value={page.w || 210} min={50} max={600} onChange={(v) => setPage({ w: v })} />
              </div>
              <div>
                <label className={label}>Height (mm)</label>
                <Num value={page.h || 297} min={50} max={600} onChange={(v) => setPage({ h: v })} />
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {[['landscape', 'Landscape'], ['portrait', 'Portrait']].map(([key, text]) => (
              <Toggle key={key} on={page.orientation === key} onClick={() => setPage({ orientation: key })}>{text}</Toggle>
            ))}
          </div>
        </div>
      </Section>
      <Section title="Background">
        <div className="space-y-3">
          <div>
            <label className={label}>Colour</label>
            <ColorField value={page.background} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && setPage({ background: v })} />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-bold hover:bg-slate-50" onClick={onPickBackground}>
              {page.backgroundImage ? 'Change image' : 'Background image'}
            </button>
            {page.backgroundImage ? (
              <button type="button" className="text-xs font-bold text-rose-600" onClick={() => setPage({ backgroundImage: '' })}>Remove</button>
            ) : null}
          </div>
          <p className="text-[10px] leading-snug text-slate-400">A full-page image (for example a pre-printed border or letterhead). It is stretched to the page.</p>
        </div>
      </Section>
      <Section title="Tips">
        <ul className="list-disc space-y-1 pl-4 text-[11px] leading-snug text-slate-500">
          <li>Drag to move, use the round handles to resize, the top dot rotates.</li>
          <li>Double-click text to type on the page.</li>
          <li>Hold <b>Shift</b> to multi-select, <b>Alt</b> to move without snapping.</li>
          <li><b>Ctrl+Z / Y</b> undo / redo, <b>Ctrl+D</b> duplicate, <b>Del</b> delete.</li>
        </ul>
      </Section>
    </>
  );
}

/* ------------------------------- properties -------------------------------- */

function Properties({ el, patch, onReplaceImage, onDelete, onDuplicate }) {
  const set = (key) => (value) => patch({ [key]: value });
  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <div className="text-xs font-extrabold text-slate-700">{ELEMENT_LABEL[el.type]}</div>
        <div className="flex items-center gap-1">
          <button type="button" className={iconBtn} title={el.locked ? 'Unlock' : 'Lock'} onClick={() => patch({ locked: !el.locked })}>
            {el.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </button>
          <button type="button" className={iconBtn} title="Duplicate" onClick={onDuplicate}><Copy className="h-4 w-4" /></button>
          <button type="button" className={`${iconBtn} text-rose-600`} title="Delete" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {el.locked ? <div className="bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">Locked — unlock it to edit or move.</div> : null}

      <Section title="Position & size">
        <div className="grid grid-cols-2 gap-2">
          <div><label className={label}>X (mm)</label><Num value={el.x} step={0.5} onChange={set('x')} /></div>
          <div><label className={label}>Y (mm)</label><Num value={el.y} step={0.5} onChange={set('y')} /></div>
          <div><label className={label}>Width</label><Num value={el.w} step={0.5} min={1} onChange={set('w')} /></div>
          <div><label className={label}>Height</label><Num value={el.h} step={0.5} min={0.5} onChange={set('h')} /></div>
          <div><label className={label}>Rotation</label><Num value={el.rotation} step={1} min={-360} max={360} suffix="°" onChange={set('rotation')} /></div>
          <div><label className={label}>Opacity</label><Num value={Math.round(el.opacity * 100)} step={5} min={0} max={100} suffix="%" onChange={(v) => patch({ opacity: Math.min(1, Math.max(0, v / 100)) })} /></div>
        </div>
      </Section>

      {el.type === 'text' ? (
        <>
          <Section title="Text">
            <textarea
              rows={4}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              value={el.text}
              onChange={(e) => patch({ text: e.target.value })}
            />
          </Section>
          <Section title="Font">
            <div className="space-y-2">
              <select className={field} value={el.fontFamily} onChange={(e) => patch({ fontFamily: e.target.value })}>
                {FONT_OPTIONS.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={label}>Size (pt)</label><Num value={el.fontSize} step={1} min={3} max={120} onChange={set('fontSize')} /></div>
                <div><label className={label}>Line height</label><Num value={el.lineHeight} step={0.1} min={0.8} max={3} onChange={set('lineHeight')} /></div>
                <div><label className={label}>Letter space</label><Num value={el.letterSpacing} step={0.5} min={-2} max={20} onChange={set('letterSpacing')} /></div>
                <div><label className={label}>Colour</label><ColorField value={el.color} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && patch({ color: v })} /></div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Toggle on={el.bold} onClick={() => patch({ bold: !el.bold })} title="Bold"><Bold className="h-3.5 w-3.5" /></Toggle>
                <Toggle on={el.italic} onClick={() => patch({ italic: !el.italic })} title="Italic"><Italic className="h-3.5 w-3.5" /></Toggle>
                <Toggle on={el.underline} onClick={() => patch({ underline: !el.underline })} title="Underline"><Underline className="h-3.5 w-3.5" /></Toggle>
                <Toggle on={el.uppercase} onClick={() => patch({ uppercase: !el.uppercase })} title="UPPERCASE">Aa</Toggle>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([key, Icon]) => (
                  <Toggle key={key} on={el.align === key} onClick={() => patch({ align: key })} title={`Align ${key}`}><Icon className="h-3.5 w-3.5" /></Toggle>
                ))}
                <Toggle on={el.align === 'justify'} onClick={() => patch({ align: 'justify' })} title="Justify">≡</Toggle>
              </div>
              <div className="flex gap-1.5">
                {[['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']].map(([key, text]) => (
                  <Toggle key={key} on={el.valign === key} onClick={() => patch({ valign: key })}>{text}</Toggle>
                ))}
              </div>
            </div>
          </Section>
          <Section title="Box">
            <div className="space-y-2">
              <div><label className={label}>Background</label><ColorField allowNone value={el.background} onChange={(v) => patch({ background: v })} /></div>
              <div><label className={label}>Border colour</label><ColorField allowNone value={el.borderColor} onChange={(v) => patch({ borderColor: v })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className={label}>Border</label><Num value={el.borderWidth} step={0.1} min={0} max={5} onChange={set('borderWidth')} /></div>
                <div><label className={label}>Padding</label><Num value={el.padding} step={0.5} min={0} max={30} onChange={set('padding')} /></div>
                <div><label className={label}>Radius</label><Num value={el.radius} step={0.5} min={0} max={100} onChange={set('radius')} /></div>
              </div>
            </div>
          </Section>
        </>
      ) : null}

      {el.type === 'image' ? (
        <Section title="Image">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              {[['SCHOOL_LOGO', 'Logo']].map(([key, text]) => (
                <Toggle key={key} on={el.src === key} onClick={() => patch({ src: key })}>{text}</Toggle>
              ))}
              <Toggle on={el.src && el.src !== 'SCHOOL_LOGO' && el.src !== 'SIGNATURE'} onClick={onReplaceImage}>Upload</Toggle>
            </div>
            <div>
              <label className={label}>Fit</label>
              <select className={field} value={el.fit} onChange={(e) => patch({ fit: e.target.value })}>
                <option value="contain">Contain (whole image)</option>
                <option value="cover">Cover (fill, crop)</option>
                <option value="fill">Stretch</option>
              </select>
            </div>
            <div><label className={label}>Corner radius (mm)</label><Num value={el.radius} step={0.5} min={0} max={200} onChange={set('radius')} /></div>
          </div>
        </Section>
      ) : null}

      {el.type === 'shape' ? (
        <Section title="Shape">
          <div className="space-y-2">
            <select className={field} value={el.shape} onChange={(e) => patch({ shape: e.target.value })}>
              {['rect', 'ellipse', 'line', 'diamond', 'triangle'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div><label className={label}>Fill</label><ColorField allowNone value={el.fill} onChange={(v) => patch({ fill: v })} /></div>
            <div><label className={label}>Outline</label><ColorField allowNone value={el.stroke} onChange={(v) => patch({ stroke: v })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={label}>Outline width</label><Num value={el.strokeWidth} step={0.1} min={0} max={10} onChange={set('strokeWidth')} /></div>
              {el.shape === 'rect' ? <div><label className={label}>Corner radius</label><Num value={el.radius} step={0.5} min={0} max={200} onChange={set('radius')} /></div> : null}
            </div>
          </div>
        </Section>
      ) : null}

      {el.type === 'timetable' || el.type === 'feeTable' ? (
        <Section title="Table style">
          <div className="space-y-2">
            <select className={field} value={el.fontFamily} onChange={(e) => patch({ fontFamily: e.target.value })}>
              {FONT_OPTIONS.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={label}>Font size (pt)</label><Num value={el.fontSize} step={0.5} min={4} max={40} onChange={set('fontSize')} /></div>
              <div><label className={label}>Cell padding</label><Num value={el.padding} step={0.5} min={0} max={10} onChange={set('padding')} /></div>
            </div>
            <div><label className={label}>Header colour</label><ColorField value={el.headerBg} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && patch({ headerBg: v })} /></div>
            <div><label className={label}>Header text</label><ColorField value={el.headerColor} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && patch({ headerColor: v })} /></div>
            <div><label className={label}>Text colour</label><ColorField value={el.color} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && patch({ color: v })} /></div>
            <div><label className={label}>Border colour</label><ColorField value={el.borderColor} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && patch({ borderColor: v })} /></div>
            <div className="flex flex-wrap gap-1.5">
              <Toggle on={el.zebra} onClick={() => patch({ zebra: !el.zebra })}>Striped rows</Toggle>
              {el.type === 'timetable' ? (
                <>
                  <Toggle on={el.showTime} onClick={() => patch({ showTime: !el.showTime })}>Times</Toggle>
                  <Toggle on={el.showTeacher} onClick={() => patch({ showTeacher: !el.showTeacher })}>Teacher</Toggle>
                  <Toggle on={el.showRoom} onClick={() => patch({ showRoom: !el.showRoom })}>Room</Toggle>
                </>
              ) : (
                <>
                  <Toggle on={el.showFrequency} onClick={() => patch({ showFrequency: !el.showFrequency })}>Frequency</Toggle>
                  <Toggle on={el.showTotal} onClick={() => patch({ showTotal: !el.showTotal })}>Total</Toggle>
                  <Toggle on={el.showOptional} onClick={() => patch({ showOptional: !el.showOptional })}>Optional fees</Toggle>
                </>
              )}
            </div>
            {el.zebra ? <div><label className={label}>Stripe colour</label><ColorField value={el.zebraColor} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && patch({ zebraColor: v })} /></div> : null}
          </div>
        </Section>
      ) : null}

      <Section title="Name (layers)">
        <input className={field} maxLength={40} value={el.name || ''} placeholder={ELEMENT_LABEL[el.type]} onChange={(e) => patch({ name: e.target.value })} />
      </Section>
    </>
  );
}

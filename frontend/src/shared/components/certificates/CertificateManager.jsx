import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QRCode from 'qrcode';
import {
  Award, Plus, Pencil, Trash2, Printer, Search, Loader2, Eye, Ban, RotateCcw, Upload, X, FileCheck2, Send, Wand2, Copy, Sparkles, LayoutGrid, FileText, CalendarDays, Wallet, History,
} from 'lucide-react';
import {
  CertificateView, CERT_SIZES, CERT_TYPES, TYPE_DEFAULTS, VARIABLES, PRESETS, SAMPLE_VARIABLES,
  defaultDesign, mergeDesign, renderText,
} from './CertificateView';
import CanvasDesigner from './designer/CanvasDesigner';
import { LayoutPage } from './designer/LayoutRenderer';
import { buildStarter, isLayoutDoc, pageDimensions } from './designer/layoutModel';

/**
 * Certificate management, shared by School Admin / Principal / HR.
 * `api` is built by certificateApi(client) in shared/api/client.js.
 *
 *   Templates - the certificate "master": wording, look, signatory, status.
 *   Generate  - pick people, issue numbered certificates, print / save PDF.
 *   Issued    - history with search, print, revoke / reinstate.
 */

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400';
const btnPrimary =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50';
const btnGhost =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

const APPLICABLE = [
  ['STUDENT', 'Student'],
  ['TEACHER', 'Teacher'],
  ['STAFF', 'Staff'],
];

const typeLabel = (type) => (CERT_TYPES.find(([key]) => key === type) || [type, type])[1];
const today = () => new Date().toISOString().slice(0, 10);
const errText = (err, fallback) => err?.response?.data?.message || err?.message || fallback;
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

function qrFor(cert) {
  if (!cert?.verifyCode) return Promise.resolve('');
  const url = `${window.location.origin}/verify-certificate/${cert.verifyCode}`;
  return QRCode.toDataURL(url, { margin: 0, width: 260, errorCorrectionLevel: 'M' }).catch(() => '');
}

// One certificate per page, in the template's own size and orientation.
async function printCertificates(win, certs, school) {
  const qrs = await Promise.all(certs.map(qrFor));
  const markup = renderToStaticMarkup(
    <>
      {certs.map((cert, index) => {
        const lay = cert.design?.layout;
        const dim = lay ? pageDimensions(lay.page) : null;
        const landscape = (mergeDesign(cert.design).orientation || 'landscape') === 'landscape';
        return (
          <div
            key={cert.id || index}
            className={dim ? 'page' : landscape ? 'page land' : 'page port'}
            style={dim ? { width: `${dim.w}mm`, height: `${dim.h}mm`, page: `p${index}` } : undefined}
          >
            <CertificateView
              cert={{ ...cert, text: cert.renderedText || cert.text, recipientName: cert.recipientName }}
              school={school}
              qr={qrs[index]}
            />
          </div>
        );
      })}
    </>
  );
  // Designed pages carry their own paper size, one named @page each.
  const pageRules = certs
    .map((cert, index) => {
      const lay = cert.design?.layout;
      if (!lay) return '';
      const dim = pageDimensions(lay.page);
      return `@page p${index} { size: ${dim.w}mm ${dim.h}mm; margin: 0; }`;
    })
    .join(' ');
  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Certificates</title>
<style>
  ${pageRules}
  @page land { size: A4 landscape; margin: 0; }
  @page port { size: A4 portrait; margin: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .page { break-after: page; page-break-after: always; overflow: hidden; }
  .page:last-child { break-after: auto; page-break-after: auto; }
  .land { page: land; width: 297mm; height: 210mm; }
  .port { page: port; width: 210mm; height: 297mm; }
</style></head><body>${markup}</body></html>`);
  win.document.close();
  const images = Array.from(win.document.images);
  const ready = Promise.all(
    images.map((img) => (img.complete ? null : new Promise((resolve) => { img.onload = img.onerror = resolve; })))
  );
  await Promise.race([ready, new Promise((resolve) => setTimeout(resolve, 6000))]);
  win.focus();
  win.print();
}

function openBlankWindow(setError) {
  const win = window.open('', '_blank');
  if (!win) {
    setError('The print window was blocked. Allow pop-ups for this site and try again.');
    return null;
  }
  win.document.write('<p style="font-family:Arial;padding:24px">Preparing certificates...</p>');
  return win;
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
      <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Pick({ label, value, onChange, options }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([val, text]) => (
          <option key={val} value={val}>{text}</option>
        ))}
      </select>
    </div>
  );
}

function Color({ label, value, onChange }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0" />
        <span className="font-mono text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">{value}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
    ISSUED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REVOKED: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${styles[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {status === 'PUBLISHED' ? 'Published' : status === 'DRAFT' ? 'Draft' : status === 'ISSUED' ? 'Issued' : status === 'REVOKED' ? 'Revoked' : status}
    </span>
  );
}

/* ------------------------------ Template editor ---------------------------- */

const emptyTemplate = (school) => ({
  name: '',
  title: TYPE_DEFAULTS.ACHIEVEMENT.title,
  type: 'ACHIEVEMENT',
  text: TYPE_DEFAULTS.ACHIEVEMENT.text,
  applicableTo: 'STUDENT',
  signatoryName: '',
  designation: 'Principal',
  signatureImage: '',
  status: 'DRAFT',
  design: defaultDesign(school?.primaryColor),
});

function TemplateEditor({ initial, school, saving, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [designing, setDesigning] = useState(false);
  const textRef = useRef(null);
  const design = mergeDesign(form.design);
  const patch = (values) => setForm((prev) => ({ ...prev, ...values }));
  const patchDesign = (values) => setForm((prev) => ({ ...prev, design: { ...mergeDesign(prev.design), ...values } }));

  const layoutDoc = isLayoutDoc(form.type);
  const hasLayout = Boolean(design.layout);

  const openDesigner = () => {
    // A timetable / fee structure needs a layout: start one from its starter.
    if (!design.layout) {
      const key = form.type === 'TIMETABLE' ? 'timetable' : form.type === 'FEE_STRUCTURE' ? 'fee-structure' : null;
      if (key) patchDesign({ layout: buildStarter(key, { primary: design.primaryColor }) });
    }
    setDesigning(true);
  };

  const changeType = (type) => {
    const defaults = TYPE_DEFAULTS[type];
    // Only replace the wording when it is still the previous type's stock text.
    const stock = Object.values(TYPE_DEFAULTS).some((item) => item.text === form.text && item.title === form.title);
    patch({
      type,
      ...(stock || !form.text.trim() ? { title: defaults.title, text: defaults.text } : {}),
    });
    patchDesign({ showRecipientBlock: defaults.showRecipientBlock });
  };

  const insertVariable = (key) => {
    const el = textRef.current;
    const token = `{{${key}}}`;
    if (!el) {
      patch({ text: `${form.text} ${token}`.trim() });
      return;
    }
    const start = el.selectionStart ?? form.text.length;
    const end = el.selectionEnd ?? form.text.length;
    const next = `${form.text.slice(0, start)}${token}${form.text.slice(end)}`;
    patch({ text: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const submit = (status) => {
    if (!form.name.trim() || !form.title.trim() || !(layoutDoc || form.text.trim())) {
      setError('Certificate name, title and text are required.');
      return;
    }
    if (isLayoutDoc(form.type) && !design.layout) {
      setError('Open the designer and design the page first.');
      return;
    }
    setError('');
    onSave({ ...form, status: status || form.status });
  };

  const sample = {
    ...SAMPLE_VARIABLES,
    schoolName: school?.name || SAMPLE_VARIABLES.schoolName,
    principalName: form.signatoryName || SAMPLE_VARIABLES.principalName,
  };
  const previewCert = {
    title: form.title || 'Certificate Title',
    text: renderText(form.text, sample),
    recipientName: form.applicableTo === 'STUDENT' ? 'Ali Raza' : 'Recipient Name',
    certificateNumber: 'CERT-2026-0001',
    issueDate: new Date(),
    signatoryName: form.signatoryName,
    designation: form.designation,
    signatureImage: form.signatureImage,
    design,
  };

  const layoutDims = design.layout ? pageDimensions(design.layout.page) : null;
  const landscape = layoutDims ? layoutDims.w > layoutDims.h : design.orientation === 'landscape';
  const previewScale = layoutDims ? Math.min(0.5, 150 / Math.max(layoutDims.w, layoutDims.h)) : landscape ? 0.5 : 0.42;

  return (
    <div className="space-y-4">
      {designing ? (
        <CanvasDesigner
          initialLayout={design.layout || null}
          school={school}
          docKind={layoutDoc ? form.type : 'CERTIFICATE'}
          signatureImage={form.signatureImage}
          onClose={() => setDesigning(false)}
          onApply={(layout) => {
            patchDesign({ layout });
            setDesigning(false);
          }}
        />
      ) : null}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {initial.id ? 'Edit certificate template' : 'New certificate template'}
        </h2>
        <button type="button" onClick={onCancel} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Certificate details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Certificate name *</label>
                <input className={inputClass} maxLength={120} value={form.name} placeholder="Sports Day Winner" onChange={(e) => patch({ name: e.target.value })} />
                <p className="mt-1 text-[11px] text-slate-400">Internal name, shown in lists.</p>
              </div>
              <div>
                <label className={labelClass}>Certificate title *</label>
                <input className={inputClass} maxLength={120} value={form.title} placeholder="Certificate of Excellence" onChange={(e) => patch({ title: e.target.value })} />
                <p className="mt-1 text-[11px] text-slate-400">Printed on the certificate.</p>
              </div>
              <Pick label="Certificate type *" value={form.type} onChange={changeType} options={CERT_TYPES} />
              <Pick label="Applicable to" value={form.applicableTo} onChange={(v) => patch({ applicableTo: v })} options={APPLICABLE} />
            </div>
            {!layoutDoc && (
            <div>
              <label className={labelClass}>Certificate text *</label>
              <textarea
                ref={textRef}
                rows={5}
                maxLength={1500}
                className={`${inputClass} h-auto py-2 leading-relaxed`}
                value={form.text}
                onChange={(e) => patch({ text: e.target.value })}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VARIABLES.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    title={label}
                    onClick={() => insertVariable(key)}
                    className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                  >
                    {`{{${key}}}`}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Click a variable to insert it. It is filled in automatically for every person when the certificate is issued.
              </p>
            </div>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Advanced designer</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {hasLayout
                    ? 'This template uses a custom design. Open the designer to change anything on the page.'
                    : 'Place text, images, shapes, QR and tables anywhere on the page, with full control over fonts, colours, size and layout.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} onClick={openDesigner}>
                  <Wand2 className="h-4 w-4" />
                  {hasLayout ? 'Edit design' : 'Open designer'}
                </button>
                {hasLayout && !layoutDoc ? (
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => {
                      if (window.confirm('Go back to the quick presets? The custom design on this template will be removed.')) {
                        setForm((prev) => {
                          const { layout: _drop, ...rest } = mergeDesign(prev.design);
                          return { ...prev, design: rest };
                        });
                      }
                    }}
                  >
                    Use quick presets
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Authorisation</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Authorized signatory</label>
                <input className={inputClass} maxLength={80} value={form.signatoryName} placeholder="Name of the signatory" onChange={(e) => patch({ signatoryName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Designation</label>
                <input className={inputClass} maxLength={80} value={form.designation} placeholder="Principal" onChange={(e) => patch({ designation: e.target.value })} />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">Name and designation are printed under the signature line. The signature itself is signed by hand after printing.</p>
          </section>

          {!hasLayout && (
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick design</h3>
            <div>
              <label className={labelClass}>Template style</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => patchDesign({ ...preset.values, secondSignatory: design.secondSignatory, secondSignatoryLabel: design.secondSignatoryLabel })}
                    className={`rounded-xl border px-3 py-1.5 text-sm font-bold transition ${
                      design.preset === key
                        ? 'border-indigo-500 bg-indigo-600 text-white'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Pick label="Orientation" value={design.orientation} onChange={(v) => patchDesign({ orientation: v })} options={[['landscape', 'Landscape'], ['portrait', 'Portrait']]} />
              <Pick label="Border" value={design.borderStyle} onChange={(v) => patchDesign({ borderStyle: v })} options={[['ornate', 'Ornate corners'], ['double', 'Double line'], ['classic', 'Classic'], ['modern', 'Modern band'], ['none', 'No border']]} />
              <Pick label="Text size" value={design.textSize} onChange={(v) => patchDesign({ textSize: v })} options={[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']]} />
              <Pick label="Title font" value={design.titleFont} onChange={(v) => patchDesign({ titleFont: v })} options={[['serif', 'Serif'], ['sans', 'Sans'], ['script', 'Script']]} />
              <Pick label="Name style" value={design.nameStyle} onChange={(v) => patchDesign({ nameStyle: v })} options={[['script', 'Script'], ['serif', 'Serif italic'], ['sans', 'Sans']]} />
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Color label="Main color" value={design.primaryColor} onChange={(v) => patchDesign({ primaryColor: v })} />
              <Color label="Accent color" value={design.accentColor} onChange={(v) => patchDesign({ accentColor: v })} />
              <Color label="Text color" value={design.textColor} onChange={(v) => patchDesign({ textColor: v })} />
              <Color label="Background" value={design.backgroundColor} onChange={(v) => patchDesign({ backgroundColor: v })} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Check label="School logo" checked={design.showLogo} onChange={(v) => patchDesign({ showLogo: v })} />
              <Check label="Seal" checked={design.showSeal} onChange={(v) => patchDesign({ showSeal: v })} />
              <Check label="Logo watermark" checked={design.showWatermark} onChange={(v) => patchDesign({ showWatermark: v })} />
              <Check label="Verification QR" checked={design.showQr} onChange={(v) => patchDesign({ showQr: v })} />
              <Check label="Name block (This is to certify that ...)" checked={design.showRecipientBlock} onChange={(v) => patchDesign({ showRecipientBlock: v })} />
              <Check label="Second signature line" checked={design.secondSignatory} onChange={(v) => patchDesign({ secondSignatory: v })} />
            </div>
            {design.secondSignatory && (
              <div className="max-w-xs">
                <label className={labelClass}>Second signature label</label>
                <input className={inputClass} maxLength={40} value={design.secondSignatoryLabel} onChange={(e) => patchDesign({ secondSignatoryLabel: e.target.value })} />
              </div>
            )}
          </section>
          )}
        </div>

        <div className="space-y-3">
          <div className="sticky top-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">Live preview</p>
              <div className="flex justify-center overflow-hidden">
                <div className="shadow-lg">
                  <CertificateView cert={previewCert} school={school} scale={previewScale} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>
              <button type="button" className={btnGhost} disabled={saving} onClick={() => submit('DRAFT')}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save as draft
              </button>
              <button type="button" className={btnPrimary} disabled={saving} onClick={() => submit('PUBLISHED')}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                Save &amp; publish
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Templates ------------------------------- */

function TemplatesTab({ api, school, onGenerate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.templates();
      setTemplates(res.data || []);
      setError('');
    } catch (err) {
      setError(errText(err, 'Unable to load templates'));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (form) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name, title: form.title, type: form.type, text: form.text, applicableTo: form.applicableTo,
        signatoryName: form.signatoryName, designation: form.designation, signatureImage: form.signatureImage,
        design: form.design, status: form.status,
      };
      if (form.id) await api.updateTemplate(form.id, payload);
      else await api.createTemplate(payload);
      setEditing(null);
      await load();
    } catch (err) {
      setError(errText(err, 'Unable to save the template'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (template) => {
    try {
      await api.updateTemplate(template.id, { status: template.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' });
      await load();
    } catch (err) {
      setError(errText(err, 'Unable to change the status'));
    }
  };

  const remove = async (template) => {
    if (!window.confirm(`Delete the template "${template.name}"?`)) return;
    try {
      await api.deleteTemplate(template.id);
      await load();
    } catch (err) {
      setError(errText(err, 'Unable to delete the template'));
    }
  };

  const duplicate = async (template) => {
    try {
      await api.createTemplate({
        name: `${template.name} (copy)`.slice(0, 120),
        title: template.title,
        type: template.type,
        text: template.text,
        applicableTo: template.applicableTo,
        signatoryName: template.signatoryName,
        designation: template.designation,
        signatureImage: template.signatureImage,
        design: template.design,
        status: 'DRAFT',
      });
      await load();
    } catch (err) {
      setError(errText(err, 'Unable to duplicate the template'));
    }
  };

  const [filter, setFilter] = useState('ALL');
  const kindOf = (t) => (t.type === 'TIMETABLE' ? 'TIMETABLE' : t.type === 'FEE_STRUCTURE' ? 'FEE' : 'CERT');
  const stats = {
    total: templates.length,
    published: templates.filter((t) => t.status === 'PUBLISHED').length,
    drafts: templates.filter((t) => t.status !== 'PUBLISHED').length,
    issued: templates.reduce((sum, t) => sum + (t.issuedCount || 0), 0),
  };
  const visible = templates.filter(
    (t) =>
      (filter === 'ALL' || kindOf(t) === filter || (filter === 'DRAFT' && t.status !== 'PUBLISHED')) &&
      (!search.trim() || `${t.name} ${t.title}`.toLowerCase().includes(search.trim().toLowerCase()))
  );

  if (editing) {
    return (
      <>
        {error && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">{error}</div>}
        <TemplateEditor initial={editing} school={school} saving={saving} onSave={save} onCancel={() => setEditing(null)} />
      </>
    );
  }

  const FILTERS = [
    ['ALL', 'All', LayoutGrid],
    ['CERT', 'Certificates', Award],
    ['TIMETABLE', 'Timetables', CalendarDays],
    ['FEE', 'Fee structures', Wallet],
    ['DRAFT', 'Drafts', FileText],
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Templates', stats.total, 'from-indigo-500 to-violet-500', LayoutGrid],
          ['Published', stats.published, 'from-emerald-500 to-teal-500', FileCheck2],
          ['Drafts', stats.drafts, 'from-amber-500 to-orange-500', FileText],
          ['Issued', stats.issued, 'from-sky-500 to-blue-600', Award],
        ].map(([label, value, gradient, Icon]) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <div className="text-2xl font-extrabold leading-none text-slate-900 dark:text-white">{value}</div>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} w-60 pl-9`} placeholder="Search templates" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map(([key, text, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${
                  filter === key
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {text}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnPrimary} onClick={() => setEditing(emptyTemplate(school))}>
            <Plus className="h-4 w-4" /> New design
          </button>
        </div>
      </div>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center dark:border-slate-700 dark:bg-slate-900">
          <Sparkles className="mx-auto h-8 w-8 text-indigo-400" />
          <div className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
            {templates.length ? 'No design matches this filter' : 'No designs yet'}
          </div>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            {templates.length ? 'Try another filter or search.' : 'Click "New design" to create your first one.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((template) => {
            const design = mergeDesign(template.design);
            const dim = design.layout
              ? pageDimensions(design.layout.page)
              : design.orientation === 'portrait' ? { w: 210, h: 297 } : { w: 297, h: 210 };
            const scale = Math.min(74 / dim.w, 58 / dim.h);
            const published = template.status === 'PUBLISHED';
            return (
              <div
                key={template.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative flex h-[230px] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 p-4 dark:from-slate-950 dark:to-slate-900">
                  <div className="overflow-hidden rounded-sm shadow-xl ring-1 ring-black/5">
                    <CertificateView
                      cert={{
                        title: template.title,
                        text: renderText(template.text, { ...SAMPLE_VARIABLES, schoolName: school?.name || '' }),
                        recipientName: 'Recipient Name',
                        certificateNumber: 'CERT-2026-0001',
                        issueDate: new Date(),
                        signatoryName: template.signatoryName,
                        designation: template.designation,
                        signatureImage: template.signatureImage,
                        design: template.design,
                        docVars: { className: '10', sectionName: 'A', academicYear: '2026-2027' },
                      }}
                      school={school}
                      scale={scale}
                    />
                  </div>
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide shadow ${
                      published ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'
                    }`}
                  >
                    {published ? 'Published' : 'Draft'}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 flex translate-y-full justify-center gap-2 bg-gradient-to-t from-slate-900/70 to-transparent p-3 pt-8 transition group-hover:translate-y-0">
                    <button type="button" className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow hover:bg-slate-100" onClick={() => setEditing(template)}>
                      <Pencil className="mr-1 inline h-3.5 w-3.5" />Edit
                    </button>
                    {published && (
                      <button type="button" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-700" onClick={() => onGenerate(template)}>
                        <Send className="mr-1 inline h-3.5 w-3.5" />{isLayoutDoc(template.type) ? 'Print' : 'Generate'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-slate-900 dark:text-white" title={template.name}>{template.name}</div>
                    <div className="truncate text-xs text-slate-500">{template.title}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-500">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{typeLabel(template.type)}</span>
                    {!isLayoutDoc(template.type) && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">For {template.applicableTo.toLowerCase()}</span>
                    )}
                    {!isLayoutDoc(template.type) && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{template.issuedCount} issued</span>
                    )}
                    {design.layout && <span className="rounded-md bg-violet-50 px-2 py-0.5 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">Custom design</span>}
                  </div>
                  <div className="mt-auto flex items-center gap-1 pt-2">
                    <button type="button" className={`${btnGhost} h-8 px-2.5 text-xs`} onClick={() => toggleStatus(template)}>
                      {published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button type="button" className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" title="Duplicate" onClick={() => duplicate(template)}>
                      <Copy className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete" onClick={() => remove(template)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Generate -------------------------------- */

const PAGE_SIZE = 20;

/* ------------------- timetable / fee structure (class documents) ------------------ */

function ClassDocumentPanel({ api, options, school, templates, template, onSelect }) {
  const isTimetable = template.type === 'TIMETABLE';
  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const current = options.academicYears.find((y) => y.isCurrent) || options.academicYears[0];
    if (current) setYearId(current.id);
  }, [options]);

  const classes = options.classes.filter((c) => !yearId || !c.academicYearId || c.academicYearId === yearId);
  const sections = options.sections.filter((s) => s.classId === classId);

  useEffect(() => {
    setData(null);
    setError('');
    const ready = isTimetable ? Boolean(sectionId) : Boolean(classId);
    if (!ready) return undefined;
    let cancelled = false;
    setLoading(true);
    const request = isTimetable ? api.timetableData(sectionId) : api.feeStructureData(classId, yearId);
    request
      .then((res) => !cancelled && setData(res.data))
      .catch((err) => !cancelled && setError(errText(err, 'Unable to load the data')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, isTimetable, sectionId, classId, yearId]);

  const year = options.academicYears.find((y) => y.id === yearId);
  const cert = {
    title: template.title,
    text: '',
    design: template.design,
    signatureImage: template.signatureImage,
    signatoryName: template.signatoryName,
    designation: template.designation,
    issueDate: new Date(),
    timetable: isTimetable ? data : undefined,
    fees: !isTimetable ? data : undefined,
    docVars: {
      className: data?.className || classes.find((c) => c.id === classId)?.name || '',
      sectionName: data?.sectionName || sections.find((s) => s.id === sectionId)?.name || '',
      academicYear: data?.academicYear || year?.name || '',
      session: data?.academicYear || year?.name || '',
    },
  };
  const dim = pageDimensions(template.design?.layout?.page);
  const scale = Math.min(0.55, 190 / Math.max(dim.w, dim.h));

  const print = async () => {
    const win = openBlankWindow(setError);
    if (!win) return;
    setPrinting(true);
    try {
      await printCertificates(win, [{ ...cert, id: 'doc' }], school);
    } catch (err) {
      win.close();
      setError(errText(err, 'Unable to prepare the document'));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{error}</div>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{isTimetable ? 'Print a class timetable' : 'Print a fee structure'}</h3>
          <Pick label="Design" value={template.id} onChange={onSelect} options={templates.map((t) => [t.id, t.name])} />
          <Pick label="Academic year" value={yearId} onChange={(v) => { setYearId(v); setClassId(''); setSectionId(''); }} options={[['', 'Select'], ...options.academicYears.map((y) => [y.id, y.name])]} />
          <Pick label="Class" value={classId} onChange={(v) => { setClassId(v); setSectionId(''); }} options={[['', 'Select class'], ...classes.map((c) => [c.id, c.name])]} />
          {isTimetable ? (
            <Pick label="Section" value={sectionId} onChange={setSectionId} options={[['', 'Select section'], ...sections.map((s) => [s.id, s.name])]} />
          ) : null}
          <button type="button" className={btnPrimary} disabled={!data || loading || printing} onClick={print}>
            {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Print / Save PDF
          </button>
          <p className="text-[11px] text-slate-400">
            {isTimetable ? 'Pick a class and section to fill the timetable from the live schedule.' : 'Pick a class to fill the fee table from its active fee structure.'}
          </p>
        </section>
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-950">
          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {loading ? 'Loading…' : data ? 'Preview' : 'Preview (sample data until you pick a class)'}
          </p>
          <div className="flex justify-center overflow-auto">
            <div className="shadow-lg">
              <CertificateView cert={cert} school={school} scale={scale} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerateTab({ api, options, school, initialTemplateId, onIssued }) {
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState(initialTemplateId || '');
  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [people, setPeople] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() => new Map());
  const [issueDate, setIssueDate] = useState(today());
  const [courseName, setCourseName] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    api.templates({ status: 'PUBLISHED' }).then((res) => {
      const list = res.data || [];
      setTemplates(list);
      setTemplateId((current) => current || list[0]?.id || '');
    }).catch((err) => setError(errText(err, 'Unable to load templates')));
  }, [api]);

  useEffect(() => {
    const current = options.academicYears.find((y) => y.isCurrent) || options.academicYears[0];
    if (current) setYearId(current.id);
  }, [options]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const template = templates.find((t) => t.id === templateId) || null;
  const type = template?.applicableTo || 'STUDENT';

  useEffect(() => {
    setSelected(new Map());
    setPage(1);
    setResult(null);
  }, [templateId]);

  useEffect(() => {
    if (!template) return undefined;
    let cancelled = false;
    setLoading(true);
    const params = { type, page, limit: PAGE_SIZE };
    if (type === 'STUDENT') {
      if (yearId) params.academicYearId = yearId;
      if (classId) params.classId = classId;
      if (sectionId) params.sectionId = sectionId;
    }
    if (debounced) params.search = debounced;
    api
      .recipients(params)
      .then((res) => {
        if (cancelled) return;
        setPeople(res.data || []);
        setPagination(res.pagination || { page: 1, total: 0, totalPages: 1 });
        setError('');
      })
      .catch((err) => !cancelled && setError(errText(err, 'Unable to load recipients')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, template, type, yearId, classId, sectionId, debounced, page]);

  const classes = options.classes.filter((c) => !yearId || !c.academicYearId || c.academicYearId === yearId);
  const sections = options.sections.filter((s) => s.classId === classId);

  const toggle = (person) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(person.id)) next.delete(person.id);
      else next.set(person.id, person);
      return next;
    });
  const pageAll = people.length > 0 && people.every((p) => selected.has(p.id));
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      people.forEach((p) => (pageAll ? next.delete(p.id) : next.set(p.id, p)));
      return next;
    });

  const issue = async (force = false) => {
    setIssuing(true);
    setError('');
    try {
      const res = await api.issue({
        templateId,
        recipientIds: Array.from(selected.keys()),
        issueDate,
        courseName,
        validUntil,
        force,
      });
      setResult(res.data);
      setSelected(new Map());
      onIssued?.();
    } catch (err) {
      setError(errText(err, 'Unable to issue certificates'));
    } finally {
      setIssuing(false);
    }
  };

  const printIssued = async () => {
    const win = openBlankWindow(setError);
    if (!win || !result?.issued?.length) return;
    setPrinting(true);
    try {
      await printCertificates(win, result.issued, school);
    } catch (err) {
      win.close();
      setError(errText(err, 'Unable to prepare the certificates'));
    } finally {
      setPrinting(false);
    }
  };

  const sampleCert = useMemo(() => {
    if (!template) return null;
    const first = selected.values().next().value || people[0];
    const vars = {
      ...SAMPLE_VARIABLES,
      schoolName: school?.name || '',
      studentName: first?.name || SAMPLE_VARIABLES.studentName,
      courseName: courseName || SAMPLE_VARIABLES.courseName,
      principalName: template.signatoryName,
      issueDate: new Date(issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    };
    return {
      title: template.title,
      text: renderText(template.text, vars),
      recipientName: first?.name || 'Recipient Name',
      certificateNumber: 'CERT-####-####',
      issueDate,
      validUntil: validUntil || null,
      signatoryName: template.signatoryName,
      designation: template.designation,
      signatureImage: template.signatureImage,
      design: template.design,
      variables: vars,
    };
  }, [template, selected, people, courseName, issueDate, validUntil, school]);

  if (template && isLayoutDoc(template.type)) {
    return (
      <ClassDocumentPanel
        api={api}
        options={options}
        school={school}
        templates={templates.filter((t) => isLayoutDoc(t.type))}
        template={template}
        onSelect={setTemplateId}
      />
    );
  }

  if (templates.length === 0 && !error) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm font-semibold text-slate-400 dark:border-slate-800">
        Publish a certificate template first, then come back here to generate certificates.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{error}</div>}

      {result && (
        <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
            {result.issued.length} certificate{result.issued.length === 1 ? '' : 's'} issued
            {result.skipped.length ? `, ${result.skipped.length} skipped` : ''}.
          </div>
          {result.skipped.length > 0 && (
            <div className="text-xs text-emerald-900/80 dark:text-emerald-200">
              Skipped: {result.skipped.map((s) => `${s.name || s.id} (${s.reason})`).join(', ')}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {result.issued.length > 0 && (
              <button type="button" className={btnPrimary} disabled={printing} onClick={printIssued}>
                {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Print / Save PDF
              </button>
            )}
            {result.skipped.some((s) => s.reason === 'Already issued') && (
              <button type="button" className={btnGhost} disabled={issuing} onClick={() => issue(true)}>
                Issue again anyway
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Certificate</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Pick
                label="Template"
                value={templateId}
                onChange={setTemplateId}
                options={templates.map((t) => [t.id, `${t.name} (${t.applicableTo.toLowerCase()})`])}
              />
              <div>
                <label className={labelClass}>Course / event name</label>
                <input className={inputClass} maxLength={120} value={courseName} placeholder="Annual Sports Day" onChange={(e) => setCourseName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Issue date</label>
                <input type="date" className={inputClass} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Valid until (optional)</label>
                <input type="date" className={inputClass} value={validUntil} min={issueDate} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              2. Select {type === 'STUDENT' ? 'students' : type === 'TEACHER' ? 'teachers' : 'staff'}
            </h3>
            <div className="grid gap-3 sm:grid-cols-4">
              {type === 'STUDENT' && (
                <>
                  <Pick
                    label="Academic year"
                    value={yearId}
                    onChange={(v) => { setYearId(v); setClassId(''); setSectionId(''); setPage(1); }}
                    options={options.academicYears.map((y) => [y.id, y.name + (y.isCurrent ? ' (current)' : '')])}
                  />
                  <Pick
                    label="Class"
                    value={classId}
                    onChange={(v) => { setClassId(v); setSectionId(''); setPage(1); }}
                    options={[['', 'All classes'], ...classes.map((c) => [c.id, c.name])]}
                  />
                  <Pick
                    label="Section"
                    value={sectionId}
                    onChange={(v) => { setSectionId(v); setPage(1); }}
                    options={[['', 'All sections'], ...sections.map((s) => [s.id, s.name])]}
                  />
                </>
              )}
              <div className={type === 'STUDENT' ? '' : 'sm:col-span-2'}>
                <label className={labelClass}>Search</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputClass} pl-9`} value={search} placeholder="Name / ID" onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={pageAll} disabled={!people.length} onChange={togglePage} />
                Select this page
              </label>
              <span className="text-xs font-medium text-slate-500">
                {pagination.total} found{selected.size ? ` - ${selected.size} selected` : ''}
              </span>
              {selected.size > 0 && (
                <button type="button" className="text-xs font-bold text-indigo-600" onClick={() => setSelected(new Map())}>
                  Clear
                </button>
              )}
            </div>

            <div className={`divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800 ${loading ? 'opacity-60' : ''}`}>
              {people.length === 0 ? (
                <div className="py-10 text-center text-sm font-semibold text-slate-400">
                  {loading ? 'Loading...' : 'No one matches these filters.'}
                </div>
              ) : (
                people.map((person) => (
                  <label key={person.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={selected.has(person.id)} onChange={() => toggle(person)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{person.name}</span>
                      <span className="block truncate text-xs text-slate-500">{[person.ref, person.subtitle].filter(Boolean).join(' - ')}</span>
                    </span>
                  </label>
                ))
              )}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button type="button" className={`${btnGhost} h-8 px-3 text-xs`} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <span className="text-xs font-semibold text-slate-500">Page {pagination.page} of {pagination.totalPages}</span>
                <button type="button" className={`${btnGhost} h-8 px-3 text-xs`} disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </section>

          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} disabled={issuing || selected.size === 0 || !template} onClick={() => issue(false)}>
            {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
            Generate {selected.size || ''} certificate{selected.size === 1 ? '' : 's'}
          </button>
        </div>

        <div>
          {sampleCert && (
            <div className="sticky top-4 rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">Preview</p>
              <div className="flex justify-center overflow-hidden">
                <div className="shadow-lg">
                  <CertificateView
                    cert={sampleCert}
                    school={school}
                    scale={mergeDesign(sampleCert.design).orientation === 'portrait' ? 0.38 : 0.46}
                  />
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400">The certificate number is assigned when you generate.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Issued -------------------------------- */

function IssuedTab({ api, school, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(() => new Map());
  const [busy, setBusy] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    api.templates().then((res) => setTemplates(res.data || [])).catch(() => {});
  }, [api]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { page, limit: 20 };
    if (templateId) params.templateId = templateId;
    if (status) params.status = status;
    if (debounced) params.search = debounced;
    api
      .issued(params)
      .then((res) => {
        if (cancelled) return;
        setRows(res.data || []);
        setPagination(res.pagination || { page: 1, total: 0, totalPages: 1 });
        setError('');
      })
      .catch((err) => !cancelled && setError(errText(err, 'Unable to load issued certificates')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, templateId, status, debounced, page, reload, refreshKey]);

  const print = async (list) => {
    const win = openBlankWindow(setError);
    if (!win) return;
    setBusy('print');
    try {
      await printCertificates(win, list, school);
    } catch (err) {
      win.close();
      setError(errText(err, 'Unable to prepare the certificates'));
    } finally {
      setBusy('');
    }
  };

  const revoke = async (row) => {
    const reason = window.prompt(`Revoke ${row.certificateNumber}? Enter a reason (optional):`, '');
    if (reason === null) return;
    try {
      await api.revoke(row.id, reason);
      setReload((n) => n + 1);
    } catch (err) {
      setError(errText(err, 'Unable to revoke'));
    }
  };

  const reinstate = async (row) => {
    try {
      await api.reinstate(row.id);
      setReload((n) => n + 1);
    } catch (err) {
      setError(errText(err, 'Unable to reinstate'));
    }
  };

  const toggle = (row) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.set(row.id, row);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className={labelClass}>Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} pl-9`} value={search} placeholder="Name, certificate no, event" onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <Pick label="Template" value={templateId} onChange={(v) => { setTemplateId(v); setPage(1); }} options={[['', 'All templates'], ...templates.map((t) => [t.id, t.name])]} />
        <Pick label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[['', 'All'], ['ISSUED', 'Issued'], ['REVOKED', 'Revoked']]} />
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">
          {pagination.total} certificate{pagination.total === 1 ? '' : 's'}{selected.size ? ` - ${selected.size} selected` : ''}
        </span>
        <button
          type="button"
          className={btnPrimary}
          disabled={selected.size === 0 || busy === 'print'}
          onClick={() => print(Array.from(selected.values()).filter((r) => r.status === 'ISSUED'))}
        >
          {busy === 'print' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Print selected
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
            <tr>
              <th className="w-10 px-3 py-3" />
              <th className="px-3 py-3">Certificate no</th>
              <th className="px-3 py-3">Recipient</th>
              <th className="px-3 py-3">Certificate</th>
              <th className="px-3 py-3">Issued</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-sm font-semibold text-slate-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-sm font-semibold text-slate-400">No certificates issued yet.</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className={row.status === 'REVOKED' ? 'bg-rose-50/40 dark:bg-rose-950/10' : ''}>
                  <td className="px-3 py-3">
                    <input type="checkbox" className="h-4 w-4 accent-indigo-600" disabled={row.status !== 'ISSUED'} checked={selected.has(row.id)} onChange={() => toggle(row)} />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs font-bold text-indigo-600">{row.certificateNumber}</td>
                  <td className="px-3 py-3">
                    <div className="font-bold text-slate-900 dark:text-white">{row.recipientName}</div>
                    <div className="text-xs text-slate-500">{[row.recipientRef, row.recipientType.toLowerCase()].filter(Boolean).join(' - ')}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{row.title}</div>
                    <div className="text-xs text-slate-500">{[row.templateName, row.courseName].filter(Boolean).join(' - ')}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">{formatDate(row.issueDate)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={row.status} />
                    {row.status === 'REVOKED' && row.revokeReason ? <div className="mt-1 max-w-[160px] truncate text-[11px] text-slate-500">{row.revokeReason}</div> : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="View / Print" onClick={() => print([row])}>
                        <Eye className="h-4 w-4" />
                      </button>
                      {row.status === 'ISSUED' ? (
                        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Revoke" onClick={() => revoke(row)}>
                          <Ban className="h-4 w-4" />
                        </button>
                      ) : (
                        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600" title="Reinstate" onClick={() => reinstate(row)}>
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" className={`${btnGhost} h-8 px-3 text-xs`} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-xs font-semibold text-slate-500">Page {pagination.page} of {pagination.totalPages}</span>
          <button type="button" className={`${btnGhost} h-8 px-3 text-xs`} disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------- Page --------------------------------- */

const TABS = [
  ['templates', 'Designs', LayoutGrid],
  ['generate', 'Generate', Send],
  ['issued', 'Issued history', History],
];

export default function CertificateManager({ api }) {
  const [tab, setTab] = useState('templates');
  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');
  const [generateFor, setGenerateFor] = useState('');
  const [issuedKey, setIssuedKey] = useState(0);

  useEffect(() => {
    api
      .options()
      .then((res) => setOptions(res.data))
      .catch((err) => setError(errText(err, 'Unable to load school data')));
  }, [api]);

  const school = options?.school;

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Certificates &amp; Documents</h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">
                Design certificates, timetables and fee structures with full control, issue them to students, teachers or staff, and print or save as PDF.
              </p>
            </div>
          </div>
          <div className="flex gap-1 rounded-2xl bg-white/15 p-1 backdrop-blur">
            {TABS.map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                  tab === key ? 'bg-white text-indigo-700 shadow' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{error}</div>}

      {!options && !error ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : options ? (
        <>
          {tab === 'templates' && (
            <TemplatesTab
              api={api}
              school={school}
              onGenerate={(template) => {
                setGenerateFor(template.id);
                setTab('generate');
              }}
            />
          )}
          {tab === 'generate' && (
            <GenerateTab
              key={generateFor || 'generate'}
              api={api}
              options={options}
              school={school}
              initialTemplateId={generateFor}
              onIssued={() => setIssuedKey((n) => n + 1)}
            />
          )}
          {tab === 'issued' && <IssuedTab api={api} school={school} refreshKey={issuedKey} />}
        </>
      ) : null}
    </div>
  );
}

export { CERT_SIZES };

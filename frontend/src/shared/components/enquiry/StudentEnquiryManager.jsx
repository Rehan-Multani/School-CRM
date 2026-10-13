import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Search, Trash2, Copy, Share2, ExternalLink, Check, Plus, Loader2, Phone, Mail } from 'lucide-react';
import { SkeletonTableRow } from '../../ui/SkeletonLoader';

/**
 * Student enquiries, shared by School Admin / Principal / HR.
 * Top: the school's public form link (copy / share). Tabs: the list of submitted enquiries,
 * and the form settings (built-in fields on/off + required, plus the school's own fields).
 * `api` is built by studentEnquiryApi(client) in shared/api/client.js.
 */

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400';
const btnPrimary =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50';
const btnGhost =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

const errText = (err, fallback) => err?.response?.data?.message || err?.message || fallback;
const formatWhen = (v) =>
  v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

const STATUSES = ['NEW', 'CONTACTED', 'VISITED', 'ADMITTED', 'CLOSED'];
const STATUS_TONE = {
  NEW: 'bg-indigo-50 text-indigo-700',
  CONTACTED: 'bg-amber-50 text-amber-700',
  VISITED: 'bg-sky-50 text-sky-700',
  ADMITTED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};
const TYPES = [
  ['text', 'Short text'],
  ['textarea', 'Long text'],
  ['number', 'Number'],
  ['date', 'Date'],
  ['select', 'Dropdown'],
  ['email', 'Email'],
  ['phone', 'Phone'],
];

function ShareCard({ path, enabled }) {
  const [copied, setCopied] = useState(false);
  if (!path) return null;
  const link = `${window.location.origin}${path}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Student enquiry', text: 'Fill this form to enquire about admission:', url: link });
        return;
      } catch {
        /* cancelled — fall through to copy */
      }
    }
    copy();
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={labelClass + ' mb-0'}>Enquiry form link</span>
        {!enabled ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">Form is switched off</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input readOnly value={link} className={`${inputClass} min-w-[220px] flex-1`} onFocus={(e) => e.target.select()} />
        <button type="button" className={btnPrimary} onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy link'}
        </button>
        <button type="button" className={btnGhost} onClick={share}>
          <Share2 className="h-4 w-4" /> Share
        </button>
        <a className={btnGhost} href={link} target="_blank" rel="noreferrer">
          <ExternalLink className="h-4 w-4" /> Open
        </a>
      </div>
      <p className="mt-2 text-xs text-slate-500">Share this link with parents (WhatsApp, SMS, website). Submissions appear in the list below.</p>
    </div>
  );
}

function EnquiryList({ api }) {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.list({ page, limit: 20, search: query || undefined, status: status || undefined });
      setRows(res.data || []);
      setStats(res.stats || {});
      setPagination(res.pagination || { totalPages: 1, total: 0 });
    } catch (err) {
      setError(errText(err, 'Could not load enquiries'));
    } finally {
      setLoading(false);
    }
  }, [api, page, query, status]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (row, body) => {
    try {
      const res = await api.update(row.id, body);
      setRows((list) => list.map((r) => (r.id === row.id ? res.data : r)));
      if (body.status) load();
    } catch (err) {
      setError(errText(err, 'Could not update the enquiry'));
    }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete the enquiry of ${row.studentName || 'this student'}?`)) return;
    try {
      await api.remove(row.id);
      await load();
    } catch (err) {
      setError(errText(err, 'Could not delete the enquiry'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[['', 'All', stats.TOTAL], ...STATUSES.map((s) => [s, s[0] + s.slice(1).toLowerCase(), stats[s]])].map(([key, label, n]) => (
          <button
            key={key || 'all'}
            type="button"
            onClick={() => {
              setStatus(key);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              status === key ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {label} · {n ?? 0}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className={`${inputClass} pl-9`} placeholder="Search student, parent, mobile…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Parent</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonTableRow key={i} columns={7} />)
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No enquiries yet. Share the form link above to start receiving them.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr
                    className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/40"
                    onClick={() => setOpen(open === row.id ? null : row.id)}
                  >
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{row.studentName || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.parentName || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{row.mobile || '-'}</div>
                      {row.email ? <div className="text-xs text-slate-400">{row.email}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.classApplying || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatWhen(row.createdAt)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={row.status}
                        onChange={(e) => patch(row, { status: e.target.value })}
                        className={`rounded-lg border-0 px-2 py-1 text-xs font-bold ${STATUS_TONE[row.status] || ''}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s[0] + s.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {row.mobile ? (
                          <a href={`tel:${row.mobile}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Call">
                            <Phone className="h-4 w-4" />
                          </a>
                        ) : null}
                        {row.email ? (
                          <a href={`mailto:${row.email}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Email">
                            <Mail className="h-4 w-4" />
                          </a>
                        ) : null}
                        <button type="button" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => remove(row)} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {open === row.id ? (
                    <tr className="border-b border-slate-50 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/30">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {row.extra.map((e) => (
                            <div key={e.key}>
                              <div className={labelClass}>{e.label}</div>
                              <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{e.value || '-'}</div>
                            </div>
                          ))}
                          <div className="sm:col-span-2 lg:col-span-3">
                            <label className={labelClass}>Follow-up note</label>
                            <NoteEditor value={row.note} onSave={(note) => patch(row, { note })} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{pagination.total} enquiries</span>
          <div className="flex items-center gap-2">
            <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              {page} / {pagination.totalPages}
            </span>
            <button type="button" className={btnGhost} disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NoteEditor({ value, onSave }) {
  const [text, setText] = useState(value || '');
  return (
    <div className="flex gap-2">
      <input className={inputClass} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="e.g. Called, will visit on Saturday" />
      <button type="button" className={btnGhost} disabled={text === (value || '')} onClick={() => onSave(text)}>
        Save
      </button>
    </div>
  );
}

function FormSettings({ api, config, onSaved }) {
  const [form, setForm] = useState(config);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => setForm(config), [config]);

  const setField = (i, patch) => setForm((f) => ({ ...f, fields: f.fields.map((x, n) => (n === i ? { ...x, ...patch } : x)) }));
  const addField = () =>
    setForm((f) => ({ ...f, fields: [...f.fields, { key: '', label: '', type: 'text', required: false, enabled: true, options: [], builtIn: false }] }));
  const removeField = (i) => setForm((f) => ({ ...f, fields: f.fields.filter((_, n) => n !== i) }));
  const locked = (f) => f.key === 'studentName' || f.key === 'mobile';

  const save = async () => {
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await api.saveForm({
        enabled: form.enabled,
        title: form.title,
        intro: form.intro,
        successMessage: form.successMessage,
        fields: form.fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          enabled: f.enabled,
          options: f.type === 'select' ? (Array.isArray(f.options) ? f.options : String(f.options || '').split(',')) : [],
        })),
      });
      onSaved(res.data);
      setMsg({ type: 'ok', text: 'Form saved.' });
    } catch (err) {
      setMsg({ type: 'err', text: errText(err, 'Could not save the form') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 sm:col-span-2">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          Accept enquiries through the form link
        </label>
        <div>
          <label className={labelClass}>Form title</label>
          <input className={inputClass} value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Thank-you message</label>
          <input className={inputClass} value={form.successMessage} maxLength={300} placeholder="Shown after submitting" onChange={(e) => setForm({ ...form, successMessage: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Intro text</label>
          <textarea className={`${inputClass} h-20 py-2`} value={form.intro} maxLength={500} placeholder="Shown above the form (optional)" onChange={(e) => setForm({ ...form, intro: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        {form.fields.map((f, i) => (
          <div key={f.key || `new-${i}`} className="grid items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1.4fr_1fr_1.4fr_auto_auto_auto]">
            <input className={inputClass} value={f.label} maxLength={120} placeholder="Field label" onChange={(e) => setField(i, { label: e.target.value })} />
            {f.builtIn ? (
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Built-in</span>
            ) : (
              <select className={inputClass} value={f.type} onChange={(e) => setField(i, { type: e.target.value })}>
                {TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            )}
            {!f.builtIn && f.type === 'select' ? (
              <input
                className={inputClass}
                value={Array.isArray(f.options) ? f.options.join(', ') : f.options}
                placeholder="Options, comma separated"
                onChange={(e) => setField(i, { options: e.target.value.split(',').map((o) => o.trim()) })}
              />
            ) : (
              <span />
            )}
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={f.required} disabled={locked(f)} onChange={(e) => setField(i, { required: e.target.checked })} /> Required
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={f.enabled} disabled={locked(f)} onChange={(e) => setField(i, { enabled: e.target.checked })} /> Show
            </label>
            {f.builtIn ? (
              <span className="w-9" />
            ) : (
              <button type="button" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" onClick={() => removeField(i)} aria-label="Remove field">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btnGhost} onClick={addField} disabled={form.fields.length >= 25}>
          <Plus className="h-4 w-4" /> Add field
        </button>
        <button type="button" className={btnPrimary} onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save form
        </button>
        {msg.text ? <span className={`text-sm font-semibold ${msg.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</span> : null}
      </div>
    </div>
  );
}

export default function StudentEnquiryManager({ api }) {
  const [tab, setTab] = useState('list');
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getForm()
      .then((res) => !cancelled && setConfig(res.data))
      .catch((err) => !cancelled && setError(errText(err, 'Could not load the enquiry form')));
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Student Enquiry</h1>
          <p className="text-sm text-slate-500">Enquiries submitted through your school&apos;s form link.</p>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {config ? <ShareCard path={config.path} enabled={config.enabled} /> : null}

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {[['list', 'Enquiries'], ['form', 'Form settings']].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold ${tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'list' ? <EnquiryList api={api} /> : config ? <FormSettings api={api} config={config} onSaved={(c) => setConfig((old) => ({ ...old, ...c }))} /> : null}
    </div>
  );
}

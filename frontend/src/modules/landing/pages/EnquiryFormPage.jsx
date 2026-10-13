import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, Loader2, Lock, Send } from 'lucide-react';
import { publicSchoolEnquiryApi } from '../../../shared/api/client';
import BrandLogo from '../../../shared/ui/BrandLogo';

const INPUT_TYPE = { phone: 'tel', email: 'email', number: 'number', date: 'date' };
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 ' +
  'focus:border-[var(--brand)] focus:bg-white focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_16%,transparent)]';

// The school's primary colour, or the platform default when it is not a plain #RRGGBB.
const brandOrDefault = (c) => (HEX_RE.test(c || '') ? c : '#4F46E5');

// Hint text for the built-in fields; a custom field falls back to its type / label.
const PLACEHOLDERS = {
  studentName: 'e.g. Aarav Sharma',
  parentName: 'e.g. Rakesh Sharma',
  mobile: '10-digit mobile number',
  email: 'name@example.com',
  classApplying: 'e.g. Class 5',
  message: 'Write your question or message here',
};

function placeholderFor(field) {
  if (PLACEHOLDERS[field.key]) return PLACEHOLDERS[field.key];
  const label = String(field.label || '').replace(/\s*[*?]\s*$/, '').trim().toLowerCase();
  switch (field.type) {
    case 'phone':
      return '10-digit mobile number';
    case 'email':
      return 'name@example.com';
    case 'textarea':
      return label ? `Write ${label} here` : 'Write here';
    case 'number':
      return label ? `Enter ${label}` : 'Enter a number';
    case 'date':
      return undefined;
    default:
      return label ? `Enter ${label}` : undefined;
  }
}

// The school's own logo; the platform's default logo when it has none (or it fails to load).
function SchoolMark({ logo, name }) {
  const [broken, setBroken] = useState(false);
  if (logo && !broken) {
    return <img src={logo} alt={name} onError={() => setBroken(true)} className="h-full w-full object-contain" />;
  }
  return <BrandLogo alt={name || 'School'} className="h-full w-full rounded-none" />;
}

/** Public page behind a school's enquiry link (the link carries a random token, not the school's id). */
export const EnquiryFormPage = () => {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, form: null, error: '' });
  const [answers, setAnswers] = useState({});
  const [trap, setTrap] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    let cancelled = false;
    publicSchoolEnquiryApi
      .getForm(token)
      .then((res) => !cancelled && setState({ loading: false, form: res.data, error: '' }))
      .catch((err) =>
        !cancelled &&
        setState({
          loading: false,
          form: null,
          error: err.response?.status === 404 ? 'This enquiry link is not valid or has been replaced.' : 'Unable to load the form right now. Please try again.',
        })
      );
    return () => {
      cancelled = true;
    };
  }, [token]);

  const { loading, form, error } = state;
  const brand = brandOrDefault(form?.primaryColor);
  const closed = form && (!form.enabled || form.fields.length === 0);

  useEffect(() => {
    if (form?.schoolName) document.title = `${form.title || 'Enquiry'} · ${form.schoolName}`;
  }, [form]);

  const set = (key) => (e) => setAnswers((a) => ({ ...a, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    for (const f of form.fields) {
      if (f.required && !String(answers[f.key] || '').trim()) {
        setFormError(`${f.label} is required.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await publicSchoolEnquiryApi.submit(token, { answers, website: trap });
      setDone(res.data?.message || 'Thank you! Your enquiry has been received.');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const style = useMemo(() => ({ '--brand': brand }), [brand]);

  const header = form ? (
    <div className="relative px-6 pb-14 pt-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${brand}, color-mix(in srgb, ${brand} 55%, #0f172a))` }}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10" />
      <p className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">{form.schoolName}</p>
      <h1 className="relative mt-1 text-2xl font-extrabold leading-tight">{form.title}</h1>
      {form.intro ? <p className="relative mx-auto mt-2 max-w-sm text-sm text-white/85">{form.intro}</p> : null}
    </div>
  ) : null;

  const logoBadge = form ? (
    <div className="relative z-10 mx-auto -mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white p-1.5 shadow-lg">
      <SchoolMark logo={form.logo} name={form.schoolName} />
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-6 sm:py-12" style={style}>
      <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-200">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm font-semibold text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="space-y-3 px-6 py-16 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
            <h1 className="text-lg font-extrabold text-slate-900">Link not available</h1>
            <p className="mx-auto max-w-xs text-sm text-slate-500">{error}</p>
          </div>
        ) : done ? (
          <>
            {header}
            {logoBadge}
            <div className="space-y-3 px-6 pb-10 pt-5 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <h2 className="text-lg font-extrabold text-slate-900">Enquiry sent</h2>
              <p className="mx-auto max-w-sm text-sm text-slate-500">{done}</p>
            </div>
          </>
        ) : closed ? (
          <>
            {header}
            {logoBadge}
            <div className="space-y-2 px-6 pb-10 pt-5 text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
              <p className="text-sm text-slate-500">This enquiry form is not accepting responses right now.</p>
            </div>
          </>
        ) : (
          <>
            {header}
            {logoBadge}
            <form onSubmit={submit} className="space-y-4 px-5 pb-7 pt-6 sm:px-8" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                {form.fields.map((f) => (
                  <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label htmlFor={`f-${f.key}`} className="mb-1.5 block text-xs font-bold text-slate-600">
                      {f.label}
                      {f.required ? <span className="text-rose-500"> *</span> : null}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea id={`f-${f.key}`} className={`${inputClass} h-28 resize-none`} value={answers[f.key] || ''} onChange={set(f.key)} maxLength={1000} placeholder={placeholderFor(f)} />
                    ) : f.type === 'select' ? (
                      <select id={`f-${f.key}`} className={inputClass} value={answers[f.key] || ''} onChange={set(f.key)}>
                        <option value="">{f.label ? `Select ${String(f.label).toLowerCase()}` : 'Select…'}</option>
                        {f.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`f-${f.key}`}
                        className={inputClass}
                        type={INPUT_TYPE[f.type] || 'text'}
                        inputMode={f.type === 'phone' ? 'tel' : undefined}
                        autoComplete={f.type === 'phone' ? 'tel' : f.type === 'email' ? 'email' : 'off'}
                        value={answers[f.key] || ''}
                        onChange={set(f.key)}
                        maxLength={200}
                        placeholder={placeholderFor(f)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Honeypot: hidden from people, filled by bots. */}
              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={trap}
                onChange={(e) => setTrap(e.target.value)}
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              />

              {formError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-600">{formError}</p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit enquiry
              </button>

              <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-slate-400">
                <Lock className="h-3 w-3" /> Your details are shared only with {form.schoolName}.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default EnquiryFormPage;

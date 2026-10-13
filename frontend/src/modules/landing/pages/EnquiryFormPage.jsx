import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { apiClient, publicSchoolEnquiryApi } from '../../../shared/api/client';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';

const INPUT_TYPE = { phone: 'tel', email: 'email', number: 'number', date: 'date' };

/** Public page behind a school's enquiry link: the parent fills the school's own form. */
export const EnquiryFormPage = () => {
  const { schoolId } = useParams();
  const [state, setState] = useState({ loading: true, form: null, error: '' });
  const [logo, setLogo] = useState('');
  const [answers, setAnswers] = useState({});
  const [trap, setTrap] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    let cancelled = false;
    publicSchoolEnquiryApi
      .getForm(schoolId)
      .then((res) => !cancelled && setState({ loading: false, form: res.data, error: '' }))
      .catch((err) =>
        !cancelled &&
        setState({
          loading: false,
          form: null,
          error: err.response?.status === 404 ? 'This enquiry link is not valid.' : 'Unable to load the form right now. Please try again.',
        })
      );
    apiClient
      .get(`/platform/school-theme/${encodeURIComponent(schoolId)}`)
      .then((res) => !cancelled && setLogo(res.data?.data?.branding?.logo || ''))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const set = (key) => (e) => setAnswers((a) => ({ ...a, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    for (const f of state.form.fields) {
      if (f.required && !String(answers[f.key] || '').trim()) {
        setFormError(`${f.label} is required.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await publicSchoolEnquiryApi.submit(schoolId, { answers, website: trap });
      setDone(res.data?.message || 'Thank you! Your enquiry has been received.');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const { loading, form, error } = state;
  const closed = form && (!form.enabled || form.fields.length === 0);

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-50 px-4 py-8 sm:py-12">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : error ? (
          <div className="space-y-2 py-6 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
            <p className="text-sm text-slate-500">{error}</p>
          </div>
        ) : done ? (
          <div className="space-y-3 py-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h1 className="text-lg font-extrabold text-slate-900">Enquiry sent</h1>
            <p className="text-sm text-slate-500">{done}</p>
            <p className="text-xs font-semibold text-slate-400">{form.schoolName}</p>
          </div>
        ) : closed ? (
          <div className="space-y-2 py-6 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
            <h1 className="text-lg font-extrabold text-slate-900">{form.schoolName}</h1>
            <p className="text-sm text-slate-500">This enquiry form is not accepting responses right now.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-2 text-center">
              {logo ? <img src={logo} alt="" className="mx-auto h-16 w-16 rounded-2xl object-contain" /> : null}
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{form.schoolName}</p>
              <h1 className="text-xl font-extrabold text-slate-900">{form.title}</h1>
              {form.intro ? <p className="text-sm text-slate-500">{form.intro}</p> : null}
            </div>

            {form.fields.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-bold text-slate-600">
                  {f.label}
                  {f.required ? <span className="text-rose-500"> *</span> : null}
                </label>
                {f.type === 'textarea' ? (
                  <textarea className={`${inputClass} h-24`} value={answers[f.key] || ''} onChange={set(f.key)} maxLength={1000} />
                ) : f.type === 'select' ? (
                  <select className={inputClass} value={answers[f.key] || ''} onChange={set(f.key)}>
                    <option value="">Select…</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={inputClass}
                    type={INPUT_TYPE[f.type] || 'text'}
                    inputMode={f.type === 'phone' ? 'tel' : undefined}
                    value={answers[f.key] || ''}
                    onChange={set(f.key)}
                    maxLength={200}
                  />
                )}
              </div>
            ))}

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

            {formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit enquiry
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EnquiryFormPage;

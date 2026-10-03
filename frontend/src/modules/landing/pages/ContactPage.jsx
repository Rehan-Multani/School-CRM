import React, { useEffect, useState } from 'react';
import { CheckCircle2, LifeBuoy, Loader2, Mail, MapPin, Phone, Send, ShieldCheck } from 'lucide-react';
import Reveal from '../components/Reveal';
import { PRODUCT } from '../data/content';
import { usePlatformContact } from '../data/siteContent';
import { publicEnquiryApi } from '../../../shared/api/client';
import { sanitizeMobileInput, isValid10DigitMobile } from '../../../shared/utils/mobileValidation';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

export const ContactPage = () => {
  const contact = usePlatformContact();
  const [form, setForm] = useState({ name: '', email: '', school: '', phone: '', message: '', website: '' });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const channels = [
    { icon: Mail, label: 'Sales & onboarding', value: contact.salesEmail, href: `mailto:${contact.salesEmail}` },
    { icon: LifeBuoy, label: 'Support', value: contact.supportEmail, href: `mailto:${contact.supportEmail}` },
    { icon: ShieldCheck, label: 'Privacy', value: contact.privacyEmail, href: `mailto:${contact.privacyEmail}` },
    { icon: Phone, label: 'Phone', value: contact.phone, href: `tel:${(contact.phone || '').replace(/\s+/g, '')}` },
  ];

  useEffect(() => {
    document.title = `Contact – ${PRODUCT.name}`;
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.phone && !isValid10DigitMobile(form.phone, false)) {
      setError('Contact phone must be exactly 10 digits');
      return;
    }

    setSubmitting(true);
    try {
      await publicEnquiryApi.submit({
        name: form.name,
        email: form.email,
        school: form.school,
        phone: form.phone ? sanitizeMobileInput(form.phone) : '',
        message: form.message,
        website: form.website,
      });
      setSent(true);
      setForm({ name: '', email: '', school: '', phone: '', message: '', website: '' });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <Reveal className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
          Contact
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Talk to us about your school
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
          Tell us your school size, board and the modules you need. We'll get back with a plan
          and a walkthrough.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          {channels.map((channel, i) => {
            const Icon = channel.icon;
            return (
              <Reveal key={channel.label} delay={i * 0.04}>
                <a
                  href={channel.href}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {channel.label}
                    </p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {channel.value}
                    </p>
                  </div>
                </a>
              </Reveal>
            );
          })}
          <Reveal delay={0.16}>
            <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Office</p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {contact.address}
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.08}>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            {sent ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
                  Enquiry Submitted Successfully!
                </h2>
                <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
                  Thank you for reaching out. We have safely received your details and our team will contact you shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-6 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400">
                    {error}
                  </div>
                )}
                {/* Spam trap: hidden from people, filled in by bots. The server drops any enquiry that has it. */}
                <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                  <label>
                    Website
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={update('website')} />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Your name <span className="text-rose-500">*</span>
                    </label>
                    <input required value={form.name} onChange={update('name')} className={inputClass} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Work email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={update('email')}
                      className={inputClass}
                      placeholder="you@school.edu"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      School name
                    </label>
                    <input value={form.school} onChange={update('school')} className={inputClass} placeholder="e.g. Greenfield Public School" />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Contact phone (optional)
                      </label>
                      {form.phone ? (
                        <span
                          className={`text-[10px] font-bold ${
                            form.phone.length === 10 ? 'text-emerald-500' : 'text-amber-500'
                          }`}
                        >
                          {form.phone.length}/10 digits
                        </span>
                      ) : null}
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: sanitizeMobileInput(e.target.value) }))}
                      className={inputClass}
                      placeholder="9876543210"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={update('message')}
                    className={`${inputClass} resize-y`}
                    placeholder="Tell us about your school size, board and the modules you need."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting enquiry...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send message
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-slate-400">
                  Your enquiry will be sent directly to our team. We usually respond within 24 hours.
                </p>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default ContactPage;


import React, { useEffect, useState } from 'react';
import { CheckCircle2, LifeBuoy, Mail, MapPin, Phone, Send, ShieldCheck } from 'lucide-react';
import Reveal from '../components/Reveal';
import { PRODUCT } from '../data/content';

const CHANNELS = [
  { icon: Mail, label: 'Sales & onboarding', value: PRODUCT.email, href: `mailto:${PRODUCT.email}` },
  { icon: LifeBuoy, label: 'Support', value: PRODUCT.supportEmail, href: `mailto:${PRODUCT.supportEmail}` },
  { icon: ShieldCheck, label: 'Privacy', value: PRODUCT.privacyEmail, href: `mailto:${PRODUCT.privacyEmail}` },
  { icon: Phone, label: 'Phone', value: PRODUCT.phone, href: `tel:${PRODUCT.phone.replace(/\s+/g, '')}` },
];

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

export const ContactPage = () => {
  const [form, setForm] = useState({ name: '', email: '', school: '', message: '' });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = `Contact — ${PRODUCT.name}`;
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`School CRM enquiry — ${form.school || form.name || 'Website'}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nSchool: ${form.school}\n\n${form.message}`,
    );
    window.location.href = `mailto:${PRODUCT.email}?subject=${subject}&body=${body}`;
    setSent(true);
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
          Tell us your school size, board and the modules you need. We’ll get back with a plan
          and a walkthrough.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          {CHANNELS.map((channel, i) => {
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
                  {PRODUCT.address}
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.08}>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            {sent ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                  Almost there
                </h2>
                <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
                  Your email app should have opened with the message ready to send. If it didn’t,
                  write to{' '}
                  <a className="font-semibold text-indigo-600 dark:text-indigo-400" href={`mailto:${PRODUCT.email}`}>
                    {PRODUCT.email}
                  </a>
                  .
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-6 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Edit message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Your name
                    </label>
                    <input required value={form.name} onChange={update('name')} className={inputClass} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Work email
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
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    School name
                  </label>
                  <input value={form.school} onChange={update('school')} className={inputClass} placeholder="e.g. Greenfield Public School" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Message
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-500"
                >
                  <Send className="h-4 w-4" />
                  Send message
                </button>
                <p className="text-center text-xs text-slate-400">
                  This opens your email app with the details filled in — nothing is stored on this page.
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

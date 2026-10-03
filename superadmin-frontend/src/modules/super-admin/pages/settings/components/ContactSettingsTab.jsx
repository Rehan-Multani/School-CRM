import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Phone,
  MapPin,
  LifeBuoy,
  ShieldCheck,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { platformAppConfigApi } from '../../../../../shared/api/client';
import { showToast } from '../../../../../shared/ui/Toast';

function FormField({ id, label, icon: Icon, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
        )}
        {children}
      </div>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export default function ContactSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const [form, setForm] = useState({
    salesEmail: '',
    supportEmail: '',
    privacyEmail: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    let alive = true;
    platformAppConfigApi
      .get()
      .then((res) => {
        if (!alive) return;
        const data = res.data || {};
        const contact = data.contact || {};
        setForm({
          salesEmail: contact.salesEmail || data.salesEmail || 'hello@schoolcrm.app',
          supportEmail: contact.supportEmail || data.supportEmail || 'support@schoolcrm.app',
          privacyEmail: contact.privacyEmail || data.privacyEmail || 'privacy@schoolcrm.app',
          phone: contact.phone || data.phone || '+91 80 4718 2200',
          address:
            contact.address ||
            data.address ||
            'WeWork Prestige Central, Ground Floor, 36 Infantry Road, Bengaluru 560001, India',
        });
        setUpdatedAt(data.updatedAt || null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.message || err.message || 'Unable to load contact settings.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);

    try {
      const res = await platformAppConfigApi.update({
        salesEmail: form.salesEmail.trim(),
        supportEmail: form.supportEmail.trim(),
        privacyEmail: form.privacyEmail.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });

      const updated = res.data || {};
      const contact = updated.contact || {};
      setForm({
        salesEmail: contact.salesEmail || updated.salesEmail || form.salesEmail,
        supportEmail: contact.supportEmail || updated.supportEmail || form.supportEmail,
        privacyEmail: contact.privacyEmail || updated.privacyEmail || form.privacyEmail,
        phone: contact.phone || updated.phone || form.phone,
        address: contact.address || updated.address || form.address,
      });
      setUpdatedAt(updated.updatedAt || new Date().toISOString());
      setSaved(true);
      showToast.success('Contact and support settings saved successfully!');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to save contact settings.';
      setError(msg);
      showToast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const previewItems = [
    {
      icon: Mail,
      label: 'SALES & ONBOARDING',
      value: form.salesEmail || 'hello@schoolcrm.app',
      href: `mailto:${form.salesEmail || 'hello@schoolcrm.app'}`,
    },
    {
      icon: LifeBuoy,
      label: 'SUPPORT',
      value: form.supportEmail || 'support@schoolcrm.app',
      href: `mailto:${form.supportEmail || 'support@schoolcrm.app'}`,
    },
    {
      icon: ShieldCheck,
      label: 'PRIVACY',
      value: form.privacyEmail || 'privacy@schoolcrm.app',
      href: `mailto:${form.privacyEmail || 'privacy@schoolcrm.app'}`,
    },
    {
      icon: Phone,
      label: 'PHONE',
      value: form.phone || '+91 80 4718 2200',
      href: `tel:${(form.phone || '').replace(/\s+/g, '')}`,
    },
    {
      icon: MapPin,
      label: 'OFFICE',
      value:
        form.address ||
        'WeWork Prestige Central, Ground Floor, 36 Infantry Road, Bengaluru 560001, India',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-blue-50/40 p-5 dark:border-indigo-900/30 dark:from-indigo-950/20 dark:to-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Public Contact &amp; Support Info
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Changes made here instantly update the public landing site, Contact page, and website footer.
            </p>
          </div>
        </div>
        {updatedAt && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Last updated: {new Date(updatedAt).toLocaleDateString()} at {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Edit Form */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
          >
            <form onSubmit={handleSave} className="space-y-4">
              <FormField
                id="sales-email"
                label="Sales & Onboarding Email"
                icon={Mail}
                hint="Inquiries submitted through the Contact Form will also be routed here."
              >
                <input
                  id="sales-email"
                  type="email"
                  required
                  placeholder="hello@schoolcrm.app"
                  value={form.salesEmail}
                  onChange={handleChange('salesEmail')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </FormField>

              <FormField
                id="support-email"
                label="Support Email"
                icon={LifeBuoy}
                hint="Used for parent, teacher, and institutional support requests."
              >
                <input
                  id="support-email"
                  type="email"
                  required
                  placeholder="support@schoolcrm.app"
                  value={form.supportEmail}
                  onChange={handleChange('supportEmail')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </FormField>

              <FormField
                id="privacy-email"
                label="Privacy & Legal Email"
                icon={ShieldCheck}
                hint="Listed under privacy policy and legal compliance queries."
              >
                <input
                  id="privacy-email"
                  type="email"
                  required
                  placeholder="privacy@schoolcrm.app"
                  value={form.privacyEmail}
                  onChange={handleChange('privacyEmail')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </FormField>

              <FormField
                id="contact-phone"
                label="Phone Number"
                icon={Phone}
                hint="Include country code (e.g. +91 80 4718 2200). Rendered as a clickable tel: link."
              >
                <input
                  id="contact-phone"
                  type="text"
                  required
                  placeholder="+91 80 4718 2200"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </FormField>

              <FormField
                id="office-address"
                label="Office / Campus Address"
                icon={MapPin}
                hint="Complete address shown on the Contact page card and footer."
              >
                <textarea
                  id="office-address"
                  rows={3}
                  required
                  placeholder="WeWork Prestige Central, Ground Floor, 36 Infantry Road, Bengaluru 560001, India"
                  value={form.address}
                  onChange={handleChange('address')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 pl-10 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </FormField>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600 dark:bg-rose-500/5 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <AnimatePresence>
                  {saved && (
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
                    >
                      <Check className="h-4 w-4" />
                      Changes saved
                    </motion.span>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  className="h-11 gap-2 rounded-xl px-5"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving...' : 'Save contact settings'}
                </Button>
              </div>
            </form>
          </motion.div>

          {/* Live Preview */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-900/40"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Live Preview
                </h3>
              </div>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400">
                Contact Page
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Preview of how visitors will interact with your contact details:
            </p>

            <div className="space-y-3 pt-2">
              {previewItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-0.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

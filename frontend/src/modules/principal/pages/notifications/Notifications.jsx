import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, Send, Smartphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { principalNotificationApi } from '../../../../shared/api/client';

const AUDIENCE_OPTIONS = [
  { key: 'principal', label: 'Principal' },
  { key: 'accountant', label: 'Accountant' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'student', label: 'Student' },
  { key: 'parent', label: 'Parent' },
  { key: 'hr', label: 'HR' },
  { key: 'librarian', label: 'Librarian' },
  { key: 'transport', label: 'Transport' },
];

const EMPTY_FORM = AUDIENCE_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.key]: false }),
  { title: '', body: '' }
);

function relativeTime(value) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return 'Just now';
  }
}

function deliveryLabel(item) {
  if (!item.delivery?.firebaseConfigured) {
    return {
      tone: 'amber',
      text: 'Saved only · Firebase not configured',
    };
  }
  if (item.delivery?.skippedReason) {
    return {
      tone: 'amber',
      text: item.delivery.skippedReason,
    };
  }
  if (item.delivery?.success > 0) {
    return {
      tone: 'emerald',
      text: `Firebase sent to ${item.delivery.success} device(s)`,
    };
  }
  return {
    tone: 'rose',
    text: 'No registered devices matched this audience',
  };
}

function audienceNames(audiences = []) {
  return AUDIENCE_OPTIONS.filter((option) => audiences.includes(option.key))
    .map((option) => option.label)
    .join(', ');
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

function Input({ as = 'input', className = '', ...props }) {
  const Component = as;
  return (
    <Component
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 ${className}`}
      {...props}
    />
  );
}

export const Notifications = () => {
  const { showToast, ToastComponent } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [history, setHistory] = useState([]);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState({});

  const selectedAudienceCount = useMemo(
    () => AUDIENCE_OPTIONS.filter((option) => form[option.key]).length,
    [form]
  );

  useEffect(() => {
    let cancelled = false;

    principalNotificationApi
      .list()
      .then((result) => {
        if (cancelled) return;
        setHistory(result.data || []);
        setFirebaseConfigured(Boolean(result.firebaseConfigured));
      })
      .catch((error) => {
        if (!cancelled) {
          showToast(error?.response?.data?.message || error?.message || 'Unable to load notifications', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Title is required';
    if (!form.body.trim()) nextErrors.body = 'Message is required';
    if (!selectedAudienceCount) nextErrors.audiences = 'At least one target audience is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const audiences = AUDIENCE_OPTIONS.filter((option) => form[option.key]).map((option) => option.key);
    setSending(true);
    try {
      const result = await principalNotificationApi.send({
        title: form.title.trim(),
        body: form.body.trim(),
        audiences,
      });
      setHistory((prev) => [result.data, ...prev]);
      setFirebaseConfigured(Boolean(result.firebaseConfigured));
      setForm(EMPTY_FORM);
      setErrors({});
      showToast(result.message || 'Notification sent', 'success');
    } catch (error) {
      showToast(error?.response?.data?.message || error?.message || 'Unable to send notification', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Notifications"
        subtitle="Send Firebase notifications to selected audiences. Only checked audience groups with registered devices will receive the push."
      />

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Smartphone className={`h-4 w-4 ${firebaseConfigured ? 'text-emerald-500' : 'text-amber-500'}`} />
        <span className={firebaseConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
          {firebaseConfigured
            ? 'Firebase is configured. Push will go to registered devices.'
            : 'Firebase is not configured. Notification history will be saved, but push will not be delivered.'}
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Send Notification
            </h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Notification Title" error={errors.title}>
              <Input
                value={form.title}
                onChange={(event) => handleChange('title', event.target.value)}
                placeholder="Fee reminder, circular, alert..."
                maxLength={120}
              />
            </Field>

            <Field label="Message" error={errors.body}>
              <Input
                as="textarea"
                rows={5}
                value={form.body}
                onChange={(event) => handleChange('body', event.target.value)}
                placeholder="Write the message recipients should receive"
                className="resize-none"
              />
            </Field>

            <Field
              label={`Target Audience${selectedAudienceCount ? ` (${selectedAudienceCount} selected)` : ''}`}
              error={errors.audiences}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {AUDIENCE_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-950"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={form[option.key]}
                      onChange={(event) => handleChange(option.key, event.target.checked)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </Field>

            <button
              type="submit"
              disabled={sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending...' : 'Send Notification'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Sent History
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-800">
              No notifications have been sent yet.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const delivery = deliveryLabel(item);
                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.body}</p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          delivery.tone === 'emerald'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : delivery.tone === 'rose'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                        }`}
                      >
                        {delivery.text}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      {audienceNames(item.audiences) || 'No audience'}
                      {item.createdAt ? ` | ${relativeTime(item.createdAt)}` : ''}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <ToastComponent />
    </div>
  );
};
export default Notifications;

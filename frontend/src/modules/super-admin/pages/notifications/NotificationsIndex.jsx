import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Loader2, Send, Smartphone } from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui/Button';
import { Pulse } from '../../components/ui/SkeletonLoader';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformNotificationApi, platformSchoolApi } from '../../../../shared/api/client';

const emptyForm = () => ({
  title: '',
  body: '',
  principal: true,
  schoolAdmin: true,
  schoolId: '',
});

function audienceLabel(audiences = []) {
  const labels = [];
  if (audiences.includes('principal')) labels.push('Principal');
  if (audiences.includes('school-admin')) labels.push('School Admin');
  return labels.join(' + ') || '—';
}

function relativeTime(value) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '';
  }
}

function NotificationsHistorySkeleton() {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="space-y-2 py-4 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <Pulse className="h-4 w-48" />
            <Pulse className="h-5 w-28 rounded-full" />
          </div>
          <Pulse className="h-3.5 w-full" />
          <Pulse className="h-3 w-4/5" />
          <Pulse className="h-2.5 w-40" />
        </div>
      ))}
    </div>
  );
}

function deliveryBadge(item) {
  if (!item.delivery?.firebaseConfigured) {
    return { variant: 'warning', label: 'Saved · Firebase not configured' };
  }
  if (item.delivery.skippedReason) {
    return { variant: 'warning', label: item.delivery.skippedReason };
  }
  if (item.delivery.success > 0) {
    return { variant: 'success', label: `Firebase · ${item.delivery.success} sent` };
  }
  return { variant: 'danger', label: 'Firebase · no devices reached' };
}

export default function NotificationsIndex() {
  const { addNotification } = useSuperAdminNotifications();
  const [form, setForm] = useState(emptyForm);
  const [schools, setSchools] = useState([]);
  const [history, setHistory] = useState([]);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState({});

  const loadHistory = async () => {
    setLoading(true);
    try {
      const [notificationsResult, schoolsResult] = await Promise.all([
        platformNotificationApi.list(),
        platformSchoolApi.list({ page: 1, limit: 50 }),
      ]);
      setHistory(notificationsResult.data || []);
      setFirebaseConfigured(Boolean(notificationsResult.firebaseConfigured));
      setSchools(schoolsResult.data || []);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Title is required';
    if (!form.body.trim()) next.body = 'Message is required';
    if (!form.principal && !form.schoolAdmin) next.audience = 'Select Principal, School Admin, or both';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const audiences = [];
    if (form.principal) audiences.push('principal');
    if (form.schoolAdmin) audiences.push('school-admin');

    setSending(true);
    try {
      const result = await platformNotificationApi.send({
        title: form.title.trim(),
        body: form.body.trim(),
        audiences,
        schoolId: form.schoolId,
      });
      addNotification('success', result.message || 'Notification sent.');
      setForm(emptyForm());
      setErrors({});
      setHistory((prev) => [result.data, ...prev]);
      if (typeof result.firebaseConfigured === 'boolean') {
        setFirebaseConfigured(result.firebaseConfigured);
      }
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to send notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Notifications</h1>
        <p className="text-xs text-slate-400">
          Send Firebase push notifications to school Principals and School Admins.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <Smartphone size={14} className={firebaseConfigured ? 'text-emerald-500' : 'text-amber-500'} />
        <span className={firebaseConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
          {firebaseConfigured
            ? 'Firebase is configured. Messages will be pushed to registered devices.'
            : 'Firebase keys are missing. Notifications will still be saved and shown in Principal / Admin inboxes.'}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        <Card className="xl:col-span-2 space-y-5">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Send size={16} className="text-indigo-500" />
            Compose
          </h3>

          <form className="space-y-4" onSubmit={handleSend}>
            <Input
              label="Title"
              placeholder="Fee reminder, circular, or alert title"
              value={form.title}
              error={errors.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <Textarea
              label="Message"
              placeholder="Write the notification that Principal and School Admin should receive"
              value={form.body}
              error={errors.body}
              onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
            />
            <Select
              label="School"
              value={form.schoolId}
              onChange={(event) => setForm((prev) => ({ ...prev, schoolId: event.target.value }))}
            >
              <option value="">All schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </Select>

            <div className="space-y-2">
              <p className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Send to</p>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={form.principal}
                  onChange={(event) => setForm((prev) => ({ ...prev, principal: event.target.checked }))}
                />
                Principal
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={form.schoolAdmin}
                  onChange={(event) => setForm((prev) => ({ ...prev, schoolAdmin: event.target.checked }))}
                />
                School Admin
              </label>
              {errors.audience && <p className="text-xs text-rose-500">{errors.audience}</p>}
            </div>

            <Button type="submit" disabled={sending} className="w-full gap-2">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? 'Sending…' : 'Send via Firebase'}
            </Button>
          </form>
        </Card>

        <Card className="xl:col-span-3 space-y-4">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Bell size={16} className="text-indigo-500" />
            Sent history
          </h3>

          {loading ? (
            <NotificationsHistorySkeleton />
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">No notifications sent yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((item) => {
                const status = deliveryBadge(item);
                return (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{item.body}</p>
                    <p className="text-xs text-slate-400">
                      {audienceLabel(item.audiences)}
                      {item.schoolName ? ` · ${item.schoolName}` : ' · All schools'}
                      {item.createdAt ? ` · ${relativeTime(item.createdAt)}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { BellRing, CloudDownload, Save, Smartphone, Store } from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui/Button';
import { Pulse } from '../../components/ui/SkeletonLoader';
import { Input, Textarea } from '../../components/ui/Input';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformAppConfigApi } from '../../../../shared/api/client';

/**
 * App Version — everything that decides whether a phone must update:
 *
 *   installed < minimum version → "Update required" popup that cannot be closed
 *   installed < latest version  → "Update available" popup with a Later button
 *
 * The app reads this on launch and every time it is reopened. "Notify all
 * users" also pushes a notification, so the popup appears straight away.
 * "Update" on the popup opens the store link saved here.
 */

const emptyForm = () => ({ latestVersion: '', minVersion: '', message: '', playStoreUrl: '', appStoreUrl: '' });

const fromConfig = (data) => ({
  latestVersion: data?.appUpdate?.latestVersion || '',
  minVersion: data?.appUpdate?.minVersion || '',
  message: data?.appUpdate?.message || '',
  playStoreUrl: data?.playStoreUrl || '',
  appStoreUrl: data?.appStoreUrl || '',
});

export default function AppVersionIndex() {
  const { addNotification } = useSuperAdminNotifications();
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(emptyForm); // what the server holds — what phones see now
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(''); // '' | 'save' | 'notify'

  const apply = (data) => {
    setForm(fromConfig(data));
    setSaved(fromConfig(data));
    setUpdatedAt(data?.updatedAt || null);
  };

  useEffect(() => {
    let alive = true;
    platformAppConfigApi
      .get()
      .then((res) => alive && apply(res.data))
      .catch((err) => alive && addNotification('error', err.response?.data?.message || err.message || 'Unable to load the app version settings.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const save = async (event) => {
    event.preventDefault();
    setBusy('save');
    try {
      const res = await platformAppConfigApi.update({
        appLatestVersion: form.latestVersion.trim(),
        appMinVersion: form.minVersion.trim(),
        appUpdateMessage: form.message.trim(),
        playStoreUrl: form.playStoreUrl.trim(),
        appStoreUrl: form.appStoreUrl.trim(),
      });
      apply(res.data);
      addNotification('success', 'App version saved. Phones apply it the next time the app is opened.');
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to save the app version.');
    } finally {
      setBusy('');
    }
  };

  const notify = async () => {
    setBusy('notify');
    try {
      const res = await platformAppConfigApi.notifyUpdate();
      addNotification('success', res.message || 'Update notification sent.');
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to send the update notification.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">App Version</h1>
        <p className="text-xs text-slate-400">
          Control which versions of the mobile app may be used, and tell users when an update is out.
          {updatedAt ? ` Last saved ${new Date(updatedAt).toLocaleString()}.` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <form className="space-y-6 xl:col-span-3" onSubmit={save}>
          <Card className="space-y-5">
            <h3 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <CloudDownload size={16} className="text-indigo-500" />
              Versions
            </h3>
            {loading ? (
              <Pulse className="h-40 w-full rounded-lg" />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Input label="Latest version" placeholder="1.2.0" value={form.latestVersion} onChange={set('latestVersion')} />
                    <p className="text-xs text-slate-400">The version now on the store. Older phones see “Update available” with a Later button.</p>
                  </div>
                  <div className="space-y-1">
                    <Input label="Minimum version (force update)" placeholder="1.0.0" value={form.minVersion} onChange={set('minVersion')} />
                    <p className="text-xs text-slate-400">Older phones are blocked by “Update required” until they update. Blank = never force.</p>
                  </div>
                </div>
                <Textarea
                  label="Message on the popup (optional)"
                  className="min-h-[80px]"
                  maxLength={300}
                  placeholder="Bug fixes and a faster attendance screen."
                  value={form.message}
                  onChange={set('message')}
                />
              </>
            )}
          </Card>

          <Card className="space-y-5">
            <h3 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Store size={16} className="text-indigo-500" />
              Where “Update” opens
            </h3>
            {loading ? (
              <Pulse className="h-24 w-full rounded-lg" />
            ) : (
              <>
                <Input
                  label="Google Play URL (Android)"
                  type="url"
                  placeholder="https://play.google.com/store/apps/details?id=com.schoolcrm.app"
                  value={form.playStoreUrl}
                  onChange={set('playStoreUrl')}
                />
                <Input
                  label="Apple App Store URL (iPhone)"
                  type="url"
                  placeholder="https://apps.apple.com/app/id…"
                  value={form.appStoreUrl}
                  onChange={set('appStoreUrl')}
                />
                <p className="text-xs text-slate-400">
                  These are the same links shown on the public landing page (Settings → Mobile app). If the Google Play
                  URL is blank, the app opens its own Play Store page.
                </p>
              </>
            )}
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={loading || Boolean(busy) || dirty || !saved.latestVersion}
              onClick={notify}
              title={dirty ? 'Save your changes first' : 'Push a notification to every phone signed in to the app'}
            >
              <BellRing size={16} />
              {busy === 'notify' ? 'Notifying…' : 'Notify all users'}
            </Button>
            <Button type="submit" className="gap-2" disabled={loading || Boolean(busy) || !dirty}>
              <Save size={16} />
              {busy === 'save' ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>

        <Card className="space-y-4 xl:col-span-2">
          <h3 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Smartphone size={16} className="text-indigo-500" />
            What phones see now
          </h3>
          {loading ? (
            <Pulse className="h-32 w-full rounded-lg" />
          ) : (
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <Row label={saved.minVersion ? `Older than ${saved.minVersion}` : 'Force update'}>
                {saved.minVersion ? <Badge variant="danger">Update required</Badge> : <Badge>Off</Badge>}
              </Row>
              <Row label={saved.latestVersion ? `Older than ${saved.latestVersion}` : 'Optional update'}>
                {saved.latestVersion ? <Badge variant="warning">Update available</Badge> : <Badge>Off</Badge>}
              </Row>
              <Row label={saved.latestVersion ? `${saved.latestVersion} or newer` : 'Every version'}>
                <Badge variant="success">No popup</Badge>
              </Row>
              <p className="border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
                The app compares these with its own version (the <code>version</code> in the build). When you publish a
                new build, raise its version number first, then set it as the latest version here.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      {children}
    </div>
  );
}

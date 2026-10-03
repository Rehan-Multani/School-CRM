import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, cn } from '../../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { platformAppConfigApi } from '../../../../shared/api/client';
import { bustPlatformConfigCache } from '../../../../shared/platformBrand';
import bundledLogo from '../../../../assets/School_logo.png';
import {
  AlertCircle,
  Check,
  HelpCircle,
  ImagePlus,
  Link2,
  Loader2,
  Mail,
  RotateCcw,
  Save,
  Settings,
  Smartphone,
} from 'lucide-react';
import FaqSettingsTab from './components/FaqSettingsTab';
import ContactSettingsTab from './components/ContactSettingsTab';

const tabTriggerClass = cn(
  'gap-2 rounded-lg px-4 py-2 text-sm font-medium',
  'data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm',
  'dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-indigo-400'
);

function Field({ id, label, icon: Icon, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}
        {children}
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function SettingsIndex() {
  // Mobile app links shown on the public landing site.
  const [appConfig, setAppConfig] = useState({ playStoreUrl: '', appStoreUrl: '', apkUrl: '' });
  const [appConfigUpdatedAt, setAppConfigUpdatedAt] = useState(null);
  const [loadingAppConfig, setLoadingAppConfig] = useState(true);
  const [savingAppConfig, setSavingAppConfig] = useState(false);
  const [appConfigSaved, setAppConfigSaved] = useState(false);
  const [appConfigError, setAppConfigError] = useState('');

  // Platform logo — used by every portal's <BrandLogo> + browser-tab favicon.
  const logoInputRef = useRef(null);
  const [platformLogo, setPlatformLogo] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);
  const [logoError, setLogoError] = useState('');

  useEffect(() => {
    let alive = true;
    platformAppConfigApi
      .get()
      .then((result) => {
        if (!alive) return;
        setAppConfig({
          playStoreUrl: result.data?.playStoreUrl || '',
          appStoreUrl: result.data?.appStoreUrl || '',
          apkUrl: result.data?.apkUrl || '',
        });
        setPlatformLogo(result.data?.logoUrl || '');
        setAppConfigUpdatedAt(result.data?.updatedAt || null);
      })
      .catch((err) => {
        if (!alive) return;
        setAppConfigError(err.response?.data?.message || err.message || 'Unable to load mobile app links.');
      })
      .finally(() => {
        if (alive) setLoadingAppConfig(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSaveAppConfig = async (event) => {
    event.preventDefault();
    setAppConfigError('');
    setAppConfigSaved(false);
    setSavingAppConfig(true);
    try {
      const result = await platformAppConfigApi.update({
        playStoreUrl: appConfig.playStoreUrl.trim(),
        appStoreUrl: appConfig.appStoreUrl.trim(),
        apkUrl: appConfig.apkUrl.trim(),
      });
      setAppConfig({
        playStoreUrl: result.data?.playStoreUrl || '',
        appStoreUrl: result.data?.appStoreUrl || '',
        apkUrl: result.data?.apkUrl || '',
      });
      setAppConfigUpdatedAt(result.data?.updatedAt || new Date().toISOString());
      setAppConfigSaved(true);
      setTimeout(() => setAppConfigSaved(false), 2200);
    } catch (err) {
      setAppConfigError(err.response?.data?.message || err.message || 'Unable to save mobile app links.');
    } finally {
      setSavingAppConfig(false);
    }
  };

  const updateAppConfigField = (key) => (event) =>
    setAppConfig((prev) => ({ ...prev, [key]: event.target.value }));

  const handlePlatformLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('Please choose an image file (PNG, JPG, SVG, or WebP).');
      return;
    }
    setLogoError('');
    setLogoSaved(false);
    setLogoBusy(true);
    try {
      const result = await platformAppConfigApi.uploadLogo(file);
      const nextUrl = result.data?.logoUrl || '';
      setPlatformLogo(nextUrl);
      bustPlatformConfigCache(nextUrl); // updates the live sidebar/topbar logo + favicon
      setLogoSaved(true);
      setTimeout(() => setLogoSaved(false), 2200);
    } catch (err) {
      setLogoError(err.response?.data?.message || err.message || 'Unable to upload the logo.');
    } finally {
      setLogoBusy(false);
    }
  };

  const handlePlatformLogoReset = async () => {
    setLogoError('');
    setLogoSaved(false);
    setLogoBusy(true);
    try {
      await platformAppConfigApi.removeLogo();
      setPlatformLogo('');
      bustPlatformConfigCache('');
      setLogoSaved(true);
      setTimeout(() => setLogoSaved(false), 2200);
    } catch (err) {
      setLogoError(err.response?.data?.message || err.message || 'Unable to reset the logo.');
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Platform Settings</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Manage global branding, platform logo, and mobile app download links.
          </p>
        </div>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/70">
          <TabsTrigger value="branding" className={tabTriggerClass}>
            <ImagePlus className="h-4 w-4" />
            Branding &amp; Logo
          </TabsTrigger>
          <TabsTrigger value="mobile-app" className={tabTriggerClass}>
            <Smartphone className="h-4 w-4" />
            Mobile App Links
          </TabsTrigger>
          <TabsTrigger value="contact" className={tabTriggerClass}>
            <Mail className="h-4 w-4" />
            Contact &amp; Support
          </TabsTrigger>
          <TabsTrigger value="faqs" className={tabTriggerClass}>
            <HelpCircle className="h-4 w-4" />
            Website FAQs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <ImagePlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Platform logo</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Replaces the icon in every portal sidebar, on every login screen, on the
                  landing site and as the browser-tab icon. PNG, JPG, SVG or WebP — square
                  works best; it is resized to 256&times;256.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <img
                src={platformLogo || bundledLogo}
                alt="Platform logo preview"
                className="h-20 w-20 rounded-2xl border border-slate-200 object-contain p-1.5 dark:border-slate-800"
              />
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="h-10 gap-2 rounded-xl px-4"
                    disabled={logoBusy}
                  >
                    {logoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {platformLogo ? 'Replace logo' : 'Upload logo'}
                  </Button>
                  {platformLogo && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handlePlatformLogoReset}
                      className="h-10 gap-2 rounded-xl px-4"
                      disabled={logoBusy}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset to default
                    </Button>
                  )}
                </div>
                <AnimatePresence>
                  {logoSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
                    >
                      <Check className="h-4 w-4" />
                      Logo updated
                    </motion.span>
                  )}
                </AnimatePresence>
                {logoError && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-rose-600 dark:text-rose-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {logoError}
                  </span>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePlatformLogoUpload}
              />
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="mobile-app" className="mt-6 space-y-6">
          <form onSubmit={handleSaveAppConfig}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Mobile app links
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Shown on the public landing page. Leave a field blank to hide that button
                    (it renders as “coming soon”).
                    {appConfigUpdatedAt && (
                      <span className="ml-1 text-slate-400">
                        Last saved {new Date(appConfigUpdatedAt).toLocaleString()}.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {loadingAppConfig ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-11 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : (
                <div className="max-w-xl space-y-5">
                  <Field
                    id="play-store-url"
                    label="Google Play URL"
                    icon={Smartphone}
                    hint="e.g. https://play.google.com/store/apps/details?id=com.schoolcrm.app"
                  >
                    <input
                      id="play-store-url"
                      type="url"
                      inputMode="url"
                      placeholder="https://play.google.com/store/apps/details?id=…"
                      value={appConfig.playStoreUrl}
                      onChange={updateAppConfigField('playStoreUrl')}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </Field>

                  <Field
                    id="apk-url"
                    label="APK download URL"
                    icon={Link2}
                    hint="Direct link to the signed .apk for sideloading."
                  >
                    <input
                      id="apk-url"
                      type="url"
                      inputMode="url"
                      placeholder="https://downloads.schoolcrm.app/schoolcrm-latest.apk"
                      value={appConfig.apkUrl}
                      onChange={updateAppConfigField('apkUrl')}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </Field>

                  <Field
                    id="app-store-url"
                    label="Apple App Store URL"
                    icon={Link2}
                    hint="Optional — reserved for a future iOS build."
                  >
                    <input
                      id="app-store-url"
                      type="url"
                      inputMode="url"
                      placeholder="https://apps.apple.com/app/id…"
                      value={appConfig.appStoreUrl}
                      onChange={updateAppConfigField('appStoreUrl')}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </Field>

                  {appConfigError && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-50 px-3 py-2.5 text-sm text-rose-600 dark:bg-rose-500/5 dark:text-rose-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {appConfigError}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <AnimatePresence>
                  {appConfigSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
                    >
                      <Check className="h-4 w-4" />
                      Saved
                    </motion.span>
                  )}
                </AnimatePresence>
                <Button
                  type="submit"
                  className="h-11 gap-2 rounded-xl px-5"
                  disabled={savingAppConfig || loadingAppConfig}
                >
                  {savingAppConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingAppConfig ? 'Saving…' : 'Save links'}
                </Button>
              </div>
            </motion.div>
          </form>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <ContactSettingsTab />
        </TabsContent>

        <TabsContent value="faqs" className="mt-6">
          <FaqSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

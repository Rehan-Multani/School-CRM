import React, { useEffect, useState } from 'react';
import { Card, Button, cn } from '../../components/ui/Button';
import { Pulse } from '../../components/ui/SkeletonLoader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformLegalApi } from '../../../../shared/api/client';
import { Eye, Loader2, Save, Scale } from 'lucide-react';

function LegalPreviewBody({ text }) {
  const lines = (text || '').split('\n');
  const blocks = [];
  let listItems = [];

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {listItems.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) {
      flushList();
      return;
    }
    if (line.startsWith('- ')) {
      listItems.push(line.slice(2));
      return;
    }
    flushList();
    if (line.startsWith('# ')) {
      blocks.push(
        <h1 key={index} className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {line.slice(2)}
        </h1>
      );
      return;
    }
    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={index} className="mb-2 mt-6 text-base font-semibold text-indigo-700 dark:text-indigo-300">
          {line.slice(3)}
        </h2>
      );
      return;
    }
    blocks.push(
      <p key={index} className="mb-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {line}
      </p>
    );
  });
  flushList();

  if (!blocks.length) {
    return <p className="text-sm text-slate-400">No content to preview.</p>;
  }

  return <div>{blocks}</div>;
}

function DocumentEditor({ id, label, value, onChange }) {
  const [mode, setMode] = useState('edit');

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">{label}</h3>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-semibold',
              mode === 'edit'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-semibold',
              mode === 'preview'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            Preview
          </button>
        </div>
      </div>

      {mode === 'edit' ? (
        <textarea
          id={id}
          className="min-h-[320px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
      ) : (
        <div className="min-h-[320px] rounded-xl border border-slate-200 bg-slate-50 px-5 py-5 dark:border-slate-800 dark:bg-slate-950/60">
          <LegalPreviewBody text={value} />
        </div>
      )}
    </Card>
  );
}

function LegalDocumentsSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((index) => (
        <Card key={index} className="space-y-3">
          <div className="flex items-center justify-between">
            <Pulse className="h-3.5 w-32" />
            <Pulse className="h-8 w-28 rounded-lg" />
          </div>
          <Pulse className="h-80 w-full rounded-lg" />
        </Card>
      ))}
      <Pulse className="h-10 w-48 rounded-lg" />
    </div>
  );
}

export default function PrivacyPolicyIndex() {
  const { addNotification } = useSuperAdminNotifications();
  const [privacy, setPrivacy] = useState('');
  const [terms, setTerms] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState('privacy');

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const result = await platformLegalApi.get();
      setPrivacy(result.data?.privacyPolicy || '');
      setTerms(result.data?.termsOfService || '');
      setUpdatedAt(result.data?.updatedAt || null);
    } catch (err) {
      addNotification(
        'error',
        err.response?.data?.message || err.message || 'Unable to load legal documents.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await platformLegalApi.update({
        privacyPolicy: privacy,
        termsOfService: terms,
      });
      setPrivacy(result.data?.privacyPolicy || privacy);
      setTerms(result.data?.termsOfService || terms);
      setUpdatedAt(result.data?.updatedAt || new Date().toISOString());
      addNotification('success', result.message || 'Privacy policy and terms of service updated');
    } catch (err) {
      addNotification(
        'error',
        err.response?.data?.message || err.message || 'Unable to save legal documents.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Privacy / Policy</h1>
          <p className="text-xs text-slate-400">
            Legal copy shown on the platform login and school apps.
            {updatedAt && (
              <span className="ml-2 text-slate-500">
                Last saved {new Date(updatedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          disabled={loading}
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      </div>

      {loading ? (
        <LegalDocumentsSkeleton />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <DocumentEditor
            id="privacy-policy"
            label="Privacy Policy"
            value={privacy}
            onChange={setPrivacy}
          />
          <DocumentEditor
            id="terms-of-service"
            label="Terms of Service"
            value={terms}
            onChange={setTerms}
          />

          <Button type="submit" className="gap-2" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Legal Documents
              </>
            )}
          </Button>
        </form>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-indigo-600" />
              Public preview
            </DialogTitle>
            <DialogDescription>
              This is how the document will appear to schools and parents.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <Tabs value={previewTab} onValueChange={setPreviewTab} className="mt-4">
              <TabsList>
                <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
                <TabsTrigger value="terms">Terms of Service</TabsTrigger>
              </TabsList>
              <TabsContent value="privacy">
                <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-950">
                  <LegalPreviewBody text={privacy} />
                </div>
              </TabsContent>
              <TabsContent value="terms">
                <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-950">
                  <LegalPreviewBody text={terms} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

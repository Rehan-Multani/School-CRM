import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { communicationApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { Megaphone, Send, Plus, Pencil, Trash2, Pin, Archive, ChevronRight } from 'lucide-react';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const AUDIENCES = ['ALL', 'TEACHERS', 'STUDENTS', 'PARENTS', 'STAFF'];
const STATUS_VARIANT = { DRAFT: 'default', PUBLISHED: 'success', ARCHIVED: 'warning' };

function fmt(v) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const CommunicationHub = () => {
  const { showToast, ToastComponent } = useToast();
  const [activeTab, setActiveTab] = useState('announcements');

  const [announcements, setAnnouncements] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // announcement modal
  const [annModal, setAnnModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState(null);
  const [annForm, setAnnForm] = useState({ title: '', body: '', audiences: ['ALL'], pinned: false });
  const [annSaving, setAnnSaving] = useState(false);
  const [deleteAnn, setDeleteAnn] = useState(null);
  const [annStatusFilter, setAnnStatusFilter] = useState('ALL');

  // broadcast modal
  const [bcModal, setBcModal] = useState(false);
  const [bcForm, setBcForm] = useState({ channel: 'SMS', audienceLabel: 'All Parents', content: '' });
  const [bcSaving, setBcSaving] = useState(false);

  // messaging
  const [activeThread, setActiveThread] = useState(null);
  const [threadMsgs, setThreadMsgs] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [replySending, setReplySending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, bRes, tRes] = await Promise.all([
        communicationApi.announcements({ status: annStatusFilter, limit: 200 }),
        communicationApi.broadcasts({ limit: 200 }).catch(() => ({ data: [] })),
        communicationApi.threads().catch(() => ({ data: [] })),
      ]);
      setAnnouncements(aRes?.data || []);
      setBroadcasts(bRes?.data || []);
      setThreads(tRes?.data || []);
    } catch (err) {
      setError(apiMessage(err, 'Unable to load communication data'));
    } finally {
      setLoading(false);
    }
  }, [annStatusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- announcements ----
  const openAnnCreate = () => {
    setEditingAnn(null);
    setAnnForm({ title: '', body: '', audiences: ['ALL'], pinned: false });
    setAnnModal(true);
  };
  const openAnnEdit = (row) => {
    setEditingAnn(row);
    setAnnForm({
      title: row.title || '',
      body: row.body || '',
      audiences: row.audiences?.length ? row.audiences : ['ALL'],
      pinned: Boolean(row.pinned),
    });
    setAnnModal(true);
  };
  const toggleAud = (a) => {
    setAnnForm((f) => {
      const has = f.audiences.includes(a);
      let next = has ? f.audiences.filter((x) => x !== a) : [...f.audiences, a];
      if (a === 'ALL' && !has) next = ['ALL'];
      else if (a !== 'ALL') next = next.filter((x) => x !== 'ALL');
      if (!next.length) next = ['ALL'];
      return { ...f, audiences: next };
    });
  };
  const submitAnn = async (publish) => {
    if (!annForm.title.trim()) return showToast('Title is required', 'error');
    setAnnSaving(true);
    try {
      if (editingAnn) {
        await communicationApi.updateAnnouncement(editingAnn.id, annForm);
        if (publish && editingAnn.status !== 'PUBLISHED') await communicationApi.publishAnnouncement(editingAnn.id);
        showToast('Announcement updated', 'success');
      } else {
        await communicationApi.createAnnouncement({ ...annForm, publish });
        showToast(publish ? 'Announcement published' : 'Draft saved', 'success');
      }
      setAnnModal(false);
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to save announcement'), 'error');
    } finally {
      setAnnSaving(false);
    }
  };
  const doPublish = async (row) => {
    try {
      await communicationApi.publishAnnouncement(row.id);
      showToast('Published', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to publish'), 'error');
    }
  };
  const doPinArchive = async (row, patch) => {
    try {
      await communicationApi.updateAnnouncement(row.id, patch);
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to update'), 'error');
    }
  };
  const confirmDeleteAnn = async () => {
    if (!deleteAnn) return;
    try {
      await communicationApi.deleteAnnouncement(deleteAnn.id);
      showToast('Announcement deleted', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to delete'), 'error');
    } finally {
      setDeleteAnn(null);
    }
  };

  // ---- broadcast ----
  const submitBroadcast = async (e) => {
    e.preventDefault();
    if (!bcForm.content.trim()) return showToast('Message content is required', 'error');
    if (bcForm.channel === 'SMS' && bcForm.content.length > 160) {
      showToast('SMS is over 160 chars — it will be sent as multiple parts', 'warning');
    }
    setBcSaving(true);
    try {
      await communicationApi.createBroadcast(bcForm);
      showToast('Broadcast recorded', 'success');
      setBcModal(false);
      setBcForm({ channel: 'SMS', audienceLabel: 'All Parents', content: '' });
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to send broadcast'), 'error');
    } finally {
      setBcSaving(false);
    }
  };

  // ---- messaging ----
  const openThread = async (t) => {
    setActiveThread(t);
    setThreadLoading(true);
    try {
      const res = await communicationApi.thread(t.threadKey);
      setThreadMsgs(res?.data || []);
      setThreads((prev) => prev.map((x) => (x.threadKey === t.threadKey ? { ...x, unread: 0 } : x)));
    } catch (err) {
      showToast(apiMessage(err, 'Unable to open conversation'), 'error');
    } finally {
      setThreadLoading(false);
    }
  };
  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !activeThread) return;
    setReplySending(true);
    try {
      await communicationApi.reply(activeThread.threadKey, reply.trim());
      const res = await communicationApi.thread(activeThread.threadKey);
      setThreadMsgs(res?.data || []);
      setReply('');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to send reply'), 'error');
    } finally {
      setReplySending(false);
    }
  };

  const annColumns = useMemo(
    () => [
      {
        key: 'title',
        title: 'Announcement',
        sortable: true,
        render: (v, row) => (
          <div className="flex items-center gap-1.5">
            {row.pinned && <Pin className="h-3 w-3 text-amber-500" />}
            <span className="font-bold text-slate-900 dark:text-white">{v}</span>
          </div>
        ),
      },
      { key: 'audiences', title: 'Audience', render: (v) => <Badge variant="primary">{(v || []).join(', ')}</Badge> },
      { key: 'publishedByName', title: 'Author', render: (v) => v || '—' },
      { key: 'publishAt', title: 'Published', render: (v) => fmt(v) },
      { key: 'status', title: 'Status', render: (v) => <Badge variant={STATUS_VARIANT[v] || 'default'}>{v}</Badge> },
      {
        key: '_actions',
        title: 'Actions',
        align: 'right',
        render: (_v, row) => (
          <div className="flex items-center justify-end gap-1">
            {row.status === 'DRAFT' && (
              <button type="button" onClick={() => doPublish(row)} className="rounded-lg px-2 py-1 text-[11px] font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                Publish
              </button>
            )}
            <button type="button" onClick={() => doPinArchive(row, { pinned: !row.pinned })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-slate-800" title={row.pinned ? 'Unpin' : 'Pin'}>
              <Pin size={14} />
            </button>
            {row.status !== 'ARCHIVED' && (
              <button type="button" onClick={() => doPinArchive(row, { status: 'ARCHIVED' })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" title="Archive">
                <Archive size={14} />
              </button>
            )}
            <button type="button" onClick={() => openAnnEdit(row)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800" title="Edit">
              <Pencil size={14} />
            </button>
            <button type="button" onClick={() => setDeleteAnn(row)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const bcColumns = useMemo(
    () => [
      { key: 'channel', title: 'Channel', render: (v) => <Badge variant={v === 'EMAIL' ? 'info' : v === 'SMS' ? 'warning' : 'success'}>{v}</Badge> },
      { key: 'audienceLabel', title: 'Recipient' },
      { key: 'content', title: 'Content', render: (v) => <span className="line-clamp-2 max-w-md text-xs">{v}</span> },
      { key: 'status', title: 'Status', render: (v) => <Badge variant="success">{v}</Badge> },
      { key: 'sentByName', title: 'Sent By', render: (v) => v || '—' },
      { key: 'createdAt', title: 'When', render: (v) => fmt(v) },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication Hub"
        subtitle="Broadcast school announcements, send targeted SMS/Email alerts, and message staff directly."
        actions={
          <div className="flex gap-2">
            <button onClick={() => setBcModal(true)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
              <Send className="h-3.5 w-3.5" /> Broadcast Alert
            </button>
            <button onClick={openAnnCreate} className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm">
              <Plus className="h-3.5 w-3.5" /> Create Announcement
            </button>
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: 'announcements', label: 'Announcements', count: announcements.length },
          { id: 'alerts', label: 'Broadcast Log', count: broadcasts.length },
          { id: 'messaging', label: 'Internal Messages', count: threads.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/60 p-10 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button type="button" onClick={load} className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">
            Retry
          </button>
        </div>
      ) : activeTab === 'announcements' ? (
        <>
          <div className="flex gap-2">
            {['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map((s) => (
              <button
                key={s}
                onClick={() => setAnnStatusFilter(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                  annStatusFilter === s ? 'bg-primary text-white' : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <DataTable
            columns={annColumns}
            data={announcements}
            loading={loading}
            searchPlaceholder="Search announcements..."
            searchKeys={['title', 'body']}
            emptyMessage="No announcements yet."
            csvFilename="announcements.csv"
          />
        </>
      ) : activeTab === 'alerts' ? (
        <DataTable
          columns={bcColumns}
          data={broadcasts}
          loading={loading}
          searchPlaceholder="Search broadcast history..."
          searchKeys={['content', 'audienceLabel', 'sentByName']}
          emptyMessage="No broadcasts sent yet."
          csvFilename="broadcast_log.csv"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            <span className="p-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Conversations</span>
            {threads.length === 0 && (
              <div className="p-6 text-center text-xs font-semibold text-slate-400">No conversations yet.</div>
            )}
            {threads.map((t) => (
              <button
                key={t.threadKey}
                onClick={() => openThread(t)}
                className={`flex items-center justify-between p-4 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-950/20 ${
                  activeThread?.threadKey === t.threadKey ? 'border-l-4 border-primary bg-primary/5' : ''
                }`}
              >
                <div className="space-y-1">
                  <span className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                    {t.fromName}
                    {t.unread > 0 && <span className="rounded-full bg-primary px-1.5 text-[9px] text-white">{t.unread}</span>}
                  </span>
                  <span className="block max-w-[180px] truncate font-medium text-slate-400">{t.lastBody}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            ))}
          </div>

          <div className="flex min-h-[360px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            {!activeThread ? (
              <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                Select a conversation
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold text-slate-900 dark:border-slate-800 dark:text-white">
                    <Megaphone className="h-5 w-5 text-primary" />
                    <span>{activeThread.fromName}</span>
                  </div>
                  {threadLoading ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading…</div>
                  ) : (
                    threadMsgs.map((m) => (
                      <div key={m.id} className={`flex ${m.direction === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-sm rounded-2xl px-3.5 py-2 text-xs font-semibold ${
                            m.direction === 'OUT'
                              ? 'bg-primary text-white'
                              : 'bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-200'
                          }`}
                        >
                          <div>{m.body}</div>
                          <div className={`mt-1 text-[9px] ${m.direction === 'OUT' ? 'text-white/70' : 'text-slate-400'}`}>{fmt(m.createdAt)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={sendReply} className="mt-4 flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <input
                    className={inputCls}
                    placeholder={`Reply to ${activeThread.fromName}...`}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={replySending}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                  >
                    <Send className="h-3.5 w-3.5" /> {replySending ? 'Sending…' : 'Send'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT MODAL */}
      <Modal isOpen={annModal} onClose={() => setAnnModal(false)} title={editingAnn ? 'Edit Announcement' : 'Create Announcement'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-400">Title *</label>
            <input className={inputCls} value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} placeholder="e.g. Winter Holiday Schedule Notice" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-400">Message</label>
            <textarea rows={4} className={`${inputCls} resize-y`} value={annForm.body} onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold text-slate-400">Audience</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAud(a)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                    annForm.audiences.includes(a) ? 'bg-primary text-white' : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={annForm.pinned} onChange={(e) => setAnnForm({ ...annForm, pinned: e.target.checked })} className="h-4 w-4 rounded text-primary" />
            Pin to top
          </label>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setAnnModal(false)} className="rounded-xl px-4 py-2 text-xs font-semibold">Cancel</button>
            <button type="button" disabled={annSaving} onClick={() => submitAnn(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200">
              Save Draft
            </button>
            <button type="button" disabled={annSaving} onClick={() => submitAnn(true)} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {annSaving ? 'Saving…' : 'Publish'}
            </button>
          </div>
        </div>
      </Modal>

      {/* BROADCAST MODAL */}
      <Modal isOpen={bcModal} onClose={() => setBcModal(false)} title="Broadcast SMS / Email / Push Alert">
        <form onSubmit={submitBroadcast} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-400">Channel</label>
              <select className={inputCls} value={bcForm.channel} onChange={(e) => setBcForm({ ...bcForm, channel: e.target.value })}>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
                <option value="PUSH">App Push</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-400">Recipient Group</label>
              <input className={inputCls} value={bcForm.audienceLabel} onChange={(e) => setBcForm({ ...bcForm, audienceLabel: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-400">Message ({bcForm.content.length} chars)</label>
            <textarea rows={4} className={`${inputCls} resize-y`} value={bcForm.content} onChange={(e) => setBcForm({ ...bcForm, content: e.target.value })} placeholder="Keep below 160 chars for a single SMS…" />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setBcModal(false)} className="rounded-xl px-4 py-2 text-xs font-semibold">Cancel</button>
            <button type="submit" disabled={bcSaving} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {bcSaving ? 'Sending…' : 'Send Alert'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteAnn)}
        onClose={() => setDeleteAnn(null)}
        onConfirm={confirmDeleteAnn}
        title="Delete Announcement"
        message={`Delete "${deleteAnn?.title}"?`}
        confirmText="Delete"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default CommunicationHub;

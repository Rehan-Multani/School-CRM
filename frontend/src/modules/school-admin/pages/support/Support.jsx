import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { LifeBuoy, Loader2, MessageSquare, Plus, Send } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
import { schoolSupportApi } from '../../../../shared/api/client';

const CATEGORIES = ['Billing', 'Technical', 'Account', 'Academic', 'Feature Request', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const emptyForm = () => ({
  subject: '',
  description: '',
  category: 'Technical',
  priority: 'Medium',
});

function relativeTime(value) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '';
  }
}

function statusVariant(status) {
  if (status === 'Resolved') return 'success';
  if (status === 'Closed') return 'default';
  if (status === 'In Progress') return 'info';
  return 'warning';
}

function priorityVariant(priority) {
  if (priority === 'Critical' || priority === 'High') return 'danger';
  if (priority === 'Medium') return 'warning';
  return 'secondary';
}

export const Support = () => {
  const { user, loading: authLoading } = useSchoolAdminAuth();
  const { showToast, ToastComponent } = useToast();
  const schoolId = user?.schoolId;
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('All');
  const [selectedId, setSelectedId] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadTickets = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await schoolSupportApi.list(schoolId, { status });
      setTickets(result.data || []);
      setStats(result.stats || stats);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Unable to load tickets.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [schoolId, status]);

  useEffect(() => {
    if (!selectedId) {
      setActiveTicket(null);
      return;
    }
    const local = tickets.find((ticket) => ticket.id === selectedId);
    if (local) setActiveTicket(local);
  }, [selectedId, tickets]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await schoolSupportApi.create(schoolId, {
        ...form,
        createdByName: user?.name || 'School Admin',
        createdByEmail: user?.email || '',
      });
      showToast(result.message || 'Ticket raised to Super Admin', 'success');
      setCreateOpen(false);
      setForm(emptyForm());
      setSelectedId(result.data?.id || null);
      await loadTickets();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Unable to raise ticket.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    setSending(true);
    try {
      const result = await schoolSupportApi.reply(schoolId, activeTicket.id, {
        body: replyText.trim(),
        createdByName: user?.name || 'School Admin',
        createdByEmail: user?.email || '',
      });
      setActiveTicket(result.data);
      setReplyText('');
      showToast('Reply sent to Super Admin', 'success');
      await loadTickets();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Unable to send reply.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <ToastComponent />
      <PageHeader
        title="Help & Support"
        subtitle="Raise a ticket for billing, login, or module issues. Super Admin will reply and resolve it."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Raise ticket
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Open', value: stats.open },
          { label: 'In progress', value: stats.inProgress },
          { label: 'Resolved', value: stats.resolved },
          { label: 'Total', value: stats.total },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 xl:col-span-3">
          <Select
            label="Filter status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'All', label: 'All tickets' },
              { value: 'Open', label: 'Open' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Resolved', label: 'Resolved' },
              { value: 'Closed', label: 'Closed' },
            ]}
          />

          {authLoading || loading ? (
            <SkeletonList count={4} />
          ) : !schoolId ? (
            <div className="flex flex-col items-center py-16 text-center">
              <LifeBuoy className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">School not linked</p>
              <p className="mt-1 text-xs text-slate-400">Sign in again to raise support tickets.</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <LifeBuoy className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">No tickets yet</p>
              <p className="mt-1 text-xs text-slate-400">Raise one when you need Super Admin help.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedId(ticket.id)}
                  className={`flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    selectedId === ticket.id ? 'bg-indigo-50 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] font-bold text-indigo-600">{ticket.ticketNo}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{ticket.subject}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={statusVariant(ticket.status)}>{ticket.status}</Badge>
                      <Badge variant={priorityVariant(ticket.priority)}>{ticket.priority}</Badge>
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400">
                    {ticket.category} · {relativeTime(ticket.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-h-[480px] flex-col rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
          {activeTicket ? (
            <>
              <div className="mb-4 border-b border-slate-200 pb-4 dark:border-slate-800">
                <p className="font-mono text-xs font-bold text-indigo-600">{activeTicket.ticketNo}</p>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">{activeTicket.subject}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant={statusVariant(activeTicket.status)}>{activeTicket.status}</Badge>
                  <Badge variant={priorityVariant(activeTicket.priority)}>{activeTicket.priority}</Badge>
                  <Badge variant="secondary">{activeTicket.category}</Badge>
                </div>
                {activeTicket.status === 'Resolved' && (
                  <p className="mt-2 text-[11px] font-medium text-emerald-600">
                    Super Admin marked this resolved. Reply if the issue is still open.
                  </p>
                )}
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                {(activeTicket.messages || []).map((message) => {
                  const mine = message.authorRole === 'SchoolAdmin';
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                          mine
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
                        }`}
                      >
                        <p className={`mb-1 text-[10px] font-bold ${mine ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {mine ? 'You' : 'Super Admin'} · {relativeTime(message.createdAt)}
                        </p>
                        {message.body}
                      </div>
                    </div>
                  );
                })}
              </div>
              {activeTicket.status !== 'Closed' ? (
                <form onSubmit={handleReply} className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Add more details for Super Admin..."
                    className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send reply
                  </button>
                </form>
              ) : (
                <p className="mt-4 text-xs text-slate-400">This ticket is closed.</p>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MessageSquare className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Select a ticket</p>
              <p className="mt-1 max-w-[200px] text-xs text-slate-400">
                Super Admin replies will appear in the conversation.
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Raise a support ticket"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="raise-ticket-form"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {saving ? 'Submitting...' : 'Submit ticket'}
            </button>
          </>
        }
      >
        <form id="raise-ticket-form" onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Category"
            value={form.category}
            onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
            options={CATEGORIES.map((item) => ({ value: item, label: item }))}
          />
          <Select
            label="Priority"
            value={form.priority}
            onChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}
            options={PRIORITIES.map((item) => ({ value: item, label: item }))}
          />
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Subject</label>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
              placeholder="Short summary of the issue"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Details</label>
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
              placeholder="What happened, which module, and who is affected?"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Support;

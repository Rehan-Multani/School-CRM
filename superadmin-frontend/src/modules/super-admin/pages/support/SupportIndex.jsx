import React, { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle2,
  CircleDot,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  TriangleAlert,
} from 'lucide-react';
import { Card, Button, Badge, cn } from '../../components/ui/Button';
import { Pulse } from '../../components/ui/SkeletonLoader';
import { Input, Select, Textarea } from '../../components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformSchoolApi, platformSupportApi } from '../../../../shared/api/client';

const CATEGORIES = ['Billing', 'Technical', 'Account', 'Academic', 'Feature Request', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];

const emptyForm = () => ({
  schoolId: '',
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

function statusBadge(status) {
  if (status === 'Resolved') return 'success';
  if (status === 'Closed') return 'default';
  if (status === 'In Progress') return 'info';
  return 'warning';
}

function priorityBadge(priority) {
  if (priority === 'Critical' || priority === 'High') return 'danger';
  if (priority === 'Medium') return 'warning';
  return 'default';
}

function SupportListSkeleton() {
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Pulse className="h-2.5 w-16" />
              <Pulse className="h-3.5 w-48" />
              <Pulse className="h-2.5 w-28" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Pulse className="h-5 w-16 rounded-full" />
              <Pulse className="h-5 w-14 rounded-full" />
            </div>
          </div>
          <Pulse className="h-2.5 w-40" />
        </div>
      ))}
    </div>
  );
}

function SupportDetailSkeleton() {
  return (
    <div className="flex min-h-[520px] flex-col">
      <div className="mb-4 space-y-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <Pulse className="h-2.5 w-20" />
        <Pulse className="h-5 w-56" />
        <Pulse className="h-3 w-32" />
        <div className="flex gap-2">
          <Pulse className="h-5 w-16 rounded-full" />
          <Pulse className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="flex-1 space-y-3">
        <Pulse className="h-16 w-4/5 rounded-2xl" />
        <Pulse className="ml-auto h-16 w-3/4 rounded-2xl" />
        <Pulse className="h-12 w-2/3 rounded-2xl" />
      </div>
    </div>
  );
}

export default function SupportIndex() {
  const { addNotification } = useSuperAdminNotifications();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, closed: 0, critical: 0, total: 0 });
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [priority, setPriority] = useState('All');
  const [selectedId, setSelectedId] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const [ticketResult, schoolResult] = await Promise.all([
        platformSupportApi.list({
          search: search || undefined,
          status,
          priority,
        }),
        platformSchoolApi.list({ page: 1, limit: 50, status: 'All', plan: 'All' }),
      ]);
      setTickets(ticketResult.data || []);
      setStats(ticketResult.stats || stats);
      setSchools(schoolResult.data || []);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadTickets, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, status, priority]);

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
      const result = await platformSupportApi.create(form);
      addNotification('success', result.message || 'Ticket created for the school');
      setCreateOpen(false);
      setForm(emptyForm());
      setSelectedId(result.data?.id || null);
      await loadTickets();
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to create ticket.');
    } finally {
      setSaving(false);
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    setSending(true);
    try {
      const result = await platformSupportApi.reply(activeTicket.id, { body: replyText.trim() });
      setActiveTicket(result.data);
      setReplyText('');
      addNotification('success', 'Reply sent to the school');
      await loadTickets();
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to send reply.');
    } finally {
      setSending(false);
    }
  };

  const handleStatus = async (nextStatus) => {
    if (!activeTicket) return;
    try {
      const result = await platformSupportApi.updateStatus(activeTicket.id, nextStatus);
      setActiveTicket(result.data);
      addNotification('success', result.message || `Ticket ${nextStatus}`);
      await loadTickets();
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to update status.');
    }
  };

  const selectedSchoolName = useMemo(
    () => schools.find((school) => school.schoolId === form.schoolId)?.name,
    [schools, form.schoolId]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-xs text-slate-400">
            School admins raise issues here. You can also open a ticket for a school and resolve the thread.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create ticket for school
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="space-y-2">
              <Pulse className="h-2.5 w-16" />
              <Pulse className="h-7 w-12" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Open</p>
            <p className="text-2xl font-bold">{stats.open}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">In progress</p>
            <p className="text-2xl font-bold text-sky-600">{stats.inProgress}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Resolved</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Critical open</p>
            <p className="text-2xl font-bold text-rose-600">{stats.critical}</p>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="space-y-4 xl:col-span-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              placeholder="Search ticket, school, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((item) => (
                <option key={item} value={item}>{item === 'All' ? 'All statuses' : item}</option>
              ))}
            </Select>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="All">All priorities</option>
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
          </div>

          {loading ? (
            <SupportListSkeleton />
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <LifeBuoy className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No tickets match these filters</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedId(ticket.id)}
                  className={cn(
                    'flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900/60',
                    selectedId === ticket.id && 'bg-indigo-50/70 dark:bg-indigo-950/20'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] text-indigo-600">{ticket.ticketNo}</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{ticket.subject}</p>
                      <p className="text-xs text-slate-500">{ticket.schoolName}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={statusBadge(ticket.status)}>{ticket.status}</Badge>
                      <Badge variant={priorityBadge(ticket.priority)}>{ticket.priority}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span>{ticket.category}</span>
                    <span>·</span>
                    <span>Raised by {ticket.createdByRole === 'SuperAdmin' ? 'Super Admin' : 'School'}</span>
                    <span>·</span>
                    <span>{relativeTime(ticket.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex min-h-[520px] flex-col xl:col-span-2">
          {loading ? (
            <SupportDetailSkeleton />
          ) : activeTicket ? (
            <>
              <div className="mb-4 space-y-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-indigo-600">{activeTicket.ticketNo}</p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{activeTicket.subject}</h3>
                    <p className="text-xs text-slate-500">{activeTicket.schoolName}</p>
                  </div>
                  <Badge variant={statusBadge(activeTicket.status)}>{activeTicket.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={priorityBadge(activeTicket.priority)}>{activeTicket.priority}</Badge>
                  <Badge>{activeTicket.category}</Badge>
                  <Badge variant="info">{activeTicket.createdByRole === 'SuperAdmin' ? 'Opened by Super Admin' : 'Opened by School'}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeTicket.status !== 'In Progress' && activeTicket.status !== 'Resolved' && (
                    <Button size="sm" variant="secondary" onClick={() => handleStatus('In Progress')}>
                      <CircleDot className="mr-1 h-3.5 w-3.5" />
                      In progress
                    </Button>
                  )}
                  {activeTicket.status !== 'Resolved' && (
                    <Button size="sm" onClick={() => handleStatus('Resolved')}>
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Resolve
                    </Button>
                  )}
                  {activeTicket.status === 'Resolved' && (
                    <Button size="sm" variant="secondary" onClick={() => handleStatus('Closed')}>
                      Close ticket
                    </Button>
                  )}
                  {activeTicket.status === 'Closed' && (
                    <Button size="sm" variant="secondary" onClick={() => handleStatus('Open')}>
                      Reopen
                    </Button>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {(activeTicket.messages || []).map((message) => {
                  const fromAdmin = message.authorRole === 'SuperAdmin';
                  return (
                    <div key={message.id} className={cn('flex', fromAdmin ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                          fromAdmin
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                        )}
                      >
                        <p className={cn('mb-1 text-[10px] font-semibold', fromAdmin ? 'text-indigo-100' : 'text-slate-400')}>
                          {message.authorName} · {relativeTime(message.createdAt)}
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
                    placeholder="Reply to the school..."
                    className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-800 dark:bg-slate-950"
                  />
                  <Button type="submit" className="w-full gap-2" disabled={sending || !replyText.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send reply
                  </Button>
                </form>
              ) : (
                <p className="mt-4 text-xs text-slate-400">This ticket is closed. Reopen it to continue the thread.</p>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MessageSquare className="mb-3 h-8 w-8 text-slate-300" />
              <h4 className="text-sm font-semibold">Select a ticket</h4>
              <p className="mt-1 max-w-[220px] text-xs text-slate-400">
                Open a school issue to reply, mark in progress, or resolve it.
              </p>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create ticket for a school</DialogTitle>
            <DialogDescription>
              Use this when you need to log an issue on behalf of a school. They will see it in their Help & Support.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <Select
              label="School"
              value={form.schoolId}
              onChange={(e) => setForm((prev) => ({ ...prev, schoolId: e.target.value }))}
              required
            >
              <option value="">Select school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.schoolId}>
                  {school.name}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </Select>
              <Select
                label="Priority"
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              >
                {PRIORITIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </Select>
            </div>
            <Input
              label="Subject"
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              required
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              required
            />
            {selectedSchoolName && (
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <TriangleAlert className="h-3.5 w-3.5" />
                {selectedSchoolName} will see this ticket in their admin portal.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create ticket'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

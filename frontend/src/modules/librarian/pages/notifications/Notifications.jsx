import React, { useState, useMemo } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import { useLibrarianNotifications } from '../../context/LibrarianNotificationContext';
import { librarianApi } from '../../../../shared/api/client';
import {
  Bell,
  CheckCheck,
  ShieldAlert,
  Receipt,
  Info,
  Bookmark,
  Send,
  Search,
  Users,
  GraduationCap,
  Briefcase,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const TAG_STYLES = {
  Due: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
  Issued: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400',
  Reserved: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
};

const TYPE_LABELS = {
  overdue: 'Overdue',
  fine: 'Fines',
  reservation: 'Reservations',
  inventory: 'Inventory',
  info: 'General',
};

export const Notifications = () => {
  const toast = useToast();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useLibrarianNotifications();

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [inboxTab, setInboxTab] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const res = await librarianApi.notificationRecipients();
      if (res?.success && Array.isArray(res.data)) {
        setRecipients(res.data);
      } else {
        setRecipients([]);
      }
    } catch {
      toast.error('Failed to load students/teachers list');
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const openSendModal = () => {
    setSendModalOpen(true);
    setTitle('');
    setBody('');
    setTypeFilter('ALL');
    setSearch('');
    setSelectedIds(new Set());
    fetchRecipients();
  };

  const filteredRecipients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipients.filter((r) => {
      if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.code && r.code.toLowerCase().includes(q)) ||
        (r.class && r.class.toLowerCase().includes(q))
      );
    });
  }, [recipients, typeFilter, search]);

  const allFilteredSelected = filteredRecipients.length > 0 && filteredRecipients.every((r) => selectedIds.has(r.id));

  const toggleRecipient = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredRecipients.forEach((r) => next.delete(r.id));
      } else {
        filteredRecipients.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const inboxTabs = useMemo(() => {
    const types = [...new Set(notifications.map((n) => n.type))];
    return [
      { id: 'ALL', label: 'All', count: notifications.length },
      { id: 'UNREAD', label: 'Unread', count: unreadCount },
      ...types.map((type) => ({
        id: type,
        label: TYPE_LABELS[type] || type,
        count: notifications.filter((n) => n.type === type).length,
      })),
    ];
  }, [notifications, unreadCount]);

  const filteredNotifications = useMemo(() => {
    if (inboxTab === 'ALL') return notifications;
    if (inboxTab === 'UNREAD') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === inboxTab);
  }, [notifications, inboxTab]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Please enter both a title and a message.');
      return;
    }
    if (selectedIds.size === 0) {
      toast.error('Select at least one student or teacher to notify.');
      return;
    }

    const selected = recipients.filter((r) => selectedIds.has(r.id));
    const audiences = [...new Set(selected.map((r) => (r.type === 'TEACHER' ? 'teacher' : 'student')))];

    setSending(true);
    try {
      const res = await librarianApi.sendNotification({
        title: title.trim(),
        body: body.trim(),
        audiences,
        recipientRefIds: Array.from(selectedIds),
      });
      toast.success(res?.message || `Notification sent to ${selectedIds.size} recipient(s)!`);
      setSendModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'overdue':
        return <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'fine':
        return <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'reservation':
        return <Bookmark className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert Notifications"
        subtitle="Manage overdue notices, hold queue warnings, and fine collected alerts."
        actions={
          <div className="flex items-center gap-2.5">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="h-10 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-150 bg-white dark:bg-slate-900"
              >
                <CheckCheck className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                <span>Mark All as Read</span>
              </button>
            )}
            <button
              onClick={openSendModal}
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-xs"
            >
              <Send className="h-4 w-4" />
              <span>Send Notification</span>
            </button>
          </div>
        }
      />

      <Tabs tabs={inboxTabs} activeTab={inboxTab} onChange={setInboxTab} />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden">
        {filteredNotifications.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-850',
                  !notif.read && 'bg-indigo-50/50 dark:bg-indigo-950/10'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', !notif.read ? 'bg-indigo-600' : 'bg-transparent')} />
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="min-w-0 flex-1 flex items-baseline gap-2">
                  <span className={cn(
                    'text-xs shrink-0',
                    !notif.read ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-500 dark:text-slate-400'
                  )}>
                    {notif.title}
                  </span>
                  <span className="text-2xs text-slate-400 truncate">{notif.message}</span>
                </div>
                <span className="text-3xs text-slate-400 font-semibold shrink-0">{notif.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full w-12 h-12 items-center justify-center">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Alert Notifications</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {inboxTab === 'ALL'
                ? 'Overdue notices, hold queue warnings, and fine alerts will appear here.'
                : 'No notifications match this filter.'}
            </p>
          </div>
        )}
      </div>

      {/* Send Notification Modal */}
      <Modal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        title="Send Notification"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-3xs font-bold text-slate-500 uppercase">Notification Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Book Return Reminder"
                className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-3xs font-bold text-slate-500 uppercase">Message *</label>
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="e.g. Your borrowed book is due soon. Please return it to avoid a fine."
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-3xs font-bold text-slate-500 uppercase">
                Select Students / Teachers * {selectedIds.size > 0 && `(${selectedIds.size} selected)`}
              </label>
              <div className="flex items-center p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                {[
                  { id: 'ALL', label: 'All', icon: Users },
                  { id: 'STUDENT', label: 'Students', icon: GraduationCap },
                  { id: 'TEACHER', label: 'Teachers', icon: Briefcase },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTypeFilter(f.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-3xs font-bold flex items-center gap-1 transition-colors',
                      typeFilter === f.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
                    )}
                  >
                    <f.icon className="h-3 w-3" />
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, code, or class..."
                className="w-full h-9 pl-8 pr-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 text-3xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    className="h-3.5 w-3.5 rounded accent-indigo-600"
                  />
                  <span>Select All ({filteredRecipients.length})</span>
                </label>
                <button onClick={fetchRecipients} disabled={loadingRecipients} className="text-slate-400 hover:text-indigo-600">
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingRecipients ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {loadingRecipients ? (
                  <div className="py-10 text-center text-xs font-semibold text-slate-400">
                    Loading students &amp; teachers...
                  </div>
                ) : filteredRecipients.length === 0 ? (
                  <div className="py-10 text-center text-xs font-semibold text-slate-400">
                    No members found matching your filters.
                  </div>
                ) : (
                  filteredRecipients.map((r) => (
                    <label
                      key={r.id}
                      className={cn(
                        'flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors',
                        selectedIds.has(r.id) ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleRecipient(r.id)}
                        className="h-3.5 w-3.5 rounded accent-indigo-600 shrink-0"
                      />
                      <div className={cn(
                        'p-1.5 rounded-lg shrink-0',
                        r.type === 'STUDENT' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30'
                      )}>
                        {r.type === 'STUDENT' ? <GraduationCap className="h-3.5 w-3.5" /> : <Briefcase className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{r.name}</span>
                          <span className="text-3xs text-slate-400 font-mono shrink-0">{r.code}</span>
                        </div>
                        <span className="text-3xs text-slate-400 block truncate">{r.class}</span>
                      </div>
                      {r.tags.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          {r.tags.map((tag) => (
                            <span key={tag} className={cn('px-1.5 py-0.5 rounded text-3xs font-bold', TAG_STYLES[tag] || 'bg-slate-100 text-slate-600')}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setSendModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{sending ? 'Sending...' : `Send to ${selectedIds.size || ''} Recipient${selectedIds.size === 1 ? '' : 's'}`}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default Notifications;

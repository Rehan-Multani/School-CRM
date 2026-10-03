import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Inbox,
  Clock,
  CheckCircle2,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  Trash2,
  Eye,
  Check,
  Copy,
  AlertCircle,
  Download,
  MessageCircle,
  StickyNote,
  RotateCcw,
  CalendarDays,
  ArrowDownUp,
  X,
} from 'lucide-react';
import { Card, Button, Badge, cn } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { Pulse } from '../../components/ui/SkeletonLoader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { showToast } from '../../../../shared/ui/Toast';
import { platformEnquiryApi } from '../../../../shared/api/client';

const PAGE_SIZE = 10;
const NOTES_MAX = 2000;
// Excel only reads a UTF-8 CSV correctly (Hindi names, ₹) when it starts with this mark.
const BOM = String.fromCharCode(0xfeff);
// The public contact page promises a reply within 24 hours.
const OVERDUE_MS = 24 * 60 * 60 * 1000;

const isOverdue = (item) =>
  item.status === 'Pending' && item.createdAt && Date.now() - new Date(item.createdAt).getTime() > OVERDUE_MS;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy, hh:mm a');
};

const formatRel = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true });
};

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';

const replyMailto = (item) => {
  const subject = `Re: Your enquiry${item.schoolName ? ` for ${item.schoolName}` : ''}`;
  const body = `Hi ${firstName(item.name)},\n\nThank you for contacting us.\n\n`;
  return `mailto:${item.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/** wa.me link, or '' when the number is not usable. A bare 10-digit number is treated as Indian. */
const whatsappLink = (item) => {
  let digits = String(item.phone || '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 11 || digits.length > 15) return '';
  const text = `Hi ${firstName(item.name)}, thank you for your enquiry${item.schoolName ? ` for ${item.schoolName}` : ''}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

// The form is public: a cell starting with = + - @ would run as a formula
// when the sheet is opened, so it is neutralised with a leading apostrophe.
const csvCell = (value) => {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

// Toast only: these are action results, not entries for the bell's notification list.
const notify = ({ type = 'info', title, message }) => showToast(type, message, title);

const StatusBadge = ({ item }) =>
  item.status === 'Contacted' ? (
    <Badge variant="success" className="gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Contacted
    </Badge>
  ) : (
    <Badge variant="warning" className="gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );

export const EnquiriesIndex = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, contacted: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [enquiryToDelete, setEnquiryToDelete] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Only the newest request may update the table: typing quickly or switching
  // tabs can make an older response arrive last.
  const requestId = useRef(0);

  const query = useCallback(
    (extra = {}) => ({
      search: debouncedSearch || undefined,
      status: statusFilter !== 'All' ? statusFilter : undefined,
      sort: sort === 'oldest' ? 'oldest' : undefined,
      ...extra,
    }),
    [debouncedSearch, statusFilter, sort],
  );

  const fetchEnquiries = useCallback(
    async ({ manual = false, silent = false } = {}) => {
      const id = ++requestId.current;
      if (manual) setRefreshing(true);
      else if (!silent) setLoading(true);

      try {
        const res = await platformEnquiryApi.list(query({ page, limit: PAGE_SIZE }));
        if (id !== requestId.current || !res?.success) return;
        const rows = res.data || [];
        const pages = res.pagination?.totalPages || 1;
        // The last row of the last page was deleted / moved out of this filter.
        if (!rows.length && page > pages) {
          setPage(pages);
          return;
        }
        setLoadError('');
        setEnquiries(rows);
        if (res.stats) setStats(res.stats);
        setTotalPages(pages);
        setTotalCount(res.pagination?.total || 0);
        setSelectedEnquiry((curr) => {
          if (!curr) return null;
          const found = rows.find((e) => e.id === curr.id);
          return found ? { ...curr, ...found } : curr;
        });
      } catch (err) {
        if (id !== requestId.current) return;
        const message = err?.response?.data?.message || 'Could not load enquiries. Check your connection and try again.';
        if (silent) return;
        setLoadError(message);
        if (manual) notify({ type: 'error', title: 'Refresh failed', message });
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [query, page],
  );

  // Search waits for the typing to stop, then goes back to page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // One request per change of page / filter / sort / search.
  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const patchRow = (id, patch) => {
    setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    setSelectedEnquiry((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };

  const shiftStats = (toContacted) =>
    setStats((prev) => ({
      ...prev,
      pending: Math.max(0, prev.pending + (toContacted ? -1 : 1)),
      contacted: Math.max(0, prev.contacted + (toContacted ? 1 : -1)),
    }));

  const openDetails = (item) => {
    setSelectedEnquiry(item);
    setNotesDraft(item.notes || '');
  };

  const handleSetStatus = async (item, target) => {
    if (!item?.id || item.status === target || actionLoadingId === item.id) return;
    const toContacted = target === 'Contacted';
    const before = { status: item.status, contactedAt: item.contactedAt || null, contactedBy: item.contactedBy || null };

    // Shown at once; rolled back below if the server says no.
    patchRow(
      item.id,
      toContacted
        ? { status: 'Contacted', contactedAt: new Date().toISOString(), contactedBy: item.contactedBy || 'You' }
        : { status: 'Pending', contactedAt: null, contactedBy: null },
    );
    shiftStats(toContacted);
    setActionLoadingId(item.id);

    try {
      const res = await platformEnquiryApi.updateStatus(item.id, { status: target });
      if (res?.data) patchRow(item.id, res.data);
      notify({
        type: 'success',
        title: toContacted ? 'Marked as contacted' : 'Moved back to pending',
        message: toContacted ? `${item.name}'s enquiry is marked as contacted.` : `${item.name}'s enquiry needs follow-up again.`,
      });
      fetchEnquiries({ silent: true });
    } catch (err) {
      patchRow(item.id, before);
      shiftStats(!toContacted);
      notify({
        type: 'error',
        title: 'Update failed',
        message: err?.response?.data?.message || 'Could not update the enquiry. Please try again.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const notesDirty = Boolean(selectedEnquiry) && notesDraft.trim() !== (selectedEnquiry.notes || '');

  const handleSaveNotes = async () => {
    if (!selectedEnquiry || !notesDirty || savingNotes) return;
    const { id, status } = selectedEnquiry;
    setSavingNotes(true);
    try {
      // The current status goes along so the save can never flip it.
      const res = await platformEnquiryApi.updateStatus(id, { status, notes: notesDraft.trim() });
      const saved = res?.data?.notes ?? notesDraft.trim();
      patchRow(id, { notes: saved });
      setNotesDraft(saved);
      notify({ type: 'success', title: 'Notes saved', message: 'Your follow-up notes were saved.' });
    } catch (err) {
      notify({
        type: 'error',
        title: 'Notes not saved',
        message: err?.response?.data?.message || 'Could not save the notes. Please try again.',
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const closeDetails = () => {
    if (notesDirty && !window.confirm('Your notes are not saved. Close without saving?')) return;
    setSelectedEnquiry(null);
  };

  const handleDelete = async () => {
    if (!enquiryToDelete) return;
    const target = enquiryToDelete;
    setActionLoadingId(target.id);
    try {
      await platformEnquiryApi.remove(target.id);
      notify({ type: 'success', title: 'Enquiry deleted', message: `The enquiry from ${target.name} was removed.` });
      setEnquiries((prev) => prev.filter((e) => e.id !== target.id));
      setEnquiryToDelete(null);
      setSelectedEnquiry((prev) => (prev?.id === target.id ? null : prev));
      // Counts, pagination and an emptied page are all corrected by the reload.
      fetchEnquiries({ silent: true });
    } catch (err) {
      notify({
        type: 'error',
        title: 'Delete failed',
        message: err?.response?.data?.message || 'Could not delete the enquiry. Please try again.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1800);
    } catch {
      notify({ type: 'error', title: 'Copy failed', message: 'Your browser blocked copying. Select the text and copy it manually.' });
    }
  };

  // Everything that matches the current search + filter, not only this page.
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = [];
      for (let p = 1; p <= 50; p += 1) {
        const res = await platformEnquiryApi.list(query({ page: p, limit: 100 }));
        rows.push(...(res?.data || []));
        if (p >= (res?.pagination?.totalPages || 1)) break;
      }
      if (!rows.length) {
        notify({ type: 'info', title: 'Nothing to export', message: 'No enquiries match the current filters.' });
        return;
      }
      const header = ['Name', 'Email', 'Phone', 'School', 'Message', 'Status', 'Received', 'Contacted on', 'Contacted by', 'Notes'];
      const lines = rows.map((r) =>
        [r.name, r.email, r.phone, r.schoolName, r.message, r.status, formatDate(r.createdAt), r.contactedAt ? formatDate(r.contactedAt) : '', r.contactedBy || '', r.notes || '']
          .map(csvCell)
          .join(','),
      );
      const blob = new Blob([`${BOM}${header.map(csvCell).join(',')}\r\n${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enquiries-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify({ type: 'success', title: 'Export ready', message: `${rows.length} enquir${rows.length === 1 ? 'y' : 'ies'} downloaded.` });
    } catch (err) {
      notify({
        type: 'error',
        title: 'Export failed',
        message: err?.response?.data?.message || 'Could not export the enquiries. Please try again.',
      });
    } finally {
      setExporting(false);
    }
  };

  const filtersActive = Boolean(debouncedSearch) || statusFilter !== 'All';
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setPage(1);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">School Enquiries</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Contact requests sent from the website. Reply within 24 hours.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting || loading} className="gap-2">
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fetchEnquiries({ manual: true })} disabled={refreshing} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="flex items-center justify-between border-slate-200 p-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Enquiries</p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Inbox className="h-5 w-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between border-amber-200/60 bg-amber-50/30 p-4 dark:border-amber-900/30 dark:bg-amber-950/10">
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pending Follow-up</p>
            <p className="mt-1 text-2xl font-black text-amber-900 dark:text-amber-300">{stats.pending}</p>
            {stats.overdue > 0 && (
              <p className="mt-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {stats.overdue} waiting over 24 hours
              </p>
            )}
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between border-emerald-200/60 bg-emerald-50/30 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/10">
          <div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Contacted</p>
            <p className="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-300">{stats.contacted}</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between border-slate-200 p-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Last 7 Days</p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.last7Days ?? '—'}</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
            <CalendarDays className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, school or message"
            aria-label="Search enquiries"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-950"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter by status">
            {[
              { label: 'All', value: 'All', count: stats.total },
              { label: 'Pending', value: 'Pending', count: stats.pending },
              { label: 'Contacted', value: 'Contacted', count: stats.contacted },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                  statusFilter === tab.value
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] font-bold',
                    statusFilter === tab.value
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setSort((s) => (s === 'newest' ? 'oldest' : 'newest'));
              setPage(1);
            }}
            title="Change the order"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            {sort === 'newest' ? 'Newest first' : 'Waiting longest first'}
          </button>
        </div>
      </div>

      {/* Main Table / List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Pulse className="h-4 w-44" />
                  <Pulse className="h-3 w-64" />
                </div>
                <Pulse className="h-6 w-20 rounded-full" />
                <Pulse className="h-8 w-28 rounded-xl" />
              </div>
            ))}
          </div>
        ) : loadError && enquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">Enquiries could not be loaded</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{loadError}</p>
            <Button variant="secondary" size="sm" className="mt-4 gap-2" onClick={() => fetchEnquiries()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600">
              <Inbox className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
              {filtersActive ? 'No matching enquiries' : 'No enquiries yet'}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              {filtersActive
                ? 'Nothing matches the current search and filter.'
                : 'Enquiries sent from the website contact page will appear here.'}
            </p>
            {filtersActive && (
              <Button variant="secondary" size="sm" className="mt-4" onClick={clearFilters}>
                Clear search and filter
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Contact Person</TableHead>
                  <TableHead className="w-[180px]">School Name</TableHead>
                  <TableHead>Enquiry Message</TableHead>
                  <TableHead className="w-[160px]">Received</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[210px] whitespace-nowrap text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiries.map((item) => {
                  const isContacted = item.status === 'Contacted';
                  const isActing = actionLoadingId === item.id;
                  const overdue = isOverdue(item);

                  return (
                    <TableRow key={item.id} className="group">
                      {/* Name & Contact */}
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                            <a
                              href={replyMailto(item)}
                              className="max-w-[150px] truncate hover:text-indigo-600 hover:underline dark:hover:text-indigo-400"
                              title={item.email}
                            >
                              {item.email}
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.email, `row-${item.id}`)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              aria-label={`Copy email of ${item.name}`}
                              title="Copy email"
                            >
                              {copiedKey === `row-${item.id}` ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          {item.phone && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                              <a href={`tel:${item.phone}`} className="hover:underline">
                                {item.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* School Name */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {item.schoolName || <span className="italic text-slate-400">Not specified</span>}
                          </span>
                        </div>
                      </TableCell>

                      {/* Message preview */}
                      <TableCell>
                        <div className="max-w-xs sm:max-w-md">
                          <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{item.message}</p>
                          <div className="mt-1 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openDetails(item)}
                              className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                              Read full message →
                            </button>
                            {item.notes && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400" title={item.notes}>
                                <StickyNote className="h-3 w-3" />
                                Has notes
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Received Date */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{formatDate(item.createdAt)}</p>
                          <p className={cn('text-[10px]', overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-400')}>
                            {formatRel(item.createdAt)}
                          </p>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <div className="space-y-1">
                          <StatusBadge item={item} />
                          {isContacted && item.contactedAt && (
                            <p className="text-[10px] text-slate-400">{formatRel(item.contactedAt)}</p>
                          )}
                          {overdue && <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">Over 24 hours</p>}
                        </div>
                      </TableCell>

                      {/* Action Buttons */}
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isContacted && (
                            <Button variant="success" size="xs" onClick={() => handleSetStatus(item, 'Contacted')} disabled={isActing} className="h-8 px-3">
                              <Check className="h-3.5 w-3.5" />
                              {isActing ? 'Saving…' : 'Mark Contacted'}
                            </Button>
                          )}

                          <Button
                            variant="secondary"
                            size="icon-sm"
                            onClick={() => openDetails(item)}
                            title="View details"
                            aria-label={`View enquiry from ${item.name}`}
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEnquiryToDelete(item)}
                            title="Delete enquiry"
                            aria-label={`Delete enquiry from ${item.name}`}
                            className="text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalCount}
            itemsPerPage={PAGE_SIZE}
          />
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEnquiry} onOpenChange={(open) => !open && closeDetails()}>
        <DialogContent className="max-w-lg p-5 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <DialogTitle className="text-base font-bold">Enquiry Details</DialogTitle>
              {selectedEnquiry && <StatusBadge item={selectedEnquiry} />}
            </div>
            <DialogDescription className="text-xs">
              Received on {formatDate(selectedEnquiry?.createdAt)} ({formatRel(selectedEnquiry?.createdAt)})
            </DialogDescription>
          </DialogHeader>

          {selectedEnquiry && (
            <div className="space-y-2.5 pt-1">
              {/* Contact card */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/50">
                <div>
                  <span className="text-[11px] font-medium text-slate-400">Contact Person</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">{selectedEnquiry.name}</p>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400">School Name</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{selectedEnquiry.schoolName || '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400">Work Email</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{selectedEnquiry.email}</p>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400">Phone</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{selectedEnquiry.phone || '—'}</p>
                </div>
              </div>


              {/* Message */}
              <div>
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Enquiry Message</p>
                <div className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  {selectedEnquiry.message}
                </div>
              </div>

              {/* Internal notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="enquiry-notes" className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Follow-up notes <span className="font-normal text-slate-400">(internal only)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {notesDraft.length}/{NOTES_MAX}
                    </span>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={handleSaveNotes}
                      disabled={!notesDirty || savingNotes}
                      className="h-6 px-2 text-[11px]"
                    >
                      <StickyNote className="h-2.5 w-2.5" />
                      {savingNotes ? 'Saving...' : 'Save notes'}
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="enquiry-notes"
                  rows={2}
                  maxLength={NOTES_MAX}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="e.g. Called on Monday, wants a demo next week for 800 students."
                  className="text-xs py-1.5 px-2.5 min-h-[48px] max-h-24"
                />
              </div>

              {/* Follow-up info */}
              {selectedEnquiry.status === 'Contacted' && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 py-1.5 text-[11px] text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>
                    Contacted by <strong>{selectedEnquiry.contactedBy || 'Super Admin'}</strong> on {formatDate(selectedEnquiry.contactedAt)}
                  </span>
                </div>
              )}

              {/* Dialog actions */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setEnquiryToDelete(selectedEnquiry);
                    setSelectedEnquiry(null);
                  }}
                  className="gap-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>

                {selectedEnquiry.status === 'Pending' ? (
                  <Button
                    variant="success"
                    size="xs"
                    onClick={() => handleSetStatus(selectedEnquiry, 'Contacted')}
                    disabled={actionLoadingId === selectedEnquiry.id}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {actionLoadingId === selectedEnquiry.id ? 'Saving…' : 'Mark as Contacted'}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => handleSetStatus(selectedEnquiry, 'Pending')}
                    disabled={actionLoadingId === selectedEnquiry.id}
                    title="Use this if it was marked by mistake or needs another follow-up"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {actionLoadingId === selectedEnquiry.id ? 'Saving…' : 'Move back to Pending'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!enquiryToDelete} onOpenChange={(open) => !open && setEnquiryToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">Delete Enquiry?</DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="py-2 text-xs text-slate-600 dark:text-slate-300">
            The enquiry from <strong className="text-slate-900 dark:text-white">{enquiryToDelete?.name}</strong> ({enquiryToDelete?.email})
            {enquiryToDelete?.notes ? ' and its follow-up notes' : ''} will be removed permanently.
          </p>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setEnquiryToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={actionLoadingId === enquiryToDelete?.id}>
              {actionLoadingId === enquiryToDelete?.id ? (
                <>
                  Deleting...
                </>
              ) : (
                'Delete Enquiry'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnquiriesIndex;

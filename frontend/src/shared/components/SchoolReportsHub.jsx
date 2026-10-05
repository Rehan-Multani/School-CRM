import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  Bed,
  BookOpen,
  Bus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  GraduationCap,
  IndianRupee,
  LifeBuoy,
  NotebookPen,
  Printer,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { Badge } from '../ui/Badge';
import { SkeletonTable } from '../ui/SkeletonLoader';
import { useToast } from '../ui/Toast';
import { cn } from '../lib/cn';
import { exportToCSV, exportToExcel } from '../lib/exportHelpers';
import { PrintReportModal } from './PrintReportModal';

// `countKey` reads the record count for the card from the summary endpoint.
// `dateFilter` / `statuses` list only the filters that report's API honours.
const REPORT_CATEGORIES = [
  {
    id: 'students',
    label: 'Student Directory',
    desc: 'Admission number, class & section, roll number, parent contact and status.',
    icon: Users,
    color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    group: 'Academic',
    countKey: 'studentsCount',
    statuses: ['ACTIVE', 'INACTIVE'],
  },
  {
    id: 'exams',
    label: 'Exam Schedule',
    desc: 'Exams with their type, start and end dates and publishing status.',
    icon: GraduationCap,
    color: 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400',
    group: 'Academic',
    countKey: 'examsCount',
    statuses: ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PUBLISHED', 'CANCELLED'],
  },
  {
    id: 'homework',
    label: 'Homework',
    desc: 'Assigned homework by class and subject, with submission and evaluation progress.',
    icon: NotebookPen,
    color: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400',
    group: 'Academic',
  },
  {
    id: 'fees',
    label: 'Fee Payments',
    desc: 'Every payment received: receipt number, student, amount, mode and date.',
    icon: IndianRupee,
    color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
    group: 'Finance',
    dateFilter: true,
  },
  {
    id: 'fee_dues',
    label: 'Fee Dues & Defaulters',
    desc: 'Unpaid and partly paid invoices with pending amount, due date and parent phone.',
    icon: AlertTriangle,
    color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
    group: 'Finance',
    statuses: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    desc: 'Salary records per employee and month: gross pay, deductions and net pay.',
    icon: Wallet,
    color: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400',
    group: 'Finance',
    countKey: 'payrollCount',
    statuses: ['PROCESSED', 'PAID', 'ON_HOLD', 'CANCELLED'],
  },
  {
    id: 'staff',
    label: 'Staff Directory',
    desc: 'Teachers and other staff with role, designation, department and contact details.',
    icon: UserCheck,
    color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
    group: 'Staff',
    countKey: 'staffCount',
    statuses: ['ACTIVE', 'INACTIVE'],
  },
  {
    id: 'attendance',
    label: 'Staff Attendance',
    desc: 'Day-wise staff attendance: present, absent, on leave and attendance percentage.',
    icon: Calendar,
    color: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
    group: 'Staff',
    dateFilter: true,
  },
  {
    id: 'reviews',
    label: 'Performance Reviews',
    desc: 'Staff appraisals with review period, rating, reviewer and status.',
    icon: Award,
    color: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400',
    group: 'Staff',
    countKey: 'reviewsCount',
  },
  {
    id: 'hostel',
    label: 'Hostel Allocations',
    desc: 'Students currently in the hostel with room, bed and yearly fee.',
    icon: Bed,
    color: 'bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-600 dark:text-fuchsia-400',
    group: 'Facilities',
    countKey: 'hostelCount',
  },
  {
    id: 'transport',
    label: 'Transport Riders',
    desc: 'Students using school transport with route, stop, timings and yearly fee.',
    icon: Bus,
    color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
    group: 'Facilities',
    countKey: 'transportCount',
    statuses: ['ACTIVE', 'DISCONTINUED'],
  },
  {
    id: 'library',
    label: 'Library Stock',
    desc: 'Book catalogue with total, available and issued copies and shelf location.',
    icon: BookOpen,
    color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
    group: 'Facilities',
    countKey: 'libraryCount',
  },
  {
    id: 'support',
    label: 'Support Tickets',
    desc: 'Tickets raised with the platform team, with priority and current status.',
    icon: LifeBuoy,
    color: 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400',
    group: 'Facilities',
    statuses: ['Open', 'In Progress', 'Resolved', 'Closed'],
  },
];

const GROUP_TABS = ['All', 'Academic', 'Finance', 'Staff', 'Facilities'];

const STATUS_VARIANT = {
  ACTIVE: 'success',
  PAID: 'success',
  COMPLETED: 'success',
  SUCCESS: 'success',
  PUBLISHED: 'success',
  EVALUATED: 'success',
  RESOLVED: 'success',
  CLOSED: 'default',
  PENDING: 'warning',
  PARTIALLY_PAID: 'warning',
  ON_HOLD: 'warning',
  OPEN: 'warning',
  DRAFT: 'default',
  PROCESSED: 'info',
  SCHEDULED: 'info',
  IN_PROGRESS: 'info',
  ASSIGNED: 'info',
  SUBMITTED: 'info',
  OVERDUE: 'danger',
  CANCELLED: 'danger',
  INACTIVE: 'danger',
  DISCONTINUED: 'danger',
};

const PAGE_SIZE = 25;
const FETCH_PAGE = 500; // the API's largest page
const MAX_ROWS = 5000; // stop paging here so a huge school can't hang the tab

const formatINR = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;
const statusLabel = (value) => String(value).replace(/_/g, ' ');
const statusKey = (value) => String(value).trim().toUpperCase().replace(/\s+/g, '_');
const isMoney = (value) => typeof value === 'string' && /^₹[\d,]+(\.\d+)?$/.test(value);
const isNumeric = (value) => typeof value === 'number' || isMoney(value) || /^\d+%$/.test(String(value));
const todayStr = () => new Date().toISOString().split('T')[0];

// Rows arrive display-formatted ("₹3,000", "15/7/2026"); sort on the real value.
function sortValue(value) {
  if (typeof value === 'number') return value;
  const str = String(value ?? '');
  if (isMoney(str)) return Number(str.replace(/[₹,]/g, ''));
  if (/^\d+%$/.test(str)) return Number(str.slice(0, -1));
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])).getTime();
  return str.toLowerCase();
}

// Spreadsheets need amounts as numbers, not "₹3,000" text, to be summable.
const toExportRows = (rows) =>
  rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, isMoney(value) ? Number(value.replace(/[₹,]/g, '')) : value])
    )
  );

const KpiCard = ({ label, value, hint, icon: Icon, tone }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 truncate">{value}</h3>
      <p className="text-[11px] text-slate-400 mt-1">{hint}</p>
    </div>
    <div className={cn('p-3 rounded-2xl shrink-0', tone)}>
      <Icon className="w-6 h-6" />
    </div>
  </div>
);

const toolbarButton =
  'flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * The school-wide reports page, shared by the School Admin and Principal panels.
 * `api` is `{ summary(), data(category, params) }` bound to the panel's client.
 */
export const SchoolReportsHub = ({ api, schoolName }) => {
  const { showToast, ToastComponent } = useToast();

  const [activeGroup, setActiveGroup] = useState('All');
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryFailed, setSummaryFailed] = useState(false);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [printOpen, setPrintOpen] = useState(false);

  // Ignores a slow response that a newer request has already superseded.
  const requestId = useRef(0);

  useEffect(() => {
    api
      .summary()
      .then((res) => setSummary(res?.data || null))
      .catch(() => setSummaryFailed(true));
  }, [api]);

  const loadReport = useCallback(async () => {
    if (!selected) return;
    const id = ++requestId.current;
    setLoading(true);
    try {
      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: status !== 'ALL' ? status : undefined,
        limit: FETCH_PAGE,
      };

      // Page through the whole report so search, sort and export cover every record.
      const all = [];
      let first = null;
      for (let p = 1; all.length < MAX_ROWS; p += 1) {
        const res = await api.data(selected.id, { ...params, page: p });
        if (id !== requestId.current) return;
        first = first || res;
        const batch = res?.data || [];
        all.push(...batch);
        if (!batch.length || all.length >= (res?.total || 0)) break;
      }

      setRows(all);
      setTotal(Math.max(first?.total || 0, all.length));
      setStats(first?.stats || null);
    } catch (err) {
      if (id !== requestId.current) return;
      showToast(err.response?.data?.message || err.message || 'Failed to load the report', 'error');
      setRows([]);
      setTotal(0);
      setStats(null);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoaded(true);
      }
    }
  }, [api, selected, startDate, endDate, status, showToast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const openCategory = (category) => {
    setRows([]);
    setTotal(0);
    setStats(null);
    setLoaded(false);
    setSearch('');
    setStartDate('');
    setEndDate('');
    setStatus('ALL');
    setSort({ key: null, dir: 'asc' });
    setPage(1);
    setSelected(category);
  };

  const visibleCategories = useMemo(
    () => (activeGroup === 'All' ? REPORT_CATEGORIES : REPORT_CATEGORIES.filter((c) => c.group === activeGroup)),
    [activeGroup]
  );

  const columns = useMemo(() => Object.keys(rows[0] || {}), [rows]);

  const viewRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = q
      ? rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(q)))
      : rows;
    if (!sort.key) return matched;
    const direction = sort.dir === 'asc' ? 1 : -1;
    return [...matched].sort((a, b) => {
      const x = sortValue(a[sort.key]);
      const y = sortValue(b[sort.key]);
      if (x === y) return 0;
      return (x > y ? 1 : -1) * direction;
    });
  }, [rows, search, sort]);

  const totalPages = Math.max(1, Math.ceil(viewRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = viewRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    setPage(1);
  };

  const setDatePreset = (preset) => {
    const today = new Date();
    const from = preset === 'MONTH' ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(today.getFullYear(), 0, 1);
    // Local date parts — toISOString() would shift the 1st back a day in IST.
    const local = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setStartDate(local(from));
    setEndDate(local(today));
    setPage(1);
  };

  const fileBase = () => `${selected.id}_report_${todayStr()}`;

  const handleCSV = () => {
    exportToCSV(toExportRows(viewRows), `${fileBase()}.csv`);
    showToast(`${selected.label} exported as CSV`, 'success');
  };

  const handleExcel = async () => {
    try {
      await exportToExcel([{ name: selected.label, data: toExportRows(viewRows) }], `${fileBase()}.xlsx`);
      showToast(`${selected.label} exported as Excel`, 'success');
    } catch {
      showToast('Could not create the Excel file', 'error');
    }
  };

  const kpi = (key, format = (v) => v) => {
    if (summaryFailed) return '—';
    return summary ? format(summary[key] ?? 0) : '…';
  };

  const statItems = stats
    ? [
        stats.totalCollected !== undefined && { label: 'Total collected', value: formatINR(stats.totalCollected), tone: 'text-emerald-600 dark:text-emerald-400' },
        stats.totalDue !== undefined && { label: 'Total outstanding', value: formatINR(stats.totalDue), tone: 'text-rose-600 dark:text-rose-400' },
        stats.totalGross !== undefined && { label: 'Gross pay', value: formatINR(stats.totalGross), tone: 'text-slate-900 dark:text-white' },
        stats.totalDeductions !== undefined && { label: 'Deductions', value: formatINR(stats.totalDeductions), tone: 'text-slate-900 dark:text-white' },
        stats.totalNetDisbursed !== undefined && { label: 'Net pay', value: formatINR(stats.totalNetDisbursed), tone: 'text-teal-600 dark:text-teal-400' },
        stats.averageRating !== undefined && { label: 'Average rating', value: `${stats.averageRating} / 5`, tone: 'text-amber-500' },
        stats.totalCopies !== undefined && { label: 'Total copies', value: stats.totalCopies, tone: 'text-slate-900 dark:text-white' },
        stats.availableCopies !== undefined && { label: 'Available', value: stats.availableCopies, tone: 'text-emerald-600 dark:text-emerald-400' },
        stats.issuedCopies !== undefined && { label: 'Issued', value: stats.issuedCopies, tone: 'text-amber-600 dark:text-amber-400' },
      ].filter(Boolean)
    : [];

  const hasFilters = Boolean(search.trim() || startDate || endDate || status !== 'ALL');
  const noExport = loading || viewRows.length === 0;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="School Reports"
        subtitle="Live reports from every module. Open one to filter, sort, print or export it."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Students" value={kpi('studentsCount')} hint="Student records" icon={Users} tone="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400" />
        <KpiCard label="Fees collected" value={kpi('totalCollected', formatINR)} hint="All payments received" icon={IndianRupee} tone="bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400" />
        <KpiCard label="Fees outstanding" value={kpi('totalDue', formatINR)} hint="Unpaid and partly paid invoices" icon={AlertTriangle} tone="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400" />
        <KpiCard label="Staff" value={kpi('staffCount')} hint="Teachers and other staff" icon={UserCheck} tone="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400" />
      </div>

      {!selected ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 pb-3">
            {GROUP_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveGroup(tab)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  activeGroup === tab
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                {tab}
              </button>
            ))}
            <span className="ml-auto text-xs font-bold text-slate-400 hidden sm:block whitespace-nowrap">
              {visibleCategories.length} reports
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCategories.map((category) => {
              const Icon = category.icon;
              const count = category.countKey ? summary?.[category.countKey] : undefined;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => openCategory(category)}
                  className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-md rounded-2xl p-5 cursor-pointer flex items-start gap-4 transition-all group"
                >
                  <div className={cn('p-3 rounded-xl shrink-0', category.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{category.label}</h4>
                      <ChevronRight className="w-4 h-4 shrink-0 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{category.desc}</p>
                    <div className="flex items-center gap-2 pt-1.5">
                      <Badge variant="secondary">{category.group}</Badge>
                      {count !== undefined && (
                        <span className="text-[11px] font-bold text-slate-400">
                          {count} record{count === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                title="Back to all reports"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">{selected.label}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{selected.desc}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={loadReport} disabled={loading} className={cn(toolbarButton, 'px-2.5')} title="Refresh">
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
              <button type="button" onClick={() => setPrintOpen(true)} disabled={noExport} className={toolbarButton}>
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button type="button" onClick={handleCSV} disabled={noExport} className={toolbarButton}>
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExcel}
                disabled={noExport}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {statItems.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statItems.map((item) => (
                <div key={item.label} className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 px-4 py-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
                  <span className={cn('text-base font-black', item.tone)}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search any column…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3.5 text-xs font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {selected.statuses && (
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                <option value="ALL">All statuses</option>
                {selected.statuses.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            )}

            {selected.dateFilter && (
              <>
                <div className="flex items-center gap-1.5 h-10 bg-slate-50/80 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 px-2.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none"
                    title="From date"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none"
                    title="To date"
                  />
                </div>
                <button type="button" onClick={() => setDatePreset('MONTH')} className={cn(toolbarButton, 'h-10 py-0')}>
                  This month
                </button>
                <button type="button" onClick={() => setDatePreset('YEAR')} className={cn(toolbarButton, 'h-10 py-0')}>
                  This year
                </button>
              </>
            )}

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStartDate('');
                  setEndDate('');
                  setStatus('ALL');
                  setPage(1);
                }}
                className="px-2 text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>

          {!loaded ? (
            <SkeletonTable rows={8} columns={6} />
          ) : viewRows.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {rows.length === 0 && !hasFilters ? 'No records yet' : 'No matching records'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {rows.length === 0 && !hasFilters
                  ? `Nothing has been recorded for ${selected.label} so far.`
                  : 'Try changing the search or filters.'}
              </p>
            </div>
          ) : (
            <div className={cn('border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-opacity', loading && 'opacity-60')}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-3 w-10">#</th>
                      {columns.map((column) => {
                        const numeric = isNumeric(rows[0][column]);
                        const active = sort.key === column;
                        const SortIcon = sort.dir === 'asc' ? ArrowUp : ArrowDown;
                        return (
                          <th key={column} className={cn('px-3.5 py-3 whitespace-nowrap', numeric && 'text-right')}>
                            <button
                              type="button"
                              onClick={() => toggleSort(column)}
                              className={cn(
                                'inline-flex items-center gap-1 uppercase tracking-wider font-bold cursor-pointer hover:text-slate-900 dark:hover:text-white',
                                active && 'text-primary'
                              )}
                            >
                              <span>{column}</span>
                              {active && <SortIcon className="w-3 h-3" />}
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                    {pageRows.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/40 transition-colors">
                        <td className="px-3.5 py-3 text-slate-400 font-mono text-[11px]">
                          {(currentPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        {columns.map((column) => {
                          const value = row[column];
                          return (
                            <td
                              key={column}
                              className={cn('px-3.5 py-3 whitespace-nowrap', isNumeric(value) && 'text-right tabular-nums')}
                            >
                              {column === 'Status' ? (
                                <Badge variant={STATUS_VARIANT[statusKey(value)] || 'default'}>{statusLabel(value)}</Badge>
                              ) : (
                                String(value)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {loaded && viewRows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-500">
              <span>
                Showing <strong>{(currentPage - 1) * PAGE_SIZE + 1}</strong>–
                <strong>{(currentPage - 1) * PAGE_SIZE + pageRows.length}</strong> of <strong>{viewRows.length}</strong>
                {viewRows.length !== rows.length && ` (filtered from ${rows.length})`}
                {total > rows.length && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {' '}
                    · only the first {rows.length} of {total} records are loaded — narrow the filters
                  </span>
                )}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={cn(toolbarButton, 'px-2 py-1.5')}
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={cn(toolbarButton, 'px-2 py-1.5')}
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selected && (
        <PrintReportModal
          isOpen={printOpen}
          onClose={() => setPrintOpen(false)}
          title={selected.label}
          documentType={selected.label}
          data={toExportRows(viewRows)}
        >
          <div className="space-y-6 text-slate-900">
            <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
              {schoolName && <h2 className="text-2xl font-black uppercase tracking-wider">{schoolName}</h2>}
              <h3 className="text-sm font-bold mt-2">{selected.label}</h3>
              <p className="text-[10px] text-slate-500">
                Generated on {new Date().toLocaleString('en-IN')} · {viewRows.length} record{viewRows.length === 1 ? '' : 's'}
                {startDate && endDate ? ` · ${startDate} to ${endDate}` : ''}
                {status !== 'ALL' ? ` · ${statusLabel(status)}` : ''}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-2 font-bold border-r border-slate-300">#</th>
                    {columns.map((column) => (
                      <th key={column} className="p-2 font-bold border-r border-slate-300 last:border-r-0">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {viewRows.map((row, index) => (
                    <tr key={index}>
                      <td className="p-2 font-mono text-[10px] border-r border-slate-200">{index + 1}</td>
                      {columns.map((column) => (
                        <td key={column} className="p-2 border-r border-slate-200 last:border-r-0">
                          {column === 'Status' ? statusLabel(row[column]) : String(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-12 text-xs font-bold text-slate-700">
              <div className="border-t border-slate-400 pt-1 w-44 text-center">Prepared by</div>
              <div className="border-t border-slate-400 pt-1 w-44 text-center">Principal</div>
            </div>
          </div>
        </PrintReportModal>
      )}

      <ToastComponent />
    </div>
  );
};

export default SchoolReportsHub;

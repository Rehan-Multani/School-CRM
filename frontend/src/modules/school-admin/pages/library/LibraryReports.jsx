import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw, Filter, Printer, Search } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { libraryPortalApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { exportToCSV, exportToExcel } from '../../../../shared/lib/exportHelpers';
import { PrintReportModal } from '../../../../shared/components/PrintReportModal';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import {
  LibraryTabsNav,
  inputClass,
  formatDisplayDate,
  ISSUE_STATUS_BADGE,
  RESERVATION_STATUS_BADGE,
  BORROWER_TYPE_BADGE,
} from './libraryShared';

const REPORT_TYPES = [
  { id: 'issue', label: 'Issue Report' },
  { id: 'return', label: 'Return Report' },
  { id: 'overdue', label: 'Overdue Report' },
  { id: 'fine', label: 'Fine Report' },
  { id: 'reservation', label: 'Reservation Report' },
  { id: 'book-usage', label: 'Book Usage' },
];

const PAGE_LIMIT = 200; // the API's largest page
const MAX_ROWS = 5000; // stop paging here so a huge library can't hang the tab

const todayStr = () => new Date().toISOString().slice(0, 10);
const formatINR = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;
const sumOf = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
const countWhere = (rows, key, value) => rows.filter((row) => row[key] === value).length;

// The plain value of a cell, for search, print and export.
const cellText = (column, row) => (column.text ? column.text(row[column.key], row) : row[column.key] ?? '');

// Pages through a paginated list endpoint so totals, search and export cover every record.
async function fetchAll(fetchPage, params) {
  const all = [];
  for (let page = 1; all.length < MAX_ROWS; page += 1) {
    const res = await fetchPage({ ...params, limit: PAGE_LIMIT, page });
    const batch = res?.data || [];
    all.push(...batch);
    if (!batch.length || all.length >= (res?.pagination?.total || 0)) break;
  }
  return all;
}

export const LibraryReports = () => {
  const { user } = useSchoolAdminAuth();
  const { showToast, ToastComponent } = useToast();
  const [reportType, setReportType] = useState('issue');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [printOpen, setPrintOpen] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: 'ALL',
    borrowerType: 'ALL',
    status: 'ALL',
    fineStatus: 'ALL',
  });

  // Ignores a slow response that a newer request has already superseded.
  const requestId = useRef(0);

  useEffect(() => {
    libraryPortalApi.categories().then((res) => setCategories(res.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const baseParams = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        category: filters.category !== 'ALL' ? filters.category : undefined,
        borrowerType: filters.borrowerType !== 'ALL' ? filters.borrowerType : undefined,
      };

      let data = [];
      if (reportType === 'issue') {
        data = await fetchAll(libraryPortalApi.issues, { ...baseParams, status: filters.status !== 'ALL' ? filters.status : undefined });
      } else if (reportType === 'return') {
        data = await fetchAll(libraryPortalApi.issues, { ...baseParams, status: 'RETURNED', dateField: 'returnDate' });
      } else if (reportType === 'overdue') {
        data = await fetchAll(libraryPortalApi.issues, { ...baseParams, status: 'OVERDUE' });
      } else if (reportType === 'fine') {
        data = await fetchAll(libraryPortalApi.issues, { ...baseParams, hasFine: true, fineStatus: filters.fineStatus !== 'ALL' ? filters.fineStatus : undefined });
      } else if (reportType === 'reservation') {
        data = await fetchAll(libraryPortalApi.reservations, { status: filters.status !== 'ALL' ? filters.status : undefined });
      } else if (reportType === 'book-usage') {
        const res = await libraryPortalApi.report('book-usage', { category: filters.category !== 'ALL' ? filters.category : undefined });
        data = res.data || [];
      }
      if (id !== requestId.current) return;
      setRows(data);
    } catch (err) {
      if (id !== requestId.current) return;
      showToast(apiMessage(err, 'Failed to load report'), 'error');
      setRows([]);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [reportType, filters, showToast]);

  useEffect(() => { load(); }, [load]);

  // `render` draws the cell on screen; `text` is the plain value for search, print and export.
  const columns = useMemo(() => {
    const dateCol = (key, title) => ({ key, title, render: formatDisplayDate, text: formatDisplayDate });
    const fineCol = (title = 'Fine') => ({ key: 'fineAmount', title, render: (v) => `₹${v || 0}`, text: (v) => v || 0 });
    switch (reportType) {
      case 'issue':
        return [
          { key: 'bookTitle', title: 'Book' },
          { key: 'borrowerName', title: 'Borrower' },
          { key: 'borrowerType', title: 'Type', render: (v) => <Badge variant={BORROWER_TYPE_BADGE[v] || 'default'}>{v}</Badge> },
          dateCol('issueDate', 'Issue Date'),
          dateCol('dueDate', 'Due Date'),
          { key: 'status', title: 'Status', render: (v) => <Badge variant={ISSUE_STATUS_BADGE[v] || 'default'}>{v}</Badge> },
        ];
      case 'return':
        return [
          { key: 'bookTitle', title: 'Book' },
          { key: 'borrowerName', title: 'Borrower' },
          dateCol('issueDate', 'Issue Date'),
          dateCol('returnDate', 'Return Date'),
          { key: 'overdueDays', title: 'Late Days', render: (v) => v || 0, text: (v) => v || 0 },
          fineCol(),
        ];
      case 'overdue':
        return [
          { key: 'borrowerName', title: 'Borrower' },
          { key: 'bookTitle', title: 'Book' },
          dateCol('dueDate', 'Due Date'),
          { key: 'overdueDays', title: 'Days Overdue', render: (v) => <span className="font-bold text-rose-600">{v || 0}</span>, text: (v) => v || 0 },
          fineCol(),
        ];
      case 'fine': {
        const fineDate = (v, row) => formatDisplayDate(v || row.issueDate);
        return [
          { key: 'borrowerName', title: 'Borrower' },
          { key: 'bookTitle', title: 'Book' },
          fineCol('Amount'),
          { key: 'fineStatus', title: 'Status', render: (v) => <Badge variant={v === 'PAID' ? 'success' : v === 'WAIVED' ? 'default' : 'warning'}>{v}</Badge> },
          { key: 'returnDate', title: 'Date', render: fineDate, text: fineDate },
        ];
      }
      case 'reservation':
        return [
          { key: 'bookTitle', title: 'Book' },
          { key: 'borrowerName', title: 'Borrower' },
          dateCol('reservedAt', 'Reservation Date'),
          { key: 'status', title: 'Status', render: (v) => <Badge variant={RESERVATION_STATUS_BADGE[v] || 'default'}>{v}</Badge> },
        ];
      case 'book-usage':
        return [
          { key: 'title', title: 'Book' },
          { key: 'author', title: 'Author' },
          { key: 'category', title: 'Category' },
          { key: 'totalCopies', title: 'Total Copies' },
          { key: 'availableCopies', title: 'Available' },
          { key: 'totalIssues', title: 'Total Issues' },
          { key: 'currentlyIssued', title: 'Currently Issued' },
        ];
      default:
        return [];
    }
  }, [reportType]);

  const viewRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => columns.some((c) => String(cellText(c, row)).toLowerCase().includes(q)));
  }, [rows, columns, search]);

  // Totals for exactly the rows on screen (filters + search applied).
  const summary = useMemo(() => {
    const r = viewRows;
    switch (reportType) {
      case 'issue':
        return [
          { label: 'Total issues', value: r.length },
          { label: 'Currently issued', value: countWhere(r, 'status', 'ISSUED'), tone: 'text-amber-600 dark:text-amber-400' },
          { label: 'Overdue', value: countWhere(r, 'status', 'OVERDUE'), tone: 'text-rose-600 dark:text-rose-400' },
          { label: 'Returned', value: countWhere(r, 'status', 'RETURNED'), tone: 'text-emerald-600 dark:text-emerald-400' },
        ];
      case 'return':
        return [
          { label: 'Books returned', value: r.length },
          { label: 'Returned late', value: r.filter((x) => (x.overdueDays || 0) > 0).length, tone: 'text-rose-600 dark:text-rose-400' },
          { label: 'Fines charged', value: formatINR(sumOf(r, 'fineAmount')), tone: 'text-amber-600 dark:text-amber-400' },
        ];
      case 'overdue':
        return [
          { label: 'Overdue books', value: r.length, tone: 'text-rose-600 dark:text-rose-400' },
          { label: 'Borrowers', value: new Set(r.map((x) => x.borrowerRefId || x.borrowerName)).size },
          { label: 'Longest overdue', value: `${Math.max(0, ...r.map((x) => x.overdueDays || 0))} days` },
          { label: 'Fines so far', value: formatINR(sumOf(r, 'fineAmount')), tone: 'text-amber-600 dark:text-amber-400' },
        ];
      case 'fine': {
        const amountWhere = (fineStatus) => formatINR(sumOf(r.filter((x) => x.fineStatus === fineStatus), 'fineAmount'));
        return [
          { label: 'Total fines', value: formatINR(sumOf(r, 'fineAmount')) },
          { label: 'Collected', value: amountWhere('PAID'), tone: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Pending', value: amountWhere('PENDING'), tone: 'text-amber-600 dark:text-amber-400' },
          { label: 'Waived', value: amountWhere('WAIVED') },
        ];
      }
      case 'reservation':
        return [
          { label: 'Total reservations', value: r.length },
          { label: 'Pending', value: countWhere(r, 'status', 'PENDING'), tone: 'text-amber-600 dark:text-amber-400' },
          { label: 'Approved', value: countWhere(r, 'status', 'APPROVED') },
          { label: 'Fulfilled', value: countWhere(r, 'status', 'FULFILLED'), tone: 'text-emerald-600 dark:text-emerald-400' },
        ];
      case 'book-usage':
        return [
          { label: 'Titles', value: r.length },
          { label: 'Total copies', value: sumOf(r, 'totalCopies') },
          { label: 'Available', value: sumOf(r, 'availableCopies'), tone: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Currently issued', value: sumOf(r, 'currentlyIssued'), tone: 'text-amber-600 dark:text-amber-400' },
        ];
      default:
        return [];
    }
  }, [viewRows, reportType]);

  const plainRows = () =>
    viewRows.map((row) => {
      const out = {};
      columns.forEach((c) => { out[c.title] = cellText(c, row); });
      return out;
    });

  const reportLabel = REPORT_TYPES.find((t) => t.id === reportType)?.label || 'Report';

  const handleExportCSV = () => {
    if (!viewRows.length) return;
    exportToCSV(plainRows(), `library_${reportType}_report_${todayStr()}.csv`);
    showToast('Report exported as CSV', 'success');
  };

  const handleExportExcel = async () => {
    if (!viewRows.length) return;
    await exportToExcel([{ name: reportType, data: plainRows() }], `library_${reportType}_report_${todayStr()}.xlsx`);
    showToast('Report exported as Excel', 'success');
  };

  const showDateRange = ['issue', 'return', 'overdue'].includes(reportType);
  const showCategory = ['issue', 'return', 'overdue', 'book-usage'].includes(reportType);
  const showBorrowerType = ['issue', 'return', 'overdue'].includes(reportType);
  const showStatus = reportType === 'issue';
  const showReservationStatus = reportType === 'reservation';
  const showFineStatus = reportType === 'fine';

  const actionButton =
    'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200';

  return (
    <div className="space-y-6">
      <ToastComponent />
      <PageHeader
        title="Library Reports"
        subtitle="Filtered, exportable circulation reports drawn from the live library backend."
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPrintOpen(true)} disabled={!viewRows.length} className={actionButton}>
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button type="button" onClick={handleExportCSV} disabled={!viewRows.length} className={actionButton}>
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button type="button" onClick={handleExportExcel} disabled={!viewRows.length} className={actionButton}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </button>
            <button type="button" onClick={load} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300" title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />
      <LibraryTabsNav />

      <Tabs
        tabs={REPORT_TYPES}
        activeTab={reportType}
        onChange={(id) => {
          // Status values differ per report, so one tab's choice must not leak into the next.
          setFilters((f) => ({ ...f, status: 'ALL', fineStatus: 'ALL' }));
          setSearch('');
          setRows([]);
          setReportType(id);
        }}
      />

      {/* Summary */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {summary.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
              <span className={`text-lg font-black ${item.tone || 'text-slate-900 dark:text-white'}`}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search book, borrower…"
            className={`${inputClass} h-9 pl-9`}
          />
        </div>
        <Filter className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        {showDateRange && (
          <>
            <input type="date" value={filters.startDate} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))} className={`${inputClass} h-9 w-40`} />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={filters.endDate} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))} className={`${inputClass} h-9 w-40`} />
          </>
        )}
        {showCategory && (
          <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className={`${inputClass} h-9 w-auto`}>
            <option value="ALL">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        )}
        {showBorrowerType && (
          <select value={filters.borrowerType} onChange={(e) => setFilters((f) => ({ ...f, borrowerType: e.target.value }))} className={`${inputClass} h-9 w-auto`}>
            <option value="ALL">All Borrower Types</option>
            <option value="STUDENT">Students</option>
            <option value="TEACHER">Teachers</option>
            <option value="STAFF">Staff</option>
          </select>
        )}
        {showStatus && (
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className={`${inputClass} h-9 w-auto`}>
            <option value="ALL">All Statuses</option>
            <option value="ISSUED">Issued</option>
            <option value="OVERDUE">Overdue</option>
            <option value="RETURNED">Returned</option>
          </select>
        )}
        {showReservationStatus && (
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className={`${inputClass} h-9 w-auto`}>
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        )}
        {showFineStatus && (
          <select value={filters.fineStatus} onChange={(e) => setFilters((f) => ({ ...f, fineStatus: e.target.value }))} className={`${inputClass} h-9 w-auto`}>
            <option value="ALL">All Fine Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="WAIVED">Waived</option>
          </select>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <SkeletonTable rows={8} columns={columns.length} />
      ) : viewRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No records found</p>
          <p className="mt-1 text-xs text-slate-400">No data matches the selected report, filters and search.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  {columns.map((c) => <th key={c.key} className="px-4 py-3 font-bold">{c.title}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {viewRows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/40">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '–')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-400 dark:border-slate-800">
            {viewRows.length} record{viewRows.length === 1 ? '' : 's'}
            {viewRows.length !== rows.length && ` (filtered from ${rows.length})`}
          </div>
        </div>
      )}

      <PrintReportModal
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
        title={`Library ${reportLabel}`}
        documentType={`Library ${reportLabel}`}
        data={printOpen ? plainRows() : []}
      >
        <div className="space-y-6 text-slate-900">
          <div className="space-y-1 border-b-2 border-slate-900 pb-4 text-center">
            {user?.schoolName && <h2 className="text-2xl font-black uppercase tracking-wider">{user.schoolName}</h2>}
            <h3 className="mt-2 text-sm font-bold">Library {reportLabel}</h3>
            <p className="text-[10px] text-slate-500">
              Generated on {new Date().toLocaleString('en-IN')} · {viewRows.length} record{viewRows.length === 1 ? '' : 's'}
              {filters.startDate && filters.endDate && showDateRange ? ` · ${filters.startDate} to ${filters.endDate}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-1 text-xs">
            {summary.map((item) => (
              <span key={item.label}>
                {item.label}: <strong>{item.value}</strong>
              </span>
            ))}
          </div>

          <table className="w-full border-collapse border border-slate-300 text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100">
                <th className="border-r border-slate-300 p-2 font-bold">#</th>
                {columns.map((c) => (
                  <th key={c.key} className="border-r border-slate-300 p-2 font-bold last:border-r-0">{c.title}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {printOpen && viewRows.map((row, idx) => (
                <tr key={row.id || idx}>
                  <td className="border-r border-slate-200 p-2 font-mono text-[10px]">{idx + 1}</td>
                  {columns.map((c) => (
                    <td key={c.key} className="border-r border-slate-200 p-2 last:border-r-0">
                      {c.key === 'fineAmount' ? formatINR(row.fineAmount) : String(cellText(c, row))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between pt-12 text-xs font-bold text-slate-700">
            <div className="w-44 border-t border-slate-400 pt-1 text-center">Librarian</div>
            <div className="w-44 border-t border-slate-400 pt-1 text-center">Principal</div>
          </div>
        </div>
      </PrintReportModal>
    </div>
  );
};

export default LibraryReports;

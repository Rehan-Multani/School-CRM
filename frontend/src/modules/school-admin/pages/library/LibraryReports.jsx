import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw, Filter } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { libraryPortalApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { exportToCSV, exportToExcel } from '../../../../shared/lib/exportHelpers';
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

const todayStr = () => new Date().toISOString().slice(0, 10);

export const LibraryReports = () => {
  const { showToast, ToastComponent } = useToast();
  const [reportType, setReportType] = useState('issue');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: 'ALL',
    borrowerType: 'ALL',
    status: 'ALL',
    fineStatus: 'ALL',
  });

  useEffect(() => {
    libraryPortalApi.categories().then((res) => setCategories(res.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        category: filters.category !== 'ALL' ? filters.category : undefined,
        borrowerType: filters.borrowerType !== 'ALL' ? filters.borrowerType : undefined,
        limit: 200,
      };

      if (reportType === 'issue') {
        const res = await libraryPortalApi.issues({ ...baseParams, status: filters.status !== 'ALL' ? filters.status : undefined });
        setRows(res.data || []);
      } else if (reportType === 'return') {
        const res = await libraryPortalApi.issues({ ...baseParams, status: 'RETURNED' });
        setRows(res.data || []);
      } else if (reportType === 'overdue') {
        const res = await libraryPortalApi.issues({ ...baseParams, status: 'OVERDUE' });
        setRows(res.data || []);
      } else if (reportType === 'fine') {
        const res = await libraryPortalApi.issues({ ...baseParams, fineStatus: filters.fineStatus !== 'ALL' ? filters.fineStatus : undefined });
        setRows((res.data || []).filter((r) => (r.fineAmount || 0) > 0));
      } else if (reportType === 'reservation') {
        const res = await libraryPortalApi.reservations({
          status: filters.status !== 'ALL' ? filters.status : undefined,
          limit: 200,
        });
        setRows(res.data || []);
      } else if (reportType === 'book-usage') {
        const res = await libraryPortalApi.report('book-usage', { category: filters.category !== 'ALL' ? filters.category : undefined });
        setRows(res.data || []);
      }
    } catch (err) {
      showToast(apiMessage(err, 'Failed to load report'), 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportType, filters, showToast]);

  useEffect(() => { load(); }, [load]);

  const columns = useMemo(() => {
    switch (reportType) {
      case 'issue':
        return [
          { key: 'bookTitle', title: 'Book' },
          { key: 'borrowerName', title: 'Borrower' },
          { key: 'borrowerType', title: 'Type', render: (v) => <Badge variant={BORROWER_TYPE_BADGE[v] || 'default'}>{v}</Badge> },
          { key: 'issueDate', title: 'Issue Date', render: formatDisplayDate },
          { key: 'dueDate', title: 'Due Date', render: formatDisplayDate },
          { key: 'status', title: 'Status', render: (v) => <Badge variant={ISSUE_STATUS_BADGE[v] || 'default'}>{v}</Badge> },
        ];
      case 'return':
        return [
          { key: 'bookTitle', title: 'Book' },
          { key: 'borrowerName', title: 'Borrower' },
          { key: 'issueDate', title: 'Issue Date', render: formatDisplayDate },
          { key: 'returnDate', title: 'Return Date', render: formatDisplayDate },
          { key: 'overdueDays', title: 'Late Days', render: (v) => v || 0 },
          { key: 'fineAmount', title: 'Fine', render: (v) => `₹${v || 0}` },
        ];
      case 'overdue':
        return [
          { key: 'borrowerName', title: 'Borrower' },
          { key: 'bookTitle', title: 'Book' },
          { key: 'dueDate', title: 'Due Date', render: formatDisplayDate },
          { key: 'overdueDays', title: 'Days Overdue', render: (v) => <span className="font-bold text-rose-600">{v || 0}</span> },
          { key: 'fineAmount', title: 'Fine', render: (v) => `₹${v || 0}` },
        ];
      case 'fine':
        return [
          { key: 'borrowerName', title: 'Borrower' },
          { key: 'bookTitle', title: 'Book' },
          { key: 'fineAmount', title: 'Amount', render: (v) => `₹${v || 0}` },
          { key: 'fineStatus', title: 'Status', render: (v) => <Badge variant={v === 'PAID' ? 'success' : v === 'WAIVED' ? 'default' : 'warning'}>{v}</Badge> },
          { key: 'returnDate', title: 'Date', render: (v, row) => formatDisplayDate(v || row.issueDate) },
        ];
      case 'reservation':
        return [
          { key: 'bookTitle', title: 'Book' },
          { key: 'borrowerName', title: 'Borrower' },
          { key: 'reservedAt', title: 'Reservation Date', render: formatDisplayDate },
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

  const handleExportCSV = () => {
    if (!rows.length) return;
    const plainRows = rows.map((row) => {
      const out = {};
      columns.forEach((c) => { out[c.title] = row[c.key]; });
      return out;
    });
    exportToCSV(plainRows, `library_${reportType}_report_${todayStr()}.csv`);
    showToast('Report exported as CSV', 'success');
  };

  const handleExportExcel = async () => {
    if (!rows.length) return;
    const plainRows = rows.map((row) => {
      const out = {};
      columns.forEach((c) => { out[c.title] = row[c.key]; });
      return out;
    });
    await exportToExcel([{ name: reportType, data: plainRows }], `library_${reportType}_report_${todayStr()}.xlsx`);
    showToast('Report exported as Excel', 'success');
  };

  const showDateRange = ['issue', 'return', 'overdue'].includes(reportType);
  const showCategory = ['issue', 'return', 'overdue', 'book-usage'].includes(reportType);
  const showBorrowerType = ['issue', 'return', 'overdue'].includes(reportType);
  const showStatus = reportType === 'issue';
  const showReservationStatus = reportType === 'reservation';
  const showFineStatus = reportType === 'fine';

  return (
    <div className="space-y-6">
      <ToastComponent />
      <PageHeader
        title="Reports"
        subtitle="Filtered, exportable circulation reports drawn from the live library backend."
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleExportCSV} disabled={!rows.length} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button type="button" onClick={handleExportExcel} disabled={!rows.length} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
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
        onChange={(id) => setReportType(id)}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No records found</p>
          <p className="mt-1 text-xs text-slate-400">No data matches the selected report and filters.</p>
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
                {rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-400 dark:border-slate-800">
            {rows.length} record{rows.length === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryReports;

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { SkeletonStatCard, SkeletonTable } from '../../components/ui/SkeletonLoader';
import { exportToCSV, exportToExcel } from '../../utils/exportHelpers';
import {
  Download,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  BookOpen,
  Users,
  FileCheck,
  RotateCcw,
  AlertTriangle,
  Receipt,
  UserCog,
  Library,
  CalendarRange,
  TrendingUp,
  Trophy,
  Package,
  XCircle,
  Eye,
} from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatCurrency } from '../../utils/formatters';

const EMPTY_FILTERS = { fromDate: '', toDate: '', bookId: '', memberId: '', category: '', status: 'ALL' };

function pivotTrend(rows, granularity) {
  const map = new Map();
  (rows || []).forEach((r) => {
    const label =
      granularity === 'weekly'
        ? `${r._id.year}-W${String(r._id.week).padStart(2, '0')}`
        : r._id.period;
    if (!map.has(label)) map.set(label, { period: label, ISSUE: 0, RETURN: 0, RENEW: 0 });
    map.get(label)[r._id.type] = r.count;
  });
  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

function printAllReports(title, sections) {
  const body = sections
    .map(({ heading, rows }) => {
      const columns = rows.length ? Object.keys(rows[0]) : [];
      return `
        <h2>${heading}</h2>
        <table>
          <thead><tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>
            ${
              rows.length
                ? rows
                    .map((row) => `<tr>${columns.map((c) => `<td>${row[c] ?? '—'}</td>`).join('')}</tr>`)
                    .join('')
                : `<tr><td>No records.</td></tr>`
            }
          </tbody>
        </table>
      `;
    })
    .join('');

  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Inter, Segoe UI, sans-serif; padding: 28px; color: #0f172a; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          h2 { font-size: 14px; margin: 24px 0 8px; }
          p { color: #64748b; font-size: 12px; margin: 0 0 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; page-break-inside: auto; }
          th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
          th { background: #f8fafc; text-transform: uppercase; letter-spacing: .04em; font-size: 10px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated ${new Date().toLocaleString('en-IN')}</p>
        ${body}
      </body>
    </html>`);
  win.document.close();
  win.focus();
  win.print();
}

const ReportSection = ({ title, onExport, extra, children }) => (
  <div>
    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      <div className="flex items-center gap-3">
        {extra}
        {onExport && (
          <button
            onClick={onExport}
            className="text-3xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        )}
      </div>
    </div>
    {children}
  </div>
);

export const Reports = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [activeTab, setActiveTab] = useState('issueReturn');
  const [granularity, setGranularity] = useState('daily');
  const [options, setOptions] = useState({ books: [], members: [], categories: [] });
  const [data, setData] = useState({
    inventory: null,
    mostIssued: [],
    issues: [],
    overdue: [],
    fines: [],
    memberActivity: [],
    mostActiveMembers: [],
    bookUsage: [],
    lostDamaged: [],
  });
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [booksRes, membersRes, categoriesRes] = await Promise.allSettled([
          librarianApi.books({ limit: 500 }),
          librarianApi.borrowers(),
          librarianApi.categories(),
        ]);
        setOptions({
          books: booksRes.status === 'fulfilled' ? booksRes.value?.data || [] : [],
          members: membersRes.status === 'fulfilled' ? membersRes.value?.data || [] : [],
          categories: categoriesRes.status === 'fulfilled' ? categoriesRes.value?.data || [] : [],
        });
      } catch {
        // filter dropdowns are a convenience; ignore failures
      }
    })();
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams = {
        ...(filters.fromDate && { startDate: filters.fromDate }),
        ...(filters.toDate && { endDate: filters.toDate }),
        ...(filters.bookId && { bookId: filters.bookId }),
        ...(filters.memberId && { borrowerRefId: filters.memberId }),
        ...(filters.category && { category: filters.category }),
      };
      const statusParam = filters.status && filters.status !== 'ALL' ? filters.status : undefined;

      const [
        invRes,
        mostRes,
        issuesRes,
        overdueRes,
        finesRes,
        memberActivityRes,
        mostActiveRes,
        bookUsageRes,
        lostDamagedRes,
      ] = await Promise.allSettled([
        librarianApi.report('inventory'),
        librarianApi.report('most-issued', { limit: 20 }),
        librarianApi.issues({ ...baseParams, status: statusParam, limit: 100 }),
        librarianApi.issues({ ...baseParams, status: 'OVERDUE', limit: 100 }),
        librarianApi.issues({ ...baseParams, fineStatus: 'PAID', limit: 100 }),
        librarianApi.report('member-activity', {
          startDate: filters.fromDate || undefined,
          endDate: filters.toDate || undefined,
          limit: 50,
        }),
        librarianApi.report('most-active-members', { limit: 10 }),
        librarianApi.report('book-usage', filters.category ? { category: filters.category } : {}),
        librarianApi.report('lost-damaged'),
      ]);

      setData({
        inventory: invRes.status === 'fulfilled' ? invRes.value?.data || null : null,
        mostIssued: mostRes.status === 'fulfilled' ? mostRes.value?.data || [] : [],
        issues: issuesRes.status === 'fulfilled' ? issuesRes.value?.data || [] : [],
        overdue: overdueRes.status === 'fulfilled' ? overdueRes.value?.data || [] : [],
        fines: finesRes.status === 'fulfilled' ? finesRes.value?.data || [] : [],
        memberActivity: memberActivityRes.status === 'fulfilled' ? memberActivityRes.value?.data || [] : [],
        mostActiveMembers: mostActiveRes.status === 'fulfilled' ? mostActiveRes.value?.data || [] : [],
        bookUsage: bookUsageRes.status === 'fulfilled' ? bookUsageRes.value?.data || [] : [],
        lostDamaged: lostDamagedRes.status === 'fulfilled' ? lostDamagedRes.value?.data || [] : [],
      });
    } catch {
      toast.error('Failed to load report analytics');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const fetchTrend = useCallback(async (nextGranularity) => {
    setTrendLoading(true);
    try {
      const days = nextGranularity === 'monthly' ? 180 : nextGranularity === 'weekly' ? 84 : 30;
      const res = await librarianApi.report('period-trend', { granularity: nextGranularity, days });
      setTrend(pivotTrend(res?.data || [], nextGranularity));
    } catch {
      setTrend([]);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    fetchTrend(granularity);
  }, [granularity, fetchTrend]);

  const stats = data.inventory?.stats || {};
  const totalMembers = options.members.length;
  const booksReturned = Math.max((stats.totalIssues || 0) - (stats.activeIssued || 0), 0);
  const totalFine = (stats.totalFinesCollected || 0) + (stats.totalPendingFines || 0);

  const rows = {
    inventory: (data.inventory?.categories || []).map((c) => ({
      Category: c.name,
      'Unique Titles': c.count,
      'Total Copies': c.totalCopies,
      'Available Copies': c.availableCopies,
    })),
    issueReturn: data.issues.map((i) => ({
      'Book Title': i.bookTitle,
      'Accession #': i.accessionNumber,
      Borrower: i.borrowerName,
      Type: i.borrowerType,
      'Issue Date': formatDate(i.issueDate),
      'Due Date': formatDate(i.dueDate),
      'Return Date': i.returnDate ? formatDate(i.returnDate) : '',
      Status: i.status,
    })),
    overdue: data.overdue.map((i) => ({
      'Book Title': i.bookTitle,
      'Accession #': i.accessionNumber,
      Borrower: i.borrowerName,
      'Due Date': formatDate(i.dueDate),
      'Days Overdue': i.overdueDays || '',
      'Est. Fine': i.fineAmount || 0,
    })),
    fines: data.fines.map((i) => ({
      'Book Title': i.bookTitle,
      Borrower: i.borrowerName,
      'Payment Date': formatDate(i.returnDate),
      'Fine Amount': i.fineAmount || 0,
      Status: i.fineStatus,
    })),
    memberActivity: data.memberActivity.map((m) => ({
      Member: m.borrowerName,
      Type: m.borrowerType,
      Code: m.borrowerCode,
      'Total Issues': m.totalIssues,
      'Currently Issued': m.currentlyIssued,
      Overdue: m.overdueCount,
      'Total Fines': m.totalFines || 0,
    })),
    bookUsage: data.bookUsage.map((b) => ({
      Title: b.title,
      Author: b.author,
      Category: b.category,
      'Total Copies': b.totalCopies,
      Available: b.availableCopies,
      'Total Issues': b.totalIssues,
      'Currently Issued': b.currentlyIssued,
    })),
    trend: trend.map((t) => ({ Period: t.period, Issues: t.ISSUE, Returns: t.RETURN, Renewals: t.RENEW })),
    mostIssued: data.mostIssued.map((b) => ({
      Title: b.title,
      Author: b.author,
      Category: b.category,
      'Total Issues': b.totalIssues,
      'Last Issued': formatDate(b.lastIssuedAt),
    })),
    mostActiveMembers: data.mostActiveMembers.map((m) => ({
      Member: m.borrowerName,
      Type: m.borrowerType,
      'Total Issues': m.totalIssues,
      'Total Fines': m.totalFines || 0,
    })),
    lostDamaged: data.lostDamaged.map((i) => ({
      'Book Title': i.bookTitle,
      'Accession #': i.accessionNumber,
      Borrower: i.borrowerName,
      'Return Date': formatDate(i.returnDate),
      Condition: i.conditionOnReturn,
      'Fine Amount': i.fineAmount || 0,
    })),
  };

  const handleExportExcel = () => {
    exportToExcel(
      [
        { name: 'Inventory-Stock', data: rows.inventory },
        { name: 'Issue & Return', data: rows.issueReturn },
        { name: 'Overdue', data: rows.overdue },
        { name: 'Fines', data: rows.fines },
        { name: 'Member Activity', data: rows.memberActivity },
        { name: 'Book Usage', data: rows.bookUsage },
        { name: 'Circulation Trend', data: rows.trend },
        { name: 'Most Issued Books', data: rows.mostIssued },
        { name: 'Most Active Members', data: rows.mostActiveMembers },
        { name: 'Lost & Damaged', data: rows.lostDamaged },
      ],
      `library_reports_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handleDownloadPDF = () => {
    printAllReports('Library Reports & Analytics', [
      { heading: 'Stock Breakdown by Category', rows: rows.inventory },
      { heading: 'Issue & Return Report', rows: rows.issueReturn },
      { heading: 'Overdue Report', rows: rows.overdue },
      { heading: 'Fine Report', rows: rows.fines },
      { heading: 'Member Activity Report', rows: rows.memberActivity },
      { heading: 'Book Usage Report', rows: rows.bookUsage },
      { heading: `Circulation Trend (${granularity})`, rows: rows.trend },
      { heading: 'Most Issued Books', rows: rows.mostIssued },
      { heading: 'Most Active Members', rows: rows.mostActiveMembers },
      { heading: 'Lost & Damaged Books', rows: rows.lostDamaged },
    ]);
  };

  const bookOptions = [
    { value: '', label: 'All Books' },
    ...options.books.map((b) => ({ value: b.id, label: b.title })),
  ];
  const memberOptions = [
    { value: '', label: 'All Members' },
    ...options.members.map((m) => ({ value: m.id, label: `${m.name} (${m.type})` })),
  ];
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...options.categories.map((c) => ({ value: c.name, label: c.name })),
  ];
  const statusOptions = [
    { value: 'ALL', label: 'All Status' },
    { value: 'ISSUED', label: 'Issued' },
    { value: 'RETURNED', label: 'Returned' },
    { value: 'OVERDUE', label: 'Overdue' },
  ];

  const reportTabs = [
    { id: 'issueReturn', label: 'Issue & Return', icon: FileCheck },
    { id: 'overdue', label: 'Overdue', icon: AlertTriangle, count: data.overdue.length || undefined },
    { id: 'fines', label: 'Fines', icon: Receipt },
    { id: 'memberActivity', label: 'Member Activity', icon: UserCog },
    { id: 'bookUsage', label: 'Book Usage', icon: Library },
    { id: 'trend', label: 'Circulation Trend', icon: CalendarRange },
    { id: 'mostIssued', label: 'Most Issued Books', icon: TrendingUp },
    { id: 'mostActiveMembers', label: 'Most Active Members', icon: Trophy },
    { id: 'inventory', label: 'Inventory / Stock', icon: Package },
    { id: 'lostDamaged', label: 'Lost & Damaged', icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics Hub"
        subtitle="Overall library report — inventory, circulation, members and fine records, all in one place."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchAll}
              disabled={loading}
              className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="h-10 px-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Excel</span>
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              From Date
            </label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              To Date
            </label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <Select
            label="Book"
            options={bookOptions}
            value={filters.bookId}
            onChange={(val) => setFilters((f) => ({ ...f, bookId: val }))}
          />
          <Select
            label="Member"
            options={memberOptions}
            value={filters.memberId}
            onChange={(val) => setFilters((f) => ({ ...f, memberId: val }))}
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={filters.category}
            onChange={(val) => setFilters((f) => ({ ...f, category: val }))}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={filters.status}
            onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
          />
        </div>
        <div className="flex items-center gap-2.5 mt-4">
          <button
            onClick={fetchAll}
            disabled={loading}
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
          >
            <Eye className="h-3.5 w-3.5" />
            View Report
          </button>
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="h-9 px-4 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <SkeletonStatCard key={idx} />
            ))}
          </div>
          <SkeletonTable rows={8} columns={6} />
          <SkeletonTable rows={8} columns={6} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard title="Total Books" value={stats.totalTitles || 0} icon={BookOpen} />
            <StatCard title="Total Members" value={totalMembers} icon={Users} />
            <StatCard title="Books Issued" value={stats.activeIssued || 0} icon={FileCheck} />
            <StatCard title="Books Returned" value={booksReturned} icon={RotateCcw} />
            <StatCard title="Overdue Books" value={stats.overdueCount || 0} icon={AlertTriangle} colorClass="bg-rose-500" />
            <StatCard title="Total Fine" value={formatCurrency(totalFine)} icon={Receipt} colorClass="bg-emerald-500" />
          </div>

          {/* Report Tabs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden">
            <div className="px-4 pt-2">
              <Tabs tabs={reportTabs} activeTab={activeTab} onChange={setActiveTab} />
            </div>
            <div className="p-6">
              {activeTab === 'issueReturn' && (
                <ReportSection title="Issue & Return Report" onExport={() => exportToCSV(rows.issueReturn, 'issue_return_report.csv')}>
                  <DataTable
                    columns={[
                      { title: 'Book Title', key: 'bookTitle' },
                      { title: 'Accession #', key: 'accessionNumber' },
                      { title: 'Borrower', key: 'borrowerName' },
                      { title: 'Type', key: 'borrowerType' },
                      { title: 'Issue Date', key: 'issueDate', render: (val) => formatDate(val) },
                      { title: 'Due Date', key: 'dueDate', render: (val) => formatDate(val) },
                      { title: 'Status', key: 'status', render: (val) => <Badge variant={val === 'RETURNED' ? 'success' : 'warning'}>{val}</Badge> },
                    ]}
                    data={data.issues}
                    searchPlaceholder="Search issues..."
                    searchKeys={['bookTitle', 'borrowerName']}
                  />
                </ReportSection>
              )}

              {activeTab === 'overdue' && (
                <ReportSection title="Overdue Report" onExport={() => exportToCSV(rows.overdue, 'overdue_report.csv')}>
                  <DataTable
                    columns={[
                      { title: 'Book Title', key: 'bookTitle' },
                      { title: 'Accession #', key: 'accessionNumber' },
                      { title: 'Borrower', key: 'borrowerName' },
                      { title: 'Due Date', key: 'dueDate', render: (val) => formatDate(val) },
                      { title: 'Days Overdue', key: 'overdueDays', render: (val) => <span className="text-rose-600 font-bold">{val || 1} days late</span> },
                      { title: 'Est. Fine', key: 'fineAmount', render: (val) => formatCurrency(val || 0) },
                    ]}
                    data={data.overdue}
                    searchPlaceholder="Search overdue..."
                    searchKeys={['bookTitle', 'borrowerName']}
                  />
                </ReportSection>
              )}

              {activeTab === 'fines' && (
                <ReportSection title="Fine Report" onExport={() => exportToCSV(rows.fines, 'fine_report.csv')}>
                  <DataTable
                    columns={[
                      { title: 'Book Title', key: 'bookTitle' },
                      { title: 'Borrower', key: 'borrowerName' },
                      { title: 'Payment Date', key: 'returnDate', render: (val) => formatDate(val) },
                      { title: 'Fine Amount', key: 'fineAmount', render: (val) => <span className="font-bold text-emerald-600">{formatCurrency(val || 0)}</span> },
                      { title: 'Status', key: 'fineStatus', render: (val) => <Badge variant="success">{val}</Badge> },
                    ]}
                    data={data.fines}
                    searchPlaceholder="Search fines..."
                    searchKeys={['bookTitle', 'borrowerName']}
                  />
                </ReportSection>
              )}

              {activeTab === 'memberActivity' && (
                <ReportSection title="Member Activity Report" onExport={() => exportToCSV(rows.memberActivity, 'member_activity_report.csv')}>
                  <DataTable
                    columns={[
                      { title: 'Member', key: 'borrowerName' },
                      { title: 'Type', key: 'borrowerType', render: (val) => <Badge variant="indigo">{val}</Badge> },
                      { title: 'Code', key: 'borrowerCode' },
                      { title: 'Total Issues', key: 'totalIssues', sortable: true },
                      { title: 'Currently Issued', key: 'currentlyIssued', sortable: true },
                      { title: 'Overdue', key: 'overdueCount', render: (val) => (val > 0 ? <span className="text-rose-600 font-bold">{val}</span> : val) },
                      { title: 'Total Fines', key: 'totalFines', render: (val) => formatCurrency(val || 0) },
                    ]}
                    data={data.memberActivity}
                    searchPlaceholder="Search members..."
                    searchKeys={['borrowerName', 'borrowerCode']}
                  />
                </ReportSection>
              )}

              {activeTab === 'bookUsage' && (
                <ReportSection title="Book Usage Report" onExport={() => exportToCSV(rows.bookUsage, 'book_usage_report.csv')}>
                  <DataTable
                    columns={[
                      { title: 'Title', key: 'title', sortable: true },
                      { title: 'Author', key: 'author' },
                      { title: 'Category', key: 'category' },
                      { title: 'Total Copies', key: 'totalCopies', sortable: true },
                      { title: 'Available', key: 'availableCopies', sortable: true },
                      { title: 'Total Issues', key: 'totalIssues', sortable: true },
                      { title: 'Currently Issued', key: 'currentlyIssued', sortable: true },
                    ]}
                    data={data.bookUsage}
                    searchPlaceholder="Search books..."
                    searchKeys={['title', 'author', 'category']}
                  />
                </ReportSection>
              )}

              {activeTab === 'trend' && (
                <ReportSection
                  title="Daily / Weekly / Monthly Report"
                  onExport={() => exportToCSV(rows.trend, 'circulation_trend_report.csv')}
                  extra={
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                      {['daily', 'weekly', 'monthly'].map((g) => (
                        <button
                          key={g}
                          onClick={() => setGranularity(g)}
                          className={`px-3 py-1 text-3xs font-bold rounded-md capitalize transition-all ${
                            granularity === g
                              ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  }
                >
                  {trendLoading ? (
                    <SkeletonTable rows={6} columns={4} />
                  ) : (
                    <DataTable
                      columns={[
                        { title: 'Period', key: 'period', sortable: true },
                        { title: 'Issues', key: 'ISSUE', sortable: true },
                        { title: 'Returns', key: 'RETURN', sortable: true },
                        { title: 'Renewals', key: 'RENEW', sortable: true },
                      ]}
                      data={trend}
                      searchPlaceholder="Search period..."
                      searchKeys={['period']}
                    />
                  )}
                </ReportSection>
              )}

              {activeTab === 'mostIssued' && (
                <ReportSection title="Most Issued Books" onExport={() => exportToCSV(rows.mostIssued, 'most_issued_books_report.csv')}>
                  {data.mostIssued.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                      No issue transactions recorded yet.
                    </div>
                  ) : (
                    <DataTable
                      columns={[
                        {
                          title: 'Rank',
                          key: 'rank',
                          render: (_, __, index) => (
                            <span className="font-black text-xs text-indigo-600 dark:text-indigo-400">#{index + 1}</span>
                          ),
                        },
                        { title: 'Book Title', key: 'title', sortable: true },
                        { title: 'Author', key: 'author', sortable: true },
                        { title: 'Category', key: 'category' },
                        {
                          title: 'Total Circulation Count',
                          key: 'totalIssues',
                          sortable: true,
                          render: (val) => <Badge variant="indigo">{val} times issued</Badge>,
                        },
                        { title: 'Last Issued Date', key: 'lastIssuedAt', render: (val) => formatDate(val) },
                      ]}
                      data={data.mostIssued}
                      searchPlaceholder="Search titles..."
                      searchKeys={['title', 'author', 'category']}
                    />
                  )}
                </ReportSection>
              )}

              {activeTab === 'mostActiveMembers' && (
                <ReportSection title="Most Active Members" onExport={() => exportToCSV(rows.mostActiveMembers, 'most_active_members_report.csv')}>
                  {data.mostActiveMembers.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                      No circulation activity recorded yet.
                    </div>
                  ) : (
                    <DataTable
                      columns={[
                        {
                          title: 'Rank',
                          key: 'rank',
                          render: (_, __, index) => (
                            <span className="font-black text-xs text-indigo-600 dark:text-indigo-400">#{index + 1}</span>
                          ),
                        },
                        { title: 'Member', key: 'borrowerName', sortable: true },
                        { title: 'Type', key: 'borrowerType', render: (val) => <Badge variant="indigo">{val}</Badge> },
                        {
                          title: 'Total Issues',
                          key: 'totalIssues',
                          sortable: true,
                          render: (val) => <Badge variant="success">{val} books</Badge>,
                        },
                        { title: 'Total Fines', key: 'totalFines', render: (val) => formatCurrency(val || 0) },
                      ]}
                      data={data.mostActiveMembers}
                      searchPlaceholder="Search members..."
                      searchKeys={['borrowerName']}
                    />
                  )}
                </ReportSection>
              )}

              {activeTab === 'inventory' && (
                <ReportSection title="Inventory / Stock Report" onExport={() => exportToCSV(rows.inventory, 'inventory_report.csv')}>
                  <DataTable
                    columns={[
                      { title: 'Category Name', key: 'name', sortable: true },
                      { title: 'Unique Titles', key: 'count', sortable: true },
                      { title: 'Total Copies', key: 'totalCopies', sortable: true },
                      { title: 'Available Copies', key: 'availableCopies', sortable: true },
                    ]}
                    data={data.inventory?.categories || []}
                    searchPlaceholder="Filter categories..."
                    searchKeys={['name']}
                  />
                </ReportSection>
              )}

              {activeTab === 'lostDamaged' && (
                <ReportSection title="Lost & Damaged Books" onExport={() => exportToCSV(rows.lostDamaged, 'lost_damaged_report.csv')}>
                  {data.lostDamaged.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                      No lost or damaged copies recorded.
                    </div>
                  ) : (
                    <DataTable
                      columns={[
                        { title: 'Book Title', key: 'bookTitle' },
                        { title: 'Accession #', key: 'accessionNumber' },
                        { title: 'Borrower', key: 'borrowerName' },
                        { title: 'Return Date', key: 'returnDate', render: (val) => formatDate(val) },
                        { title: 'Condition', key: 'conditionOnReturn', render: (val) => <Badge variant="danger">{val}</Badge> },
                        { title: 'Fine Amount', key: 'fineAmount', render: (val) => formatCurrency(val || 0) },
                      ]}
                      data={data.lostDamaged}
                      searchPlaceholder="Search records..."
                      searchKeys={['bookTitle', 'borrowerName']}
                    />
                  )}
                </ReportSection>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Reports;

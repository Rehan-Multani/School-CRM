import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bell,
  Building2,
  CreditCard,
  Download,
  IndianRupee,
  Loader2,
  Printer,
  Search,
} from 'lucide-react';
import { Badge, Button, Card, cn } from '../../components/ui/Button';
import { StatCard } from '../../components/dashboard/StatCard';
import { Pulse } from '../../components/ui/SkeletonLoader';
import { Select } from '../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformReportApi } from '../../../../shared/api/client';

const PAGE_SIZE = 8;
const SCHOOL_STATUSES = ['All', 'Active', 'Inactive', 'Trial', 'Suspended'];
const INVOICE_STATUSES = ['All', 'Paid', 'Pending', 'Overdue', 'Refunded', 'Failed', 'Cancelled'];
const RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'year', label: 'This year' },
];
const STATUS_COLORS = {
  Active: '#10b981',
  Inactive: '#64748b',
  Trial: '#f59e0b',
  Suspended: '#f43f5e',
  Paid: '#10b981',
  Pending: '#f59e0b',
  Overdue: '#f43f5e',
  Refunded: '#6366f1',
  Failed: '#f43f5e',
  Cancelled: '#64748b',
  Unassigned: '#94a3b8',
};
const PLAN_COLORS = ['#6366f1', '#0ea5e9', '#8b5cf6', '#14b8a6', '#f59e0b', '#94a3b8'];

const emptySummary = {
  summary: {
    totalSchools: 0,
    activeSchools: 0,
    trialSchools: 0,
    suspendedSchools: 0,
    unassignedPlan: 0,
    totalStudents: 0,
    totalStaff: 0,
    storageUsedGb: 0,
    estimatedMonthlyRevenue: 0,
    estimatedAnnualRevenue: 0,
    collectedAmount: 0,
    outstandingAmount: 0,
    notificationsSent: 0,
    notificationDevicesReached: 0,
  },
  schoolsByStatus: [],
  schoolsByPlan: [],
  schoolsByBoard: [],
  monthlyGrowth: [],
  plans: [],
  billing: { byStatus: [], collectedAmount: 0, outstandingAmount: 0, paid: 0, pending: 0, overdue: 0 },
  recentSchools: [],
  notifications: { total: 0, attempted: 0, success: 0, failed: 0 },
  planCatalog: [],
};

function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function dateParams(preset) {
  if (preset === 'all') return {};
  const to = new Date();
  const from = new Date();
  if (preset === '30d') from.setDate(from.getDate() - 30);
  if (preset === '90d') from.setDate(from.getDate() - 90);
  if (preset === 'year') {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(','))].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function printReport(title, columns, rows) {
  const table = `
    <table>
      <thead>
        <tr>${columns.map((col) => `<th>${col.label}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${
          rows.length
            ? rows
                .map(
                  (row) =>
                    `<tr>${columns.map((col) => `<td>${row[col.key] ?? '—'}</td>`).join('')}</tr>`
                )
                .join('')
            : '<tr><td colspan="12">No records in this range.</td></tr>'
        }
      </tbody>
    </table>
  `;
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Inter, Segoe UI, sans-serif; padding: 28px; color: #0f172a; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          p { color: #64748b; font-size: 12px; margin: 0 0 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
          th { background: #f8fafc; text-transform: uppercase; letter-spacing: .04em; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated ${new Date().toLocaleString('en-IN')}</p>
        ${table}
      </body>
    </html>`);
  win.document.close();
  win.focus();
  win.print();
}

function invoiceBadge(status) {
  if (status === 'Paid') return 'success';
  if (status === 'Pending') return 'warning';
  if (status === 'Refunded') return 'info';
  if (['Overdue', 'Failed', 'Cancelled'].includes(status)) return 'danger';
  return status;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-800 dark:bg-slate-950">
      <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="text-slate-500">
          {item.name}:{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {item.dataKey === 'collected' ? formatInr(item.value) : item.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function Pager({ page, pagination, onPageChange }) {
  if (!pagination?.total) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Showing {(pagination.page - 1) * pagination.limit + 1}–
        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={page >= pagination.totalPages}
          onClick={() => onPageChange(Math.min(pagination.totalPages, page + 1))}
          className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function EmptyRow({ cols, label }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={cols} className="py-10 text-center text-sm text-slate-400">
        {label}
      </TableCell>
    </TableRow>
  );
}

function TableSkeletonRows({ cols, rows = 5 }) {
  return Array.from({ length: rows }).map((_, rowIndex) => (
    <TableRow key={rowIndex} className="hover:bg-transparent">
      {Array.from({ length: cols }).map((_, colIndex) => (
        <TableCell key={colIndex}>
          <Pulse className={`h-3.5 ${colIndex === 0 ? 'w-36' : 'w-20'}`} />
        </TableCell>
      ))}
    </TableRow>
  ));
}

function ReportsOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {[0, 1].map((index) => (
          <Card key={index} className="space-y-4">
            <Pulse className="h-3.5 w-48" />
            <Pulse className="h-72 w-full rounded-xl" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="space-y-4">
          <Pulse className="h-3.5 w-32" />
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <Pulse className="h-3 w-24" />
                <Pulse className="h-3 w-8" />
              </div>
              <Pulse className="h-2 w-full rounded-full" />
            </div>
          ))}
        </Card>
        <Card className="space-y-4">
          <Pulse className="h-3.5 w-40" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableSkeletonRows cols={4} rows={4} />
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

function SubscriptionsReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Card key={index} className="space-y-2">
            <Pulse className="h-2.5 w-24" />
            <Pulse className="h-7 w-16" />
          </Card>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Schools</TableHead>
            <TableHead>Billable</TableHead>
            <TableHead>Est. MRR</TableHead>
            <TableHead>Est. ARR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableSkeletonRows cols={7} rows={4} />
        </TableBody>
      </Table>
    </div>
  );
}

export default function ReportsIndex() {
  const { addNotification } = useSuperAdminNotifications();
  const [tab, setTab] = useState('overview');
  const [range, setRange] = useState('all');
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolStatus, setSchoolStatus] = useState('All');
  const [schoolPlan, setSchoolPlan] = useState('All');
  const [schoolPage, setSchoolPage] = useState(1);
  const [schools, setSchools] = useState([]);
  const [schoolMeta, setSchoolMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  const [invoiceStatus, setInvoiceStatus] = useState('All');
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoices, setInvoices] = useState([]);
  const [invoiceMeta, setInvoiceMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const [notificationPage, setNotificationPage] = useState(1);
  const [notifications, setNotifications] = useState([]);
  const [notificationMeta, setNotificationMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const rangeQuery = useMemo(() => dateParams(range), [range]);
  const stats = summary.summary || emptySummary.summary;

  const loadSummary = async () => {
    setLoading(true);
    try {
      const result = await platformReportApi.summary(rangeQuery);
      setSummary(result.data || emptySummary);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  };

  const loadSchools = async (page = schoolPage) => {
    setSchoolsLoading(true);
    try {
      const result = await platformReportApi.schools({
        ...rangeQuery,
        search: schoolSearch || undefined,
        status: schoolStatus,
        plan: schoolPlan,
        page,
        limit: PAGE_SIZE,
      });
      const meta = result.pagination || { page, limit: PAGE_SIZE, total: 0, totalPages: 1 };
      if (meta.totalPages > 0 && page > meta.totalPages) {
        setSchoolPage(meta.totalPages);
        return;
      }
      setSchools(result.data || []);
      setSchoolMeta(meta);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to load school report.');
    } finally {
      setSchoolsLoading(false);
    }
  };

  const loadInvoices = async (page = invoicePage) => {
    setInvoicesLoading(true);
    try {
      const result = await platformReportApi.invoices({
        ...rangeQuery,
        status: invoiceStatus,
        page,
        limit: PAGE_SIZE,
      });
      const meta = result.pagination || { page, limit: PAGE_SIZE, total: 0, totalPages: 1 };
      if (meta.totalPages > 0 && page > meta.totalPages) {
        setInvoicePage(meta.totalPages);
        return;
      }
      setInvoices(result.data || []);
      setInvoiceMeta(meta);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to load invoice report.');
    } finally {
      setInvoicesLoading(false);
    }
  };

  const loadNotifications = async (page = notificationPage) => {
    setNotificationsLoading(true);
    try {
      const result = await platformReportApi.notifications({
        ...rangeQuery,
        page,
        limit: PAGE_SIZE,
      });
      const meta = result.pagination || { page, limit: PAGE_SIZE, total: 0, totalPages: 1 };
      if (meta.totalPages > 0 && page > meta.totalPages) {
        setNotificationPage(meta.totalPages);
        return;
      }
      setNotifications(result.data || []);
      setNotificationMeta(meta);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to load notification report.');
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
    setSchoolPage(1);
    setInvoicePage(1);
    setNotificationPage(1);
  }, [range]);

  useEffect(() => {
    const timer = setTimeout(() => loadSchools(schoolPage), schoolSearch ? 300 : 0);
    return () => clearTimeout(timer);
  }, [range, schoolSearch, schoolStatus, schoolPlan, schoolPage]);

  useEffect(() => {
    loadInvoices(invoicePage);
  }, [range, invoiceStatus, invoicePage]);

  useEffect(() => {
    loadNotifications(notificationPage);
  }, [range, notificationPage]);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (tab === 'schools') {
        const result = await platformReportApi.schools({
          ...rangeQuery,
          search: schoolSearch || undefined,
          status: schoolStatus,
          plan: schoolPlan,
          page: 1,
          limit: 500,
        });
        downloadCsv(
          'school-report.csv',
          (result.data || []).map((row) => ({
            School: row.name,
            Code: row.code,
            'School ID': row.schoolId,
            Board: row.board,
            Type: row.type,
            City: row.city,
            State: row.state,
            Plan: row.subscriptionPlan || 'Unassigned',
            Status: row.status,
            Students: row.studentsCount,
            Staff: row.staffCount,
            'Created at': formatDate(row.createdAt),
          }))
        );
      } else if (tab === 'invoices') {
        const result = await platformReportApi.invoices({
          ...rangeQuery,
          status: invoiceStatus,
          page: 1,
          limit: 500,
        });
        downloadCsv(
          'invoice-report.csv',
          (result.data || []).map((row) => ({
            Invoice: row.invoiceNumber,
            School: row.schoolName,
            Plan: row.planName,
            'Plan type': row.planType,
            Amount: row.amount,
            Status: row.status,
            Issued: formatDate(row.issuedAt),
            Due: formatDate(row.dueAt),
            Paid: formatDate(row.paidAt),
          }))
        );
      } else if (tab === 'notifications') {
        const result = await platformReportApi.notifications({ ...rangeQuery, page: 1, limit: 200 });
        downloadCsv(
          'notification-report.csv',
          (result.data || []).map((row) => ({
            Title: row.title,
            Audience: (row.audiences || []).join(', '),
            School: row.schoolName,
            Attempted: row.attempted,
            Success: row.success,
            Failed: row.failed,
            Sent: formatDate(row.createdAt),
          }))
        );
      } else if (tab === 'subscriptions') {
        downloadCsv(
          'subscription-report.csv',
          (summary.plans || []).map((plan) => ({
            Plan: plan.name,
            Price: plan.price,
            Type: plan.planType,
            Schools: plan.schoolCount,
            'Billable schools': plan.billableCount,
            'Estimated MRR': plan.monthlyRevenue,
            'Estimated ARR': plan.annualRevenue,
          }))
        );
      } else {
        downloadCsv('platform-overview.csv', [
          {
            Schools: stats.totalSchools,
            Active: stats.activeSchools,
            Trial: stats.trialSchools,
            'Collected revenue': stats.collectedAmount,
            Outstanding: stats.outstandingAmount,
            'Estimated MRR': stats.estimatedMonthlyRevenue,
            Notifications: stats.notificationsSent,
          },
        ]);
      }
      addNotification('success', 'CSV report downloaded.');
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to export report.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    try {
      if (tab === 'schools') {
        const result = await platformReportApi.schools({
          ...rangeQuery,
          search: schoolSearch || undefined,
          status: schoolStatus,
          plan: schoolPlan,
          page: 1,
          limit: 500,
        });
        printReport(
          'School report',
          [
            { key: 'name', label: 'School' },
            { key: 'code', label: 'Code' },
            { key: 'board', label: 'Board' },
            { key: 'city', label: 'City' },
            { key: 'subscriptionPlan', label: 'Plan' },
            { key: 'status', label: 'Status' },
          ],
          result.data || []
        );
        return;
      }
      if (tab === 'invoices') {
        const result = await platformReportApi.invoices({
          ...rangeQuery,
          status: invoiceStatus,
          page: 1,
          limit: 500,
        });
        printReport(
          'Invoice report',
          [
            { key: 'invoiceNumber', label: 'Invoice' },
            { key: 'schoolName', label: 'School' },
            { key: 'planName', label: 'Plan' },
            { key: 'amount', label: 'Amount' },
            { key: 'status', label: 'Status' },
          ],
          (result.data || []).map((row) => ({ ...row, amount: formatInr(row.amount) }))
        );
        return;
      }
      if (tab === 'notifications') {
        printReport(
          'Notification report',
          [
            { key: 'title', label: 'Title' },
            { key: 'schoolName', label: 'School' },
            { key: 'success', label: 'Delivered' },
            { key: 'failed', label: 'Failed' },
          ],
          notifications
        );
        return;
      }
      if (tab === 'subscriptions') {
        printReport(
          'Subscription occupancy',
          [
            { key: 'name', label: 'Plan' },
            { key: 'planType', label: 'Type' },
            { key: 'schoolCount', label: 'Schools' },
            { key: 'monthlyRevenue', label: 'Est. MRR' },
          ],
          (summary.plans || []).map((plan) => ({ ...plan, monthlyRevenue: formatInr(plan.monthlyRevenue) }))
        );
        return;
      }
      printReport(
        'Platform overview',
        [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value' },
        ],
        [
          { metric: 'Total schools', value: stats.totalSchools },
          { metric: 'Active schools', value: stats.activeSchools },
          { metric: 'Collected revenue', value: formatInr(stats.collectedAmount) },
          { metric: 'Outstanding', value: formatInr(stats.outstandingAmount) },
          { metric: 'Estimated MRR', value: formatInr(stats.estimatedMonthlyRevenue) },
          { metric: 'Notifications sent', value: stats.notificationsSent },
        ]
      );
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to print report.');
    }
  };

  const kpis = [
    { label: 'Total schools', value: stats.totalSchools, hint: `${stats.activeSchools} active`, icon: Building2, tone: 'indigo', to: '/super-admin/schools' },
    { label: 'Collected revenue', value: formatInr(stats.collectedAmount), hint: `${formatInr(stats.outstandingAmount)} outstanding`, icon: IndianRupee, tone: 'emerald', to: '/super-admin/billing' },
    { label: 'Estimated MRR', value: formatInr(stats.estimatedMonthlyRevenue), hint: `${formatInr(stats.estimatedAnnualRevenue)} ARR`, icon: CreditCard, tone: 'violet', to: '/super-admin/revenue' },
    { label: 'Notifications', value: stats.notificationsSent, hint: `${stats.notificationDevicesReached} devices reached`, icon: Bell, tone: 'sky', to: '/super-admin/notifications' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Live school occupancy, subscription usage, invoice collection, and notification delivery.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="inline-flex w-full items-center rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900 sm:w-auto">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={cn(
                  'flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:flex-none',
                  range === option.value
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="h-9 px-3.5" onClick={handlePrint} disabled={loading}>
              <Printer size={14} className="mr-1.5" />
              Print
            </Button>
            <Button size="sm" className="h-9 px-3.5" onClick={handleExport} disabled={loading || exporting}>
              {exporting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <StatCard
            key={item.label}
            title={item.label}
            value={item.value}
            hint={item.hint}
            icon={item.icon}
            tone={item.tone}
            to={item.to}
            loading={loading}
          />
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto p-1.5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {loading ? (
            <ReportsOverviewSkeleton />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">School additions & collections</h3>
                    <p className="mt-0.5 text-xs text-slate-400">New schools vs collected invoice amount</p>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={summary.monthlyGrowth || []}>
                        <defs>
                          <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                        <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} />
                        <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar yAxisId="left" dataKey="schools" name="New schools" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Area yAxisId="right" type="monotone" dataKey="collected" name="Collected" stroke="#10b981" fill="url(#collectedFill)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Schools by status</h3>
                    <p className="mt-0.5 text-xs text-slate-400">Active, trial, and suspended occupancy</p>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.schoolsByStatus || []} layout="vertical" margin={{ left: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={80} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" name="Schools" radius={[0, 4, 4, 0]}>
                          {(summary.schoolsByStatus || []).map((row) => (
                            <Cell key={row.name} fill={STATUS_COLORS[row.name] || '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Plan occupancy</h3>
                    <p className="mt-0.5 text-xs text-slate-400">Schools assigned to each subscription plan</p>
                  </div>
                  <div className="space-y-3">
                    {(summary.schoolsByPlan || []).length ? (
                      summary.schoolsByPlan.map((row, index) => {
                        const max = Math.max(...summary.schoolsByPlan.map((item) => item.count), 1);
                        return (
                          <div key={row.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700 dark:text-slate-200">{row.name || 'Unassigned'}</span>
                              <span className="text-slate-400">{row.count}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.round((row.count / max) * 100)}%`,
                                  background: PLAN_COLORS[index % PLAN_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="py-8 text-center text-sm text-slate-400">No school occupancy yet.</p>
                    )}
                  </div>
                </Card>

                <Card className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recently added schools</h3>
                    <p className="mt-0.5 text-xs text-slate-400">Latest registrations in the selected range</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(summary.recentSchools || []).length ? (
                        summary.recentSchools.map((school) => (
                          <TableRow key={school.id}>
                            <TableCell>
                              <p className="font-semibold">{school.name}</p>
                              <p className="text-[11px] text-slate-400">{school.city}{school.state ? `, ${school.state}` : ''}</p>
                            </TableCell>
                            <TableCell>{school.subscriptionPlan || 'Unassigned'}</TableCell>
                            <TableCell>
                              <Badge variant={school.status}>{school.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-400">{formatDate(school.createdAt)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <EmptyRow cols={4} label="No schools in this range." />
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="schools">
          <Card className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                  placeholder="Search school, code, or city"
                  value={schoolSearch}
                  onChange={(event) => {
                    setSchoolPage(1);
                    setSchoolSearch(event.target.value);
                  }}
                />
              </div>
              <Select
                value={schoolStatus}
                onChange={(event) => {
                  setSchoolPage(1);
                  setSchoolStatus(event.target.value);
                }}
                wrapperClassName="lg:w-40 lg:shrink-0"
              >
                {SCHOOL_STATUSES.map((status) => (
                  <option key={status} value={status}>{status === 'All' ? 'All statuses' : status}</option>
                ))}
              </Select>
              <Select
                value={schoolPlan}
                onChange={(event) => {
                  setSchoolPage(1);
                  setSchoolPlan(event.target.value);
                }}
                wrapperClassName="lg:w-48 lg:shrink-0"
              >
                <option value="All">All plans</option>
                <option value="Unassigned">Unassigned</option>
                {(summary.planCatalog || []).map((plan) => (
                  <option key={plan.id} value={plan.name}>{plan.name}</option>
                ))}
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Board / Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schoolsLoading ? (
                  <TableSkeletonRows cols={7} />
                ) : schools.length ? (
                  schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>
                        <p className="font-semibold">{school.name}</p>
                        <p className="font-mono text-[11px] text-slate-400">{school.code}</p>
                      </TableCell>
                      <TableCell>
                        <p>{school.board}</p>
                        <p className="text-[11px] text-slate-400">{school.type}</p>
                      </TableCell>
                      <TableCell>{[school.city, school.state].filter(Boolean).join(', ') || '—'}</TableCell>
                      <TableCell>{school.subscriptionPlan || 'Unassigned'}</TableCell>
                      <TableCell>{school.studentsCount}</TableCell>
                      <TableCell>
                        <Badge variant={school.status}>{school.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">{formatDate(school.createdAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <EmptyRow cols={7} label="No schools match these filters." />
                )}
              </TableBody>
            </Table>
            <Pager page={schoolPage} pagination={schoolMeta} onPageChange={setSchoolPage} />
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          {loading ? (
            <SubscriptionsReportSkeleton />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Plans</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{summary.plans?.length || 0}</p>
                </Card>
                <Card className="shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Unassigned schools</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{stats.unassignedPlan}</p>
                </Card>
                <Card className="shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Estimated MRR</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{formatInr(stats.estimatedMonthlyRevenue)}</p>
                  <p className="mt-1 text-xs text-slate-400">From active schools on a plan</p>
                </Card>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Schools</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Est. MRR</TableHead>
                    <TableHead>Est. ARR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(summary.plans || []).length ? (
                    summary.plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-semibold">{plan.name}</TableCell>
                        <TableCell>
                          <Badge variant="info">{plan.planType}</Badge>
                        </TableCell>
                        <TableCell>₹{plan.price}</TableCell>
                        <TableCell>{plan.schoolCount}</TableCell>
                        <TableCell>{plan.billableCount}</TableCell>
                        <TableCell>{formatInr(plan.monthlyRevenue)}</TableCell>
                        <TableCell>{formatInr(plan.annualRevenue)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyRow cols={7} label="No subscription plans yet." />
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 flex-1">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Collected</p>
                  <p className="mt-1 font-semibold">{formatInr(summary.billing?.collectedAmount)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Outstanding</p>
                  <p className="mt-1 font-semibold">{formatInr(summary.billing?.outstandingAmount)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Paid</p>
                  <p className="mt-1 font-semibold">{summary.billing?.paid || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Overdue</p>
                  <p className="mt-1 font-semibold">{summary.billing?.overdue || 0}</p>
                </div>
              </div>
              <Select
                value={invoiceStatus}
                onChange={(event) => {
                  setInvoicePage(1);
                  setInvoiceStatus(event.target.value);
                }}
                wrapperClassName="sm:w-44 sm:shrink-0"
              >
                {INVOICE_STATUSES.map((status) => (
                  <option key={status} value={status}>{status === 'All' ? 'All statuses' : status}</option>
                ))}
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesLoading ? (
                  <TableSkeletonRows cols={7} />
                ) : invoices.length ? (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-xs text-indigo-500">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="font-semibold">{invoice.schoolName}</TableCell>
                      <TableCell>
                        {invoice.planName}
                        <p className="text-[11px] text-slate-400">{invoice.planType}</p>
                      </TableCell>
                      <TableCell>{formatInr(invoice.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={invoiceBadge(invoice.status)}>{invoice.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">{formatDate(invoice.issuedAt)}</TableCell>
                      <TableCell className="text-xs text-slate-400">{formatDate(invoice.dueAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <EmptyRow cols={7} label="No invoices in this range." />
                )}
              </TableBody>
            </Table>
            <Pager page={invoicePage} pagination={invoiceMeta} onPageChange={setInvoicePage} />
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Sent</p>
                <p className="mt-1 font-semibold">{summary.notifications?.total || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Devices reached</p>
                <p className="mt-1 font-semibold">{summary.notifications?.success || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Failed</p>
                <p className="mt-1 font-semibold">{summary.notifications?.failed || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Attempted</p>
                <p className="mt-1 font-semibold">{summary.notifications?.attempted || 0}</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notificationsLoading ? (
                  <TableSkeletonRows cols={5} />
                ) : notifications.length ? (
                  notifications.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-semibold">{item.title}</p>
                        <p className="line-clamp-1 text-[11px] text-slate-400">{item.body}</p>
                      </TableCell>
                      <TableCell className="text-xs capitalize">
                        {(item.audiences || []).join(', ') || '—'}
                      </TableCell>
                      <TableCell>{item.schoolName}</TableCell>
                      <TableCell>
                        <p className="text-xs">{item.success} delivered · {item.failed} failed</p>
                        {item.skippedReason && <p className="text-[11px] text-amber-500">{item.skippedReason}</p>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">{formatDate(item.createdAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <EmptyRow cols={5} label="No notifications in this range." />
                )}
              </TableBody>
            </Table>
            <Pager page={notificationPage} pagination={notificationMeta} onPageChange={setNotificationPage} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

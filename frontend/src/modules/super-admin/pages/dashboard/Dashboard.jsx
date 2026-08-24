import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Building,
  CreditCard,
  IndianRupee,
  Users,
} from 'lucide-react';
import { Card, Badge } from '../../components/ui/Button';
import { StatCard } from '../../components/dashboard/StatCard';
import { AnalyticsCharts } from '../../components/charts/AnalyticsCharts';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Pulse } from '../../components/ui/SkeletonLoader';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import {
  platformNotificationApi,
  platformReportApi,
  platformSupportApi,
} from '../../../../shared/api/client';

function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatCount(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
}

function relativeTime(value) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '';
  }
}

function assignedPlan(plan) {
  return plan ? plan : '—';
}

export default function Dashboard() {
  const { addNotification } = useSuperAdminNotifications();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [openTickets, setOpenTickets] = useState(0);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [reportResult, notificationResult, ticketResult] = await Promise.all([
        platformReportApi.summary(),
        platformNotificationApi.list(),
        platformSupportApi.list({ page: 1, limit: 6 }),
      ]);
      setSummary(reportResult.data || reportResult);
      setNotifications(notificationResult.data || []);
      setTickets(ticketResult.data || []);
      setOpenTickets(ticketResult.stats?.open || ticketResult.pagination?.total || 0);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = summary?.summary || {};
  const monthlyGrowth = summary?.monthlyGrowth || [];

  const revenueData = useMemo(
    () => monthlyGrowth.map((row) => ({ name: row.month, revenue: row.collected || 0 })),
    [monthlyGrowth]
  );
  const growthData = useMemo(
    () =>
      monthlyGrowth.map((row) => ({
        name: row.month,
        schools: row.schools || 0,
        invoices: row.paidInvoices || 0,
      })),
    [monthlyGrowth]
  );

  const activity = useMemo(() => {
    const schoolItems = (summary?.recentSchools || []).slice(0, 5).map((school) => ({
      id: `school-${school.id}`,
      type: 'School',
      details: `${school.name} registered${school.subscriptionPlan ? ` · ${school.subscriptionPlan}` : ''}`,
      time: school.createdAt,
      meta: school.status,
    }));
    const notificationItems = notifications.slice(0, 5).map((item) => ({
      id: `notif-${item.id}`,
      type: 'Notification',
      details: item.title,
      time: item.createdAt,
      meta: item.delivery?.success ? `${item.delivery.success} sent` : 'Saved',
    }));
    const ticketItems = tickets.slice(0, 5).map((ticket) => ({
      id: `ticket-${ticket.id}`,
      type: 'Support',
      details: ticket.subject,
      time: ticket.createdAt || ticket.updatedAt,
      meta: ticket.status,
    }));

    return [...schoolItems, ...notificationItems, ...ticketItems]
      .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
      .slice(0, 8);
  }, [summary, notifications, tickets]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Super Admin Dashboard</h1>
        <p className="text-xs text-slate-400">Live schools, billing, notifications, and support across the platform.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="space-y-3">
              <Pulse className="h-3 w-24" />
              <Pulse className="h-8 w-20" />
              <Pulse className="h-3 w-32" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Schools" value={formatCount(stats.totalSchools)} icon={Building} tone="indigo" to="/super-admin/schools" />
          <StatCard title="Platform Users" value={formatCount((stats.totalStudents || 0) + (stats.totalStaff || 0))} icon={Users} tone="violet" to="/super-admin/reports" />
          <StatCard title="Collected" value={formatInr(stats.collectedAmount)} icon={IndianRupee} tone="emerald" to="/super-admin/billing" />
          <StatCard title="Est. Monthly Revenue" value={formatInr(stats.estimatedMonthlyRevenue)} icon={CreditCard} tone="sky" to="/super-admin/revenue" />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 bg-slate-100 dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-800/80 rounded-xl">
        {[
          { label: 'Active', val: formatCount(stats.activeSchools), to: '/super-admin/schools' },
          { label: 'Trial', val: formatCount(stats.trialSchools), to: '/super-admin/schools' },
          { label: 'Suspended', val: formatCount(stats.suspendedSchools), to: '/super-admin/schools' },
          { label: 'No plan', val: formatCount(stats.unassignedPlan), to: '/super-admin/subscriptions' },
          { label: 'Notifications', val: formatCount(stats.notificationsSent), to: '/super-admin/notifications' },
          { label: 'Open tickets', val: formatCount(openTickets), to: '/super-admin/support' },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="text-center md:text-left space-y-1 rounded-lg p-1.5 -m-1.5 hover:bg-white/70 dark:hover:bg-slate-800/50 transition-colors"
          >
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block">{item.label}</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{loading ? '—' : item.val}</span>
          </Link>
        ))}
      </div>

      <AnalyticsCharts revenueData={revenueData} growthData={growthData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">New school registrations</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Pulse key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : (summary?.recentSchools || []).length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No schools registered yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(summary?.recentSchools || []).slice(0, 6).map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-semibold text-slate-800 dark:text-slate-100">{school.name}</TableCell>
                    <TableCell>{assignedPlan(school.subscriptionPlan)}</TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 text-xs">
                      {relativeTime(school.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={school.status}>{school.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Bell size={14} className="text-indigo-500" />
            Recent activity
          </h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Pulse key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No recent activity yet.</p>
          ) : (
            <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-2">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start gap-4 p-3 bg-slate-100 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-900"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide block">
                      {item.type}
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{item.details}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-[10px] text-slate-500">{relativeTime(item.time)}</span>
                    {item.meta && (
                      <Badge variant="default" className="text-[8px] px-1 py-0.5">
                        {item.meta}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

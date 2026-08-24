import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  CreditCard,
  IndianRupee,
  Layers,
  Receipt,
  Wallet,
} from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui/Button';
import { KpiIcon } from '../../components/dashboard/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Pulse } from '../../components/ui/SkeletonLoader';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformBillingApi, platformReportApi } from '../../../../shared/api/client';

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

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function collectionRate(collected, outstanding) {
  const total = Number(collected || 0) + Number(outstanding || 0);
  if (!total) return 0;
  return Math.round((Number(collected || 0) / total) * 100);
}

const PLAN_COLORS = ['#6366f1', '#0ea5e9', '#8b5cf6', '#14b8a6', '#f59e0b'];

export default function RevenueIndex() {
  const { addNotification } = useSuperAdminNotifications();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [paidInvoices, setPaidInvoices] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [reportResult, paidResult] = await Promise.all([
          platformReportApi.summary(),
          platformBillingApi.list({ status: 'Paid', page: 1, limit: 8 }),
        ]);
        setSummary(reportResult.data || null);
        setPaidInvoices(paidResult.data || []);
      } catch (err) {
        addNotification('error', err.response?.data?.message || err.message || 'Unable to load revenue.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = summary?.summary || {};
  const billing = summary?.billing || {};
  const plans = summary?.plans || [];
  const rate = collectionRate(stats.collectedAmount, stats.outstandingAmount);

  const trendData = useMemo(
    () =>
      (summary?.monthlyGrowth || []).map((row) => ({
        name: row.month,
        collected: row.collected || 0,
      })),
    [summary]
  );

  const planChart = useMemo(
    () =>
      plans.map((plan) => ({
        name: plan.name,
        mrr: plan.monthlyRevenue || 0,
      })),
    [plans]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
          <p className="text-xs text-slate-400">
            Estimated MRR from assigned plans, collected invoices, and outstanding renewals.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => navigate('/super-admin/billing')}>
          <Receipt size={14} className="mr-1.5" />
          Open billings
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="space-y-3">
              <Pulse className="h-3 w-28" />
              <Pulse className="h-8 w-24" />
            </Card>
          ))
        ) : (
          <>
            <Kpi
              icon={IndianRupee}
              tone="indigo"
              label="Monthly Recurring Revenue"
              value={formatInr(stats.estimatedMonthlyRevenue)}
              hint="Active schools on a plan"
            />
            <Kpi
              icon={Layers}
              tone="emerald"
              label="Annual Run Rate"
              value={formatInr(stats.estimatedAnnualRevenue)}
              hint="Estimated from current MRR"
            />
            <Kpi
              icon={Wallet}
              tone="violet"
              label="Collected"
              value={formatInr(stats.collectedAmount)}
              hint={`${formatInr(stats.outstandingAmount)} outstanding`}
            />
            <Kpi
              icon={CreditCard}
              tone="sky"
              label="Collection Rate"
              value={`${rate}%`}
              hint={`${formatCount(billing.pending || 0)} pending · ${formatCount(billing.overdue || 0)} overdue`}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-100 dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-800/80 rounded-xl">
        {[
          { label: 'Paid invoices', val: formatCount(billing.paid) },
          { label: 'Pending', val: formatCount(billing.pending) },
          { label: 'Overdue', val: formatCount(billing.overdue) },
          { label: 'Refunded', val: formatCount(billing.refunded) },
        ].map((item) => (
          <div key={item.label} className="space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block">{item.label}</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{loading ? '—' : item.val}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Collected (12 months)</h3>
          <div className="h-72 w-full">
            {loading ? (
              <Pulse className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickFormatter={(value) => `₹${Number(value || 0).toLocaleString('en-IN')}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                    formatter={(value) => [formatInr(value), 'Collected']}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueCollected)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">MRR by plan</h3>
          <div className="h-72 w-full">
            {loading ? (
              <Pulse className="h-full w-full" />
            ) : planChart.length === 0 ? (
              <p className="text-sm text-slate-400 h-full flex items-center justify-center">No plans assigned yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planChart} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickFormatter={(value) => `₹${Number(value || 0).toLocaleString('en-IN')}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                    formatter={(value) => [formatInr(value), 'Est. MRR']}
                  />
                  <Bar dataKey="mrr" fill={PLAN_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Plan mix</h3>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Pulse key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No subscription plans yet.</p>
        ) : (
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
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-semibold">{plan.name}</TableCell>
                  <TableCell>
                    <Badge variant="info">{plan.planType}</Badge>
                  </TableCell>
                  <TableCell>{formatInr(plan.price)}</TableCell>
                  <TableCell>{formatCount(plan.schoolCount)}</TableCell>
                  <TableCell>{formatCount(plan.billableCount)}</TableCell>
                  <TableCell>{formatInr(plan.monthlyRevenue)}</TableCell>
                  <TableCell>{formatInr(plan.annualRevenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Banknote size={14} className="text-emerald-500" />
            Recent collections
          </h3>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Pulse key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : paidInvoices.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No paid invoices yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid on</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paidInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                  <TableCell className="font-semibold">{invoice.schoolName}</TableCell>
                  <TableCell>{invoice.planName || '—'}</TableCell>
                  <TableCell>{formatInr(invoice.amount)}</TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDate(invoice.paidAt || invoice.issuedAt)}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status}>{invoice.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, tone, label, value, hint }) {
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-2">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</h4>
        <p className="truncate text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{value}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <KpiIcon icon={Icon} tone={tone} />
    </Card>
  );
}

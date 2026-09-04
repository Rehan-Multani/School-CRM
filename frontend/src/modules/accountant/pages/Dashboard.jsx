import React, { useEffect, useState } from 'react';
import { useAccountantAuth } from '../context/AccountantAuthContext';
import { useAccountantNotifications } from '../context/AccountantNotificationContext';
import {
  Users,
  TrendingUp,
  IndianRupee,
  AlertTriangle,
  ArrowRight,
  Receipt,
  Loader2,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { AreaChart } from '../components/ui/Charts/AreaChart';
import { BarChart } from '../components/ui/Charts/BarChart';
import { PieChart } from '../components/ui/Charts/PieChart';
import { useNavigate } from 'react-router-dom';
import { accountantApi } from '../../../shared/api/client';
import { formatCurrency, formatDate } from '../utils/formatters';

const STATUS_LABELS = {
  PENDING: 'Pending',
  PARTIALLY_PAID: 'Partially Paid',
  OVERDUE: 'Overdue',
  PAID: 'Paid',
  DRAFT: 'Draft',
  CANCELLED: 'Cancelled',
};

export const Dashboard = () => {
  const { user } = useAccountantAuth();
  const { notifications } = useAccountantNotifications();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    accountantApi
      .dashboard()
      .then((res) => {
        if (alive) setData(res?.data || null);
      })
      .catch((err) => {
        if (alive) setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const netBalance = (data?.monthCollection || 0) - (data?.monthExpenses || 0);
  const collectionSeries = (data?.collectionOverview || []).map((d) => ({
    day: formatDate(d.date),
    collection: d.amount,
  }));
  const duesSeries = (data?.duesSummary || [])
    .filter((d) => d.amount > 0)
    .map((d) => ({ status: STATUS_LABELS[d.status] || d.status, amount: d.amount }));

  return (
    <div className="space-y-6">
      {/* Welcome Board */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl object-cover border-2 border-violet-500 shrink-0 shadow-sm overflow-hidden bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-xl font-black text-violet-600 dark:text-violet-300">
            {user?.photo ? (
              <img src={user.photo} alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              <span>{(user?.name || 'A').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-violet-600 dark:text-violet-400 uppercase">
              Finance &amp; Ledger Center
            </span>
            <h2 className="text-lg md:text-xl font-black mt-0.5 text-slate-900 dark:text-white">Welcome, {user?.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              {[user?.employeeId, user?.department, user?.academicSession && `Session ${user.academicSession}`]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
        </div>
        <div className="text-left md:text-right md:border-l md:border-slate-200 dark:md:border-slate-800 md:pl-6">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Ledger Date</span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Quick Operations Actions bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">Quick Accountant Tools</span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Collect Fee', to: '/accountant/fee-collection' },
            { label: 'Fee Structure', to: '/accountant/fee-structure' },
            { label: 'Pending Dues', to: '/accountant/dues' },
            { label: 'School Expenses', to: '/accountant/expenses' },
            { label: 'Transactions', to: '/accountant/transactions' },
          ].map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-violet-50 dark:bg-slate-950 dark:hover:bg-violet-900/20 text-slate-600 dark:text-slate-300 hover:text-violet-700 dark:hover:text-violet-300 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-extrabold transition-all text-left"
            >
              <ArrowRight className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-900/10 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Today's Collection" value={formatCurrency(data?.todayCollection || 0)} subtitle={`${data?.todayCount || 0} payments today`} icon={TrendingUp} />
            <StatCard title="This Month's Collection" value={formatCurrency(data?.monthCollection || 0)} subtitle={`${data?.monthCount || 0} payments this month`} icon={TrendingUp} />
            <StatCard title="Total Pending Fees" value={formatCurrency(data?.totalPendingFees || 0)} subtitle={`${data?.pendingInvoiceCount || 0} open invoices`} icon={AlertTriangle} />
            <StatCard title="Total Expenses" value={formatCurrency(data?.totalExpenses || 0)} subtitle="all recorded debits" icon={IndianRupee} />
            <StatCard title="Expenses This Month" value={formatCurrency(data?.monthExpenses || 0)} subtitle="current month debits" icon={IndianRupee} />
            <StatCard title="Net Position (Month)" value={formatCurrency(netBalance)} subtitle="collections minus expenses" icon={IndianRupee} />
            <StatCard title="Recent Transactions" value={`${data?.recentTransactions?.length || 0} Records`} subtitle="latest fee receipts" icon={Receipt} />
            <StatCard title="Dues Buckets" value={`${duesSeries.length}`} subtitle="pending/partial/overdue" icon={Users} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block mb-4">Collection Overview (Last 7 Days)</span>
              {collectionSeries.length ? (
                <AreaChart data={collectionSeries} dataKey="collection" xKey="day" height={220} color="#7c3aed" />
              ) : (
                <p className="py-16 text-center text-xs font-semibold text-slate-400">No collections in the last 7 days.</p>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest block mb-4">Pending / Dues Summary</span>
              <div className="flex-1 flex items-center justify-center">
                {duesSeries.length ? (
                  <BarChart data={duesSeries} dataKey="amount" xKey="status" height={200} color="#8b5cf6" />
                ) : (
                  <p className="py-16 text-center text-xs font-semibold text-slate-400">No outstanding dues.</p>
                )}
              </div>
            </div>
          </div>

          {/* Transaction Feed & Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Recent Transactions</h4>
                <button onClick={() => navigate('/accountant/transactions')} className="text-[10px] font-bold text-violet-600 hover:underline flex items-center gap-1">
                  <span>View All</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {(data?.recentTransactions || []).length === 0 ? (
                <div className="py-8 text-center text-xs font-semibold text-slate-400">No fee transactions recorded yet.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.recentTransactions.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between text-xs font-semibold">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{item.studentName}</span>
                          <Badge variant={item.status === 'COMPLETED' ? 'success' : 'warning'}>{item.status}</Badge>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.receiptNumber} • {item.paymentMethod}
                          {item.invoiceNumber ? ` • ${item.invoiceNumber}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 dark:text-white block">{formatCurrency(item.amount)}</span>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">{formatDate(item.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Notifications</h4>
              </div>
              <div className="space-y-4 max-h-72 overflow-y-auto no-scrollbar">
                {(notifications || []).length === 0 ? (
                  <p className="text-[11px] text-slate-400 font-semibold">No notifications.</p>
                ) : (
                  notifications.slice(0, 12).map((n) => (
                    <div key={n.id} className="flex gap-2.5 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0"></div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{n.title}</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useLibrarianAuth } from '../context/LibrarianAuthContext';
import {
  BookOpen,
  BookCopy,
  FileCheck,
  FileX,
  Receipt,
  Bookmark,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Library,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/ui/StatCard';
import { AreaChart } from '../components/ui/Charts/AreaChart';
import { BarChart } from '../components/ui/Charts/BarChart';
import { PieChart } from '../components/ui/Charts/PieChart';
import { DashboardSkeleton } from '../components/ui/SkeletonLoader';
import { formatDate, formatCurrency, formatDateTime } from '../utils/formatters';
import { librarianApi } from '../../../shared/api/client';
import { Badge } from '../components/ui/Badge';

export const Dashboard = () => {
  const { user } = useLibrarianAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalTitles: 0,
    totalCopies: 0,
    availableCopies: 0,
    issuedCopies: 0,
    overdueCount: 0,
    todayIssues: 0,
    todayReturns: 0,
    todayFineCollected: 0,
    totalPendingFines: 0,
    pendingReservations: 0,
    damagedCopies: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categoryChartData, setCategoryChartData] = useState([]);
  const [issueTrendData, setIssueTrendData] = useState([]);
  const [fineTrendData, setFineTrendData] = useState([]);

  const loadDashboardData = async (isSilent = false) => {
    if (isSilent) setRefreshing(true);
    else setLoading(true);
    try {
      const [statsRes, catRes, txRes, trendRes, fineRes] = await Promise.allSettled([
        librarianApi.stats(),
        librarianApi.categories(),
        librarianApi.transactions({ limit: 6 }),
        librarianApi.report('issue-trend', { months: 6 }),
        librarianApi.report('fine-trend', { months: 6 }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data);
      }

      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value?.data)) {
        setCategoryChartData(
          catRes.value.data.map((c) => ({
            name: c.name || 'General',
            value: c.count || 0,
          }))
        );
      }

      if (txRes.status === 'fulfilled' && Array.isArray(txRes.value?.data)) {
        setRecentTransactions(txRes.value.data);
      }

      if (trendRes.status === 'fulfilled' && Array.isArray(trendRes.value?.data)) {
        const monthMap = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        trendRes.value.data.forEach((item) => {
          const key = `${monthNames[(item._id?.month || 1) - 1]}`;
          if (!monthMap[key]) monthMap[key] = { name: key, Issues: 0, Returns: 0 };
          if (item._id?.type === 'ISSUE') monthMap[key].Issues += item.count;
          if (item._id?.type === 'RETURN') monthMap[key].Returns += item.count;
        });
        setIssueTrendData(Object.values(monthMap));
      }

      if (fineRes.status === 'fulfilled' && Array.isArray(fineRes.value?.data)) {
        const monthMap = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        fineRes.value.data.forEach((item) => {
          const key = `${monthNames[(item._id?.month || 1) - 1]}`;
          if (!monthMap[key]) monthMap[key] = { name: key, Collection: 0 };
          monthMap[key].Collection += item.totalAmount || 0;
        });
        setFineTrendData(Object.values(monthMap));
      }
    } catch {
      // Handled via settled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const quickActions = [
    { name: 'Add New Book', icon: PlusCircle, path: '/librarian/books/add', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
    { name: 'Issue Book', icon: FileCheck, path: '/librarian/issue', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
    { name: 'Return Book', icon: FileX, path: '/librarian/return', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
    { name: 'Reservations', icon: Bookmark, path: '/librarian/reservations', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
    { name: 'View Reports', icon: FileText, path: '/librarian/reports', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Welcome & Library Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <Library className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {user?.schoolName || 'Greenfield Public School'} Library
              </h1>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-1">{formatDate(new Date())} • Welcome back, {user?.name || 'Librarian'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
            Session: <strong>{user?.academicSession || '2024-2025'}</strong>
          </span>
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:hover:bg-indigo-950 text-xs font-bold rounded-xl transition-all"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Titles"
          value={stats.totalTitles}
          icon={BookOpen}
          subtitle={`${stats.totalCopies} physical copies`}
          onClick={() => navigate('/librarian/books')}
        />
        <StatCard
          title="Available Copies"
          value={stats.availableCopies}
          icon={BookCopy}
          subtitle="Ready to issue"
          onClick={() => navigate('/librarian/books')}
        />
        <StatCard
          title="Active Issued"
          value={stats.issuedCopies}
          icon={FileCheck}
          subtitle={`${stats.todayIssues} issued today`}
          onClick={() => navigate('/librarian/issued')}
        />
        <StatCard
          title="Overdue Books"
          value={stats.overdueCount}
          icon={AlertTriangle}
          subtitle={`${stats.todayReturns} returned today`}
          onClick={() => navigate('/librarian/overdue')}
        />
        <StatCard
          title="Pending Fines"
          value={formatCurrency(stats.totalPendingFines)}
          icon={Receipt}
          subtitle={`${formatCurrency(stats.todayFineCollected)} collected today`}
          onClick={() => navigate('/librarian/fines/pending')}
        />
        <StatCard
          title="Reservation Queue"
          value={stats.pendingReservations}
          icon={Bookmark}
          subtitle="Pending requests"
          onClick={() => navigate('/librarian/reservations/pending')}
        />
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Quick Circulation Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.name}
                onClick={() => navigate(act.path)}
                className="flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/50 rounded-2xl hover:shadow-sm transition-all duration-200 group text-center"
              >
                <div className={`p-3 rounded-xl mb-2.5 group-hover:scale-105 transition-transform duration-200 ${act.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{act.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts & Activities Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issue Trends Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Monthly Issue & Return Trends</h3>
          </div>
          {issueTrendData.length > 0 ? (
            <AreaChart data={issueTrendData} dataKey="Issues" xKey="name" />
          ) : (
            <div className="h-56 flex items-center justify-center text-xs font-semibold text-slate-400">
              No trend data recorded yet.
            </div>
          )}
        </div>

        {/* Categories Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Category Distribution</h3>
          {categoryChartData.length > 0 ? (
            <PieChart data={categoryChartData} dataKey="value" nameKey="name" />
          ) : (
            <div className="h-56 flex items-center justify-center text-xs font-semibold text-slate-400">
              No categories populated.
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions & Fines Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Ledger (2 cols) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recent Circulation Activity</h3>
            <button
              onClick={() => navigate('/librarian/transactions')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View Full Ledger</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">
              No recent circulation transactions on record.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      tx.type === 'ISSUE' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40' :
                      tx.type === 'RETURN' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' :
                      tx.type === 'RENEW' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
                    }`}>
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                        {tx.bookTitle || 'Book Transaction'}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {tx.borrowerName} • Copy {tx.accessionNumber || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <Badge variant={tx.type === 'RETURN' ? 'success' : tx.type === 'ISSUE' ? 'neutral' : 'warning'}>
                      {tx.type}
                    </Badge>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {formatDateTime(tx.performedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fine Collection Trend */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Fine Collection Trend</h3>
            <button
              onClick={() => navigate('/librarian/fines')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Manage
            </button>
          </div>
          {fineTrendData.length > 0 ? (
            <BarChart data={fineTrendData} dataKey="Collection" xKey="name" />
          ) : (
            <div className="h-56 flex items-center justify-center text-xs font-semibold text-slate-400">
              No fines recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Dashboard;

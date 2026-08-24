import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Layers,
  CheckCircle2,
  BookmarkCheck,
  Clock,
  BookmarkPlus,
  Coins,
  RefreshCw,
  FileCheck,
  FileX,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { SkeletonStatCard, SkeletonCard, SkeletonList } from '../../components/ui/SkeletonLoader';
import { libraryPortalApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { LibraryTabsNav, formatDisplayDate, timeAgo, ISSUE_STATUS_BADGE } from './libraryShared';

const ACTIVITY_ICON = {
  ISSUE: { icon: FileCheck, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' },
  RETURN: { icon: FileX, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
  RENEW: { icon: RefreshCw, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/30' },
  LOST: { icon: Clock, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30' },
  DAMAGED: { icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  BOOK_ADDED: { icon: Plus, color: 'text-primary bg-primary/10' },
};

function activityLabel(entry) {
  if (entry.kind === 'BOOK_ADDED') {
    return `New book added: ${entry.bookTitle}`;
  }
  switch (entry.type) {
    case 'ISSUE':
      return `${entry.borrowerName} issued "${entry.bookTitle}"`;
    case 'RETURN':
      return `${entry.borrowerName} returned "${entry.bookTitle}"`;
    case 'RENEW':
      return `${entry.borrowerName} renewed "${entry.bookTitle}"`;
    case 'LOST':
      return `"${entry.bookTitle}" reported lost by ${entry.borrowerName}`;
    case 'DAMAGED':
      return `"${entry.bookTitle}" returned damaged by ${entry.borrowerName}`;
    default:
      return entry.details || 'Library activity';
  }
}

export const LibraryDashboard = () => {
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [mostIssued, setMostIssued] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [categories, setCategories] = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, txRes, booksRes, mostIssuedRes, overdueRes, catRes] = await Promise.all([
        libraryPortalApi.stats(),
        libraryPortalApi.transactions({ limit: 6 }),
        libraryPortalApi.books({ limit: 3 }),
        libraryPortalApi.report('most-issued', { limit: 5 }),
        libraryPortalApi.issues({ status: 'OVERDUE', limit: 6 }),
        libraryPortalApi.report('inventory'),
      ]);

      setStats(statsRes.data || null);

      const txActivity = (txRes.data || []).map((t) => ({ ...t, kind: 'TX' }));
      const bookActivity = (booksRes.data || []).map((b) => ({
        kind: 'BOOK_ADDED',
        id: `book-${b.id}`,
        bookTitle: b.title,
        performedAt: b.createdAt,
      }));
      const merged = [...txActivity, ...bookActivity]
        .sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt))
        .slice(0, 8);
      setActivity(merged);

      setMostIssued(mostIssuedRes.data || []);
      setOverdue((overdueRes.data || []).slice(0, 6));
      setCategories((catRes.data?.categories || []).slice(0, 8));
    } catch (err) {
      showToast(apiMessage(err, 'Failed to load library dashboard'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const kpis = stats || {
    totalTitles: 0,
    totalCopies: 0,
    availableCopies: 0,
    issuedCopies: 0,
    overdueCount: 0,
    pendingReservations: 0,
    totalFinesCollected: 0,
    totalPendingFines: 0,
  };

  const totalCategoryBooks = categories.reduce((sum, c) => sum + (c.count || 0), 0) || 1;

  return (
    <div className="space-y-6">
      <ToastComponent />
      <PageHeader
        title="Library Dashboard"
        subtitle="School-wide library inventory, circulation and reservation overview."
        actions={
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      <LibraryTabsNav />

      {/* KPI Cards */}
      {loading && !stats ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard title="Total Books" value={kpis.totalTitles} icon={BookOpen} subtitle="Catalog titles" />
          <StatCard title="Total Copies" value={kpis.totalCopies} icon={Layers} subtitle="Physical copies" />
          <StatCard
            title="Available Copies"
            value={kpis.availableCopies}
            icon={CheckCircle2}
            subtitle="Ready to issue"
            colorClass="bg-emerald-500"
          />
          <StatCard
            title="Issued Copies"
            value={kpis.issuedCopies}
            icon={BookmarkCheck}
            subtitle="Currently borrowed"
            colorClass="bg-indigo-500"
          />
          <StatCard
            title="Overdue Books"
            value={kpis.overdueCount}
            icon={Clock}
            subtitle="Past due date"
            colorClass="bg-rose-500"
          />
          <StatCard
            title="Active Reservations"
            value={kpis.pendingReservations}
            icon={BookmarkPlus}
            subtitle="Awaiting approval"
            colorClass="bg-sky-500"
          />
          <StatCard
            title="Fines Collected"
            value={`₹${kpis.totalFinesCollected}`}
            icon={Coins}
            subtitle="Total paid to date"
            colorClass="bg-amber-500"
          />
          <StatCard
            title="Fines Pending"
            value={`₹${kpis.totalPendingFines}`}
            icon={Coins}
            subtitle="Awaiting settlement"
            colorClass="bg-orange-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Library Activity</h3>
          <div className="mt-4">
            {loading ? (
              <SkeletonList count={5} />
            ) : activity.length === 0 ? (
              <p className="py-8 text-center text-xs font-semibold text-slate-400">No recent activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((entry) => {
                  const meta = ACTIVITY_ICON[entry.kind === 'BOOK_ADDED' ? 'BOOK_ADDED' : entry.type] || ACTIVITY_ICON.ISSUE;
                  const Icon = meta.icon;
                  return (
                    <li key={entry.id} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {activityLabel(entry)}
                        </p>
                        <span className="text-[11px] font-medium text-slate-400">{timeAgo(entry.performedAt)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Most Issued Books */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Most Issued Books</h3>
          <div className="mt-4">
            {loading ? (
              <SkeletonCard />
            ) : mostIssued.length === 0 ? (
              <p className="py-8 text-center text-xs font-semibold text-slate-400">No circulation data yet.</p>
            ) : (
              <ul className="space-y-3">
                {mostIssued.map((b, idx) => (
                  <li key={b.bookId || idx} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">{b.title}</p>
                      <span className="text-[11px] text-slate-400">{b.category}</span>
                    </div>
                    <Badge variant="primary">{b.totalIssues} issues</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Category Distribution</h3>
          <div className="mt-4">
            {loading ? (
              <SkeletonCard />
            ) : categories.length === 0 ? (
              <p className="py-8 text-center text-xs font-semibold text-slate-400">No categories yet.</p>
            ) : (
              <ul className="space-y-3">
                {categories.map((c) => (
                  <li key={c.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{c.name}</span>
                      <span className="font-semibold text-slate-400">{c.count} titles</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round(((c.count || 0) / totalCategoryBooks) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Overview */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Overdue Overview</h3>
          <Link
            to="/school-admin/library/reports"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            View full report <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-5"><SkeletonList count={4} /></div>
        ) : overdue.length === 0 ? (
          <p className="py-10 text-center text-xs font-semibold text-slate-400">No overdue books right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Borrower</th>
                  <th className="px-3 py-3 font-bold">Book</th>
                  <th className="px-3 py-3 font-bold">Due Date</th>
                  <th className="px-3 py-3 font-bold">Days Overdue</th>
                  <th className="px-5 py-3 text-right font-bold">Fine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overdue.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">{i.borrowerName}</td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{i.bookTitle}</td>
                    <td className="px-3 py-3 text-rose-600 font-semibold">{formatDisplayDate(i.dueDate)}</td>
                    <td className="px-3 py-3">
                      <Badge variant={ISSUE_STATUS_BADGE.OVERDUE}>{i.overdueDays || 0} days</Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-black text-rose-600">₹{i.fineAmount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryDashboard;

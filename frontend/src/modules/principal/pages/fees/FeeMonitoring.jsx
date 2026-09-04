import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { AreaChart } from '../../components/ui/Charts/AreaChart';
import { BarChart } from '../../components/ui/Charts/BarChart';
import { IndianRupee, TrendingUp, AlertTriangle, Percent } from 'lucide-react';
import { principalReportApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseAmount(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const n = Number(String(str).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function parseInDate(str) {
  // "DD/MM/YYYY" from toLocaleDateString('en-IN')
  if (!str || str === 'N/A') return null;
  const m = String(str).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}
function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export const FeeMonitoring = () => {
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [dues, setDues] = useState([]);
  const [duesStats, setDuesStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, feesRes, duesRes] = await Promise.all([
        principalReportApi.summary(),
        principalReportApi.data('fees', { limit: 1000 }).catch(() => ({ data: [] })),
        principalReportApi.data('fee_dues', { limit: 1000 }).catch(() => ({ data: [] })),
      ]);
      setSummary(sumRes || null);
      setPayments(feesRes?.data || []);
      setDues(duesRes?.data || []);
      setDuesStats(duesRes?.stats || null);
    } catch (err) {
      setError(apiMessage(err, 'Unable to load fee monitoring data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalCollected = summary?.totalCollected ?? 0;
  const totalOutstanding = duesStats?.totalDue ?? summary?.totalDue ?? 0;
  const collectionRate =
    totalCollected + totalOutstanding > 0
      ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)
      : 0;

  const monthlyCollections = useMemo(() => {
    const buckets = new Map();
    payments.forEach((p) => {
      const d = parseInDate(p['Transaction Date']);
      if (!d) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.set(key, (buckets.get(key) || 0) + parseAmount(p['Amount Paid']));
    });
    return Array.from(buckets.entries())
      .sort((a, b) => {
        const [ay, am] = a[0].split('-').map(Number);
        const [by, bm] = b[0].split('-').map(Number);
        return ay - by || am - bm;
      })
      .slice(-8)
      .map(([key, amount]) => {
        const [y, m] = key.split('-').map(Number);
        return { name: `${MONTHS[m]} ${String(y).slice(2)}`, amount };
      });
  }, [payments]);

  const duesByClass = useMemo(() => {
    const buckets = new Map();
    dues.forEach((d) => {
      const cls = (d.Class || 'Unknown').split(' - ')[0] || 'Unknown';
      buckets.set(cls, (buckets.get(cls) || 0) + parseAmount(d['Pending Due']));
    });
    return Array.from(buckets.entries())
      .map(([name, duesAmt]) => ({ name, dues: duesAmt }))
      .sort((a, b) => b.dues - a.dues)
      .slice(0, 10);
  }, [dues]);

  const defaulterRows = useMemo(
    () =>
      dues.map((d, i) => ({
        id: `${d['Invoice No'] || i}`,
        invoiceNo: d['Invoice No'],
        name: d['Student Name'],
        class: d.Class,
        pending: parseAmount(d['Pending Due']),
        dueDate: d['Due Date'],
        status: d.Status,
      })),
    [dues]
  );

  const columns = [
    { key: 'invoiceNo', title: 'Invoice No' },
    { key: 'name', title: 'Student Name', sortable: true, render: (v) => <span className="font-bold">{v}</span> },
    { key: 'class', title: 'Class', sortable: true },
    {
      key: 'pending',
      title: 'Pending Due',
      sortable: true,
      render: (v) => <span className="font-bold text-rose-600">{inr(v)}</span>,
    },
    { key: 'dueDate', title: 'Due Date' },
    {
      key: 'status',
      title: 'Status',
      render: (v) => <Badge variant={v === 'OVERDUE' ? 'danger' : 'warning'}>{v || 'PENDING'}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee & Dues Monitoring"
        subtitle="Track school tuition collections, outstanding deficits, and student ledger summaries."
      />

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/60 p-10 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button type="button" onClick={load} className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="rounded-2xl bg-emerald-50 p-3.5 text-emerald-600 dark:bg-emerald-950/40">
                <IndianRupee className="h-5 w-5 shrink-0" />
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Total Fee Collected</span>
                <span className="mt-1 block text-xl font-extrabold text-emerald-600">{loading ? '…' : inr(totalCollected)}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="rounded-2xl bg-rose-50 p-3.5 text-rose-600 dark:bg-rose-950/40">
                <AlertTriangle className="h-5 w-5 shrink-0" />
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Outstanding Deficit</span>
                <span className="mt-1 block text-xl font-extrabold text-rose-600">{loading ? '…' : inr(totalOutstanding)}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="rounded-2xl bg-indigo-50 p-3.5 text-indigo-600 dark:bg-indigo-950/40">
                <Percent className="h-5 w-5 shrink-0" />
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Collection Rate</span>
                <span className="mt-1 block text-xl font-extrabold text-indigo-600">{loading ? '…' : `${collectionRate}%`}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span>Monthly Tuition Revenue (Trend)</span>
              </h4>
              <div className="h-56">
                {monthlyCollections.length > 0 ? (
                  <AreaChart data={monthlyCollections} dataKey="amount" xKey="name" height={220} color="#10b981" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                    {loading ? 'Loading…' : 'No payments recorded yet.'}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span>Outstanding Dues by Class Grade</span>
              </h4>
              <div className="h-56">
                {duesByClass.length > 0 ? (
                  <BarChart data={duesByClass} dataKey="dues" xKey="name" height={220} color="#f43f5e" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                    {loading ? 'Loading…' : 'No outstanding dues.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
              Deficit Accounts Roster{duesStats?.defaultersCount ? ` (${duesStats.defaultersCount})` : ''}
            </h4>
            <DataTable
              columns={columns}
              data={defaulterRows}
              loading={loading}
              searchPlaceholder="Search students with pending fees..."
              searchKeys={['name', 'class', 'invoiceNo']}
              emptyMessage="No outstanding fee dues."
              csvFilename="principal_fee_dues.csv"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default FeeMonitoring;

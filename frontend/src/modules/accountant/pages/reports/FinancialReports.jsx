import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { AreaChart } from '../../components/ui/Charts/AreaChart';
import { BarChart } from '../../components/ui/Charts/BarChart';
import { useToast } from '../../components/ui/Toast';
import { exportToCSV, exportToExcel } from '../../../../shared/lib/exportHelpers';
import { accountantApi } from '../../../../shared/api/client';
import { formatCurrency } from '../../utils/formatters';
import { Download, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';

const REPORTS = [
  { id: 'fee-collection', label: 'Fee Collection' },
  { id: 'dues', label: 'Pending / Dues' },
  { id: 'expense', label: 'Expense' },
  { id: 'transaction', label: 'Transaction' },
  { id: 'receipt', label: 'Receipt' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'class-wise', label: 'Class-wise Collection' },
  { id: 'payment-method', label: 'Payment Method Summary' },
  { id: 'daily', label: 'Daily Collection' },
  { id: 'monthly', label: 'Monthly Collection' },
];

const CURRENCY_KEYS = new Set([
  'amount',
  'totalAmount',
  'paidAmount',
  'pendingAmount',
  'balanceAmount',
  'totalBilled',
  'totalCollected',
  'totalPending',
  'totalFee',
  'totalPaid',
  'discountAmount',
  'fineAmount',
]);

export const FinancialReports = () => {
  const { showToast, ToastComponent } = useToast();
  const [category, setCategory] = useState('fee-collection');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = () => {
    setLoading(true);
    setError(null);
    const params = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    accountantApi
      .report(category, params)
      .then((res) => setResult(res?.data || null))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to generate report'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const rows = result?.rows || [];
  const summary = result?.summary || null;
  const columns = rows.length ? Object.keys(rows[0]) : [];

  const fmtCell = (key, val) => {
    if (val === null || val === undefined || val === '') return '—';
    if (CURRENCY_KEYS.has(key) && typeof val === 'number') return formatCurrency(val);
    if (/date/i.test(key) && (typeof val === 'string' || val instanceof Date)) {
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-IN');
    }
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const handleCSV = () => {
    if (!rows.length) return showToast('Nothing to export', 'info');
    exportToCSV(rows, `${category}_report_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Report exported to CSV', 'success');
  };

  const handleExcel = async () => {
    if (!rows.length) return showToast('Nothing to export', 'info');
    await exportToExcel(
      [{ name: category, data: rows }],
      `${category}_report_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    showToast('Report exported to Excel', 'success');
  };

  const chart = (() => {
    if (category === 'daily') return <AreaChart data={rows} dataKey="amount" xKey="date" height={260} color="#7c3aed" />;
    if (category === 'monthly') return <BarChart data={rows} dataKey="amount" xKey="month" height={260} color="#8b5cf6" />;
    if (category === 'payment-method') return <BarChart data={rows} dataKey="amount" xKey="paymentMethod" height={260} color="#8b5cf6" />;
    if (category === 'class-wise') return <BarChart data={rows} dataKey="totalCollected" xKey="className" height={260} color="#7c3aed" />;
    return null;
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Every accountant report — generated from live backend data, exportable to CSV / Excel."
      />

      <div className="flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.id}
            onClick={() => setCategory(r.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              category === r.id
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-violet-400'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-end gap-3">
        <label className="text-[11px] font-bold text-slate-500">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 block h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
          />
        </label>
        <label className="text-[11px] font-bold text-slate-500">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 block h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
          />
        </label>
        <button
          onClick={fetchReport}
          className="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Generate
        </button>
        <div className="flex-1" />
        <button
          onClick={handleCSV}
          className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-950"
        >
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
        <button
          onClick={handleExcel}
          className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-950"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
        </button>
      </div>

      {summary && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(summary).map(([k, v]) => (
            <div key={k} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                {typeof v === 'number' && CURRENCY_KEYS.has(k) ? formatCurrency(v) : String(v)}
              </p>
            </div>
          ))}
        </div>
      )}

      {chart && rows.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">{chart}</div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin inline" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-rose-500 font-semibold text-sm">{error}</div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-semibold text-sm">No data for this report / date range.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                  {columns.map((c) => (
                    <th key={c} className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-slate-500">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.slice(0, 500).map((row, i) => (
                  <tr key={row.id || i}>
                    {columns.map((c) => (
                      <td key={c} className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                        {fmtCell(c, row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ToastComponent />
    </div>
  );
};

export default FinancialReports;

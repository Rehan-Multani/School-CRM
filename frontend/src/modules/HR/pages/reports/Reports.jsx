import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import {
  BarChart3,
  Download,
  RefreshCw,
  Users,
  CalendarDays,
  CalendarRange,
  BadgeCent,
  Building,
  FileSpreadsheet,
  Printer,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { exportToCSV } from '../../../../shared/lib/exportHelpers';

export const Reports = () => {
  const [activeTab, setActiveTab] = useState('employee-summary');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showToast, ToastComponent } = useToast();

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hrApi.report(activeTab);
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    if (!data) return;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hr_${activeTab}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Report downloaded as JSON!', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Institutional HR Analytics & Intelligence Reports"
        subtitle="Live multi-dimensional analytics for faculty headcounts, attendance ratios, leave utilization rates, and compensation payouts."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Report"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportCSV}
              disabled={loading || !data}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'employee-summary', label: 'Faculty Headcount', icon: Users },
          { id: 'attendance-summary', label: 'Attendance Aggregation', icon: CalendarDays },
          { id: 'leave-summary', label: 'Leave Utilization', icon: CalendarRange },
          { id: 'payroll-summary', label: 'Payroll Distribution', icon: BadgeCent },
          { id: 'department-wise', label: 'Departmental Breakdown', icon: Building },
        ].map((t) => {
          const TabIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-2 ${
                activeTab === t.id
                  ? 'border-b-2 border-indigo-650 text-indigo-650 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchReport} className="underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* Report Content Display */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        </div>
      ) : !data ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-400 space-y-2">
          <BarChart3 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-xs">No analytics data returned for this category.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                {activeTab.replace('-', ' ')} Live Report
              </h3>
              <p className="text-xs text-slate-400">Generated on {new Date().toLocaleDateString()}</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-650 dark:text-indigo-400 rounded-xl text-xs font-bold">
              Institutional Live Sync
            </span>
          </div>

          {/* Render formatted table or key metrics */}
          <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Metric Dimension</th>
                  <th className="p-3.5 text-right">Computed Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {Array.isArray(data) ? (
                  data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {item.name || item.title || item.department || item.period || `Record #${idx + 1}`}
                      </td>
                      <td className="p-3.5 text-right text-indigo-650 dark:text-indigo-400 font-black">
                        {item.count ?? item.total ?? item.value ?? JSON.stringify(item)}
                      </td>
                    </tr>
                  ))
                ) : (
                  Object.entries(data).map(([key, val]) => (
                    <tr key={key} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white capitalize">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </td>
                      <td className="p-3.5 text-right text-indigo-650 dark:text-indigo-400 font-black">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ToastComponent />
    </div>
  );
};

export default Reports;

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
    let exportRows = [];

    if (activeTab === 'employee-summary') {
      exportRows = [
        { Metric: 'Total Staff', Value: data.totalStaff || 0 },
        { Metric: 'Total Faculty / Teachers', Value: data.totalTeachers || 0 },
        { Metric: 'Active Personnel', Value: data.activeCount || 0 },
        ...(data.departmentBreakdown || []).map((d) => ({
          Metric: `Department: ${d.name}`,
          Value: d.count,
        })),
      ];
    } else if (activeTab === 'attendance-summary') {
      const summary = data.summary || {};
      exportRows = Object.entries(summary).map(([status, count]) => ({
        Month: data.month || '',
        Status: status,
        Count: count,
      }));
    } else if (activeTab === 'leave-summary') {
      const stats = data.stats || {};
      exportRows = Object.entries(stats).map(([k, v]) => ({
        Year: data.year || '',
        LeaveType: k,
        Count: v,
      }));
    } else if (activeTab === 'payroll-summary') {
      exportRows = (data.monthlySummary || []).map((m) => ({
        Month: m._id,
        TotalEmployees: m.count,
        GrossDisbursed: m.totalGross,
        Deductions: m.totalDeductions,
        NetDisbursed: m.totalNet,
      }));
    } else if (activeTab === 'department-wise') {
      exportRows = (data.departments || []).map((d) => ({
        Department: d.name,
        Code: d.code,
        Head: d.headEmployeeName || 'Not Appointed',
        Status: d.status,
        TotalEmployees: d.employeeCount || 0,
      }));
    } else if (Array.isArray(data)) {
      exportRows = data;
    } else {
      exportRows = Object.entries(data).map(([key, val]) => ({
        Metric: key,
        Value: typeof val === 'object' ? JSON.stringify(val) : String(val),
      }));
    }

    if (exportRows.length) {
      exportToCSV(exportRows, `hr_${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`);
      showToast('Report downloaded as CSV!', 'success');
    }
  };

  const renderVisualReport = () => {
    if (!data) return null;

    if (activeTab === 'employee-summary') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Staff</span>
              <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">{data.totalStaff || 0}</div>
            </div>
            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/40">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Teachers</span>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{data.totalTeachers || 0}</div>
            </div>
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Faculty & Staff</span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{data.activeCount || 0}</div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Department Placements</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(data.departmentBreakdown || []).map((d, i) => (
                <div key={i} className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{d.name}</span>
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-900 font-mono font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'attendance-summary') {
      const summary = data.summary || {};
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Audit Month: <strong>{data.month}</strong></span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(summary).map(([status, count]) => (
              <div key={status} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{status}</span>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{count}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'payroll-summary') {
      const list = data.monthlySummary || [];
      return (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Payroll Month</th>
                  <th className="p-3.5 text-center">Beneficiaries</th>
                  <th className="p-3.5 text-right">Gross Amount</th>
                  <th className="p-3.5 text-right">Deductions</th>
                  <th className="p-3.5 text-right">Net Disbursed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {list.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{m._id}</td>
                    <td className="p-3.5 text-center font-mono">{m.count}</td>
                    <td className="p-3.5 text-right">₹{Number(m.totalGross || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3.5 text-right text-rose-600">₹{Number(m.totalDeductions || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400">₹{Number(m.totalNet || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab === 'department-wise') {
      const depts = data.departments || [];
      return (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Department Name</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Head of Dept</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Total Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {depts.map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{d.name}</td>
                    <td className="p-3.5 font-mono text-slate-500">{d.code || '—'}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">{d.headEmployeeName || 'Not Appointed'}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{d.status}</span>
                    </td>
                    <td className="p-3.5 text-right font-black text-indigo-600 dark:text-indigo-400">{d.employeeCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Metric Dimension</th>
              <th className="p-3.5 text-right">Computed Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
            {Object.entries(data).map(([key, val]) => (
              <tr key={key} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40">
                <td className="p-3.5 font-bold text-slate-900 dark:text-white capitalize">
                  {key.replace(/([A-Z])/g, ' $1')}
                </td>
                <td className="p-3.5 text-right text-indigo-650 dark:text-indigo-400 font-black">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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

          {/* Render formatted visual metrics & tables */}
          {renderVisualReport()}
        </div>
      )}

      <ToastComponent />
    </div>
  );
};

export default Reports;

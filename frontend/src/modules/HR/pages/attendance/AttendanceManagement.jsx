import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Check,
  RefreshCw,
  BarChart3,
  Calendar,
  AlertCircle,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Sparkles,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  Printer,
  Users,
  Sun,
} from 'lucide-react';
import { exportToCSV } from '../../../../shared/lib/exportHelpers';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { Badge } from '../../components/ui/Badge';

const STATUS_CONFIG = {
  PRESENT: { label: 'Present', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  ABSENT: { label: 'Absent', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  LEAVE: { label: 'On Leave', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  HALF_DAY: { label: 'Half Day', color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
  HOLIDAY: { label: 'Holiday', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
};

export const AttendanceManagement = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ totalCount: 0, presentCount: 0, absentCount: 0, leaveCount: 0, halfDayCount: 0 });
  const [monthlyData, setMonthlyData] = useState(null);
  const [reportData, setReportData] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [reportStartDate, setReportStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportStatus, setReportStatus] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const { showToast, ToastComponent } = useToast();

  const fetchDailyAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hrApi.attendance({ date: selectedDate });
      if (res?.success) {
        setRecords(res.data || []);
        if (res.stats) setStats(res.stats);
        setIsDirty(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const fetchMonthlyAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hrApi.monthlyAttendance({ year: selectedYear, month: selectedMonth });
      if (res?.success) {
        setMonthlyData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load monthly summary');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  const fetchAttendanceReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hrApi.attendanceReport({
        startDate: reportStartDate,
        endDate: reportEndDate,
        status: reportStatus !== 'ALL' ? reportStatus : undefined,
        department: selectedDept !== 'ALL' ? selectedDept : undefined,
      });
      if (res?.success) {
        setReportData(res.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [reportStartDate, reportEndDate, reportStatus, selectedDept]);

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyAttendance();
    } else if (activeTab === 'monthly') {
      fetchMonthlyAttendance();
    } else if (activeTab === 'reports') {
      fetchAttendanceReport();
    }
  }, [activeTab, fetchDailyAttendance, fetchMonthlyAttendance, fetchAttendanceReport]);

  const shiftDate = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleStatusChange = (employeeRefId, newStatus) => {
    setRecords((prev) =>
      prev.map((r) => (r.employeeRefId === employeeRefId ? { ...r, status: newStatus } : r))
    );
    setIsDirty(true);
  };

  const handleMarkAll = async (statusToApply) => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: statusToApply })));
    setIsDirty(true);
    showToast(`Marked all records as ${statusToApply}. Click "Save Attendance" to commit.`, 'info');
  };

  const handleSaveDaily = async () => {
    setSaving(true);
    try {
      const payload = {
        date: selectedDate,
        records: records.map((r) => ({
          employeeRefId: r.employeeRefId,
          employeeType: r.employeeType || 'STAFF',
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          status: r.status,
          department: r.department,
          designation: r.designation,
          remarks: r.remarks || '',
        })),
      };

      const res = await hrApi.saveAttendance(payload);
      if (res?.success) {
        showToast('Daily attendance saved successfully!', 'success');
        setIsDirty(false);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to save attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        !searchTerm ||
        (r.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept = selectedDept === 'ALL' || (r.department || '').toLowerCase() === selectedDept.toLowerCase();
      const matchesRole = selectedRole === 'ALL' || (r.employeeType || '').toUpperCase() === selectedRole.toUpperCase();

      return matchesSearch && matchesDept && matchesRole;
    });
  }, [records, searchTerm, selectedDept, selectedRole]);

  const departmentsList = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set);
  }, [records]);

  const handleExportReport = () => {
    if (reportData.length === 0) return;
    exportToCSV(reportData, `staff_attendance_${reportStartDate}_to_${reportEndDate}.csv`);
    showToast('Attendance report exported to CSV!', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Faculty & Staff Attendance Management"
        subtitle="Record daily staff presence rosters, review monthly matrix registers, and analyze absenteeism trends across departments."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === 'daily') fetchDailyAttendance();
                else if (activeTab === 'monthly') fetchMonthlyAttendance();
                else fetchAttendanceReport();
              }}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {activeTab === 'daily' && isDirty && (
              <button
                onClick={handleSaveDaily}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer animate-pulse"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Attendance Changes'}</span>
              </button>
            )}

            {activeTab === 'reports' && (
              <button
                onClick={handleExportReport}
                disabled={reportData.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report</span>
              </button>
            )}
          </div>
        }
      />

      {/* Tabs Navigator */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'daily', label: 'Daily Attendance Marker', icon: CalendarDays },
          { id: 'monthly', label: 'Monthly Presence Matrix', icon: BarChart3 },
          { id: 'reports', label: 'Attendance Audit Reports', icon: FileSpreadsheet },
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
          <button onClick={fetchDailyAttendance} className="underline hover:no-underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* Tab 1: Daily Attendance Marker */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Quick Date Navigator Bar & Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
              />

              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-650 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 cursor-pointer"
              >
                Today
              </button>
            </div>

            {/* Quick Summary Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 mr-1.5">Total Staff:</span>
                <span className="text-slate-900 dark:text-white font-black">{records.length}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300">
                <span className="mr-1.5">Present:</span>
                <span className="font-black">{records.filter((r) => r.status === 'PRESENT').length}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300">
                <span className="mr-1.5">Absent:</span>
                <span className="font-black">{records.filter((r) => r.status === 'ABSENT').length}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300">
                <span className="mr-1.5">On Leave:</span>
                <span className="font-black">{records.filter((r) => r.status === 'LEAVE').length}</span>
              </div>
            </div>
          </div>

          {/* Filters & Bulk Operations */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name or Employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white pl-9.5 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer focus:outline-none text-xs font-semibold"
              >
                <option value="ALL">All Departments</option>
                {departmentsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer focus:outline-none text-xs font-semibold"
              >
                <option value="ALL">All Types</option>
                <option value="TEACHER">Teachers</option>
                <option value="STAFF">Staff</option>
              </select>

              <button
                type="button"
                onClick={() => handleMarkAll('PRESENT')}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Mark All Present
              </button>

              <button
                type="button"
                onClick={() => handleMarkAll('ABSENT')}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          {/* Roster Table */}
          {loading ? (
            <SkeletonTable rows={8} columns={6} />
          ) : filteredRecords.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-400 space-y-3 shadow-xs">
              <UserCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No attendance records found</h4>
              <p className="text-xs max-w-sm mx-auto">No employees match the selected date and filter criteria.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Department & Role</th>
                      <th className="p-4 text-center">Attendance Status Selector</th>
                      <th className="p-4 text-right">Active Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                    {filteredRecords.map((r) => {
                      const currentStatus = r.status || 'PRESENT';
                      return (
                        <tr key={r.employeeRefId} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-indigo-650 dark:text-indigo-400 text-xs shrink-0">
                                {r.employeeName?.[0] || 'E'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white leading-tight">{r.employeeName}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{r.employeeId}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <p className="text-slate-900 dark:text-white">{r.department || 'General'}</p>
                            <p className="text-[11px] text-slate-400">{r.designation || r.employeeType || 'Staff'}</p>
                          </td>

                          <td className="p-4 text-center">
                            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 gap-1">
                              {['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY', 'HOLIDAY'].map((st) => (
                                <button
                                  type="button"
                                  key={st}
                                  onClick={() => handleStatusChange(r.employeeRefId, st)}
                                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                    currentStatus === st
                                      ? st === 'PRESENT'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : st === 'ABSENT'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : st === 'LEAVE'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : st === 'HALF_DAY'
                                        ? 'bg-sky-600 text-white shadow-xs'
                                        : 'bg-purple-600 text-white shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                  }`}
                                >
                                  {STATUS_CONFIG[st]?.label || st}
                                </button>
                              ))}
                            </div>
                          </td>

                          <td className="p-4 text-right">
                            <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${STATUS_CONFIG[currentStatus]?.color}`}>
                              {STATUS_CONFIG[currentStatus]?.label || currentStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Monthly Matrix */}
      {activeTab === 'monthly' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Attendance Matrix Heatmap</h3>
              <p className="text-xs text-slate-400">Aggregated presence index across selected academic cycle month</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold"
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={6} columns={6} />
          ) : !monthlyData || monthlyData.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs">No monthly summary records found for this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Staff Member</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5 text-center">Working Days</th>
                    <th className="p-3.5 text-center">Present</th>
                    <th className="p-3.5 text-center">Absent</th>
                    <th className="p-3.5 text-center">Leaves</th>
                    <th className="p-3.5 text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {monthlyData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {row.employeeName || row.name}
                      </td>
                      <td className="p-3.5 text-slate-500">{row.department || 'General'}</td>
                      <td className="p-3.5 text-center">{row.totalWorkingDays || 26}</td>
                      <td className="p-3.5 text-center text-emerald-600 font-bold">{row.presentDays || 0}</td>
                      <td className="p-3.5 text-center text-rose-600 font-bold">{row.absentDays || 0}</td>
                      <td className="p-3.5 text-center text-amber-600 font-bold">{row.leaveDays || 0}</td>
                      <td className="p-3.5 text-right">
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-black text-xs">
                          {row.attendancePercentage ? `${row.attendancePercentage}%` : '100%'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Reports */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Audit Register</h3>
              <p className="text-xs text-slate-400">Exportable presence ledger with dates and timestamps</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white outline-none"
              />
              <span className="text-xs text-slate-400">-</span>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white outline-none"
              />

              <button
                type="button"
                onClick={fetchAttendanceReport}
                className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={8} columns={5} />
          ) : reportData.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs">No records available for the selected date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Staff Name</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40">
                      <td className="p-3.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-3.5 whitespace-nowrap text-slate-800 dark:text-slate-200">{row.date || 'N/A'}</td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{row.employeeName || row.name}</td>
                      <td className="p-3.5 text-slate-500">{row.department || 'General'}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase ${STATUS_CONFIG[row.status]?.color}`}>
                          {row.status || 'PRESENT'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ToastComponent />
    </div>
  );
};

export default AttendanceManagement;

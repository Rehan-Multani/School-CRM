import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { staffAttendanceApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const PAGE_SIZE = 5;

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getFirstDayOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

function getLast7DaysString() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

function getLast30DaysString() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

function getLastMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: firstDay.toISOString().split('T')[0],
    end: lastDay.toISOString().split('T')[0],
  };
}

function getThisYearStart() {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name) {
  return (
    (name || 'Staff')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('') || 'ST'
  );
}

function getAvatarColor(name = '') {
  const colors = [
    'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
    'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
    'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
    'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function exportAttendanceToCSV(records = [], filename = 'attendance_report.csv') {
  if (!records.length) return;
  const headers = [
    'Date',
    'Employee ID',
    'Employee Name',
    'Role',
    'Department',
    'Status',
    'Leave Type',
    'Leave Reason',
    'Remarks',
  ];
  const rows = records.map((r) => [
    `"${r.date || ''}"`,
    `"${r.employeeId || ''}"`,
    `"${r.employeeName || ''}"`,
    `"${r.employeeRole || ''}"`,
    `"${r.department || ''}"`,
    `"${r.status || ''}"`,
    `"${r.leaveType || ''}"`,
    `"${(r.leaveReason || '').replace(/"/g, '""')}"`,
    `"${(r.remarks || '').replace(/"/g, '""')}"`,
  ]);
  const csvContent =
    'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const ROLE_FILTERS = [
  { id: 'ALL', label: 'All Staff' },
  { id: 'TEACHER', label: 'Teachers' },
  { id: 'LIBRARIAN', label: 'Librarians' },
  { id: 'HR', label: 'HR' },
  { id: 'ACCOUNTANT', label: 'Accountants' },
  { id: 'TRANSPORT', label: 'Transport' },
];

const LEAVE_TYPES = [
  { id: 'CASUAL', label: 'Casual Leave (CL)' },
  { id: 'MEDICAL', label: 'Medical Leave (ML)' },
  { id: 'PAID', label: 'Paid Leave (PL)' },
  { id: 'UNPAID', label: 'Unpaid / LWP' },
  { id: 'OTHER', label: 'Other Leave' },
];

export const AttendanceManagement = () => {
  const { showToast, ToastComponent } = useToast();

  // Date Mode: 'single' (Daily Roll Call) vs 'range' (Custom Date Range Audit)
  const [dateMode, setDateMode] = useState('single');

  // Single Day State
  const [date, setDate] = useState(getTodayString());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [attendanceList, setAttendanceList] = useState([]);
  const [dailyPage, setDailyPage] = useState(1);
  const [stats, setStats] = useState({
    totalCount: 0,
    presentCount: 0,
    absentCount: 0,
    leaveCount: 0,
    halfDayCount: 0,
  });

  // Custom Date Range State
  const [datePreset, setDatePreset] = useState('THIS_MONTH');
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getTodayString());
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeRecords, setRangeRecords] = useState([]);
  const [rangePage, setRangePage] = useState(1);

  // Filters & Search
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Leave Modal State
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState(null);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'CASUAL',
    leaveReason: '',
  });

  // Shift single day by offset (+1 or -1)
  const handleShiftDay = (offset) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split('T')[0]);
    setDailyPage(1);
  };

  // Handle Preset Change
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === 'THIS_MONTH') {
      setStartDate(getFirstDayOfMonth());
      setEndDate(getTodayString());
    } else if (preset === 'LAST_7_DAYS') {
      setStartDate(getLast7DaysString());
      setEndDate(getTodayString());
    } else if (preset === 'LAST_30_DAYS') {
      setStartDate(getLast30DaysString());
      setEndDate(getTodayString());
    } else if (preset === 'LAST_MONTH') {
      const lm = getLastMonthRange();
      setStartDate(lm.start);
      setEndDate(lm.end);
    } else if (preset === 'THIS_YEAR') {
      setStartDate(getThisYearStart());
      setEndDate(getTodayString());
    }
    setRangePage(1);
  };

  // Load Daily Attendance
  const loadAttendance = useCallback(
    async (selectedDate = date) => {
      setLoading(true);
      try {
        const res = await staffAttendanceApi.getDaily(selectedDate, {
          role: selectedRole !== 'ALL' ? selectedRole : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: searchQuery.trim() || undefined,
        });

        setAttendanceList(res.data || []);
        if (res.stats) setStats(res.stats);
        setHasUnsavedChanges(false);
      } catch (error) {
        showToast(apiMessage(error, 'Unable to load attendance records'), 'error');
      } finally {
        setLoading(false);
      }
    },
    [date, selectedRole, statusFilter, searchQuery, showToast]
  );

  // Load Custom Range Report
  const loadRangeReport = useCallback(async () => {
    if (!startDate || !endDate) return;
    setRangeLoading(true);
    try {
      const res = await staffAttendanceApi.getReport({
        startDate,
        endDate,
        role: selectedRole !== 'ALL' ? selectedRole : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setRangeRecords(res.data || []);
      setRangePage(1);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load custom date range report'), 'error');
    } finally {
      setRangeLoading(false);
    }
  }, [startDate, endDate, selectedRole, statusFilter, searchQuery, showToast]);

  useEffect(() => {
    if (dateMode === 'single') {
      loadAttendance(date);
    } else {
      loadRangeReport();
    }
  }, [dateMode, date, loadAttendance, loadRangeReport]);

  // Handle Quick Status Change for a Single Staff Member
  const handleStatusChange = async (employeeRefId, newStatus) => {
    if (newStatus === 'LEAVE') {
      const emp = attendanceList.find((e) => e.employeeRefId === employeeRefId);
      setTargetEmployee(emp);
      setLeaveForm({
        leaveType: emp?.leaveType || 'CASUAL',
        leaveReason: emp?.leaveReason || '',
      });
      setLeaveModalOpen(true);
      return;
    }

    setAttendanceList((prev) =>
      prev.map((item) => {
        if (item.employeeRefId === employeeRefId) {
          return {
            ...item,
            status: newStatus,
            leaveType: '',
            leaveReason: '',
          };
        }
        return item;
      })
    );

    try {
      const emp = attendanceList.find((e) => e.employeeRefId === employeeRefId);
      await staffAttendanceApi.updateSingle(employeeRefId, {
        date,
        status: newStatus,
        employeeId: emp?.employeeId,
        employeeName: emp?.employeeName,
        employeeRole: emp?.employeeRole,
        department: emp?.department,
        employeeType: emp?.employeeType,
        remarks: emp?.remarks,
      });

      setStats((prev) => {
        const currentEmp = attendanceList.find((e) => e.employeeRefId === employeeRefId);
        const oldStatus = currentEmp?.status || 'PRESENT';
        if (oldStatus === newStatus) return prev;

        const newStats = { ...prev };
        if (oldStatus === 'PRESENT') newStats.presentCount = Math.max(0, newStats.presentCount - 1);
        if (oldStatus === 'ABSENT') newStats.absentCount = Math.max(0, newStats.absentCount - 1);
        if (oldStatus === 'LEAVE') newStats.leaveCount = Math.max(0, newStats.leaveCount - 1);

        if (newStatus === 'PRESENT') newStats.presentCount += 1;
        if (newStatus === 'ABSENT') newStats.absentCount += 1;
        if (newStatus === 'LEAVE') newStats.leaveCount += 1;

        return newStats;
      });

      showToast(`Marked ${newStatus}`, 'success');
    } catch (error) {
      showToast(apiMessage(error, 'Failed to update attendance status'), 'error');
      loadAttendance(date);
    }
  };

  // Submit Leave Modal
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!targetEmployee) return;

    const employeeRefId = targetEmployee.employeeRefId;

    setAttendanceList((prev) =>
      prev.map((item) => {
        if (item.employeeRefId === employeeRefId) {
          return {
            ...item,
            status: 'LEAVE',
            leaveType: leaveForm.leaveType,
            leaveReason: leaveForm.leaveReason,
          };
        }
        return item;
      })
    );

    try {
      await staffAttendanceApi.updateSingle(employeeRefId, {
        date,
        status: 'LEAVE',
        leaveType: leaveForm.leaveType,
        leaveReason: leaveForm.leaveReason,
        employeeId: targetEmployee.employeeId,
        employeeName: targetEmployee.employeeName,
        employeeRole: targetEmployee.employeeRole,
        department: targetEmployee.department,
        employeeType: targetEmployee.employeeType,
      });

      setLeaveModalOpen(false);
      setTargetEmployee(null);
      showToast(`Leave marked for ${targetEmployee.employeeName}`, 'success');
      loadAttendance(date);
    } catch (error) {
      showToast(apiMessage(error, 'Failed to apply leave'), 'error');
    }
  };

  // Bulk Mark All Status (Present / Absent)
  const handleMarkAll = async (newStatus) => {
    setMarkingAll(true);
    try {
      const res = await staffAttendanceApi.markAll({ date, status: newStatus });
      setAttendanceList(res.data || []);
      if (res.stats) setStats(res.stats);
      showToast(`All staff marked as ${newStatus} for ${formatDisplayDate(date)}`, 'success');
    } catch (error) {
      showToast(apiMessage(error, `Failed to mark all as ${newStatus}`), 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  // Save Full Attendance Sheet
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await staffAttendanceApi.saveDaily({
        date,
        records: attendanceList,
      });
      setAttendanceList(res.data || []);
      if (res.stats) setStats(res.stats);
      setHasUnsavedChanges(false);
      showToast(res.message || 'Attendance sheet saved successfully', 'success');
    } catch (error) {
      showToast(apiMessage(error, 'Failed to save attendance sheet'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // In-line change for remarks
  const handleFieldChange = (employeeRefId, field, value) => {
    setAttendanceList((prev) =>
      prev.map((item) => {
        if (item.employeeRefId === employeeRefId) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Export CSV
  const handleExport = async () => {
    if (dateMode === 'single') {
      exportAttendanceToCSV(attendanceList, `staff_attendance_${date}.csv`);
      showToast('Daily attendance CSV downloaded', 'success');
    } else {
      if (rangeRecords.length > 0) {
        exportAttendanceToCSV(
          rangeRecords,
          `attendance_report_${startDate}_to_${endDate}.csv`
        );
        showToast('Date range attendance report CSV downloaded', 'success');
      } else {
        try {
          const res = await staffAttendanceApi.getReport({
            startDate,
            endDate,
            role: selectedRole !== 'ALL' ? selectedRole : undefined,
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
          });
          exportAttendanceToCSV(
            res.data || [],
            `attendance_report_${startDate}_to_${endDate}.csv`
          );
          showToast('Attendance report CSV downloaded', 'success');
        } catch {
          showToast('Failed to generate export report', 'error');
        }
      }
    }
  };

  const attendancePercent = useMemo(() => {
    if (!stats.totalCount) return 0;
    return Math.round((stats.presentCount / stats.totalCount) * 100);
  }, [stats.totalCount, stats.presentCount]);

  // Range Report Stats
  const rangeStats = useMemo(() => {
    return {
      total: rangeRecords.length,
      present: rangeRecords.filter((r) => r.status === 'PRESENT').length,
      absent: rangeRecords.filter((r) => r.status === 'ABSENT').length,
      leave: rangeRecords.filter((r) => r.status === 'LEAVE').length,
    };
  }, [rangeRecords]);

  // Paginated daily records
  const paginatedDailyList = useMemo(() => {
    const start = (dailyPage - 1) * PAGE_SIZE;
    return attendanceList.slice(start, start + PAGE_SIZE);
  }, [attendanceList, dailyPage]);

  const dailyTotalPages = Math.max(1, Math.ceil(attendanceList.length / PAGE_SIZE));

  // Paginated range records
  const paginatedRangeRecords = useMemo(() => {
    const start = (rangePage - 1) * PAGE_SIZE;
    return rangeRecords.slice(start, start + PAGE_SIZE);
  }, [rangeRecords, rangePage]);

  const rangeTotalPages = Math.max(1, Math.ceil(rangeRecords.length / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Staff & Faculty Attendance"
        subtitle="Manage daily staff roll calls, verify presence, and manage leaves."
        actions={
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExport}
              disabled={dateMode === 'single' ? attendanceList.length === 0 : rangeRecords.length === 0}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
              title="Export to CSV Spreadsheet"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>

            {dateMode === 'single' && (
              <>
                {/* Mark All Present */}
                <button
                  type="button"
                  onClick={() => handleMarkAll('PRESENT')}
                  disabled={markingAll || loading || attendanceList.length === 0}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 shadow-2xs transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 disabled:opacity-40 cursor-pointer"
                  title="Mark all active staff present"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark All Present</span>
                </button>

                {/* Mark All Absent */}
                <button
                  type="button"
                  onClick={() => handleMarkAll('ABSENT')}
                  disabled={markingAll || loading || attendanceList.length === 0}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 shadow-2xs transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 disabled:opacity-40 cursor-pointer"
                  title="Mark all staff absent"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Mark All Absent</span>
                </button>

                {/* Save Sheet */}
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving || loading}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
                    hasUnsavedChanges
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                      : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                  } disabled:opacity-50`}
                  title="Save Attendance Sheet"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{hasUnsavedChanges ? 'Save Unsaved' : 'Save Sheet'}</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Staff */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Staff</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              {dateMode === 'single' ? stats.totalCount || 0 : rangeStats.total}
            </p>
          </div>
        </div>

        {/* Present */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Present</p>
            <div className="flex items-center gap-1.5">
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {dateMode === 'single' ? stats.presentCount || 0 : rangeStats.present}
              </p>
              {dateMode === 'single' && (
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {attendancePercent}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Absent */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-400">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Absent</p>
            <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
              {dateMode === 'single' ? stats.absentCount || 0 : rangeStats.absent}
            </p>
          </div>
        </div>

        {/* On Leave */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">On Leave</p>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
              {dateMode === 'single' ? stats.leaveCount || 0 : rangeStats.leave}
            </p>
          </div>
        </div>
      </div>

      {/* Date Filter & Search Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        {/* Top bar: Mode switcher & Date controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher: Daily vs Custom Range */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDateMode('single');
                  setDailyPage(1);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                  dateMode === 'single'
                    ? 'bg-white text-primary shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateMode('range');
                  setRangePage(1);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                  dateMode === 'range'
                    ? 'bg-white text-primary shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Single Day Navigation & Picker */}
            {dateMode === 'single' ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleShiftDay(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setDailyPage(1);
                    }}
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleShiftDay(1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDate(getTodayString());
                    setDailyPage(1);
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                    date === getTodayString()
                      ? 'bg-primary text-white shadow-2xs shadow-primary/20'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
                  }`}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDate(getYesterdayString());
                    setDailyPage(1);
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                    date === getYesterdayString()
                      ? 'bg-primary text-white shadow-2xs shadow-primary/20'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
                  }`}
                >
                  Yesterday
                </button>
              </div>
            ) : (
              /* Custom Date Range Controls */
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={datePreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
                >
                  <option value="THIS_MONTH">This Month</option>
                  <option value="LAST_7_DAYS">Last 7 Days</option>
                  <option value="LAST_30_DAYS">Last 30 Days</option>
                  <option value="LAST_MONTH">Last Month</option>
                  <option value="THIS_YEAR">This Year</option>
                  <option value="CUSTOM">Custom Range</option>
                </select>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-400">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset('CUSTOM');
                      setRangePage(1);
                    }}
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-400">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset('CUSTOM');
                      setRangePage(1);
                    }}
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active Date Label Chip */}
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-extrabold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>{dateMode === 'single' ? formatDisplayDate(date) : `${startDate} to ${endDate}`}</span>
          </div>
        </div>

        {/* Bottom bar: Search & Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Role Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {ROLE_FILTERS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedRole(tab.id);
                  setDailyPage(1);
                  setRangePage(1);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedRole === tab.id
                    ? 'bg-primary text-white shadow-2xs shadow-primary/20'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDailyPage(1);
                  setRangePage(1);
                }}
                placeholder="Search staff name or ID..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-7 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setDailyPage(1);
                setRangePage(1);
              }}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present Only</option>
              <option value="ABSENT">Absent Only</option>
              <option value="LEAVE">On Leave</option>
            </select>

            <button
              onClick={() => (dateMode === 'single' ? loadAttendance(date) : loadRangeReport())}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 cursor-pointer"
              title="Refresh Attendance"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  (dateMode === 'single' ? loading : rangeLoading) ? 'animate-spin text-primary' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: DAILY ROLL CALL TABLE */}
      {dateMode === 'single' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {loading ? (
              <SkeletonTable rows={5} columns={4} />
            ) : attendanceList.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
                <h3 className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                  No Staff Members Found
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Try adjusting your role filter or search query.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                    <tr>
                      <th className="w-12 px-3.5 py-3 text-center">#</th>
                      <th className="px-3.5 py-3">Staff Member</th>
                      <th className="px-3.5 py-3">Role & Dept</th>
                      <th className="px-3.5 py-3 text-center">Attendance Status (1-Click)</th>
                      <th className="px-3.5 py-3">Remarks / Leave Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-800 dark:text-slate-200">
                    {paginatedDailyList.map((emp, index) => {
                      const serialNo = (dailyPage - 1) * PAGE_SIZE + index + 1;
                      const isPresent = emp.status === 'PRESENT';
                      const isAbsent = emp.status === 'ABSENT';
                      const isLeave = emp.status === 'LEAVE';

                      return (
                        <tr
                          key={emp.employeeRefId}
                          className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
                        >
                          {/* Serial No */}
                          <td className="w-12 px-3.5 py-3.5 text-center font-bold text-slate-400 text-xs">
                            {serialNo}
                          </td>

                          {/* Staff Details */}
                          <td className="px-3.5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${getAvatarColor(
                                  emp.employeeName
                                )}`}
                              >
                                {getInitials(emp.employeeName)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {emp.employeeName}
                                </span>
                                <span className="block font-mono text-[11px] text-slate-400">
                                  {emp.employeeId}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role & Department */}
                          <td className="px-3.5 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                              {emp.employeeRole}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {emp.department || 'General Staff'}
                            </p>
                          </td>

                          {/* Interactive 3-Button Status Segment */}
                          <td className="px-3.5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Present Button */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(emp.employeeRefId, 'PRESENT')}
                                className={`inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-xl px-3 text-xs font-bold transition-all cursor-pointer ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-emerald-950/40'
                                }`}
                                title="Mark Present"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Present</span>
                              </button>

                              {/* Absent Button */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(emp.employeeRefId, 'ABSENT')}
                                className={`inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-xl px-3 text-xs font-bold transition-all cursor-pointer ${
                                  isAbsent
                                    ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/30'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50/70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-rose-950/40'
                                }`}
                                title="Mark Absent"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Absent</span>
                              </button>

                              {/* Leave Button */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(emp.employeeRefId, 'LEAVE')}
                                className={`inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-xl px-3 text-xs font-bold transition-all cursor-pointer ${
                                  isLeave
                                    ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/30'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50/70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-amber-950/40'
                                }`}
                                title="Apply Leave (Casual, Medical, Paid)"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                <span>Leave</span>
                              </button>
                            </div>
                          </td>

                          {/* Remarks / Leave Reason */}
                          <td className="px-3.5 py-3.5">
                            {isLeave ? (
                              <div className="flex items-center gap-2">
                                <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 text-[11px] font-extrabold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                  {emp.leaveType || 'LEAVE'}
                                </span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {emp.leaveReason || 'Approved Leave'}
                                </span>
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={emp.remarks || ''}
                                onChange={(e) =>
                                  handleFieldChange(emp.employeeRefId, 'remarks', e.target.value)
                                }
                                placeholder="Add remark..."
                                className="h-8 w-full max-w-xs rounded-lg border border-transparent bg-slate-50/80 px-2.5 text-xs text-slate-700 placeholder-slate-400 outline-none transition hover:border-slate-200 focus:border-primary focus:bg-white dark:bg-slate-950 dark:hover:border-slate-800 dark:text-slate-200 dark:focus:bg-slate-900"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Super Admin Style Pagination Bar */}
          {!loading && attendanceList.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {(dailyPage - 1) * PAGE_SIZE + 1}–
                {Math.min(dailyPage * PAGE_SIZE, attendanceList.length)} of {attendanceList.length} staff members
              </p>

              {dailyTotalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={dailyPage <= 1}
                    onClick={() => setDailyPage((prev) => Math.max(1, prev - 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: dailyTotalPages }, (_, i) => i + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setDailyPage(pageNumber)}
                      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-xs font-semibold transition cursor-pointer ${
                        pageNumber === dailyPage
                          ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={dailyPage >= dailyTotalPages}
                    onClick={() => setDailyPage((prev) => Math.min(dailyTotalPages, prev + 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CUSTOM DATE RANGE AUDIT TABLE */}
      {dateMode === 'range' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {rangeLoading ? (
              <SkeletonTable rows={5} columns={5} />
            ) : rangeRecords.length === 0 ? (
              <div className="py-16 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
                <h3 className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                  No Attendance Logs in Selected Range
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Try expanding the date range or adjusting search filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                    <tr>
                      <th className="px-3.5 py-3">Date</th>
                      <th className="px-3.5 py-3">Staff Member</th>
                      <th className="px-3.5 py-3">Role & Dept</th>
                      <th className="px-3.5 py-3">Status</th>
                      <th className="px-3.5 py-3">Leave Details / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-800 dark:text-slate-200">
                    {paginatedRangeRecords.map((r) => (
                      <tr
                        key={`${r.id}-${r.date}`}
                        className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
                      >
                        <td className="px-3.5 py-3.5 whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                          {formatDisplayDate(r.date)}
                        </td>

                        <td className="px-3.5 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {r.employeeName}
                          </span>
                          <span className="block font-mono text-[11px] text-slate-400">
                            {r.employeeId}
                          </span>
                        </td>

                        <td className="px-3.5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                            {r.employeeRole}
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {r.department || '—'}
                          </p>
                        </td>

                        <td className="px-3.5 py-3.5 whitespace-nowrap">
                          <Badge
                            variant={
                              r.status === 'PRESENT'
                                ? 'success'
                                : r.status === 'ABSENT'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>

                        <td className="px-3.5 py-3.5">
                          {r.status === 'LEAVE' ? (
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 text-[11px] font-extrabold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                {r.leaveType || 'LEAVE'}
                              </span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {r.leaveReason || 'Approved Leave'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">
                              {r.remarks || '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Super Admin Style Range Pagination Bar */}
          {!rangeLoading && rangeRecords.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {(rangePage - 1) * PAGE_SIZE + 1}–
                {Math.min(rangePage * PAGE_SIZE, rangeRecords.length)} of {rangeRecords.length} logs
              </p>

              {rangeTotalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={rangePage <= 1}
                    onClick={() => setRangePage((prev) => Math.max(1, prev - 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: rangeTotalPages }, (_, i) => i + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setRangePage(pageNumber)}
                      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-xs font-semibold transition cursor-pointer ${
                        pageNumber === rangePage
                          ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={rangePage >= rangeTotalPages}
                    onClick={() => setRangePage((prev) => Math.min(rangeTotalPages, prev + 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* LEAVE DETAILS MODAL */}
      <Modal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title={`Apply Leave for ${targetEmployee?.employeeName || 'Employee'}`}
        size="md"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 text-xs dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="font-bold text-amber-800 dark:text-amber-200">
              {targetEmployee?.employeeName} ({targetEmployee?.employeeId})
            </p>
            <p className="mt-0.5 text-slate-500 dark:text-slate-400">
              Role: <strong>{targetEmployee?.employeeRole}</strong> • Date:{' '}
              <strong>{formatDisplayDate(date)}</strong>
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Leave Type *
            </label>
            <select
              value={leaveForm.leaveType}
              onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              {LEAVE_TYPES.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Reason / Medical Certificate Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={leaveForm.leaveReason}
              onChange={(e) => setLeaveForm({ ...leaveForm, leaveReason: e.target.value })}
              placeholder="e.g. Approved medical leave with doctor prescription"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setLeaveModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-600"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Confirm Leave</span>
            </button>
          </div>
        </form>
      </Modal>

      <ToastComponent />
    </div>
  );
};

export default AttendanceManagement;

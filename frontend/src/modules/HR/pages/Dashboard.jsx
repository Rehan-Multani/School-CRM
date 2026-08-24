import React, { useState, useEffect } from 'react';
import { useHRAuth } from '../context/HRAuthContext';
import { hrApi } from '../../../shared/api/client';
import {
  Users,
  UserPlus,
  CalendarDays,
  CalendarRange,
  BadgeCent,
  Building,
  Contact,
  Megaphone,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Award,
  ChevronRight,
  FolderOpen,
  FileSpreadsheet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useHRAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hrApi.dashboard();
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load HR dashboard');
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary || {
    totalEmployees: 0,
    activeEmployees: 0,
    teachingStaff: 0,
    nonTeachingStaff: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
    pendingLeaves: 0,
    totalPayrollPaid: 0,
    totalPayrollPending: 0,
  };

  const departmentWise = data?.departmentWise || [];

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Executive Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 border border-indigo-600/30 dark:border-slate-800 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 select-none relative overflow-hidden transition-all">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 dark:bg-indigo-600/30 border-2 border-white/20 dark:border-indigo-500 flex items-center justify-center font-black text-xl text-white dark:text-indigo-400 shrink-0 shadow-inner">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'H'}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-indigo-200 dark:text-indigo-400 uppercase">
                Staff & Payroll Administration Desk
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 text-[9px] font-bold">
                Online
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black mt-0.5 text-white">Welcome, {user?.name || 'HR Manager'}</h2>
            <p className="text-xs text-indigo-100/80 dark:text-slate-400 mt-1 font-semibold">
              Employee ID: {user?.employeeId || 'HR-201'} • {user?.department || 'Human Resources & Admin'} • {user?.schoolName || 'Greenfield Public School'}
            </p>
          </div>
        </div>

        <div className="text-left md:text-right md:border-l md:border-white/15 dark:md:border-slate-800 md:pl-6 relative z-10">
          <span className="text-[10px] font-black text-indigo-200/90 dark:text-slate-400 uppercase tracking-widest block">HRMS Workspace Date</span>
          <span className="text-xs font-bold text-white dark:text-slate-200 mt-1 block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span className="text-[11px] font-medium text-indigo-100/80 dark:text-slate-400 mt-0.5 block flex md:justify-end items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-300 dark:text-indigo-400" />
            <span>Shift: {data?.shiftTimings || '08:00 AM - 03:00 PM'}</span>
          </span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDashboard} className="underline hover:no-underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* Quick Actions Desk */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Quick Operations Desk</span>
          <span className="text-[11px] font-bold text-indigo-650 dark:text-indigo-400">Fast Actions</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <button
            onClick={() => navigate('/hr/employees/new')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 hover:shadow-xs transition-all text-xs font-bold cursor-pointer group"
          >
            <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate">Add Employee</span>
          </button>

          <button
            onClick={() => navigate('/hr/attendance')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-xs transition-all text-xs font-bold cursor-pointer group"
          >
            <CalendarDays className="w-4 h-4 text-sky-500 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate">Mark Attendance</span>
          </button>

          <button
            onClick={() => navigate('/hr/leave')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-xs transition-all text-xs font-bold cursor-pointer group"
          >
            <CalendarRange className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate">Leave Desk</span>
          </button>

          <button
            onClick={() => navigate('/hr/payroll')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-xs transition-all text-xs font-bold cursor-pointer group"
          >
            <BadgeCent className="w-4 h-4 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate">Process Payroll</span>
          </button>

          <button
            onClick={() => navigate('/hr/departments')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-xs transition-all text-xs font-bold cursor-pointer group"
          >
            <Building className="w-4 h-4 text-blue-500 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate">Departments</span>
          </button>

          <button
            onClick={() => navigate('/hr/announcements')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-xs transition-all text-xs font-bold cursor-pointer group"
          >
            <Megaphone className="w-4 h-4 text-purple-500 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate">Post Notice</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Total Employees */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Faculty & Staff</span>
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Users className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{summary.totalEmployees}</div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-slate-400">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{summary.activeEmployees} Active</span>
                <span>•</span>
                <span>{summary.teachingStaff} Teachers / {summary.nonTeachingStaff} Staff</span>
              </div>
            </div>
          </div>

          {/* Present Today */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Campus Attendance Today</span>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <CheckCircle2 className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{summary.presentToday}</div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-slate-400">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {summary.totalEmployees > 0 ? `${Math.round((summary.presentToday / summary.totalEmployees) * 100)}%` : '0%'}
                </span>
                <span>Attendance Ratio Today</span>
              </div>
            </div>
          </div>

          {/* Pending Leaves */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Pending Leave Requests</span>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl">
                <CalendarRange className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-500">{summary.pendingLeaves}</div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-slate-400">
                <span className="text-amber-600 dark:text-amber-400 font-bold">{summary.onLeaveToday} on leave today</span>
              </div>
            </div>
          </div>

          {/* Total Payroll Paid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Salary Disbursed</span>
              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl">
                <BadgeCent className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                ₹{Number(summary.totalPayrollPaid || 0).toLocaleString('en-IN')}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-slate-400">
                <span>{summary.totalPayrollPending > 0 ? `₹${Number(summary.totalPayrollPending).toLocaleString('en-IN')} Pending` : 'All cleared'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Department Distribution & Policy Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Headcount Distribution</h3>
              <p className="text-xs text-slate-400">Live employee ratio and departmental strength</p>
            </div>
            <button
              onClick={() => navigate('/hr/departments')}
              className="text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Departments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : departmentWise.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold space-y-2">
              <Building className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p>No departments created yet. Click "Manage Departments" to configure.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {departmentWise.map((dept) => {
                const percentage =
                  summary.totalEmployees > 0
                    ? Math.round((dept.employeeCount / summary.totalEmployees) * 100)
                    : 0;

                return (
                  <div key={dept.name} className="p-3.5 bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      <span>{dept.name}</span>
                      <span className="text-indigo-650 dark:text-indigo-400">{dept.employeeCount} Staff ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Operating Schedule & Work Policy */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">HR Operations Policy</h3>
            <p className="text-xs text-slate-400 mb-4">Configured shift timings and working days</p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider block">Standard Work Shift</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{data?.shiftTimings || '08:00 AM - 03:00 PM'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-850">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Working Days</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(data?.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']).map((day) => (
                    <span key={day} className="text-[10px] font-bold px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md">
                      {day.slice(0, 3)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-850">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Multi-Tenant Scoping</span>
                <div className="flex items-center gap-2 mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Isolated to {user?.schoolName || 'Current Institution'}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/hr/settings')}
            className="w-full mt-6 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center block"
          >
            Configure HR Policy & Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

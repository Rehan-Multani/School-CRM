import React, { useCallback, useEffect, useState } from 'react';
import { usePrincipalAuth } from '../context/PrincipalAuthContext';
import { useNavigate } from 'react-router-dom';
import { principalDashboardApi } from '../../../shared/api/client';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckSquare,
  Clock,
  FileSpreadsheet,
  GraduationCap,
  IndianRupee,
  RefreshCw,
  School,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { AreaChart } from '../components/ui/Charts/AreaChart';
import { BarChart } from '../components/ui/Charts/BarChart';
import { PieChart } from '../components/ui/Charts/PieChart';
import { LineChart } from '../components/ui/Charts/LineChart';
import { Badge } from '../components/ui/Badge';
import { DashboardSkeleton } from '../components/ui/SkeletonLoader';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

function buildFileUrl(path) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const _rel = path.startsWith('/') ? path : `/${path}`;
  const _tok = ['school_admin_token','principal_token','accountant_token','hr_token','librarian_token','transport_token','super_admin_token'].reduce((a, k) => a || localStorage.getItem(k), '');
  return `${API_BASE_URL}/platform${_rel}${_tok ? `?t=${encodeURIComponent(_tok)}` : ''}`;
}

export const Dashboard = () => {
  const { user } = usePrincipalAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await principalDashboardApi.summary();
      if (res?.data) setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  const today = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const kpi = {
    totalStudents: dashboardData?.kpi?.totalStudents ?? 0,
    totalTeachers: dashboardData?.kpi?.totalTeachers ?? 0,
    totalEmployees: dashboardData?.kpi?.totalEmployees ?? 0,
    attendanceRate: dashboardData?.kpi?.attendanceRate ?? 0,
    collectedToday: dashboardData?.kpi?.collectedToday ?? 0,
    collectedMonth: dashboardData?.kpi?.collectedMonth ?? 0,
    pendingFees: dashboardData?.kpi?.pendingFees ?? 0,
    classesCount: dashboardData?.kpi?.classesCount || '0 / 0',
    upcomingExams: dashboardData?.kpi?.upcomingExams ?? 0,
  };

  const charts = {
    admissionsTrend: dashboardData?.charts?.admissionsTrend || [],
    weeklyAttendance: dashboardData?.charts?.weeklyAttendance || [],
    monthlyFeeTrend: dashboardData?.charts?.monthlyFeeTrend || [],
    examPerformance: dashboardData?.charts?.examPerformance || [],
    genderDistribution: dashboardData?.charts?.genderDistribution || [],
    classStrength: dashboardData?.charts?.classStrength || [],
  };

  const recentActivities = dashboardData?.recentActivities || [];

  const quickActions = [
    { label: 'Students', path: '/principal/students', icon: Users, color: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Teachers', path: '/principal/teachers', icon: UserCheck, color: 'bg-indigo-500/10 text-indigo-600' },
    { label: 'Staff', path: '/principal/staff', icon: Briefcase, color: 'bg-purple-500/10 text-purple-600' },
    { label: 'Attendance', path: '/principal/attendance', icon: TrendingUp, color: 'bg-sky-500/10 text-sky-600' },
    { label: 'Fee & Dues', path: '/principal/fees', icon: IndianRupee, color: 'bg-amber-500/10 text-amber-600' },
    { label: 'Term Exams', path: '/principal/exams', icon: GraduationCap, color: 'bg-fuchsia-500/10 text-fuchsia-600' },
    { label: 'Leave Approval', path: '/principal/leave', icon: CheckSquare, color: 'bg-rose-500/10 text-rose-600' },
    { label: 'Reports', path: '/principal/reports', icon: FileSpreadsheet, color: 'bg-teal-500/10 text-teal-600' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Page Welcome & School Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {user?.photo ? (
            <img
              src={buildFileUrl(user.photo)}
              alt={user?.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-2 border-emerald-500 shrink-0 flex items-center justify-center font-bold text-lg">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                Welcome, {user?.name}
              </h1>
              <Badge variant="success">Principal</Badge>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              {user?.schoolName} • {today}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
            Session: <strong>{user?.academicSession || 'N/A'}</strong>
          </span>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:hover:bg-emerald-950 text-xs font-bold rounded-xl transition-all"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* Core KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Students"
          value={kpi.totalStudents.toLocaleString()}
          icon={Users}
          subtitle="Enrolled Active"
          onClick={() => navigate('/principal/students')}
        />
        <StatCard
          title="Teaching Staff"
          value={kpi.totalTeachers.toString()}
          icon={UserCheck}
          subtitle={`${kpi.totalEmployees} Total Staff`}
          onClick={() => navigate('/principal/teachers')}
        />
        <StatCard
          title="Daily Attendance"
          value={`${kpi.attendanceRate}%`}
          icon={TrendingUp}
          subtitle="Staff Roll Call Today"
          onClick={() => navigate('/principal/attendance')}
        />
        <StatCard
          title="Fee Collected Today"
          value={`₹${kpi.collectedToday.toLocaleString()}`}
          icon={IndianRupee}
          subtitle={`₹${(kpi.collectedMonth / 1000).toFixed(0)}k This Month`}
          onClick={() => navigate('/principal/fees')}
        />
      </div>

      {/* Module Pulse Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/principal/fees')}
          className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-900 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Fee Dues</h4>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between text-xs font-semibold">
            <span className="text-slate-400">Outstanding</span>
            <span className="font-bold text-rose-600">₹{kpi.pendingFees.toLocaleString()}</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/principal/academics/years')}
          className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-900 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                <School className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Academic Structure</h4>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between text-xs font-semibold">
            <span className="text-slate-400">Classes / Sections</span>
            <span className="font-bold text-indigo-600">{kpi.classesCount}</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/principal/exams')}
          className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-900 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Exam Terms</h4>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between text-xs font-semibold">
            <span className="text-slate-400">Scheduled Terms</span>
            <span className="font-bold text-amber-600">{kpi.upcomingExams} Active</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/principal/leave')}
          className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-900 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Leave Approval</h4>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between text-xs font-semibold">
            <span className="text-slate-400">Review Desk</span>
            <span className="font-bold text-emerald-600">Open</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Hub */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Fast Operations Hub
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {quickActions.map((act, idx) => {
            const Icon = act.icon;
            return (
              <button
                key={idx}
                onClick={() => navigate(act.path)}
                className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900 hover:shadow-sm rounded-2xl text-center transition-all group"
              >
                <div className={`p-2.5 rounded-xl ${act.color} mb-2 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {act.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-Time Dynamic Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Admissions Growth Trend</h4>
            <Badge variant="info">Monthly</Badge>
          </div>
          <AreaChart data={charts.admissionsTrend} dataKey="admissions" xKey="month" color="#059669" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Weekly Attendance Rate %</h4>
            <Badge variant="success">Mon - Sat</Badge>
          </div>
          <BarChart data={charts.weeklyAttendance} dataKey="attendance" xKey="day" color="#10b981" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Fee Recovery (₹)</h4>
            <Badge variant="warning">Cashflow</Badge>
          </div>
          <BarChart data={charts.monthlyFeeTrend} dataKey="collected" xKey="month" color="#f59e0b" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Exam Performance Trend (Avg %)</h4>
            <Badge variant="secondary">Evaluations</Badge>
          </div>
          <LineChart data={charts.examPerformance} dataKey="average" xKey="name" color="#a855f7" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Student Gender Distribution</h4>
            <Badge variant="info">Demographics</Badge>
          </div>
          <PieChart data={charts.genderDistribution} nameKey="name" dataKey="count" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Class-wise Student Strength</h4>
            <Badge variant="primary">Cohorts</Badge>
          </div>
          <BarChart data={charts.classStrength} dataKey="strength" xKey="class" color="#3b82f6" />
        </div>
      </div>

      {/* Live Activity Stream */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live School Activity Stream</h4>
          </div>
          <button
            onClick={() => navigate('/principal/reports')}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <span>View reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentActivities.length === 0 ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-400">
            No Result — No recent school activities recorded.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-center justify-between py-3.5 text-xs">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wide ${
                      act.color === 'emerald'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                        : act.color === 'amber'
                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                        : act.color === 'purple'
                        ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40'
                        : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40'
                    }`}
                  >
                    {act.category}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{act.text}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">{act.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

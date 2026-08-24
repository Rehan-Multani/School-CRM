import React, { useCallback, useEffect, useState } from 'react';
import { useSchoolAdminAuth } from '../context/SchoolAdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { schoolPortalApi } from '../../../shared/api/client';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bed,
  BookOpen,
  Briefcase,
  Building,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  IndianRupee,
  Layers,
  LayoutGrid,
  Loader2,
  Navigation,
  PlusCircle,
  RefreshCw,
  School,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Utensils,
  Wrench,
  Zap,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { AreaChart } from '../components/ui/Charts/AreaChart';
import { BarChart } from '../components/ui/Charts/BarChart';
import { PieChart } from '../components/ui/Charts/PieChart';
import { LineChart } from '../components/ui/Charts/LineChart';
import { Badge } from '../components/ui/Badge';
import { DashboardSkeleton } from '../components/ui/SkeletonLoader';

export const Dashboard = () => {
  const { user } = useSchoolAdminAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await schoolPortalApi.dashboardSummary();
      if (res?.data) {
        setDashboardData(res.data);
      }
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

  const handleQuickAction = (path) => {
    navigate(path);
  };

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
    libraryBooks: dashboardData?.kpi?.libraryBooks ?? 0,
    issuedBooks: dashboardData?.kpi?.issuedBooks ?? 0,
    hostelBeds: dashboardData?.kpi?.hostelBeds ?? 0,
    hostelOccupied: dashboardData?.kpi?.hostelOccupied ?? 0,
    hostelOccupancyRate: dashboardData?.kpi?.hostelOccupancyRate ?? 0,
    fleetVehicles: dashboardData?.kpi?.fleetVehicles ?? 0,
    transportStudents: dashboardData?.kpi?.transportStudents ?? 0,
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

  const formatCount = (val) => (val === 0 ? '00' : val.toLocaleString());

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Page Welcome & School Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-650 dark:text-indigo-400">
            <School className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {user?.schoolName || 'Greenfield Public School'}
              </h1>
              <Badge variant="success">School Active</Badge>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-1">{today}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
            Session: <strong>{user?.academicSession || '2026-2027'}</strong>
          </span>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-indigo-950/50 dark:hover:bg-indigo-950 text-xs font-bold rounded-xl transition-all"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* 2. Core 8-Stat KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Students"
          value={kpi.totalStudents.toLocaleString()}
          icon={Users}
          trend="+5.4%"
          trendType="up"
          subtitle="Enrolled Active"
          onClick={() => navigate('/school-admin/students')}
        />
        <StatCard
          title="Teaching Staff"
          value={kpi.totalTeachers.toString()}
          icon={UserCheck}
          trend={`${kpi.totalEmployees} Total Staff`}
          trendType="up"
          subtitle="Active Faculty"
          onClick={() => navigate('/school-admin/teachers')}
        />
        <StatCard
          title="Daily Attendance"
          value={`${kpi.attendanceRate}%`}
          icon={TrendingUp}
          trend="Present Today"
          trendType="up"
          subtitle="Campus Roll Call"
          onClick={() => navigate('/school-admin/attendance')}
        />
        <StatCard
          title="Fee Collected Today"
          value={`₹${kpi.collectedToday.toLocaleString()}`}
          icon={IndianRupee}
          trend={`₹${(kpi.collectedMonth / 1000).toFixed(0)}k This Month`}
          trendType="up"
          subtitle="Daily Receipts"
          onClick={() => navigate('/school-admin/fees')}
        />

        <StatCard
          title="Pending Fee Recovery"
          value={`₹${kpi.pendingFees.toLocaleString()}`}
          icon={AlertTriangle}
          trend="Overdue Balance"
          trendType="down"
          subtitle="Fee Invoices"
          onClick={() => navigate('/school-admin/fees')}
        />
        <StatCard
          title="Hostel Occupancy"
          value={`${kpi.hostelOccupancyRate}%`}
          icon={Bed}
          trend={`${kpi.hostelOccupied}/${kpi.hostelBeds} Beds`}
          trendType="up"
          subtitle="Residential Life"
          onClick={() => navigate('/school-admin/hostel')}
        />
        <StatCard
          title="Transport Bus Riders"
          value={kpi.transportStudents.toString()}
          icon={Bus}
          trend={`${kpi.fleetVehicles} Fleet Vehicles`}
          trendType="up"
          subtitle="Daily Commuters"
          onClick={() => navigate('/school-admin/transport')}
        />
        <StatCard
          title="Academic Classes"
          value={kpi.classesCount}
          icon={School}
          trend={`${kpi.upcomingExams} Active Exams`}
          trendType="up"
          subtitle="Classes / Sections"
          onClick={() => navigate('/school-admin/academic-year')}
        />
      </div>

      {/* 3. Module Quick Pulses (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hostel Pulse */}
        <div
          onClick={() => navigate('/school-admin/hostel')}
          className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-900 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                <Bed className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Hostel Life</h4>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between text-xs font-semibold">
            <span className="text-slate-400">Occupancy</span>
            <span className="font-bold text-purple-600">{kpi.hostelOccupied} / {kpi.hostelBeds} Beds</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-600 h-full rounded-full" style={{ width: `${kpi.hostelOccupancyRate}%` }} />
          </div>
        </div>

        {/* Transport Pulse */}
        <div
          onClick={() => navigate('/school-admin/transport')}
          className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-900 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <Bus className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Bus Transport</h4>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between text-xs font-semibold">
            <span className="text-slate-400">Daily Riders</span>
            <span className="font-bold text-emerald-600">{kpi.transportStudents} Students</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '78%' }} />
          </div>
        </div>

        {/* Library Pulse */}
        <div
          onClick={() => navigate('/school-admin/library')}
          className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-900 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650">
                <BookOpen className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Library Circulation</h4>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between text-xs font-semibold">
            <span className="text-slate-400">Issued Books</span>
            <span className="font-bold text-indigo-650">{kpi.issuedBooks} / {kpi.libraryBooks}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-650 h-full rounded-full" style={{ width: '42%' }} />
          </div>
        </div>

        {/* Exam Pulse */}
        <div
          onClick={() => navigate('/school-admin/exams')}
          className="p-5 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-900 transition-all"
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
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: '65%' }} />
          </div>
        </div>
      </div>

      {/* 4. Quick Actions Hub */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Fast Operations Hub
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Add Student', path: '/school-admin/students', icon: UserPlus, color: 'bg-emerald-500/10 text-emerald-600' },
            { label: 'Add Faculty', path: '/school-admin/teachers', icon: UserCheck, color: 'bg-indigo-500/10 text-indigo-600' },
            { label: 'Collect Fee', path: '/school-admin/fees', icon: IndianRupee, color: 'bg-amber-500/10 text-amber-600' },
            { label: 'Attendance', path: '/school-admin/attendance', icon: TrendingUp, color: 'bg-sky-500/10 text-sky-600' },
            { label: 'Hostel Life', path: '/school-admin/hostel', icon: Bed, color: 'bg-purple-500/10 text-purple-600' },
            { label: 'Bus Fleet', path: '/school-admin/transport', icon: Bus, color: 'bg-teal-500/10 text-teal-600' },
            { label: 'Term Exams', path: '/school-admin/exams', icon: GraduationCap, color: 'bg-fuchsia-500/10 text-fuchsia-600' },
            { label: 'All Reports', path: '/school-admin/reports', icon: FileSpreadsheet, color: 'bg-rose-500/10 text-rose-600' },
          ].map((act, idx) => {
            const Icon = act.icon;
            return (
              <button
                key={idx}
                onClick={() => handleQuickAction(act.path)}
                className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900 hover:shadow-sm rounded-2xl text-center transition-all group"
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

      {/* 5. Real-Time Dynamic Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Admissions Trend */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Admissions Growth Trend</h4>
            <Badge variant="primary">Monthly</Badge>
          </div>
          <AreaChart data={charts.admissionsTrend} xKey="month" yKey="admissions" fillColor="#6366f1" strokeColor="#4f46e5" />
        </div>

        {/* Weekly Attendance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Weekly Attendance Rate %</h4>
            <Badge variant="success">Mon - Sat</Badge>
          </div>
          <BarChart data={charts.weeklyAttendance} xKey="day" yKey="attendance" barColor="#10b981" />
        </div>

        {/* Fee Collection */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Fee Recovery (₹)</h4>
            <Badge variant="warning">Cashflow</Badge>
          </div>
          <BarChart data={charts.monthlyFeeTrend} xKey="month" yKey="collected" barColor="#f59e0b" />
        </div>

        {/* Exam Performance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Exam Performance Trend (Avg %)</h4>
            <Badge variant="secondary">Evaluations</Badge>
          </div>
          <LineChart data={charts.examPerformance} xKey="name" yKey="average" lineColor="#a855f7" />
        </div>

        {/* Gender Ratio */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Student Gender Distribution</h4>
            <Badge variant="info">Demographics</Badge>
          </div>
          <PieChart data={charts.genderDistribution} nameKey="name" valueKey="count" />
        </div>

        {/* Class Strength */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Class-wise Student Strength</h4>
            <Badge variant="primary">Cohorts</Badge>
          </div>
          <BarChart data={charts.classStrength} xKey="class" yKey="strength" barColor="#3b82f6" />
        </div>
      </div>

      {/* 6. Live Activity Stream & Audit Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-650" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live School Activity Stream
            </h4>
          </div>
          <button
            onClick={() => navigate('/school-admin/audit')}
            className="flex items-center gap-1 text-[11px] font-bold text-indigo-650 dark:text-indigo-400 hover:underline"
          >
            <span>View audit logs</span>
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

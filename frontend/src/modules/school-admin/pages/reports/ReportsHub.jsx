import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { exportToCSV, exportToJSON } from '../../../../shared/lib/exportHelpers';
import { PrintReportModal } from '../../../../shared/components/PrintReportModal';
import { schoolPortalApi } from '../../../../shared/api/client';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCent,
  Bed,
  Book,
  BookOpen,
  Briefcase,
  Building,
  Building2,
  Bus,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  History,
  Home,
  IndianRupee,
  Layers,
  LifeBuoy,
  Loader2,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Tag,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const REPORT_CATEGORIES = [
  {
    id: 'students',
    label: 'Student Directory & Roster',
    desc: 'Complete student profiles, roll numbers, class sections, guardian details, and active enrollment status.',
    icon: Users,
    color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    tag: 'Academic',
    categoryGroup: 'Academic',
  },
  {
    id: 'fees',
    label: 'Fee Payment Receipts Log',
    desc: 'Real-time payment transactions register, mode of payment (UPI/Cash/Card), and receipt audit identifiers.',
    icon: IndianRupee,
    color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
    tag: 'Finance',
    categoryGroup: 'Finance',
  },
  {
    id: 'fee_dues',
    label: 'Fee Dues & Defaulters Register',
    desc: 'Outstanding tuition balances, invoice due dates, parent contact phone numbers, and collection aging lists.',
    icon: AlertTriangle,
    color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
    tag: 'Finance',
    categoryGroup: 'Finance',
  },
  {
    id: 'payroll',
    label: 'Payroll & Salary Disbursements',
    desc: 'Monthly faculty salary breakdowns, gross earnings, standard deductions, and net disbursed registers.',
    icon: Wallet,
    color: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400',
    tag: 'Finance',
    categoryGroup: 'Finance',
  },
  {
    id: 'attendance',
    label: 'Staff Attendance & Presence Logs',
    desc: 'Daily campus faculty presence statistics, absenteeism counts, and monthly attendance percentages.',
    icon: Calendar,
    color: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
    tag: 'Operations',
    categoryGroup: 'HR & Staff',
  },
  {
    id: 'reviews',
    label: 'Performance Reviews & Appraisals',
    desc: 'Faculty evaluation scorecards, 5-star ratings, review periods, and qualitative achievement notes.',
    icon: Award,
    color: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400',
    tag: 'HR & Staff',
    categoryGroup: 'HR & Staff',
  },
  {
    id: 'staff',
    label: 'Faculty & Employee Directory',
    desc: 'Teaching faculty, administrative staff, assigned designations, departments, emails, and phone numbers.',
    icon: UserCheck,
    color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
    tag: 'HR & Staff',
    categoryGroup: 'HR & Staff',
  },
  {
    id: 'hostel',
    label: 'Hostel Residential Allocations',
    desc: 'Building occupancy registers, room numbers, allocated bed codes, and monthly stay durations.',
    icon: Bed,
    color: 'bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-600 dark:text-fuchsia-400',
    tag: 'Residency',
    categoryGroup: 'Logistics',
  },
  {
    id: 'transport',
    label: 'Transport Fleet & Bus Riders',
    desc: 'Route stop mappings, morning pickup/evening drop timings, and student bus subscriptions.',
    icon: Bus,
    color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
    tag: 'Logistics',
    categoryGroup: 'Logistics',
  },
  {
    id: 'library',
    label: 'Library Stock & Circulation Catalog',
    desc: 'Book inventory, shelf rack locations, total physical copies, available copies, and active loans.',
    icon: BookOpen,
    color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-650 dark:text-indigo-400',
    tag: 'Library',
    categoryGroup: 'Logistics',
  },
  {
    id: 'exams',
    label: 'Examination & Assessment Schedules',
    desc: 'Scheduled examination terms, academic sessions, test dates, and evaluation timetables.',
    icon: GraduationCap,
    color: 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400',
    tag: 'Academics',
    categoryGroup: 'Academic',
  },
  {
    id: 'support',
    label: 'Helpdesk & Support Inquiries',
    desc: 'School ticketing history, priority logs, resolution statuses, and support inquiry archives.',
    icon: LifeBuoy,
    color: 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400',
    tag: 'System',
    categoryGroup: 'System',
  },
];

const GROUP_TABS = ['All Categories', 'Academic', 'Finance', 'HR & Staff', 'Logistics', 'System'];

export const ReportsHub = () => {
  const { user } = useSchoolAdminAuth();
  const schoolName = user?.schoolName || 'Greenfield Public School';
  const { showToast, ToastComponent } = useToast();

  const [activeGroupTab, setActiveGroupTab] = useState('All Categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [reportStats, setReportStats] = useState(null);
  const [summaryStats, setSummaryStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Load institutional summary counts on initial render
  useEffect(() => {
    const fetchSummary = async () => {
      setLoadingSummary(true);
      try {
        const res = await schoolPortalApi.reportsSummary();
        if (res?.data) {
          setSummaryStats(res.data);
        }
      } catch (err) {
        console.error('Summary error:', err);
      } finally {
        setLoadingSummary(false);
      }
    };
    fetchSummary();
  }, []);

  const fetchReportData = useCallback(async (categoryObj) => {
    if (!categoryObj) return;
    setLoading(true);
    try {
      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit: 500,
      };

      const res = await schoolPortalApi.reportData(categoryObj.id, params);
      if (res?.data) {
        setReportData(res.data);
        setReportStats(res.stats || null);
      } else {
        setReportData([]);
        setReportStats(null);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to load report dataset', 'error');
      setReportData([]);
      setReportStats(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter, searchQuery, showToast]);

  const handleSelectCategory = (categoryObj) => {
    setSelectedCategory(categoryObj);
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
  };

  useEffect(() => {
    if (selectedCategory) {
      fetchReportData(selectedCategory);
    }
  }, [selectedCategory, startDate, endDate, statusFilter, fetchReportData]);

  const filteredCategories = useMemo(() => {
    if (activeGroupTab === 'All Categories') return REPORT_CATEGORIES;
    return REPORT_CATEGORIES.filter((c) => c.categoryGroup === activeGroupTab);
  }, [activeGroupTab]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return reportData;
    const q = searchQuery.toLowerCase();
    return reportData.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [reportData, searchQuery]);

  const handleDownloadCSV = () => {
    if (!selectedCategory || filteredData.length === 0) return;
    exportToCSV(filteredData, `${selectedCategory.id}_report_${new Date().toISOString().split('T')[0]}.csv`);
    showToast(`${selectedCategory.label} exported to CSV!`, 'success');
  };

  const handleDownloadJSON = () => {
    if (!selectedCategory || filteredData.length === 0) return;
    exportToJSON(filteredData, `${selectedCategory.id}_report_${new Date().toISOString().split('T')[0]}.json`);
    showToast(`${selectedCategory.label} exported to JSON!`, 'success');
  };

  const setDatePreset = (preset) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'THIS_YEAR') {
      const firstDayOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      setStartDate(firstDayOfYear);
      setEndDate(todayStr);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Institutional Intelligence & Audit Reports Hub"
        subtitle="Generate live official reports, audit cross-module datasets, analyze financial and operational trends, download spreadsheets, and print official documentation."
      />

      {/* Top Executive KPI Row (when no category is selected or as an overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Enrolled Students</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {summaryStats?.studentsCount ?? '...'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Live active student profiles</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Fee Collections</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              ₹{(summaryStats?.totalCollected || 0).toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Recorded payment transactions</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-2xl text-amber-600 dark:text-amber-400">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outstanding Fee Dues</p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              ₹{(summaryStats?.totalDue || 0).toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Pending invoice collections</p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-2xl text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Faculty & Staff Members</p>
            <h3 className="text-2xl font-black text-indigo-650 dark:text-indigo-400 mt-1">
              {summaryStats?.staffCount ?? '...'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Teaching & operations team</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-650 dark:text-indigo-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {!selectedCategory ? (
        /* Categories Cards Grid */
        <div className="space-y-5">
          {/* Domain Tab Filter */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {GROUP_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveGroupTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeGroupTab === tab
                      ? 'bg-indigo-650 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <span className="text-xs font-bold text-slate-400 hidden sm:block">
              {filteredCategories.length} Active Modules
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCategories.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <div
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-800 hover:shadow-md rounded-3xl p-6 cursor-pointer flex flex-col justify-between space-y-4 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-3.5 rounded-2xl ${cat.color} group-hover:scale-110 transition-transform`}>
                        <CatIcon className="w-6 h-6" />
                      </div>
                      <Badge variant="secondary">{cat.tag}</Badge>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                        <span>{cat.label}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-650 dark:text-indigo-400">
                    <span>Generate live dataset</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Report Category Preview & Actions Panel */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Categories Hub</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Active Dataset:</span>
              <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-xl">
                {selectedCategory.label}
              </span>
            </div>
          </div>

          {/* Quick Context Summary Widget (if stats available) */}
          {reportStats && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-650 text-white rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Dataset Intelligence Metrics</h4>
                  <p className="text-[11px] text-slate-500">Live computed aggregations across filtered records</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                {reportStats.totalCollected !== undefined && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">TOTAL COLLECTED</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                      ₹{reportStats.totalCollected.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {reportStats.totalDue !== undefined && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">TOTAL OUTSTANDING</span>
                    <span className="text-rose-600 dark:text-rose-400 font-black text-sm">
                      ₹{reportStats.totalDue.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {reportStats.totalNetDisbursed !== undefined && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">TOTAL SALARY DISBURSED</span>
                    <span className="text-teal-600 dark:text-teal-400 font-black text-sm">
                      ₹{reportStats.totalNetDisbursed.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {reportStats.averageRating !== undefined && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">AVG PERFORMANCE SCORE</span>
                    <span className="text-amber-500 font-black text-sm">
                      {reportStats.averageRating} / 5.0 Stars
                    </span>
                  </div>
                )}
                {reportStats.totalCopies !== undefined && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">TOTAL COPIES (IN STOCK)</span>
                    <span className="text-indigo-650 dark:text-indigo-400 font-black text-sm">
                      {reportStats.totalCopies} ({reportStats.availableCopies} available)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Advanced Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search in ${selectedCategory.label}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {/* Date Pickers (if applicable to financial / attendance / reviews / events) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50/80 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none"
                  title="From Date"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none"
                  title="To Date"
                />
              </div>

              {/* Date Presets */}
              <div className="hidden xl:flex items-center gap-1">
                <button
                  onClick={() => setDatePreset('THIS_MONTH')}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
                >
                  This Month
                </button>
                <button
                  onClick={() => setDatePreset('THIS_YEAR')}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
                >
                  This Year
                </button>
                {(startDate || endDate) && (
                  <button
                    onClick={() => setDatePreset('ALL')}
                    className="px-2 py-1 text-rose-500 text-[11px] font-bold cursor-pointer"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchReportData(selectedCategory)}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                title="Refresh Dataset"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setPrintModalOpen(true)}
                disabled={loading || filteredData.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>Print PDF</span>
              </button>

              <button
                onClick={handleDownloadJSON}
                disabled={loading || filteredData.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-cyan-600" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={handleDownloadCSV}
                disabled={loading || filteredData.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Excel / CSV</span>
              </button>
            </div>
          </div>

          {/* Live Data Preview Table */}
          {loading ? (
            <SkeletonTable rows={8} columns={6} />
          ) : filteredData.length === 0 ? (
            <div className="text-center py-16 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No records found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No matching records exist for the selected filters. Try adjusting your date range or search query.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[520px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">#</th>
                      {Object.keys(filteredData[0] || {}).map((h, i) => (
                        <th key={i} className="p-3.5 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                    {filteredData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors">
                        <td className="p-3.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        {Object.values(row).map((val, cIdx) => (
                          <td key={cIdx} className="p-3.5 whitespace-nowrap">
                            {String(val) === 'ACTIVE' || String(val) === 'SUCCESS' || String(val) === 'PAID' ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-bold text-[10px] dark:bg-emerald-950/60 dark:text-emerald-400">
                                {String(val)}
                              </span>
                            ) : String(val) === 'OVERDUE' || String(val) === 'CANCELLED' ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 font-bold text-[10px] dark:bg-rose-950/60 dark:text-rose-400">
                                {String(val)}
                              </span>
                            ) : String(val) === 'PENDING' || String(val) === 'ON_HOLD' ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 font-bold text-[10px] dark:bg-amber-950/60 dark:text-amber-400">
                                {String(val)}
                              </span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer stats */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>
              Showing <strong>{filteredData.length}</strong> of <strong>{reportData.length}</strong> total records
            </span>
            <span className="text-slate-400">Institutional Database Live Synchronized</span>
          </div>
        </div>
      )}

      {/* Print Document Modal */}
      {selectedCategory && (
        <PrintReportModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          title={`Official Report — ${selectedCategory.label}`}
          documentType={selectedCategory.label}
          data={filteredData}
        >
          <div className="space-y-6 text-slate-900">
            <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
              <h2 className="text-2xl font-black uppercase tracking-wider">{schoolName}</h2>
              <p className="text-xs text-slate-600">Affiliated to CBSE / State Board • Session 2026-2027</p>
              <h3 className="text-sm font-bold text-indigo-900 mt-2">{selectedCategory.label}</h3>
              <p className="text-[10px] text-slate-400">
                Generated on: {new Date().toLocaleString()} • Authorized Institutional Document
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-2 font-bold border-r border-slate-300">#</th>
                    {Object.keys(filteredData[0] || {}).map((h, i) => (
                      <th key={i} className="p-2 font-bold border-r border-slate-300 last:border-r-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredData.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="p-2 font-mono text-[10px] border-r border-slate-200">{i + 1}</td>
                      {Object.values(r).map((v, idx) => (
                        <td key={idx} className="p-2 border-r border-slate-200 last:border-r-0">
                          {String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-12 text-xs font-bold text-slate-700">
              <div className="text-center">
                <div className="border-t border-slate-400 pt-1 w-44">Prepared by: Operations Desk</div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-400 pt-1 w-44">Verified by: Internal Auditor</div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-400 pt-1 w-44">Authorized Principal Stamp</div>
              </div>
            </div>
          </div>
        </PrintReportModal>
      )}

      <ToastComponent />
    </div>
  );
};

export default ReportsHub;

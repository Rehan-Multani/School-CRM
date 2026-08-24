import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { hrApi } from '../../../../shared/api/client';
import { exportToCSV, exportToJSON } from '../../../../shared/lib/exportHelpers';
import { PrintReportModal } from '../../../../shared/components/PrintReportModal';
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const PERIOD_PRESETS = [
  '2026 Q1 Performance Appraisal',
  '2026 Q2 Mid-Term Review',
  '2026 Q3 Quarterly Evaluation',
  '2026 Q4 Year-End Assessment',
  'Annual Appraisal 2025-2026',
  'Annual Appraisal 2026-2027',
];

const RATING_DESCRIPTIONS = {
  5: { label: '5.0 — Outstanding Performance', color: 'text-amber-500', desc: 'Consistently exceeds all performance benchmarks and exhibits exceptional leadership.' },
  4: { label: '4.0 — Exceeds Expectations', color: 'text-emerald-500', desc: 'Frequently surpasses objectives and delivers high-standard pedagogical output.' },
  3: { label: '3.0 — Meets Expectations', color: 'text-indigo-500', desc: 'Consistently satisfies institutional duties and meets standard curriculum requirements.' },
  2: { label: '2.0 — Needs Improvement', color: 'text-orange-500', desc: 'Performance is below expected threshold; targeted training or mentoring advised.' },
  1: { label: '1.0 — Unsatisfactory', color: 'text-rose-500', desc: 'Fails to meet minimum acceptable job criteria; performance improvement plan required.' },
};

export const PerformanceReviews = () => {
  const { user } = useSchoolAdminAuth();
  const schoolName = user?.schoolName || 'Greenfield Public School';
  const { showToast, ToastComponent } = useToast();

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');
  const [selectedRating, setSelectedRating] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('ALL');

  // Modals & State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewingReview, setViewingReview] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employeeRefId: '',
    employeeType: 'TEACHER',
    employeeId: '',
    employeeName: '',
    department: '',
    designation: '',
    reviewPeriod: PERIOD_PRESETS[0],
    customPeriod: '',
    rating: 5,
    strengths: '',
    areasOfImprovement: '',
    goals: '',
    comments: '',
    status: 'SUBMITTED',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [revRes, empRes] = await Promise.all([
        hrApi.reviews({
          period: selectedPeriod !== 'ALL' ? selectedPeriod : undefined,
          rating: selectedRating !== 'ALL' ? selectedRating : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          employeeType: selectedEmployeeType !== 'ALL' ? selectedEmployeeType : undefined,
          search: searchQuery.trim() || undefined,
        }),
        hrApi.employees({ limit: 300 }),
      ]);

      if (revRes?.success) {
        setReviews(revRes.data || []);
        if (revRes.stats) {
          setStats(revRes.stats);
        }
      }
      if (empRes?.success) {
        setEmployees(empRes.data || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedRating, selectedStatus, selectedEmployeeType, searchQuery, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unique list of periods for filter dropdown
  const availablePeriods = useMemo(() => {
    const set = new Set(PERIOD_PRESETS);
    reviews.forEach((r) => {
      if (r.reviewPeriod) set.add(r.reviewPeriod);
    });
    return Array.from(set);
  }, [reviews]);

  const openCreateModal = () => {
    setEditingReview(null);
    setFormData({
      employeeRefId: employees[0]?.id || '',
      employeeType: employees[0]?.employeeType || 'TEACHER',
      employeeId: employees[0]?.employeeId || '',
      employeeName: employees[0]?.name || '',
      department: employees[0]?.department || '',
      designation: employees[0]?.designation || '',
      reviewPeriod: PERIOD_PRESETS[0],
      customPeriod: '',
      rating: 5,
      strengths: '',
      areasOfImprovement: '',
      goals: '',
      comments: '',
      status: 'SUBMITTED',
    });
    setModalOpen(true);
  };

  const openEditModal = (review) => {
    setEditingReview(review);
    setFormData({
      employeeRefId: review.employeeRefId || '',
      employeeType: review.employeeType || 'TEACHER',
      employeeId: review.employeeId || '',
      employeeName: review.employeeName || '',
      department: review.department || '',
      designation: review.designation || '',
      reviewPeriod: PERIOD_PRESETS.includes(review.reviewPeriod) ? review.reviewPeriod : 'CUSTOM',
      customPeriod: PERIOD_PRESETS.includes(review.reviewPeriod) ? '' : review.reviewPeriod,
      rating: review.rating || 5,
      strengths: review.strengths || '',
      areasOfImprovement: review.areasOfImprovement || '',
      goals: review.goals || '',
      comments: review.comments || '',
      status: review.status || 'SUBMITTED',
    });
    setModalOpen(true);
  };

  const handleEmployeeChange = (empId) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    setFormData((prev) => ({
      ...prev,
      employeeRefId: emp.id,
      employeeType: emp.employeeType || 'TEACHER',
      employeeId: emp.employeeId || '',
      employeeName: emp.name || '',
      department: emp.department || '',
      designation: emp.designation || '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeRefId) {
      showToast('Please select an employee for evaluation', 'error');
      return;
    }

    const finalPeriod = formData.reviewPeriod === 'CUSTOM' ? formData.customPeriod.trim() : formData.reviewPeriod;
    if (!finalPeriod) {
      showToast('Please specify a valid review period', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employeeRefId: formData.employeeRefId,
        employeeType: formData.employeeType,
        employeeId: formData.employeeId,
        employeeName: formData.employeeName,
        department: formData.department,
        designation: formData.designation,
        reviewPeriod: finalPeriod,
        rating: Number(formData.rating),
        strengths: formData.strengths.trim(),
        areasOfImprovement: formData.areasOfImprovement.trim(),
        goals: formData.goals.trim(),
        comments: formData.comments.trim(),
        status: formData.status,
      };

      if (editingReview) {
        await hrApi.updateReview(editingReview.id, payload);
        showToast('Appraisal review updated successfully!', 'success');
      } else {
        await hrApi.createReview(payload);
        showToast('Appraisal review created and recorded!', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to save review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hrApi.deleteReview(deleteTarget.id);
      showToast('Performance appraisal record deleted', 'success');
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete review', 'error');
    }
  };

  const handleExportCSV = () => {
    if (reviews.length === 0) return;
    const exportData = reviews.map((r, i) => ({
      '#': i + 1,
      'Employee Name': r.employeeName,
      'Employee ID': r.employeeId,
      'Type': r.employeeType,
      'Department': r.department,
      'Designation': r.designation,
      'Review Period': r.reviewPeriod,
      'Rating': `${r.rating} / 5 Stars`,
      'Strengths': r.strengths,
      'Areas for Improvement': r.areasOfImprovement,
      'Goals': r.goals,
      'Reviewer': r.reviewerName,
      'Review Date': r.reviewDate ? new Date(r.reviewDate).toLocaleDateString() : 'N/A',
      'Status': r.status,
    }));
    exportToCSV(exportData, `performance_reviews_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Reviews exported to CSV successfully!', 'success');
  };

  const handleExportJSON = () => {
    if (reviews.length === 0) return;
    exportToJSON(reviews, `performance_reviews_${new Date().toISOString().split('T')[0]}.json`);
    showToast('Reviews exported to JSON successfully!', 'success');
  };

  const renderStarRating = (count = 5) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= count ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Faculty & Staff Performance Appraisals"
        subtitle="Evaluate pedagogical standards, monitor staff milestones, maintain official appraisal records, and track institutional performance benchmarks."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Refresh Dataset"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              disabled={reviews.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Appraisal</span>
            </button>
          </div>
        }
      />

      {/* KPI Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Institutional Rating</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.averageRating || '0.0'}
              </h3>
              <span className="text-xs font-bold text-slate-400">/ 5.0</span>
            </div>
            <div className="mt-1.5">{renderStarRating(Math.round(stats.averageRating || 5))}</div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-2xl text-amber-600 dark:text-amber-400">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Appraisals</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.totalReviews || reviews.length}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Faculty & Staff evaluations</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-650 dark:text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">5-Star Excellence</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.breakdown?.[5] || 0}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.totalReviews ? Math.round(((stats.breakdown?.[5] || 0) / stats.totalReviews) * 100) : 0}% of evaluated faculty
            </p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Evaluated Staff</p>
            <h3 className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
              {employees.length}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Eligible institutional members</p>
          </div>
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/60 rounded-2xl text-cyan-600 dark:text-cyan-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by faculty name, employee ID, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9.5 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="h-9.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="ALL">All Review Periods</option>
            {availablePeriods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Rating Filter */}
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="h-9.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="ALL">All Ratings (1-5★)</option>
            <option value="5">5 Stars — Outstanding</option>
            <option value="4">4 Stars — Exceeds</option>
            <option value="3">3 Stars — Meets</option>
            <option value="2">2 Stars — Improvement</option>
            <option value="1">1 Star — Unsatisfactory</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="DRAFT">Draft</option>
          </select>

          {/* Employee Type Filter */}
          <select
            value={selectedEmployeeType}
            onChange={(e) => setSelectedEmployeeType(e.target.value)}
            className="h-9.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="ALL">All Roles</option>
            <option value="TEACHER">Teachers Only</option>
            <option value="STAFF">Staff Only</option>
          </select>
        </div>
      </div>

      {/* Main Reviews Table */}
      {loading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : reviews.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center space-y-3">
          <Award className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No performance appraisals found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || selectedRating !== 'ALL' || selectedPeriod !== 'ALL'
              ? 'Try modifying your search or filter parameters.'
              : 'Begin building official performance histories by recording the first appraisal review.'}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record New Appraisal</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Employee & Designation</th>
                  <th className="p-3.5">Review Period</th>
                  <th className="p-3.5">Score / Rating</th>
                  <th className="p-3.5">Key Highlights</th>
                  <th className="p-3.5">Evaluator</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-indigo-650 dark:text-indigo-400 text-xs">
                          {r.employeeName?.[0] || 'E'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{r.employeeName}</p>
                          <p className="text-[11px] text-slate-400">
                            {r.employeeId} • {r.designation || r.department || 'Faculty'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                        {r.reviewPeriod}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900 dark:text-white">{r.rating}.0</span>
                          {renderStarRating(r.rating)}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {r.rating === 5
                            ? 'Outstanding'
                            : r.rating === 4
                            ? 'Exceeds Expectations'
                            : r.rating === 3
                            ? 'Meets Standard'
                            : 'Needs Focus'}
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5 max-w-[220px]">
                      <p className="truncate text-slate-600 dark:text-slate-300" title={r.strengths || r.comments}>
                        {r.strengths || r.comments || 'Standard evaluation recorded'}
                      </p>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <p className="text-slate-800 dark:text-slate-200">{r.reviewerName || 'HR Desk'}</p>
                      <p className="text-[10px] text-slate-400">
                        {r.reviewDate ? new Date(r.reviewDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider ${
                          r.status === 'ACKNOWLEDGED'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : r.status === 'DRAFT'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                        }`}
                      >
                        {r.status || 'SUBMITTED'}
                      </span>
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingReview(r)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View Appraisal Scorecard"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Review"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Delete Appraisal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong>{reviews.length}</strong> recorded appraisal reports
            </span>
            <span className="text-slate-400">Institutional Appraisal Archive Synced</span>
          </div>
        </div>
      )}

      {/* Create / Edit Review Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingReview ? 'Edit Performance Appraisal Review' : 'Record Official Faculty Appraisal'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Faculty / Staff Member <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.employeeRefId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              disabled={!!editingReview}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.employeeId || 'EMP'}) — {e.department || 'General'} [{e.employeeType || 'STAFF'}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Review Period */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Appraisal Period <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.reviewPeriod}
                onChange={(e) => setFormData((prev) => ({ ...prev, reviewPeriod: e.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                {PERIOD_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="CUSTOM">+ Custom Assessment Period</option>
              </select>

              {formData.reviewPeriod === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="e.g. 2026 Academic Term 1"
                  value={formData.customPeriod}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customPeriod: e.target.value }))}
                  className="mt-2 h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              )}
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Appraisal Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                <option value="SUBMITTED">Submitted / Finalized</option>
                <option value="ACKNOWLEDGED">Acknowledged by Faculty</option>
                <option value="DRAFT">Draft Mode</option>
              </select>
            </div>
          </div>

          {/* Interactive Rating Picker */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Performance Rating (1 - 5 Stars) <span className="text-rose-500">*</span>
              </label>
              <span className="font-bold text-sm text-indigo-650 dark:text-indigo-400">
                {formData.rating}.0 / 5.0
              </span>
            </div>

            <div className="flex items-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((starVal) => (
                <button
                  type="button"
                  key={starVal}
                  onClick={() => setFormData((prev) => ({ ...prev, rating: starVal }))}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                    formData.rating >= starVal
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <Star className={`w-4 h-4 ${formData.rating >= starVal ? 'fill-amber-400' : ''}`} />
                  <span className="text-xs font-bold">{starVal}★</span>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>{RATING_DESCRIPTIONS[formData.rating]?.label}:</strong>{' '}
              {RATING_DESCRIPTIONS[formData.rating]?.desc}
            </p>
          </div>

          {/* Qualitative Feedback Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Demonstrated Strengths & Key Accomplishments
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Excellent student classroom engagement, initiated STEM club, strong curriculum adherence..."
                value={formData.strengths}
                onChange={(e) => setFormData((prev) => ({ ...prev, strengths: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Areas for Professional Development / Improvement
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Needs more prompt grading feedback turnaround, attend upcoming digital tools workshop..."
                value={formData.areasOfImprovement}
                onChange={(e) => setFormData((prev) => ({ ...prev, areasOfImprovement: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  SMART Objectives for Next Term
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Achieve 90%+ syllabus coverage by mid-term, organize 2 interactive labs..."
                  value={formData.goals}
                  onChange={(e) => setFormData((prev) => ({ ...prev, goals: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Evaluator Remarks / General Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Recommended for departmental seniority increment, positive feedback from principal..."
                  value={formData.comments}
                  onChange={(e) => setFormData((prev) => ({ ...prev, comments: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{editingReview ? 'Update Review' : 'Save Appraisal'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* View Appraisal Scorecard Modal */}
      {viewingReview && (
        <Modal
          isOpen={!!viewingReview}
          onClose={() => setViewingReview(null)}
          title="Official Faculty Performance Appraisal Scorecard"
          size="lg"
        >
          <div className="space-y-6">
            {/* Header / Profile info */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-black text-indigo-650 dark:text-indigo-400 text-lg">
                  {viewingReview.employeeName?.[0] || 'E'}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{viewingReview.employeeName}</h3>
                  <p className="text-xs text-slate-400">
                    ID: {viewingReview.employeeId} • {viewingReview.designation || 'Faculty Member'} • Department of {viewingReview.department || 'Academics'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-xl font-black text-slate-900 dark:text-white">{viewingReview.rating}.0</span>
                  {renderStarRating(viewingReview.rating)}
                </div>
                <span className="text-[11px] font-bold text-slate-400">{viewingReview.reviewPeriod}</span>
              </div>
            </div>

            {/* Qualitative Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Key Strengths & Achievements
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {viewingReview.strengths || 'Consistent classroom instruction and adherence to institutional benchmarks.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Areas of Improvement
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {viewingReview.areasOfImprovement || 'Continue developing digital classroom engagement and student feedback tools.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
                  Target Objectives for Next Term
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {viewingReview.goals || 'Maintain high student passing percentages and submit term reports on schedule.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Evaluator Remarks & Conclusion
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {viewingReview.comments || 'Evaluated and approved for standard institutional continuity.'}
                </p>
              </div>
            </div>

            {/* Footer Metadata & Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              <div>
                <span>Evaluator: <strong>{viewingReview.reviewerName || 'HR Administration'}</strong></span>
                <span className="mx-2">•</span>
                <span>Date: {viewingReview.reviewDate ? new Date(viewingReview.reviewDate).toLocaleDateString() : 'Today'}</span>
              </div>

              <button
                onClick={() => {
                  setPrintModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Appraisal Certificate</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Official Certificate Print Modal */}
      {viewingReview && (
        <PrintReportModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          title={`Appraisal Certificate — ${viewingReview.employeeName}`}
          documentType="Official Faculty Performance Appraisal"
          data={[viewingReview]}
        >
          <div className="p-6 space-y-6 text-slate-900">
            {/* Header */}
            <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
              <h2 className="text-2xl font-black uppercase tracking-wider">{schoolName}</h2>
              <p className="text-xs text-slate-600">Institutional Faculty & Employee Performance Assessment Board</p>
              <h3 className="text-sm font-bold text-indigo-800 mt-2">OFFICIAL APPRAISAL CERTIFICATE</h3>
              <p className="text-[10px] text-slate-400">Evaluation Period: {viewingReview.reviewPeriod}</p>
            </div>

            {/* Bio */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p><strong>Employee Name:</strong> {viewingReview.employeeName}</p>
                <p><strong>Employee Code:</strong> {viewingReview.employeeId}</p>
                <p><strong>Role Type:</strong> {viewingReview.employeeType}</p>
              </div>
              <div>
                <p><strong>Department:</strong> {viewingReview.department || 'Academics'}</p>
                <p><strong>Designation:</strong> {viewingReview.designation || 'Staff'}</p>
                <p><strong>Assessment Score:</strong> {viewingReview.rating}.0 / 5.0 Stars</p>
              </div>
            </div>

            {/* Scorecard Box */}
            <div className="border border-slate-300 rounded-xl p-4 space-y-3 text-xs bg-slate-50">
              <div>
                <strong className="text-indigo-900 block uppercase text-[10px]">Key Accomplishments:</strong>
                <p className="mt-0.5 text-slate-700">{viewingReview.strengths || 'Meets standard expectations.'}</p>
              </div>
              <div>
                <strong className="text-indigo-900 block uppercase text-[10px]">Areas of Improvement:</strong>
                <p className="mt-0.5 text-slate-700">{viewingReview.areasOfImprovement || 'Standard development path.'}</p>
              </div>
              <div>
                <strong className="text-indigo-900 block uppercase text-[10px]">Target Goals:</strong>
                <p className="mt-0.5 text-slate-700">{viewingReview.goals || 'Maintain curriculum benchmarks.'}</p>
              </div>
              <div>
                <strong className="text-indigo-900 block uppercase text-[10px]">Reviewer Remarks:</strong>
                <p className="mt-0.5 text-slate-700">{viewingReview.comments || 'Evaluated and approved by HR Management.'}</p>
              </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between pt-10 text-xs font-bold text-slate-700">
              <div className="text-center">
                <div className="border-t border-slate-400 pt-1 w-44">Employee Signature</div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-400 pt-1 w-44">HR Director Signature</div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-400 pt-1 w-44">Principal Authorization</div>
              </div>
            </div>
          </div>
        </PrintReportModal>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Performance Review?"
        message={`Are you sure you want to permanently delete the appraisal record for ${deleteTarget?.employeeName}? This action cannot be undone.`}
        confirmLabel="Delete Record"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ToastComponent />
    </div>
  );
};

export default PerformanceReviews;

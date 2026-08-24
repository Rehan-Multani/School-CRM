import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import {
  Award,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Users,
  Search,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Calendar,
  Building,
  Target,
  FileCheck,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

export const PerformanceManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ totalReviews: 0, averageRating: 0, breakdown: {} });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('ALL');
  const [filterPeriod, setFilterPeriod] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [selectedScorecard, setSelectedScorecard] = useState(null);
  const [deleteReviewId, setDeleteReviewId] = useState(null);

  // Form State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [reviewPeriod, setReviewPeriod] = useState('2026 Q1 Appraisal');
  const [rating, setRating] = useState(5);
  const [strengths, setStrengths] = useState('');
  const [areasOfImprovement, setAreasOfImprovement] = useState('');
  const [goals, setGoals] = useState('');
  const [comments, setComments] = useState('');

  const { showToast, ToastComponent } = useToast();

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [revRes, empRes] = await Promise.all([
        hrApi.reviews(),
        hrApi.employees({ limit: 300 }),
      ]);
      if (revRes?.success) {
        setReviews(revRes.data || []);
        if (revRes.stats) setStats(revRes.stats);
      }
      if (empRes?.success) {
        setEmployees(empRes.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) {
      showToast('Please select a faculty member', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const emp = employees.find((e) => e.id === selectedEmpId);
      const payload = {
        employeeRefId: selectedEmpId,
        employeeType: emp?.employeeType || 'STAFF',
        employeeId: emp?.employeeId || 'EMP',
        employeeName: emp?.name || 'Staff',
        department: emp?.department || 'General',
        designation: emp?.designation || 'Staff',
        reviewPeriod,
        rating: Number(rating),
        strengths: strengths.trim(),
        areasOfImprovement: areasOfImprovement.trim(),
        goals: goals.trim(),
        comments: comments.trim(),
      };

      await hrApi.createReview(payload);
      showToast(`Performance appraisal recorded for ${emp?.name}!`, 'success');
      setShowModal(false);
      setStrengths('');
      setAreasOfImprovement('');
      setGoals('');
      setComments('');
      fetchReviews();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!deleteReviewId) return;
    try {
      await hrApi.deleteReview(deleteReviewId);
      setReviews((prev) => prev.filter((r) => r.id !== deleteReviewId));
      showToast('Appraisal record deleted.', 'info');
      setDeleteReviewId(null);
      fetchReviews();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete review', 'error');
    }
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesSearch =
        !searchTerm ||
        (r.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.department || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRating = filterRating === 'ALL' || Number(r.rating) === Number(filterRating);
      const matchesPeriod = filterPeriod === 'ALL' || r.reviewPeriod === filterPeriod;

      return matchesSearch && matchesRating && matchesPeriod;
    });
  }, [reviews, searchTerm, filterRating, filterPeriod]);

  const uniquePeriods = useMemo(() => {
    const set = new Set();
    reviews.forEach((r) => {
      if (r.reviewPeriod) set.add(r.reviewPeriod);
    });
    return Array.from(set);
  }, [reviews]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Faculty & Staff Performance Evaluations"
        subtitle="Manage quarterly faculty scorecards, 5-star appraisal registers, pedagogical improvement goals, and excellence certificates."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchReviews}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                setSelectedEmpId(employees[0]?.id || '');
                setShowModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Appraisal</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Evaluations</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.totalReviews || reviews.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Completed appraisals</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-650 dark:text-indigo-400">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Campus Avg Rating</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {Number(stats.averageRating || 4.8).toFixed(1)}
              </span>
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= Math.round(stats.averageRating || 4.8) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Institutional benchmark</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-2xl text-amber-500">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Top 5★ Performers</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {reviews.filter((r) => Number(r.rating) === 5).length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Exceeding expectations</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Faculty Appraised</span>
            <div className="text-2xl font-black text-blue-600 mt-1">
              {new Set(reviews.map((r) => r.employeeRefId)).size} Staff
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Audited team members</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-2xl text-blue-600">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search appraisals by faculty name, ID, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white pl-9.5 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none text-xs font-semibold"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer outline-none"
          >
            <option value="ALL">All Appraisal Periods</option>
            {uniquePeriods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer outline-none"
          >
            <option value="ALL">All Star Ratings</option>
            <option value="5">5 Stars — Outstanding</option>
            <option value="4">4 Stars — Exceeds Standards</option>
            <option value="3">3 Stars — Meets Standards</option>
            <option value="2">2 Stars — Needs Improvement</option>
            <option value="1">1 Star — Unsatisfactory</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchReviews} className="underline hover:no-underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* Reviews Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-400 space-y-3 shadow-xs">
          <Award className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No appraisals found</h4>
          <p className="text-xs max-w-sm mx-auto">
            {searchTerm || filterRating !== 'ALL' || filterPeriod !== 'ALL'
              ? 'No appraisal scorecards match your active filter settings.'
              : 'No appraisals recorded yet. Click "Record Appraisal" above to audit faculty.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReviews.map((rev) => {
            const stars = Number(rev.rating || 5);
            return (
              <div
                key={rev.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-xs font-semibold space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-indigo-650 dark:text-indigo-400 text-xs shrink-0">
                        {rev.employeeName?.[0] || 'E'}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider block">
                          {rev.reviewPeriod || '2026 Appraisal'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 leading-tight">
                          {rev.employeeName}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {rev.employeeId} • {rev.department || 'General'}
                        </p>
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-300 font-black">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{stars}.0</span>
                    </div>
                  </div>

                  {/* Strengths & Improvement Snippets */}
                  <div className="mt-3.5 space-y-2 text-[11px]">
                    {rev.strengths && (
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                        <span className="font-bold block text-[10px] uppercase tracking-wider text-emerald-600 mb-0.5">Key Strengths:</span>
                        <p className="line-clamp-2 leading-relaxed">{rev.strengths}</p>
                      </div>
                    )}

                    {rev.goals && (
                      <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                        <span className="font-bold block text-[10px] uppercase tracking-wider text-indigo-600 mb-0.5">Pedagogical Goals:</span>
                        <p className="line-clamp-2 leading-relaxed">{rev.goals}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-[10px] text-slate-400">
                    Appraised on {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'N/A'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedScorecard(rev)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg cursor-pointer"
                      title="View Scorecard"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteReviewId(rev.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete Appraisal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Review Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Record Faculty Performance Appraisal"
        size="lg"
      >
        <form onSubmit={handleSubmitReview} className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Faculty / Staff Member <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.employeeId || 'EMP'}) — {e.department || 'General'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Appraisal Period / Session <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 2026 Q1 Appraisal / Annual Review 2026"
                value={reviewPeriod}
                onChange={(e) => setReviewPeriod(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
                required
              />
            </div>
          </div>

          {/* Interactive Star Rating */}
          <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Overall Performance Star Rating</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Select grading from 1 (Unsatisfactory) to 5 (Outstanding)</p>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setRating(s)}
                  className="p-1 hover:scale-125 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
                      s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 font-black text-sm text-amber-600 dark:text-amber-300">{rating}.0 / 5.0</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Demonstrated Core Strengths & Merits
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Exceptional classroom management, thorough curriculum preparation, high student exam pass rate..."
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Development Goals & Action Plan
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Integrate digital smart-board workshops, pursue continuous professional development courses..."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Evaluator Administrative Notes
            </label>
            <textarea
              rows={2}
              placeholder="Internal evaluation remarks for the personnel file..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer"
            >
              {submitting ? 'Recording...' : 'Commit Appraisal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Scorecard Modal */}
      {selectedScorecard && (
        <Modal
          isOpen={!!selectedScorecard}
          onClose={() => setSelectedScorecard(null)}
          title={`Performance Scorecard — ${selectedScorecard.employeeName}`}
          size="md"
        >
          <div className="space-y-4 p-2">
            <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-6 bg-slate-50 dark:bg-slate-950 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">{selectedScorecard.employeeName}</h3>
                  <p className="text-xs text-slate-400">{selectedScorecard.employeeId} • {selectedScorecard.department}</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-black rounded-xl text-sm">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{selectedScorecard.rating}.0 / 5.0</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Appraisal Period:</span>
                  <p className="text-slate-800 dark:text-slate-200 font-bold">{selectedScorecard.reviewPeriod}</p>
                </div>
                {selectedScorecard.strengths && (
                  <div>
                    <span className="font-bold text-slate-400 uppercase text-[10px]">Strengths:</span>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{selectedScorecard.strengths}</p>
                  </div>
                )}
                {selectedScorecard.goals && (
                  <div>
                    <span className="font-bold text-slate-400 uppercase text-[10px]">Goals & Objectives:</span>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{selectedScorecard.goals}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Scorecard Certificate</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteReviewId}
        title="Delete Appraisal Record?"
        message="Are you sure you want to remove this faculty performance review? This evaluation will be deleted from the employee's career scorecard."
        confirmLabel="Delete Review"
        confirmVariant="danger"
        onConfirm={handleDeleteReview}
        onCancel={() => setDeleteReviewId(null)}
      />

      <ToastComponent />
    </div>
  );
};

export default PerformanceManagement;

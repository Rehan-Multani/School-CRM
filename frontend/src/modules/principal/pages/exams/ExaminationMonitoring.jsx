import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { principalAcademicApi, principalExamApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const EXAM_TYPES = [
  { value: 'UNIT_TEST', label: 'Unit Test' },
  { value: 'MONTHLY_TEST', label: 'Monthly Test' },
  { value: 'QUARTERLY', label: 'Quarterly Examination' },
  { value: 'HALF_YEARLY', label: 'Half Yearly Examination' },
  { value: 'ANNUAL', label: 'Annual / Final Examination' },
  { value: 'PRE_BOARD', label: 'Pre-Board Examination' },
];

export const ExaminationMonitoring = () => {
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  // Stats & Data
  const [stats, setStats] = useState({
    totalExams: 0,
    scheduled: 0,
    completed: 0,
    published: 0,
  });
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Reference Data
  const [years, setYears] = useState([]);
  const [yearClasses, setYearClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [yearFilter, setYearFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    academicYearId: '',
    examType: 'HALF_YEARLY',
    classIds: [],
    startDate: '',
    endDate: '',
    gradingType: 'PERCENTAGE',
    status: 'DRAFT',
    description: '',
  });

  // Load Years & Stats
  const loadReferenceData = useCallback(async () => {
    try {
      const [statsRes, yearsRes] = await Promise.all([
        principalExamApi.stats(),
        principalAcademicApi.years({ limit: 100 }),
      ]);
      setStats(statsRes.data || {});
      const list = yearsRes.data || [];
      setYears(list);
      const currentYear = list.find((y) => y.isCurrent) || list[0];
      if (currentYear && !formData.academicYearId) {
        setFormData((prev) => ({ ...prev, academicYearId: currentYear.id }));
      }
    } catch {
      // ignore
    }
  }, [formData.academicYearId]);

  // Load Classes for the selected academic year in form
  const fetchClassesForYear = useCallback(async (yearId) => {
    if (!yearId) {
      setYearClasses([]);
      return;
    }
    setLoadingClasses(true);
    try {
      const res = await principalAcademicApi.yearClasses(yearId);
      const list = (res.data || []).map((item) => ({
        id: item.classId || item.class?.id || item.id,
        name: item.class?.name || item.name || 'Class',
        code: item.class?.code || item.code || '',
      }));
      setYearClasses(list);
    } catch {
      setYearClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  // Load Exams List
  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await principalExamApi.exams({
        academicYearId: yearFilter !== 'ALL' ? yearFilter : undefined,
        examType: typeFilter !== 'ALL' ? typeFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit: 100,
      });
      setExams(res.data || []);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to fetch examination terms'), 'error');
    } finally {
      setLoading(false);
    }
  }, [yearFilter, typeFilter, statusFilter, searchQuery, showToast]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const handleOpenCreateModal = () => {
    const currentYear = years.find((y) => y.isCurrent) || years[0];
    const initialYearId = currentYear?.id || '';
    setFormData({
      name: '',
      academicYearId: initialYearId,
      examType: 'HALF_YEARLY',
      classIds: [],
      startDate: '',
      endDate: '',
      gradingType: 'PERCENTAGE',
      status: 'DRAFT',
      description: '',
    });
    setCreateModalOpen(true);
    if (initialYearId) {
      fetchClassesForYear(initialYearId);
    }
  };

  const handleYearChangeInForm = (yearId) => {
    setFormData((prev) => ({
      ...prev,
      academicYearId: yearId,
      classIds: [],
    }));
    fetchClassesForYear(yearId);
  };

  const handleToggleClass = (classId) => {
    setFormData((prev) => {
      const exists = prev.classIds.includes(classId);
      const next = exists
        ? prev.classIds.filter((id) => id !== classId)
        : [...prev.classIds, classId];
      return { ...prev, classIds: next };
    });
  };

  const handleSelectAllClasses = () => {
    if (formData.classIds.length === yearClasses.length) {
      setFormData((prev) => ({ ...prev, classIds: [] }));
    } else {
      setFormData((prev) => ({ ...prev, classIds: yearClasses.map((c) => c.id) }));
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showToast('Please enter examination name', 'warning');
      return;
    }
    if (!formData.academicYearId) {
      showToast('Please select an Academic Session', 'warning');
      return;
    }
    if (formData.classIds.length === 0) {
      showToast('Please select at least one Target Class', 'warning');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      showToast('Please specify start and end dates', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await principalExamApi.createExam(formData);
      showToast(res.message || 'Examination created successfully!', 'success');
      setCreateModalOpen(false);
      loadExams();
      principalExamApi.stats().then((r) => setStats(r.data || {})).catch(() => {});
      // Navigate to detail page immediately to configure subjects and timetable
      if (res.data?.id) {
        navigate(`/principal/exams/${res.data.id}`);
      }
    } catch (err) {
      showToast(apiMessage(err, 'Failed to create exam'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!deleteTarget) return;
    try {
      const res = await principalExamApi.deleteExam(deleteTarget.id);
      showToast(res.message || 'Exam term removed', 'success');
      setDeleteTarget(null);
      loadExams();
      principalExamApi.stats().then((r) => setStats(r.data || {})).catch(() => {});
    } catch (err) {
      showToast(apiMessage(err, 'Failed to delete exam'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examinations & Terms"
        subtitle="Manage examination terms, timetables, grading, marks entry, and report cards."
        actions={
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">Create Exam</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Terms
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {stats.totalExams || 0}
          </p>
          <span className="text-[11px] font-semibold text-slate-400">All Scheduled Sessions</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Scheduled / Live
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.scheduled || 0}
          </p>
          <span className="text-[11px] font-semibold text-slate-400">Upcoming or In Progress</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Completed
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {stats.completed || 0}
          </p>
          <span className="text-[11px] font-semibold text-slate-400">Marks Graded</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Published Results
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.published || 0}
          </p>
          <span className="text-[11px] font-semibold text-slate-400">Live in Portals</span>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exam name or type..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400">Session:</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
            >
              <option value="ALL">All Academic Sessions</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
            >
              <option value="ALL">All Exam Types</option>
              {EXAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={loadExams}
          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          title="Refresh List"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Examinations Table */}
      {loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <FileSpreadsheet className="h-10 w-10 text-slate-300" />
          <h4 className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            No Examinations Scheduled
          </h4>
          <p className="mt-1 max-w-sm text-xs text-slate-400">
            Create your first examination term to configure subjects, timetable, marks, and report cards.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" /> Create Exam Term
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950">
              <tr>
                <th className="px-5 py-3.5">Exam Term Name</th>
                <th className="px-5 py-3.5">Academic Session</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Target Classes</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
              {exams.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/principal/exams/${item.id}`)}
                  className="cursor-pointer transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs dark:bg-indigo-950/50 dark:text-indigo-400">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {item.description || 'Comprehensive evaluation'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                      <CalendarDays className="h-3 w-3" />
                      {item.session}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-bold">
                    {item.examType.replace('_', ' ')}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-1">
                      {item.classes?.slice(0, 3).map((c) => (
                        <span
                          key={c.id}
                          className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {c.name}
                        </span>
                      ))}
                      {item.classes?.length > 3 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          +{item.classes.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">
                      {new Date(item.startDate).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      —{' '}
                      {new Date(item.endDate).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <Badge
                      variant={
                        item.status === 'PUBLISHED'
                          ? 'success'
                          : item.status === 'COMPLETED'
                          ? 'default'
                          : item.status === 'SCHEDULED'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>

                  <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/principal/exams/${item.id}`)}
                        className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300"
                      >
                        <span>Manage Exam</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                        title="Delete Exam"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Examination Term"
        size="lg"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Academic Session */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Academic Session *
              </label>
              <select
                value={formData.academicYearId}
                onChange={(e) => handleYearChangeInForm(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">-- Select Session --</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(Current Session)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Exam Type */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Exam Type *
              </label>
              <select
                value={formData.examType}
                onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                required
                className={inputClass}
              >
                {EXAM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Exam Term Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Half Yearly Examination 2026-27"
              className={inputClass}
            />
          </div>

          {/* Target Classes Multi-select */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Classes *
              </label>
              {yearClasses.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllClasses}
                  className="text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  {formData.classIds.length === yearClasses.length
                    ? 'Deselect All'
                    : 'Select All Classes'}
                </button>
              )}
            </div>

            {loadingClasses ? (
              <div className="flex h-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Loading classes for selected session...
              </div>
            ) : yearClasses.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                No classes mapped to this Academic Session. Please configure classes in Academics first.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-36 overflow-y-auto p-1">
                {yearClasses.map((cls) => {
                  const isChecked = formData.classIds.includes(cls.id);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => handleToggleClass(cls.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-bold transition ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isChecked
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <span className="truncate">{cls.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                End Date *
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Description / Notes
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional guidelines or remarks for students and teachers"
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>Create Exam & Configure Flow</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE EXAM */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Examination Term"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All associated subjects, timetable schedules, marks, and calculated results will be permanently removed.`}
        confirmLabel="Delete Exam"
        onConfirm={handleDeleteExam}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default ExaminationMonitoring;

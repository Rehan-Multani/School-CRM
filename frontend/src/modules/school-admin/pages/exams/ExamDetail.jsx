import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { academicPortalApi, examPortalApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Edit,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  LayoutGrid,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { DetailPageSkeleton, SkeletonTable } from '../../components/ui/SkeletonLoader';

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';

export const ExamDetail = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { schoolAdmin } = useSchoolAdminAuth();
  const { showToast, ToastComponent } = useToast();

  const [exam, setExam] = useState(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [activeTab, setActiveTab] = useState('subjects');

  // Academic Reference Data for this exam
  const [examClasses, setExamClasses] = useState([]);
  const [sectionsByClass, setSectionsByClass] = useState({});

  // TAB 1: SUBJECTS
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [allMasterSubjects, setAllMasterSubjects] = useState([]);
  const [subjectForm, setSubjectForm] = useState({
    classId: '',
    subjectId: '',
    subjectName: '',
    subjectCode: '',
    maxMarks: 100,
    passingMarks: 33,
  });
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState(null);

  // TAB 2: SCHEDULE
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    classId: '',
    sectionId: '',
    subjectId: '',
    examDate: '',
    startTime: '09:00 AM',
    endTime: '12:00 PM',
    room: 'Hall 1',
    invigilatorName: '',
    maxMarks: 100,
  });
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState(null);

  // TAB 3: MARKS ENTRY
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [marksRoster, setMarksRoster] = useState([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [examSubjectMeta, setExamSubjectMeta] = useState(null);

  // TAB 4: RESULTS
  const [resultsClassId, setResultsClassId] = useState('');
  const [resultsSectionId, setResultsSectionId] = useState('');
  const [resultsList, setResultsList] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [calculatingResults, setCalculatingResults] = useState(false);
  const [reportCardData, setReportCardData] = useState(null);
  const [reportCardModalOpen, setReportCardModalOpen] = useState(false);

  // 1. Fetch Exam Details
  const loadExam = useCallback(async () => {
    setLoadingExam(true);
    try {
      const res = await examPortalApi.getExam(examId);
      const data = res.data;
      setExam(data);
      setExamClasses(data.classes || []);
      if (data.classes?.length > 0) {
        setSelectedClassId(data.classes[0].id);
        setResultsClassId(data.classes[0].id);
      }
    } catch (err) {
      showToast(apiMessage(err, 'Failed to load examination details'), 'error');
    } finally {
      setLoadingExam(false);
    }
  }, [examId, showToast]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  // Load sections when class changes
  const fetchSectionsForClass = useCallback(async (classId) => {
    if (!classId || sectionsByClass[classId]) return;
    try {
      const res = await academicPortalApi.sections({ classId, limit: 50 });
      setSectionsByClass((prev) => ({
        ...prev,
        [classId]: res.data || [],
      }));
    } catch {
      // ignore
    }
  }, [sectionsByClass]);

  useEffect(() => {
    if (selectedClassId) {
      fetchSectionsForClass(selectedClassId);
    }
  }, [selectedClassId, fetchSectionsForClass]);

  useEffect(() => {
    if (resultsClassId) {
      fetchSectionsForClass(resultsClassId);
    }
  }, [resultsClassId, fetchSectionsForClass]);

  // Auto-select first section when class changes
  useEffect(() => {
    const secs = sectionsByClass[selectedClassId] || [];
    if (secs.length > 0 && !selectedSectionId) {
      setSelectedSectionId(secs[0].id);
    }
  }, [selectedClassId, sectionsByClass, selectedSectionId]);

  useEffect(() => {
    const secs = sectionsByClass[resultsClassId] || [];
    if (secs.length > 0 && !resultsSectionId) {
      setResultsSectionId(secs[0].id);
    }
  }, [resultsClassId, sectionsByClass, resultsSectionId]);

  // ===================== TAB 1: SUBJECTS HANDLERS =====================
  const loadSubjects = useCallback(async () => {
    setLoadingSubjects(true);
    try {
      const res = await examPortalApi.subjects(examId);
      setSubjects(res.data || []);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to load exam subjects'), 'error');
    } finally {
      setLoadingSubjects(false);
    }
  }, [examId, showToast]);

  useEffect(() => {
    if (activeTab === 'subjects') {
      loadSubjects();
      // Load all master subjects for manual add
      academicPortalApi.subjects({ limit: 100 }).then((r) => setAllMasterSubjects(r.data || [])).catch(() => {});
    }
  }, [activeTab, loadSubjects]);

  const handleSeedSubjects = async () => {
    try {
      const res = await examPortalApi.seedSubjects(examId);
      showToast(res.message || 'Exam subjects synchronized from Academic setup!', 'success');
      loadSubjects();
    } catch (err) {
      showToast(apiMessage(err, 'Failed to auto-fetch subjects'), 'error');
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      const selectedSub = allMasterSubjects.find((s) => s.id === subjectForm.subjectId);
      await examPortalApi.addSubject(examId, {
        classId: subjectForm.classId,
        subjectId: subjectForm.subjectId,
        subjectName: selectedSub?.name || subjectForm.subjectName,
        subjectCode: selectedSub?.code || subjectForm.subjectCode,
        maxMarks: Number(subjectForm.maxMarks) || 100,
        passingMarks: Number(subjectForm.passingMarks) || 33,
      });
      showToast('Subject added to exam successfully!', 'success');
      setSubjectModalOpen(false);
      loadSubjects();
    } catch (err) {
      showToast(apiMessage(err, 'Failed to add subject'), 'error');
    }
  };

  const handleDeleteSubject = async () => {
    if (!deleteSubjectTarget) return;
    try {
      await examPortalApi.deleteSubject(examId, deleteSubjectTarget.id);
      showToast('Subject removed from exam', 'success');
      setDeleteSubjectTarget(null);
      loadSubjects();
    } catch (err) {
      showToast(apiMessage(err, 'Failed to remove subject'), 'error');
    }
  };

  // ===================== TAB 2: SCHEDULE HANDLERS =====================
  const loadSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    try {
      const res = await examPortalApi.schedule(examId);
      setSchedules(res.data || []);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to load timetable'), 'error');
    } finally {
      setLoadingSchedule(false);
    }
  }, [examId, showToast]);

  useEffect(() => {
    if (activeTab === 'schedule') {
      loadSchedule();
    }
  }, [activeTab, loadSchedule]);

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      await examPortalApi.createScheduleEntry(examId, {
        classId: scheduleForm.classId,
        sectionId: scheduleForm.sectionId || null,
        subjectId: scheduleForm.subjectId,
        examDate: scheduleForm.examDate,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        room: scheduleForm.room,
        invigilatorName: scheduleForm.invigilatorName,
        maxMarks: Number(scheduleForm.maxMarks) || 100,
      });
      showToast('Timetable slot added successfully!', 'success');
      setScheduleModalOpen(false);
      loadSchedule();
    } catch (err) {
      showToast(apiMessage(err, 'Failed to schedule exam'), 'error');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!deleteScheduleTarget) return;
    try {
      await examPortalApi.deleteScheduleEntry(examId, deleteScheduleTarget.id);
      showToast('Schedule slot removed', 'success');
      setDeleteScheduleTarget(null);
      loadSchedule();
    } catch (err) {
      showToast(apiMessage(err, 'Failed to delete slot'), 'error');
    }
  };

  // ===================== TAB 3: MARKS ENTRY HANDLERS =====================
  // Filtered subjects for the selected class in marks tab
  const classExamSubjects = useMemo(() => {
    return subjects.filter((s) => s.classId === selectedClassId);
  }, [subjects, selectedClassId]);

  useEffect(() => {
    if (classExamSubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(classExamSubjects[0].subjectId);
    }
  }, [classExamSubjects, selectedSubjectId]);

  const loadMarksSheet = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId || !selectedSubjectId) return;
    setLoadingMarks(true);
    try {
      const res = await examPortalApi.marksSheet(examId, {
        classId: selectedClassId,
        sectionId: selectedSectionId,
        subjectId: selectedSubjectId,
      });
      setExamSubjectMeta(res.data?.examSubject || null);
      setMarksRoster(res.data?.students || []);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to load marks roster'), 'error');
    } finally {
      setLoadingMarks(false);
    }
  }, [examId, selectedClassId, selectedSectionId, selectedSubjectId, showToast]);

  useEffect(() => {
    if (activeTab === 'marks') {
      loadSubjects();
      if (selectedClassId && selectedSectionId && selectedSubjectId) {
        loadMarksSheet();
      }
    }
  }, [activeTab, selectedClassId, selectedSectionId, selectedSubjectId, loadMarksSheet, loadSubjects]);

  const handleMarkChange = (studentId, field, value) => {
    setMarksRoster((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        if (field === 'attendanceStatus') {
          return {
            ...s,
            attendanceStatus: value,
            marksObtained: value === 'PRESENT' ? (s.marksObtained ?? '') : null,
          };
        }
        return { ...s, [field]: value };
      })
    );
  };

  const handleSaveMarks = async () => {
    if (!selectedClassId || !selectedSectionId || !selectedSubjectId) {
      showToast('Please select Class, Section, and Subject', 'warning');
      return;
    }
    setSavingMarks(true);
    try {
      const payload = {
        classId: selectedClassId,
        sectionId: selectedSectionId,
        subjectId: selectedSubjectId,
        marksList: marksRoster.map((s) => ({
          studentId: s.studentId,
          marksObtained: s.marksObtained,
          maxMarks: s.maxMarks,
          passingMarks: s.passingMarks,
          attendanceStatus: s.attendanceStatus,
          remarks: s.remarks,
        })),
      };
      const res = await examPortalApi.saveMarks(examId, payload);
      showToast(res.message || 'Marks saved successfully!', 'success');
      loadMarksSheet();
    } catch (err) {
      showToast(apiMessage(err, 'Failed to save marks'), 'error');
    } finally {
      setSavingMarks(false);
    }
  };

  // ===================== TAB 4: RESULTS HANDLERS =====================
  const loadResults = useCallback(async () => {
    if (!resultsClassId) return;
    setLoadingResults(true);
    try {
      const res = await examPortalApi.results(examId, {
        classId: resultsClassId,
        sectionId: resultsSectionId || undefined,
      });
      setResultsList(res.data || []);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to load results'), 'error');
    } finally {
      setLoadingResults(false);
    }
  }, [examId, resultsClassId, resultsSectionId, showToast]);

  useEffect(() => {
    if (activeTab === 'results') {
      loadResults();
    }
  }, [activeTab, resultsClassId, resultsSectionId, loadResults]);

  const handleCalculateResults = async () => {
    if (!resultsClassId || !resultsSectionId) {
      showToast('Please select Target Class and Section to calculate results', 'warning');
      return;
    }
    setCalculatingResults(true);
    try {
      const res = await examPortalApi.calculateResults(examId, {
        classId: resultsClassId,
        sectionId: resultsSectionId,
      });
      showToast(res.message || 'Results calculated successfully!', 'success');
      loadResults();
    } catch (err) {
      showToast(apiMessage(err, 'Failed to calculate results'), 'error');
    } finally {
      setCalculatingResults(false);
    }
  };

  const handleOpenReportCard = async (studentId) => {
    try {
      const res = await examPortalApi.reportCard(examId, studentId);
      setReportCardData(res.data);
      setReportCardModalOpen(true);
    } catch (err) {
      showToast(apiMessage(err, 'Failed to fetch student report card'), 'error');
    }
  };

  const handlePublishResults = async () => {
    try {
      await examPortalApi.updateExam(examId, { status: 'PUBLISHED' });
      showToast('Results officially published to Student & Parent Portals!', 'success');
      loadExam();
    } catch (err) {
      showToast(apiMessage(err, 'Failed to publish results'), 'error');
    }
  };

  if (loadingExam) {
    return <DetailPageSkeleton />;
  }

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h3 className="mt-3 text-lg font-bold text-slate-800 dark:text-white">Exam Not Found</h3>
        <button
          onClick={() => navigate('/school-admin/exams')}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Examinations
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div>
        <Link
          to="/school-admin/exams"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to All Exams
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {exam.name}
              </h1>
              <Badge
                variant={
                  exam.status === 'PUBLISHED'
                    ? 'success'
                    : exam.status === 'COMPLETED'
                    ? 'default'
                    : 'warning'
                }
              >
                {exam.status}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                <CalendarDays className="h-3 w-3" /> {exam.session}
              </span>
              <span>•</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Type: {exam.examType.replace('_', ' ')}
              </span>
              <span>•</span>
              <span>
                {new Date(exam.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                —{' '}
                {new Date(exam.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {exam.classes?.map((c) => c.name).join(', ') || 'All Classes'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {exam.status !== 'PUBLISHED' ? (
              <button
                type="button"
                onClick={handlePublishResults}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <Send className="h-3.5 w-3.5" /> Publish Results to Portal
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Live in Student & Parent Portals
              </span>
            )}
          </div>
        </div>
      </div>

      {/* TABS */}
      <Tabs
        tabs={[
          { id: 'subjects', label: '1. Exam Subjects', count: subjects.length },
          { id: 'schedule', label: '2. Exam Schedule', count: schedules.length },
          { id: 'marks', label: '3. Teacher Marks Entry' },
          { id: 'results', label: '4. Results & Report Cards', count: resultsList.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* ==================== TAB 1: SUBJECTS ==================== */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Exam Subjects Master</h3>
              <p className="text-xs text-slate-500">
                Configure Max & Passing Marks for each subject per class.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSeedSubjects}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
              >
                <Sparkles className="h-3.5 w-3.5" /> Auto-fetch from Academic Setup
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubjectForm({
                    classId: examClasses[0]?.id || '',
                    subjectId: allMasterSubjects[0]?.id || '',
                    subjectName: allMasterSubjects[0]?.name || '',
                    subjectCode: allMasterSubjects[0]?.code || '',
                    maxMarks: 100,
                    passingMarks: 33,
                  });
                  setSubjectModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add Subject
              </button>
            </div>
          </div>

          {loadingSubjects ? (
            <SkeletonTable rows={4} columns={5} />
          ) : subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
              <BookOpen className="h-10 w-10 text-slate-300" />
              <h4 className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                No Subjects Attached to this Exam
              </h4>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                Click "Auto-fetch from Academic Setup" to populate mapped subjects automatically.
              </p>
              <button
                type="button"
                onClick={handleSeedSubjects}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
              >
                <Sparkles className="h-3.5 w-3.5" /> Auto-fetch Subjects Now
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Subject Name</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3 text-right">Max Marks</th>
                    <th className="px-4 py-3 text-right">Passing Marks</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                  {subjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                        {sub.className}
                      </td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-black text-[11px] dark:bg-indigo-950/50 dark:text-indigo-400">
                          {sub.subjectName[0]}
                        </span>
                        {sub.subjectName}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono">{sub.subjectCode || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                        {sub.maxMarks}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        {sub.passingMarks}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteSubjectTarget(sub)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: SCHEDULE ==================== */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Exam Timetable & Schedule</h3>
              <p className="text-xs text-slate-500">
                Manage subject dates, time slots, exam halls, and invigilator assignments.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setScheduleForm({
                  classId: examClasses[0]?.id || '',
                  sectionId: '',
                  subjectId: subjects[0]?.subjectId || '',
                  examDate: '',
                  startTime: '09:00 AM',
                  endTime: '12:00 PM',
                  room: 'Hall 1',
                  invigilatorName: '',
                  maxMarks: 100,
                });
                setScheduleModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add Timetable Slot
            </button>
          </div>

          {loadingSchedule ? (
            <SkeletonTable rows={4} columns={5} />
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
              <Calendar className="h-10 w-10 text-slate-300" />
              <h4 className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                No Timetable Slots Created
              </h4>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                Create exam dates and start/end times for each subject to share with students.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {schedules.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        <GraduationCap className="h-3 w-3" /> {item.className}
                        {item.sectionName !== 'All Sections' ? ` (${item.sectionName})` : ''}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {item.subjectName}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteScheduleTarget(item)}
                      className="rounded-lg p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold">
                        {new Date(item.examDate).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        {item.startTime} — {item.endTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" /> {item.room}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Max: {item.maxMarks}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: MARKS ENTRY ==================== */}
      {activeTab === 'marks' && (
        <div className="space-y-4">
          {/* Selector Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-3">
              {/* Select Class */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Class:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionId('');
                    setSelectedSubjectId('');
                  }}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
                >
                  {examClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Section */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Section:</span>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
                >
                  {(sectionsByClass[selectedClassId] || []).map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Subject */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Subject:</span>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
                >
                  {classExamSubjects.map((sub) => (
                    <option key={sub.subjectId} value={sub.subjectId}>
                      {sub.subjectName} (Max {sub.maxMarks})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadMarksSheet}
                className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                title="Refresh Roster"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingMarks ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleSaveMarks}
                disabled={savingMarks || marksRoster.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingMarks ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Save Subject Marks</span>
              </button>
            </div>
          </div>

          {/* Marks Entry Table */}
          {loadingMarks ? (
            <SkeletonTable rows={5} columns={6} />
          ) : marksRoster.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Users className="h-10 w-10 text-slate-300" />
              <h4 className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                No Enrolled Students Found
              </h4>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                Please verify students are active and enrolled in the selected Section.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center">Roll</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Admission No</th>
                    <th className="px-4 py-3 w-36">Attendance</th>
                    <th className="px-4 py-3 w-28 text-center">Max Marks</th>
                    <th className="px-4 py-3 w-36 text-center">Marks Obtained</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                  {marksRoster.map((row) => (
                    <tr
                      key={row.studentId}
                      className={
                        row.attendanceStatus !== 'PRESENT'
                          ? 'bg-amber-50/40 dark:bg-amber-950/10'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {row.rollNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white font-bold">
                        {row.studentName}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{row.admissionNumber}</td>
                      <td className="px-4 py-3">
                        <select
                          value={row.attendanceStatus}
                          onChange={(e) =>
                            handleMarkChange(row.studentId, 'attendanceStatus', e.target.value)
                          }
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="PRESENT">Present</option>
                          <option value="ABSENT">Absent</option>
                          <option value="MEDICAL">Medical</option>
                          <option value="EXEMPTED">Exempted</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-500">
                        {row.maxMarks}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={row.maxMarks}
                          value={row.attendanceStatus === 'PRESENT' ? (row.marksObtained ?? '') : ''}
                          disabled={row.attendanceStatus !== 'PRESENT'}
                          onChange={(e) =>
                            handleMarkChange(row.studentId, 'marksObtained', e.target.value)
                          }
                          placeholder={row.attendanceStatus !== 'PRESENT' ? row.attendanceStatus : '0'}
                          className="h-8 w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 text-center text-xs font-bold text-slate-900 outline-none focus:border-primary focus:bg-white disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.remarks || ''}
                          onChange={(e) => handleMarkChange(row.studentId, 'remarks', e.target.value)}
                          placeholder="Optional feedback..."
                          className="h-8 w-full max-w-xs rounded-lg border border-slate-200 bg-transparent px-2 text-xs font-normal outline-none focus:border-primary dark:border-slate-800 dark:text-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 4: RESULTS & REPORT CARDS ==================== */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Class:</span>
                <select
                  value={resultsClassId}
                  onChange={(e) => {
                    setResultsClassId(e.target.value);
                    setResultsSectionId('');
                  }}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
                >
                  {examClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Section:</span>
                <select
                  value={resultsSectionId}
                  onChange={(e) => setResultsSectionId(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
                >
                  {(sectionsByClass[resultsClassId] || []).map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadResults}
                className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                title="Refresh Results"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingResults ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleCalculateResults}
                disabled={calculatingResults || !resultsClassId || !resultsSectionId}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {calculatingResults ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Award className="h-3.5 w-3.5" />
                )}
                <span>Compute Final Results</span>
              </button>
            </div>
          </div>

          {loadingResults ? (
            <SkeletonTable rows={5} columns={6} />
          ) : resultsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Award className="h-10 w-10 text-slate-300" />
              <h4 className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                No Results Computed Yet
              </h4>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                Click "Compute Final Results" after marks have been entered to calculate aggregates, percentage, and ranks.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center">Rank</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Admission No</th>
                    <th className="px-4 py-3 text-right">Total Score</th>
                    <th className="px-4 py-3 text-right">Percentage</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                    <th className="px-4 py-3 text-center">Outcome</th>
                    <th className="px-4 py-3 text-right">Report Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                  {resultsList.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-center font-black">
                        {res.rank > 0 ? (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                              res.rank === 1
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : res.rank === 2
                                ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                : res.rank === 3
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            #{res.rank}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white font-bold">
                        {res.studentName}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{res.admissionNumber}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                        {res.totalMarks} / {res.maxTotalMarks}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-indigo-600 dark:text-indigo-400">
                        {res.percentage}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {res.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            res.result === 'PASS'
                              ? 'success'
                              : res.result === 'COMPARTMENT'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {res.result}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenReportCard(res.studentId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                        >
                          <FileText className="h-3 w-3" /> Report Card
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODAL 1: ADD SUBJECT ==================== */}
      <Modal
        isOpen={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title="Add Subject to Examination"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Class *
            </label>
            <select
              value={subjectForm.classId}
              onChange={(e) => setSubjectForm({ ...subjectForm, classId: e.target.value })}
              required
              className={inputClass}
            >
              {examClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Subject *
            </label>
            <select
              value={subjectForm.subjectId}
              onChange={(e) => setSubjectForm({ ...subjectForm, subjectId: e.target.value })}
              required
              className={inputClass}
            >
              {allMasterSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code || 'SUB'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Max Marks *
              </label>
              <input
                type="number"
                min="1"
                required
                value={subjectForm.maxMarks}
                onChange={(e) => setSubjectForm({ ...subjectForm, maxMarks: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Passing Marks *
              </label>
              <input
                type="number"
                min="0"
                required
                value={subjectForm.passingMarks}
                onChange={(e) => setSubjectForm({ ...subjectForm, passingMarks: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSubjectModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add Subject
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================== MODAL 2: ADD TIMETABLE SLOT ==================== */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Add Exam Timetable Slot"
      >
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Class *
              </label>
              <select
                value={scheduleForm.classId}
                onChange={(e) => {
                  setScheduleForm({ ...scheduleForm, classId: e.target.value });
                  fetchSectionsForClass(e.target.value);
                }}
                required
                className={inputClass}
              >
                {examClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Section (Optional)
              </label>
              <select
                value={scheduleForm.sectionId}
                onChange={(e) => setScheduleForm({ ...scheduleForm, sectionId: e.target.value })}
                className={inputClass}
              >
                <option value="">All Sections</option>
                {(sectionsByClass[scheduleForm.classId] || []).map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Section {sec.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Subject *
            </label>
            <select
              value={scheduleForm.subjectId}
              onChange={(e) => setScheduleForm({ ...scheduleForm, subjectId: e.target.value })}
              required
              className={inputClass}
            >
              {subjects
                .filter((s) => !scheduleForm.classId || s.classId === scheduleForm.classId)
                .map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>
                    {s.subjectName} ({s.className})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Exam Date *
            </label>
            <input
              type="date"
              required
              value={scheduleForm.examDate}
              onChange={(e) => setScheduleForm({ ...scheduleForm, examDate: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Start Time *
              </label>
              <input
                type="text"
                required
                value={scheduleForm.startTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                placeholder="09:00 AM"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                End Time *
              </label>
              <input
                type="text"
                required
                value={scheduleForm.endTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                placeholder="12:00 PM"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Room / Hall
              </label>
              <input
                type="text"
                value={scheduleForm.room}
                onChange={(e) => setScheduleForm({ ...scheduleForm, room: e.target.value })}
                placeholder="e.g. Hall 1, Room 102"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Invigilator Name
              </label>
              <input
                type="text"
                value={scheduleForm.invigilatorName}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, invigilatorName: e.target.value })
                }
                placeholder="e.g. Mr. Sharma"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setScheduleModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add Slot
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================== MODAL 3: OFFICIAL REPORT CARD ==================== */}
      {reportCardData && (
        <Modal
          isOpen={reportCardModalOpen}
          onClose={() => setReportCardModalOpen(false)}
          title="Official Student Report Card"
          size="lg"
        >
          <div className="space-y-6">
            {/* Printable Container */}
            <div
              id="report-card-print"
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              {/* School Header */}
              <div className="border-b-2 border-slate-800 pb-4 text-center dark:border-slate-200">
                <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {schoolAdmin?.schoolName || 'Greenfield Public Senior Secondary School'}
                </h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  Academic Report & Performance Evaluation
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white">
                  <span>{reportCardData.exam.name}</span>
                  <span>•</span>
                  <span>Session {reportCardData.exam.session}</span>
                </div>
              </div>

              {/* Student Metadata Box */}
              <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Student Name</span>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {reportCardData.student.name}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Roll Number</span>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {reportCardData.student.rollNumber}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Class & Section</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {reportCardData.student.className} — {reportCardData.student.sectionName}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Admission No</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {reportCardData.student.admissionNumber}
                  </p>
                </div>
              </div>

              {/* Subject Breakdown Table */}
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 text-xs dark:border-slate-800">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-100 font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="px-3.5 py-2.5">Subject</th>
                      <th className="px-3.5 py-2.5 text-right">Max</th>
                      <th className="px-3.5 py-2.5 text-right">Passing</th>
                      <th className="px-3.5 py-2.5 text-right">Obtained</th>
                      <th className="px-3.5 py-2.5 text-center">Grade</th>
                      <th className="px-3.5 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold dark:divide-slate-800">
                    {reportCardData.result.subjectResults.map((sub, idx) => (
                      <tr key={idx}>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white">
                          {sub.subjectName}
                        </td>
                        <td className="px-3.5 py-2.5 text-right text-slate-500">{sub.maxMarks}</td>
                        <td className="px-3.5 py-2.5 text-right text-slate-500">{sub.passingMarks}</td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 dark:text-white">
                          {sub.attendanceStatus === 'PRESENT' ? sub.marksObtained : sub.attendanceStatus}
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-bold">{sub.grade}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-black ${
                              sub.isPassed
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {sub.isPassed ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Performance Banner */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/40">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-500">Aggregate Score</span>
                  <p className="text-lg font-black text-indigo-900 dark:text-indigo-200">
                    {reportCardData.result.totalMarks} / {reportCardData.result.maxTotalMarks}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-500">Percentage</span>
                  <p className="text-lg font-black text-indigo-900 dark:text-indigo-200">
                    {reportCardData.result.percentage}%
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-500">Class Rank</span>
                  <p className="text-lg font-black text-indigo-900 dark:text-indigo-200">
                    #{reportCardData.result.rank || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-500">Final Outcome</span>
                  <p
                    className={`text-lg font-black ${
                      reportCardData.result.outcome === 'PASS' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {reportCardData.result.outcome}
                  </p>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-8 flex items-end justify-between pt-8 text-center text-xs font-bold text-slate-500">
                <div className="w-32 border-t border-slate-400 pt-1">Class Teacher</div>
                <div className="w-32 border-t border-slate-400 pt-1">Exam Controller</div>
                <div className="w-32 border-t border-slate-400 pt-1">Principal</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportCardModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
              >
                <Printer className="h-3.5 w-3.5" /> Print Official Report Card
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRM DELETE SUBJECT */}
      <ConfirmDialog
        isOpen={Boolean(deleteSubjectTarget)}
        title="Remove Subject from Exam"
        message={`Are you sure you want to remove ${deleteSubjectTarget?.subjectName} for ${deleteSubjectTarget?.className}?`}
        confirmLabel="Remove Subject"
        onConfirm={handleDeleteSubject}
        onCancel={() => setDeleteSubjectTarget(null)}
        variant="danger"
      />

      {/* CONFIRM DELETE SCHEDULE */}
      <ConfirmDialog
        isOpen={Boolean(deleteScheduleTarget)}
        title="Delete Timetable Slot"
        message={`Are you sure you want to delete the exam schedule for ${deleteScheduleTarget?.subjectName} (${deleteScheduleTarget?.className})?`}
        confirmLabel="Delete Slot"
        onConfirm={handleDeleteSchedule}
        onCancel={() => setDeleteScheduleTarget(null)}
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default ExamDetail;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { academicPortalApi } from '../../../../shared/api/client';
import { AcademicBreadcrumb, EmptyState } from './components/AcademicUi';
import { apiMessage, ENTITY_STATUS_VARIANT } from './utils';
import {
  BookOpen,
  Plus,
  Trash2,
  Loader2,
  Search,
  RotateCcw,
  Pencil,
  Download,
  FileUp,
  Upload,
  GraduationCap,
  Layers,
  UserCheck,
  UserX,
  Star,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X
} from 'lucide-react';

const PAGE_SIZE = 5;

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const selectClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAssignmentsCSV(assignments) {
  const rows = [
    'Academic Year,Class,Section,Subject Code,Subject Name,Subject Type,Assigned Teacher,Teacher Department,Teacher Email,Max Marks,Passing Marks,Status',
    ...assignments.map((a) =>
      [
        `"${a.academicYear?.name || ''}"`,
        `"${a.class?.name || ''}"`,
        `"${a.section?.name || ''}"`,
        `"${a.subject?.code || ''}"`,
        `"${a.subject?.name || ''}"`,
        `"${a.subject?.subjectType || 'THEORY'}"`,
        `"${a.teacher?.name || 'Vacant / Unassigned'}"`,
        `"${a.teacher?.department || ''}"`,
        `"${a.teacher?.email || ''}"`,
        `"${a.maxMarks ?? 100}"`,
        `"${a.passingMarks ?? 33}"`,
        `"${a.status || 'ACTIVE'}"`,
      ].join(',')
    ),
  ];
  downloadFile(rows.join('\n'), 'subject_assignments.csv', 'text/csv');
}

const CSV_SAMPLE = `Academic Year,Class,Section,Subject Code,Teacher Email,Max Marks,Passing Marks
2025-26,Class 1,A,MATH,teacher@school.edu,100,33
2025-26,Class 1,A,ENG,,100,33
2025-26,Class 1,B,SCI,,100,33`;

function downloadSampleCSV() {
  downloadFile(CSV_SAMPLE, 'subject_assignments_sample.csv', 'text/csv');
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i] || ''));
    return {
      academicYear: row['academic year'] || row.academicyear || row.year || '',
      className: row['class'] || row.classname || row['class name'] || '',
      sectionName: row['section'] || row.sectionname || row['section name'] || '',
      subjectCode: row['subject code'] || row.subjectcode || row.code || row.subject || '',
      teacherEmail: row['teacher email'] || row.teacheremail || row.teacher || '',
      maxMarks: Number(row['max marks'] || row.maxmarks || 100) || 100,
      passingMarks: Number(row['passing marks'] || row.passingmarks || 33) || 33,
    };
  }).filter((r) => r.className && r.sectionName && r.subjectCode);
}

export const SubjectAssignments = () => {
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef();

  // Reference data
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // All Assignments data from API
  const [assignments, setAssignments] = useState([]);

  // Pagination state
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form for Assign Subject Modal
  const [assignForm, setAssignForm] = useState({
    academicYearId: '',
    classId: '',
    sectionId: '',
    subjectId: '',
    teacherId: '',
    maxMarks: 100,
    passingMarks: 33,
    isOptional: false,
    status: 'ACTIVE',
  });

  // Form for Edit Modal
  const [editForm, setEditForm] = useState({
    teacherId: '',
    maxMarks: 100,
    passingMarks: 33,
    isOptional: false,
    status: 'ACTIVE',
  });

  // Load all reference data and all assignments
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [yearRes, classRes, sectionRes, subjectRes, teacherRes, assignRes] = await Promise.all([
        academicPortalApi.years({ limit: 100 }),
        academicPortalApi.classes({ limit: 100 }),
        academicPortalApi.sections({ limit: 1000 }),
        academicPortalApi.subjects({ limit: 1000 }),
        academicPortalApi.teachers({ limit: 1000 }),
        academicPortalApi.allSectionSubjects(),
      ]);

      const yearsData = yearRes.data || [];
      const classesData = (classRes.data || []).filter((c) => c.status === 'ACTIVE');
      const sectionsData = (sectionRes.data || []).filter((s) => s.status === 'ACTIVE');
      const subjectsData = (subjectRes.data || []).filter((s) => s.status === 'ACTIVE');
      const teachersData = (teacherRes.data || []).filter((t) => t.status === 'ACTIVE');

      setYears(yearsData);
      setClasses(classesData);
      setSections(sectionsData);
      setSubjects(subjectsData);
      setTeachers(teachersData);
      setAssignments(assignRes.data || []);

      const activeYear = yearsData.find((y) => y.isCurrent || y.status === 'ACTIVE');
      if (activeYear) {
        setAssignForm((prev) => (prev.academicYearId ? prev : { ...prev, academicYearId: activeYear.id }));
      }
    } catch (error) {
      showToast(apiMessage(error, 'Failed to load subject assignments'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload assignments list after updates
  const refreshAssignments = useCallback(async () => {
    try {
      const res = await academicPortalApi.allSectionSubjects();
      setAssignments(res.data || []);
    } catch (error) {
      showToast(apiMessage(error, 'Failed to refresh subject assignments'), 'error');
    }
  }, [showToast]);

  // Fast lookups
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const sectionMap = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);
  const yearMap = useMemo(() => new Map(years.map((y) => [y.id, y])), [years]);

  // Dynamic sections available for filtering based on class and year filter
  const filteredSectionsForFilter = useMemo(() => {
    return sections.filter((s) => {
      if (yearFilter !== 'ALL' && s.academicYearId !== yearFilter) return false;
      if (classFilter !== 'ALL' && s.classId !== classFilter) return false;
      return true;
    });
  }, [sections, yearFilter, classFilter]);

  // Dynamic sections available in Assign Modal
  const modalSections = useMemo(() => {
    if (!assignForm.classId) return [];
    return sections.filter((s) => {
      if (assignForm.academicYearId && s.academicYearId !== assignForm.academicYearId) return false;
      return s.classId === assignForm.classId;
    });
  }, [sections, assignForm.classId, assignForm.academicYearId]);

  // Filtered assignments list for display
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      if (yearFilter !== 'ALL' && item.academicYearId !== yearFilter) return false;
      if (classFilter !== 'ALL' && item.classId !== classFilter) return false;
      if (sectionFilter !== 'ALL' && item.sectionId !== sectionFilter) return false;
      if (subjectFilter !== 'ALL' && item.subjectId !== subjectFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      if (teacherFilter === 'ASSIGNED' && !item.teacherId) return false;
      if (teacherFilter === 'VACANT' && item.teacherId) return false;
      if (teacherFilter !== 'ALL' && teacherFilter !== 'ASSIGNED' && teacherFilter !== 'VACANT' && item.teacherId !== teacherFilter) {
        return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const subName = (item.subject?.name || subjectMap.get(item.subjectId)?.name || '').toLowerCase();
        const subCode = (item.subject?.code || subjectMap.get(item.subjectId)?.code || '').toLowerCase();
        const clsName = (item.class?.name || classMap.get(item.classId)?.name || '').toLowerCase();
        const secName = (item.section?.name || sectionMap.get(item.sectionId)?.name || '').toLowerCase();
        const tName = (item.teacher?.name || teacherMap.get(item.teacherId)?.name || '').toLowerCase();
        const tDept = (item.teacher?.department || teacherMap.get(item.teacherId)?.department || '').toLowerCase();
        const tEmail = (item.teacher?.email || teacherMap.get(item.teacherId)?.email || '').toLowerCase();
        const yName = (item.academicYear?.name || yearMap.get(item.academicYearId)?.name || '').toLowerCase();

        const match =
          subName.includes(q) ||
          subCode.includes(q) ||
          clsName.includes(q) ||
          secName.includes(q) ||
          tName.includes(q) ||
          tDept.includes(q) ||
          tEmail.includes(q) ||
          yName.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    assignments,
    yearFilter,
    classFilter,
    sectionFilter,
    subjectFilter,
    teacherFilter,
    statusFilter,
    search,
    subjectMap,
    classMap,
    sectionMap,
    teacherMap,
    yearMap,
  ]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = assignments.length;
    const uniqueClasses = new Set(assignments.map((a) => a.classId)).size;
    const uniqueSections = new Set(assignments.map((a) => a.sectionId)).size;
    const assignedCount = assignments.filter((a) => Boolean(a.teacherId)).length;
    const vacantCount = assignments.filter((a) => !a.teacherId).length;

    return {
      total,
      classesCovered: uniqueClasses,
      sectionsCovered: uniqueSections,
      assignedCount,
      vacantCount,
    };
  }, [assignments]);

  // Status Counts
  const statusCounts = useMemo(() => {
    return {
      ALL: assignments.length,
      ACTIVE: assignments.filter((a) => (a.status || 'ACTIVE') === 'ACTIVE').length,
      INACTIVE: assignments.filter((a) => a.status === 'INACTIVE').length,
    };
  }, [assignments]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setYearFilter('ALL');
    setClassFilter('ALL');
    setSectionFilter('ALL');
    setTeacherFilter('ALL');
    setSubjectFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search) ||
    yearFilter !== 'ALL' ||
    classFilter !== 'ALL' ||
    sectionFilter !== 'ALL' ||
    teacherFilter !== 'ALL' ||
    subjectFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  // Inline Teacher Assignment change
  const handleInlineTeacherChange = async (assignmentId, teacherId) => {
    setBusy(true);
    try {
      await academicPortalApi.updateSectionSubject(assignmentId, {
        teacherId: teacherId || null,
      });
      showToast('Assigned teacher updated successfully', 'success');
      await refreshAssignments();
    } catch (error) {
      showToast(apiMessage(error, 'Failed to update teacher assignment'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Open Assign Modal with default/reset state
  const handleOpenAssignModal = () => {
    const activeYear = years.find((y) => y.isCurrent || y.status === 'ACTIVE');
    const defaultYearId = yearFilter !== 'ALL' ? yearFilter : activeYear ? activeYear.id : years[0]?.id || '';
    const defaultClassId = classFilter !== 'ALL' ? classFilter : classes[0]?.id || '';
    const matchingSections = sections.filter((s) => s.academicYearId === defaultYearId && s.classId === defaultClassId);
    const defaultSectionId = sectionFilter !== 'ALL' ? sectionFilter : matchingSections[0]?.id || '';

    setAssignForm({
      academicYearId: defaultYearId,
      classId: defaultClassId,
      sectionId: defaultSectionId,
      subjectId: '',
      teacherId: '',
      maxMarks: 100,
      passingMarks: 33,
      isOptional: false,
      status: 'ACTIVE',
    });
    setAssignModalOpen(true);
  };

  // Submit Assign Subject
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignForm.sectionId || !assignForm.subjectId) {
      showToast('Please select Class, Section, and Subject', 'warning');
      return;
    }
    setBusy(true);
    try {
      await academicPortalApi.addSectionSubject(assignForm.sectionId, {
        subjectId: assignForm.subjectId,
        teacherId: assignForm.teacherId || null,
        maxMarks: Number(assignForm.maxMarks) || 100,
        passingMarks: Number(assignForm.passingMarks) || 33,
        isOptional: Boolean(assignForm.isOptional),
        status: assignForm.status || 'ACTIVE',
      });
      showToast('Subject successfully assigned to section', 'success');
      setAssignModalOpen(false);
      await refreshAssignments();
    } catch (error) {
      showToast(apiMessage(error, 'Failed to assign subject'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (assignment) => {
    setEditingAssignment(assignment);
    setEditForm({
      teacherId: assignment.teacherId || '',
      maxMarks: assignment.maxMarks ?? 100,
      passingMarks: assignment.passingMarks ?? 33,
      isOptional: Boolean(assignment.isOptional),
      status: assignment.status || 'ACTIVE',
    });
    setEditModalOpen(true);
  };

  // Save Edit Assignment
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAssignment) return;
    setBusy(true);
    try {
      await academicPortalApi.updateSectionSubject(editingAssignment.id, {
        teacherId: editForm.teacherId || null,
        maxMarks: Number(editForm.maxMarks) || 100,
        passingMarks: Number(editForm.passingMarks) || 33,
        isOptional: Boolean(editForm.isOptional),
        status: editForm.status || 'ACTIVE',
      });
      showToast('Subject assignment updated successfully', 'success');
      setEditModalOpen(false);
      setEditingAssignment(null);
      await refreshAssignments();
    } catch (error) {
      showToast(apiMessage(error, 'Failed to update assignment'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await academicPortalApi.deleteSectionSubject(deleteTarget.id);
      showToast('Subject assignment removed successfully', 'success');
      setDeleteTarget(null);
      await refreshAssignments();
    } catch (error) {
      showToast(apiMessage(error, 'Failed to remove subject assignment'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // CSV Import handler
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (parsed.length === 0) {
        showToast('No valid assignment rows found in file', 'error');
        return;
      }

      setImporting(true);
      let success = 0;
      let failed = 0;

      for (const row of parsed) {
        try {
          const matchedClass = classes.find(
            (c) => c.name.toLowerCase() === row.className.toLowerCase()
          );
          if (!matchedClass) {
            failed++;
            continue;
          }

          let matchedYear = null;
          if (row.academicYear) {
            matchedYear = years.find(
              (y) => y.name.toLowerCase() === row.academicYear.toLowerCase() || (y.code && y.code.toLowerCase() === row.academicYear.toLowerCase())
            );
          }
          if (!matchedYear) {
            matchedYear = years.find((y) => y.isCurrent || y.status === 'ACTIVE') || years[0];
          }

          const matchedSection = sections.find((s) => {
            if (matchedYear && s.academicYearId !== matchedYear.id) return false;
            if (s.classId !== matchedClass.id) return false;
            return s.name.toLowerCase() === row.sectionName.toLowerCase();
          });
          if (!matchedSection) {
            failed++;
            continue;
          }

          const matchedSubject = subjects.find(
            (sub) =>
              (sub.code && sub.code.toLowerCase() === row.subjectCode.toLowerCase()) ||
              sub.name.toLowerCase() === row.subjectCode.toLowerCase()
          );
          if (!matchedSubject) {
            failed++;
            continue;
          }

          let matchedTeacher = null;
          if (row.teacherEmail) {
            matchedTeacher = teachers.find(
              (t) =>
                (t.email && t.email.toLowerCase() === row.teacherEmail.toLowerCase()) ||
                t.name.toLowerCase() === row.teacherEmail.toLowerCase()
            );
          }

          await academicPortalApi.addSectionSubject(matchedSection.id, {
            subjectId: matchedSubject.id,
            teacherId: matchedTeacher ? matchedTeacher.id : null,
            maxMarks: row.maxMarks || 100,
            passingMarks: row.passingMarks || 33,
            isOptional: false,
            status: 'ACTIVE',
          });

          success++;
        } catch {
          failed++;
        }
      }

      setImporting(false);
      showToast(
        `${success} subject assignments imported${failed ? `, ${failed} failed` : ''}`,
        success > 0 ? 'success' : 'error'
      );
      if (success > 0) refreshAssignments();
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <AcademicBreadcrumb items={[{ label: 'Subject Assignments' }]} />

      {/* Page Header */}
      <PageHeader
        title="Subject Assignments"
        subtitle="Manage subject allocations, teachers, and evaluation criteria across all class sections."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Sample CSV */}
            <button
              type="button"
              onClick={downloadSampleCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <Download className="h-3.5 w-3.5" /> Sample CSV
            </button>

            {/* Import CSV */}
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 disabled:opacity-60"
            >
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Import
            </button>
            <input ref={importRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportFile} />

            {/* Export CSV */}
            {assignments.length > 0 && (
              <button
                type="button"
                onClick={() => exportAssignmentsCSV(filteredAssignments.length > 0 ? filteredAssignments : assignments)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <FileUp className="h-3.5 w-3.5" /> Export
              </button>
            )}

            {/* Create / Assign Subject */}
            <button
              type="button"
              onClick={handleOpenAssignModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-all shadow-xs shadow-primary/20"
            >
              <Plus className="h-3.5 w-3.5" /> Assign Subject
            </button>
          </div>
        }
      />

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Assignments</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-600 dark:text-indigo-400">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Classes Covered</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{stats.classesCovered}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-600 dark:text-sky-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sections Mapped</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{stats.sectionsCovered}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Teachers Assigned</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.assignedCount}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div
            className={`rounded-xl p-2.5 ${
              stats.vacantCount > 0
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
          >
            <UserX className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vacant Slots</p>
            <p
              className={`text-xl font-extrabold ${
                stats.vacantCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {stats.vacantCount}
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        {/* Status Filter Tabs */}
        {assignments.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 shrink-0 select-none">Status:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'All Assignments', count: statusCounts.ALL },
                  { id: 'ACTIVE', label: 'Active', count: statusCounts.ACTIVE },
                  { id: 'INACTIVE', label: 'Inactive', count: statusCounts.INACTIVE },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(item.id);
                      setPage(1);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                      statusFilter === item.id
                        ? 'bg-primary text-white shadow-sm shadow-primary/20'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}{' '}
                    <span
                      className={`ml-1 text-[10px] ${
                        statusFilter === item.id ? 'opacity-80' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      ({item.count})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* Filters Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Subject, Code, Class, Teacher..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3.5 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Academic Year Filter */}
          <div>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setSectionFilter('ALL');
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="ALL">All Academic Years</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setSectionFilter('ALL');
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="ALL">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={sectionFilter}
              onChange={(e) => {
                setSectionFilter(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="ALL">All Sections</option>
              {filteredSectionsForFilter.map((s) => {
                const cls = classMap.get(s.classId);
                return (
                  <option key={s.id} value={s.id}>
                    {cls ? `${cls.name} - ` : ''}
                    {s.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Teacher / Allocation Filter */}
          <div>
            <select
              value={teacherFilter}
              onChange={(e) => {
                setTeacherFilter(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="ALL">All Teachers</option>
              <option value="ASSIGNED">Assigned Only</option>
              <option value="VACANT">Vacant / Unassigned</option>
              <option disabled>──────────</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.department || 'Faculty'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Subject Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Subject Filter:</span>
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 text-xs outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.code ? `(${sub.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-700 dark:text-slate-200">{filteredAssignments.length}</strong> of{' '}
            {assignments.length} assignments
          </span>
        </div>
      </div>

      {/* Main Table / Skeleton / Empty State */}
      {loading ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="w-12 px-3.5 py-3 text-center">#</th>
                <th className="px-3.5 py-3">Class & Section</th>
                <th className="px-3.5 py-3">Subject</th>
                <th className="px-3.5 py-3">Assigned Teacher</th>
                <th className="px-3.5 py-3">Evaluation</th>
                <th className="px-3.5 py-3">Academic Year</th>
                <th className="px-3.5 py-3">Status</th>
                <th className="px-3.5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="w-12 px-3.5 py-3 text-center">
                    <div className="mx-auto h-3.5 w-4 rounded bg-slate-100 dark:bg-slate-800" />
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="h-4 w-28 rounded bg-slate-100 dark:bg-slate-800" />
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="h-4 w-32 rounded bg-slate-100 dark:bg-slate-800" />
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="h-4 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="h-4 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <div className="ml-auto h-7 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          title="No Subject Assignments Found"
          description="Assign subjects to class sections to define the curriculum and allocate teachers."
          action={
            <button
              type="button"
              onClick={handleOpenAssignModal}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
            >
              Assign First Subject
            </button>
          }
        />
      ) : filteredAssignments.length === 0 ? (
        <div className="flex min-h-[20vh] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium">No subject assignments match your filters</p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-primary underline font-semibold"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="w-12 px-3.5 py-3 text-center">#</th>
                  <th className="px-3.5 py-3">Class & Section</th>
                  <th className="px-3.5 py-3">Subject</th>
                  <th className="px-3.5 py-3">Assigned Teacher</th>
                  <th className="px-3.5 py-3">Evaluation</th>
                  <th className="px-3.5 py-3">Academic Year</th>
                  <th className="px-3.5 py-3">Status</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-800 dark:text-slate-200">
                {filteredAssignments
                  .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                  .map((assignment, index) => {
                    const serialNo = (page - 1) * PAGE_SIZE + index + 1;
                    const sub = assignment.subject || subjectMap.get(assignment.subjectId);
                    const cls = assignment.class || classMap.get(assignment.classId);
                    const sec = assignment.section || sectionMap.get(assignment.sectionId);
                    const yr = assignment.academicYear || yearMap.get(assignment.academicYearId);
                    const tch = assignment.teacher || teacherMap.get(assignment.teacherId);

                    return (
                      <tr
                        key={assignment.id}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
                      >
                        {/* Serial Number */}
                        <td className="w-12 px-3.5 py-3 text-center font-bold text-slate-400 text-xs">
                          {serialNo}
                        </td>

                        {/* Class & Section */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {cls?.name || 'Class'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                Section {sec?.name || 'A'}
                              </span>
                              {sec?.roomNumber && (
                                <span className="text-[10px] text-slate-400">
                                  Room {sec.roomNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {sub?.name || '—'}
                              </span>
                              {sub?.code && (
                                <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                                  {sub.code}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">
                              {sub?.subjectType || 'THEORY'}
                            </span>
                          </div>
                        </td>

                        {/* Assigned Teacher with Inline Selector */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <select
                              value={assignment.teacherId || ''}
                              onChange={(e) => handleInlineTeacherChange(assignment.id, e.target.value)}
                              disabled={busy}
                              className="h-8 max-w-[200px] rounded-lg border border-slate-200 bg-slate-50/90 px-2 text-xs font-semibold text-slate-800 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 disabled:opacity-50"
                            >
                              <option value="">Vacant / Unassigned</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.department || 'Faculty'})
                                </option>
                              ))}
                            </select>

                            {!assignment.teacherId && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                                <AlertCircle className="h-3 w-3" />
                                Vacant
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Evaluation Criteria */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                            <span>
                              Max: <strong className="text-slate-800 dark:text-slate-200">{assignment.maxMarks ?? 100}</strong> | Pass:{' '}
                              <strong className="text-slate-800 dark:text-slate-200">{assignment.passingMarks ?? 33}</strong>
                            </span>
                            {assignment.isOptional && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                Optional Subject
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Academic Year */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {yr?.name || '—'}
                            </span>
                            {yr?.isCurrent && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <Star className="h-2.5 w-2.5" /> Current
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <Badge variant={ENTITY_STATUS_VARIANT[assignment.status] || 'default'}>
                            {assignment.status || 'ACTIVE'}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(assignment)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition cursor-pointer"
                              title="Edit Assignment"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(assignment)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition cursor-pointer"
                              title="Unassign Subject"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Super Admin Style Pagination Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filteredAssignments.length)} of {filteredAssignments.length} subject assignments
            </p>
            {Math.ceil(filteredAssignments.length / PAGE_SIZE) > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-900"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from(
                  { length: Math.ceil(filteredAssignments.length / PAGE_SIZE) },
                  (_, i) => i + 1
                ).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-xs font-semibold transition ${
                      pageNumber === page
                        ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= Math.ceil(filteredAssignments.length / PAGE_SIZE)}
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(Math.ceil(filteredAssignments.length / PAGE_SIZE), prev + 1)
                    )
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-900"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Subject Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Subject to Section"
        size="md"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Academic Year */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Academic Year *</label>
              <select
                value={assignForm.academicYearId}
                onChange={(e) => {
                  setAssignForm((prev) => ({
                    ...prev,
                    academicYearId: e.target.value,
                    sectionId: '',
                  }));
                }}
                required
                className={selectClass}
              >
                <option value="">Select Academic Year</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Class Standard *</label>
              <select
                value={assignForm.classId}
                onChange={(e) => {
                  setAssignForm((prev) => ({
                    ...prev,
                    classId: e.target.value,
                    sectionId: '',
                  }));
                }}
                required
                className={selectClass}
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Section *</label>
              <select
                value={assignForm.sectionId}
                onChange={(e) => setAssignForm((prev) => ({ ...prev, sectionId: e.target.value }))}
                required
                disabled={!assignForm.classId || modalSections.length === 0}
                className={selectClass}
              >
                <option value="">Select Section</option>
                {modalSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {assignForm.classId && modalSections.length === 0 && (
                <p className="mt-1 text-[11px] text-amber-600">No active sections found for this class.</p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Subject *</label>
              <select
                value={assignForm.subjectId}
                onChange={(e) => {
                  const sid = e.target.value;
                  const selectedSub = subjectMap.get(sid);
                  setAssignForm((prev) => ({
                    ...prev,
                    subjectId: sid,
                    maxMarks: selectedSub?.maxMarks || 100,
                    passingMarks: selectedSub?.passingMarks || 33,
                  }));
                }}
                required
                className={selectClass}
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => {
                  const isAssigned = assignments.some(
                    (a) => a.sectionId === assignForm.sectionId && a.subjectId === sub.id
                  );
                  return (
                    <option key={sub.id} value={sub.id} disabled={isAssigned}>
                      {sub.name} ({sub.code || 'N/A'}) {isAssigned ? '— Already Assigned' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Assigned Teacher */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-500">Subject Teacher (Optional)</label>
              <select
                value={assignForm.teacherId}
                onChange={(e) => setAssignForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                className={selectClass}
              >
                <option value="">Leave Vacant (Assign Later)</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.department || 'Faculty'}) — {t.email || t.employeeId || 'ID'}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Marks */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Max Marks</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={assignForm.maxMarks}
                onChange={(e) => setAssignForm((prev) => ({ ...prev, maxMarks: e.target.value }))}
                className={inputClass}
              />
            </div>

            {/* Passing Marks */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Passing Marks</label>
              <input
                type="number"
                min="0"
                max="1000"
                value={assignForm.passingMarks}
                onChange={(e) => setAssignForm((prev) => ({ ...prev, passingMarks: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isOptionalAssign"
              checked={assignForm.isOptional}
              onChange={(e) => setAssignForm((prev) => ({ ...prev, isOptional: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
            />
            <label htmlFor="isOptionalAssign" className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
              Optional / Elective Subject
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Assign Subject
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Subject Assignment Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingAssignment(null);
        }}
        title="Edit Subject Assignment"
        size="md"
      >
        {editingAssignment && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {/* Read-only Context Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Class & Section:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {editingAssignment.class?.name || classMap.get(editingAssignment.classId)?.name} — Section{' '}
                    {editingAssignment.section?.name || sectionMap.get(editingAssignment.sectionId)?.name}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Subject:</span>
                  <p className="font-bold text-primary">
                    {editingAssignment.subject?.name || subjectMap.get(editingAssignment.subjectId)?.name} (
                    {editingAssignment.subject?.code || subjectMap.get(editingAssignment.subjectId)?.code || '—'})
                  </p>
                </div>
              </div>
            </div>

            {/* Teacher Selection */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Assigned Teacher</label>
              <select
                value={editForm.teacherId}
                onChange={(e) => setEditForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                className={selectClass}
              >
                <option value="">Leave Vacant (No Teacher)</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.department || 'Faculty'}) — {t.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Evaluation Marks */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Max Marks</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={editForm.maxMarks}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, maxMarks: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">Passing Marks</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={editForm.passingMarks}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, passingMarks: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Optional checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isOptionalEdit"
                checked={editForm.isOptional}
                onChange={(e) => setEditForm((prev) => ({ ...prev, isOptional: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
              />
              <label htmlFor="isOptionalEdit" className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                Optional / Elective Subject
              </label>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Assignment Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                className={selectClass}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingAssignment(null);
                }}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm Unassign / Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteAssignment}
        title="Unassign Subject"
        message={
          deleteTarget
            ? `Are you sure you want to remove ${
                deleteTarget.subject?.name || subjectMap.get(deleteTarget.subjectId)?.name || 'this subject'
              } from ${deleteTarget.class?.name || classMap.get(deleteTarget.classId)?.name || 'Class'} (Section ${
                deleteTarget.section?.name || sectionMap.get(deleteTarget.sectionId)?.name || 'A'
              })?`
            : 'Are you sure you want to remove this subject mapping?'
        }
        confirmText="Remove Subject"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default SubjectAssignments;

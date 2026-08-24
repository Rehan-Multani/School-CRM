import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { academicPortalApi } from '../../../../shared/api/client';
import { AcademicBreadcrumb, EmptyState } from './components/AcademicUi';
import { apiMessage, ENTITY_STATUS_VARIANT } from './utils';
import {
  UserCheck,
  UserX,
  Users,
  Search,
  RotateCcw,
  Loader2,
  GraduationCap,
  Layers,
  CheckCircle2,
  AlertCircle,
  Star,
  DoorOpen,
  LayoutGrid,
  List,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';

const PAGE_SIZE = 5;

const selectClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

export const ClassTeachers = () => {
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(true);
  const [busySectionId, setBusySectionId] = useState(null);

  // Reference data
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // View Mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState('grid');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'VACANT'

  // Table pagination
  const [page, setPage] = useState(1);

  const loadReferenceData = useCallback(async () => {
    setLoading(true);
    try {
      const [yearRes, classRes, sectionRes, teacherRes] = await Promise.all([
        academicPortalApi.years({ limit: 100 }),
        academicPortalApi.classes({ limit: 100 }),
        academicPortalApi.sections({ limit: 1000 }),
        academicPortalApi.teachers({ limit: 1000 }),
      ]);

      setYears(yearRes.data || []);
      setClasses((classRes.data || []).filter((c) => c.status === 'ACTIVE'));
      setSections((sectionRes.data || []).filter((s) => s.status === 'ACTIVE'));
      setTeachers((teacherRes.data || []).filter((t) => t.status === 'ACTIVE'));
    } catch (error) {
      showToast(apiMessage(error, 'Failed to load mentorship configuration data'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const loadSections = useCallback(async () => {
    try {
      const res = await academicPortalApi.sections({ limit: 1000 });
      setSections((res.data || []).filter((s) => s.status === 'ACTIVE'));
    } catch (error) {
      showToast(apiMessage(error, 'Failed to refresh sections data'), 'error');
    }
  }, [showToast]);

  const handleClassTeacherChange = async (sectionId, teacherId) => {
    setBusySectionId(sectionId);
    try {
      await academicPortalApi.updateSection(sectionId, {
        classTeacherId: teacherId || null,
      });
      showToast(
        teacherId ? 'Class teacher assigned successfully' : 'Class teacher unassigned',
        'success'
      );
      await loadSections();
    } catch (error) {
      showToast(apiMessage(error, 'Failed to update class teacher assignment'), 'error');
    } finally {
      setBusySectionId(null);
    }
  };

  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const yearMap = useMemo(() => new Map(years.map((y) => [y.id, y])), [years]);

  // Filtered sections based on year, class, status, and search
  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      // Academic Year Filter
      if (selectedYear !== 'ALL' && s.academicYearId !== selectedYear) return false;

      // Class Filter
      if (selectedClass !== 'ALL' && s.classId !== selectedClass) return false;

      // Status Filter
      if (statusFilter === 'ASSIGNED' && !s.classTeacherId) return false;
      if (statusFilter === 'VACANT' && s.classTeacherId) return false;

      // Search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const clsName = (classMap.get(s.classId)?.name || '').toLowerCase();
        const secName = (s.name || '').toLowerCase();
        const room = (s.roomNumber || '').toLowerCase();
        const tch = s.classTeacherId ? teacherMap.get(s.classTeacherId) : null;
        const tchName = (tch?.name || '').toLowerCase();
        const tchDept = (tch?.department || '').toLowerCase();
        const tchEmail = (tch?.email || '').toLowerCase();
        const yrName = (yearMap.get(s.academicYearId)?.name || '').toLowerCase();

        const match =
          clsName.includes(q) ||
          secName.includes(q) ||
          room.includes(q) ||
          tchName.includes(q) ||
          tchDept.includes(q) ||
          tchEmail.includes(q) ||
          yrName.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [sections, selectedYear, selectedClass, statusFilter, search, classMap, teacherMap, yearMap]);

  // Group sections by Class for the Grid View
  const groupedSectionsByClass = useMemo(() => {
    const map = {};
    filteredSections.forEach((s) => {
      if (!map[s.classId]) map[s.classId] = [];
      map[s.classId].push(s);
    });
    return map;
  }, [filteredSections]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = sections.length;
    const assigned = sections.filter((s) => Boolean(s.classTeacherId)).length;
    const vacant = total - assigned;
    const totalCapacity = sections.reduce((acc, s) => acc + (Number(s.capacity) || 0), 0);

    return {
      total,
      assigned,
      vacant,
      totalCapacity,
    };
  }, [sections]);

  // Status Filter Counts
  const statusCounts = useMemo(() => {
    return {
      ALL: sections.length,
      ASSIGNED: sections.filter((s) => Boolean(s.classTeacherId)).length,
      VACANT: sections.filter((s) => !s.classTeacherId).length,
    };
  }, [sections]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedYear('ALL');
    setSelectedClass('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search) ||
    selectedYear !== 'ALL' ||
    selectedClass !== 'ALL' ||
    statusFilter !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <AcademicBreadcrumb items={[{ label: 'Class Teachers' }]} />

      {/* Page Header */}
      <PageHeader
        title="Class Teachers"
        subtitle="Assign primary class teachers & mentors to manage academic attendance, student conduct, and parent communication."
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-primary shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-primary shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Table
              </button>
            </div>
          </div>
        }
      />

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Sections</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mentors Assigned</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.assigned}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div
            className={`rounded-xl p-2.5 ${
              stats.vacant > 0
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
          >
            <UserX className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vacant Sections</p>
            <p
              className={`text-xl font-extrabold ${
                stats.vacant > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {stats.vacant}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-600 dark:text-indigo-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Capacity</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{stats.totalCapacity}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        {/* Status Filter Tabs */}
        {sections.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 shrink-0 select-none">Mentorship Status:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'All Sections', count: statusCounts.ALL },
                  { id: 'ASSIGNED', label: 'Assigned Mentors', count: statusCounts.ASSIGNED },
                  { id: 'VACANT', label: 'Vacant (Needs Mentor)', count: statusCounts.VACANT },
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

        {/* Filter Controls Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Class, Section, Teacher, Room..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-8 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
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
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
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
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <EmptyState
          title="No Academic Sections Found"
          description="Create academic classes and sections first before assigning class teachers."
        />
      ) : filteredSections.length === 0 ? (
        <div className="flex min-h-[20vh] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium">No class sections match your filters</p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-primary underline font-semibold"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID CARDS VIEW ───────────────────────────────────────────── */
        <div className="space-y-8">
          {classes
            .filter((c) => groupedSectionsByClass[c.id]?.length > 0)
            .map((classObj) => {
              const classSections = groupedSectionsByClass[classObj.id] || [];
              return (
                <div key={classObj.id} className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {classObj.name} Standard
                    </h3>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {classSections.length} Section{classSections.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classSections.map((sec) => {
                      const assignedTeacher = sec.classTeacherId ? teacherMap.get(sec.classTeacherId) : null;
                      const session = yearMap.get(sec.academicYearId);
                      const isBusy = busySectionId === sec.id;

                      return (
                        <div
                          key={sec.id}
                          className={`group flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all duration-200 dark:bg-slate-900 ${
                            assignedTeacher
                              ? 'border-slate-200/80 hover:border-emerald-300/80 hover:shadow-md dark:border-slate-800 dark:hover:border-emerald-800/60'
                              : 'border-amber-200/70 bg-gradient-to-b from-amber-50/20 to-white hover:border-amber-300 hover:shadow-md dark:border-amber-900/40 dark:from-amber-950/10 dark:to-slate-900'
                          }`}
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                                    {classObj.name} - Section {sec.name}
                                  </h4>
                                </div>
                                {session && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-slate-400">
                                      Session: {session.name}
                                    </span>
                                    {session.isCurrent && (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                        <Star className="h-2 w-2" /> Live
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Status Badge */}
                              {assignedTeacher ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                  <CheckCircle2 className="h-3 w-3" /> Assigned
                                </span>
                              ) : (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 animate-pulse">
                                  <AlertCircle className="h-3 w-3" /> Vacant
                                </span>
                              )}
                            </div>

                            {/* Section Details Chips */}
                            <div className="mt-4 flex flex-wrap gap-2">
                              <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                                <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                                <span>Room: <strong className="font-bold text-slate-800 dark:text-slate-200">{sec.roomNumber || '—'}</strong></span>
                              </div>

                              <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                                <Users className="h-3.5 w-3.5 text-slate-400" />
                                <span>Capacity: <strong className="font-bold text-slate-800 dark:text-slate-200">{sec.capacity || 40}</strong></span>
                              </div>
                            </div>

                            {/* Assigned Teacher Card Snippet (If assigned) */}
                            {assignedTeacher && (
                              <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800/80 dark:bg-slate-950/60">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary dark:bg-primary/20">
                                  {assignedTeacher.name ? assignedTeacher.name.charAt(0).toUpperCase() : 'T'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                    {assignedTeacher.name}
                                  </p>
                                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                    {assignedTeacher.department || 'Faculty'} • {assignedTeacher.email || 'Mentor'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Class Teacher Selector Footer */}
                          <div className="mt-5 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {assignedTeacher ? 'Reassign Mentor' : 'Assign Class Teacher Mentor'}
                              </label>
                              {isBusy && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                            </div>

                            <select
                              value={sec.classTeacherId || ''}
                              onChange={(e) => handleClassTeacherChange(sec.id, e.target.value)}
                              disabled={isBusy}
                              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:bg-slate-900 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              <option value="">No Class Teacher (Vacant)</option>
                              {teachers.map((t) => {
                                const otherSec = sections.find(
                                  (s) => s.id !== sec.id && s.classTeacherId === t.id
                                );
                                const isAssignedElsewhere = Boolean(otherSec);
                                const clsName = otherSec
                                  ? classMap.get(otherSec.classId)?.name || 'other class'
                                  : '';
                                const assignmentInfo = otherSec
                                  ? ` — (Assigned: ${clsName} - ${otherSec.name})`
                                  : '';

                                return (
                                  <option
                                    key={t.id}
                                    value={t.id}
                                    disabled={isAssignedElsewhere}
                                  >
                                    {t.name} ({t.department || 'Faculty'}){assignmentInfo}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        /* ── TABLE VIEW ────────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="w-12 px-3.5 py-3 text-center">#</th>
                  <th className="px-3.5 py-3">Class & Section</th>
                  <th className="px-3.5 py-3">Room & Capacity</th>
                  <th className="px-3.5 py-3">Assigned Class Mentor</th>
                  <th className="px-3.5 py-3">Academic Session</th>
                  <th className="px-3.5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-800 dark:text-slate-200">
                {filteredSections
                  .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                  .map((sec, index) => {
                    const serialNo = (page - 1) * PAGE_SIZE + index + 1;
                    const cls = classMap.get(sec.classId);
                    const yr = yearMap.get(sec.academicYearId);
                    const tch = sec.classTeacherId ? teacherMap.get(sec.classTeacherId) : null;
                    const isBusy = busySectionId === sec.id;

                    return (
                      <tr
                        key={sec.id}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
                      >
                        <td className="w-12 px-3.5 py-3 text-center font-bold text-slate-400 text-xs">
                          {serialNo}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {cls?.name || 'Class'}
                          </span>
                          <span className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Section {sec.name}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          Room {sec.roomNumber || '—'} • {sec.capacity || 40} Students
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <select
                              value={sec.classTeacherId || ''}
                              onChange={(e) => handleClassTeacherChange(sec.id, e.target.value)}
                              disabled={isBusy}
                              className="h-8 max-w-[240px] rounded-lg border border-slate-200 bg-slate-50/90 px-2 text-xs font-semibold text-slate-800 outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 disabled:opacity-50"
                            >
                              <option value="">No Class Teacher (Vacant)</option>
                              {teachers.map((t) => {
                                const otherSec = sections.find(
                                  (s) => s.id !== sec.id && s.classTeacherId === t.id
                                );
                                const isAssignedElsewhere = Boolean(otherSec);
                                const otherClsName = otherSec
                                  ? classMap.get(otherSec.classId)?.name || 'other class'
                                  : '';
                                const assignmentInfo = otherSec
                                  ? ` — (Assigned: ${otherClsName} - ${otherSec.name})`
                                  : '';

                                return (
                                  <option
                                    key={t.id}
                                    value={t.id}
                                    disabled={isAssignedElsewhere}
                                  >
                                    {t.name} ({t.department || 'Faculty'}){assignmentInfo}
                                  </option>
                                );
                              })}
                            </select>
                            {isBusy && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {yr?.name || '—'}
                            </span>
                            {yr?.isCurrent && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <Star className="h-2.5 w-2.5" /> Live
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {tch ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> Assigned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                              <AlertCircle className="h-3 w-3" /> Vacant
                            </span>
                          )}
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
              {Math.min(page * PAGE_SIZE, filteredSections.length)} of {filteredSections.length} sections
            </p>
            {Math.ceil(filteredSections.length / PAGE_SIZE) > 1 && (
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
                  { length: Math.ceil(filteredSections.length / PAGE_SIZE) },
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
                  disabled={page >= Math.ceil(filteredSections.length / PAGE_SIZE)}
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(Math.ceil(filteredSections.length / PAGE_SIZE), prev + 1)
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

      <ToastComponent />
    </div>
  );
};

export default ClassTeachers;

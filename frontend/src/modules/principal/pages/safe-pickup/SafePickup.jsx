import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { schoolPortalApi } from '../../../../shared/api/client';
import {
  Plus,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CalendarRange,
  GraduationCap,
  Layers,
  X,
} from 'lucide-react';
import OtpVerificationModal from './OtpVerificationModal';

export const SafePickup = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters — cascade left to right: Academic Year -> Class -> Section
  const [academicYearId, setAcademicYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);

  // Modal states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [otpSessionId, setOtpSessionId] = useState(null);
  // Set when the pickup for this student was already in progress (HTTP 409).
  const [resumeInfo, setResumeInfo] = useState(null);

  // Reference data for filters
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  useEffect(() => {
    loadFilters();
    loadStudents();
  }, []);

  const loadFilters = async () => {
    try {
      const response = await schoolPortalApi.principalSafePickupSettings();
      const settings = response?.data || response;
      if (settings?.classes) setClasses(settings.classes);
      if (settings?.academicYears) setAcademicYears(settings.academicYears);
    } catch (err) {
      console.error('Failed to load filters:', err);
    } finally {
      setFiltersLoading(false);
    }
  };

  // Classes narrow to the selected academic year (via each class's academicYearIds).
  const visibleClasses = useMemo(() => {
    if (!academicYearId) return classes;
    return classes.filter((c) => (c.academicYearIds || []).includes(academicYearId));
  }, [classes, academicYearId]);

  // Sections narrow to the selected class; otherwise show every section across
  // the currently visible (academic-year-filtered) classes.
  const visibleSections = useMemo(() => {
    const pool = classId ? visibleClasses.filter((c) => c.id === classId) : visibleClasses;
    const all = pool.flatMap((c) => c.sections || []);
    return [...new Map(all.map((s) => [s.id, s])).values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [visibleClasses, classId]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        ...(classId && { classId }),
        ...(sectionId && { sectionId }),
        ...(searchQuery && { q: searchQuery }),
        ...(academicYearId && { academicYearId }),
      };

      const response = await schoolPortalApi.principalSafePickupStudents(params);

      if (response?.data) {
        setStudents(response.data || []);
        setTotalPages(response.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [page, limit, classId, sectionId, searchQuery, academicYearId]);

  useEffect(() => {
    setPage(1);
    loadStudents();
  }, [classId, sectionId, searchQuery, academicYearId]);

  useEffect(() => {
    loadStudents();
  }, [page, limit]);

  const handlePickup = async (student) => {
    setError('');
    setSuccess('');
    setSelectedStudent(student);

    try {
      const response = await schoolPortalApi.principalSendSafePickupOtp({
        studentId: student.id,
      });

      if (response?.data) {
        setResumeInfo(null);
        setOtpSessionId(response.data?.id);
        setShowOtpModal(true);
        setSuccess('OTP sent to registered guardian');
      }
    } catch (err) {
      const body = err.response?.data;
      if (err.response?.status === 409 && body?.code === 'PICKUP_ALREADY_ACTIVE' && body?.data?.sessionId) {
        // Not a failure: a pickup is already running for this student. Open it so
        // the OTP the parent already received can be entered (or resent / cancelled).
        setResumeInfo(body.data);
        setOtpSessionId(body.data.sessionId);
        setShowOtpModal(true);
        return;
      }
      setError(body?.message || 'Failed to send OTP');
    }
  };

  const handleOtpCancelled = () => {
    setShowOtpModal(false);
    setSelectedStudent(null);
    setOtpSessionId(null);
    setResumeInfo(null);
    setSuccess('Pickup cancelled. You can start a new pickup for this student.');
    setTimeout(() => setSuccess(''), 4000);
    loadStudents();
  };

  const handleOtpVerified = async () => {
    setShowOtpModal(false);
    setSuccess('Safe pickup completed successfully!');
    setTimeout(() => {
      setSuccess('');
      loadStudents();
    }, 2000);
  };

  const handleAcademicYearChange = (e) => {
    setAcademicYearId(e.target.value);
    setClassId('');
    setSectionId('');
  };

  const handleClassChange = (e) => {
    setClassId(e.target.value);
    setSectionId('');
  };

  const handleSectionChange = (e) => setSectionId(e.target.value);
  const handleSearch = (e) => setSearchQuery(e.target.value);

  const activeFilterCount = [academicYearId, classId, sectionId, searchQuery].filter(Boolean).length;

  const clearFilters = () => {
    setAcademicYearId('');
    setClassId('');
    setSectionId('');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Safe Pickup</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Verify and mark students as safely picked up by their guardians
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="font-medium text-green-900 dark:text-green-200">{success}</p>
          </div>
        )}

        {/* Filters Card */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Filters</h2>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                <X className="w-4 h-4" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Search by Name or ID
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter name or admission number"
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Academic Year Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Academic Year
              </label>
              <div className="relative">
                <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={academicYearId}
                  onChange={handleAcademicYearChange}
                  disabled={filtersLoading || academicYears.length === 0}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">All Years</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                      {y.isCurrent ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Class
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={classId}
                  onChange={handleClassChange}
                  disabled={filtersLoading || visibleClasses.length === 0}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">All Classes</option>
                  {visibleClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Section
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={sectionId}
                  onChange={handleSectionChange}
                  disabled={filtersLoading || visibleSections.length === 0}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">All Sections</option>
                  {visibleSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Admission No
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Section
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Mobile
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-slate-600 dark:text-slate-400">Loading students...</span>
                      </div>
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <p className="text-slate-600 dark:text-slate-400">No students found</p>
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {student.admissionNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {student.className}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {student.sectionName}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {student.maskedParentPhone || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {student.alreadyPickedUpToday ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Picked Up
                          </span>
                        ) : student.pickupEnabled ? (
                          <span className="text-slate-600 dark:text-slate-400">Pending</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Disabled</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {student.alreadyPickedUpToday ? (
                          <span className="text-slate-500 dark:text-slate-400">—</span>
                        ) : student.pickupEnabled ? (
                          <button
                            onClick={() => handlePickup(student)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                          >
                            <Plus className="w-4 h-4" />
                            Pickup
                          </button>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">Not Available</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && !loading && students.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* OTP Modal */}
        {showOtpModal && selectedStudent && otpSessionId && (
          <OtpVerificationModal
            student={selectedStudent}
            sessionId={otpSessionId}
            resumeInfo={resumeInfo}
            onCancelled={handleOtpCancelled}
            isPrincipal={true}
            onVerified={handleOtpVerified}
            onClose={() => {
              setShowOtpModal(false);
              setSelectedStudent(null);
              setOtpSessionId(null);
              setResumeInfo(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SafePickup;

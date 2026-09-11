import React, { useEffect, useState, useCallback } from 'react';
import { schoolPortalApi } from '../../../../shared/api/client';
import { Calendar, Search, Filter, Loader2, AlertCircle, Clock, User } from 'lucide-react';

export const SafePickupHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(25);

  // Classes and sections
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);

  useEffect(() => {
    loadFilters();
    loadHistory();
  }, []);

  const loadFilters = async () => {
    try {
      const response = await schoolPortalApi.safePickupSettings();
      if (response?.classes) {
        setClasses(response.classes);
      }
    } catch (err) {
      console.error('Failed to load filters:', err);
    } finally {
      setClassesLoading(false);
    }
  };

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        ...(classId && { classId }),
        ...(sectionId && { sectionId }),
        ...(searchQuery && { q: searchQuery }),
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: toDate }),
      };

      const response = await schoolPortalApi.safePickupHistory(params);

      if (response?.data) {
        setHistory(response.data || []);
        setTotalPages(response.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [page, limit, classId, sectionId, searchQuery, fromDate, toDate]);

  useEffect(() => {
    setPage(1);
    loadHistory();
  }, [classId, sectionId, searchQuery, fromDate, toDate]);

  useEffect(() => {
    loadHistory();
  }, [page, limit]);

  const handleClassChange = (e) => {
    const newClassId = e.target.value;
    setClassId(newClassId);
    setSectionId('');

    if (newClassId) {
      const selectedClass = classes.find((c) => c.id === newClassId);
      setSections(selectedClass?.sections || []);
    } else {
      setSections([]);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Safe Pickup History
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            View all safe pickup records for your school
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Filters Card */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Filters</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Name or ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Class
              </label>
              <select
                value={classId}
                onChange={handleClassChange}
                disabled={classesLoading}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            {sections.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Section
                </label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Sections</option>
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Filters */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                From Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                To Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {(classId || sectionId || searchQuery || fromDate || toDate) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setClassId('');
                    setSectionId('');
                    setSearchQuery('');
                    setFromDate('');
                    setToDate('');
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Guardian
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Mobile
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Pickup Time
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-slate-600 dark:text-slate-400">Loading history...</span>
                      </div>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <p className="text-slate-600 dark:text-slate-400">No pickup records found</p>
                    </td>
                  </tr>
                ) : (
                  history.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {record.studentName}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {record.admissionNumber || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {record.className} {record.sectionName && `- ${record.sectionName}`}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{record.guardianName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {record.maskedMobile}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Clock className="w-4 h-4" />
                          {formatDate(record.pickupDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                          {record.verificationMethod}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && !loading && history.length > 0 && (
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
      </div>
    </div>
  );
};

export default SafePickupHistory;

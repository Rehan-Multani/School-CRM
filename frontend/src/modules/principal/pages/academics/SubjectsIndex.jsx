import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { principalAcademicApi } from '../../../../shared/api/client';
import { AcademicBreadcrumb, EmptyState } from './components/AcademicUi';
import { apiMessage, ENTITY_STATUS_VARIANT } from './utils';
import { ChevronLeft, ChevronRight, Download, FileUp, Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';

const inputClass =
  'h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const SUBJECT_TYPES = ['THEORY', 'PRACTICAL', 'BOTH', 'ACTIVITY'];

const SUBJECT_CSV_SAMPLE = `name,code,subjectType\nMathematics,MATH,THEORY\nScience,SCI,THEORY\nEnglish,ENG,THEORY\nPhysical Education,PE,ACTIVITY`;

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportSubjectsCSV(subjects) {
  const rows = ['name,code,subjectType,status',
    ...subjects.map((s) => [s.name, s.code || '', s.subjectType, s.status].join(','))];
  downloadFile(rows.join('\n'), 'subjects.csv', 'text/csv');
}

function parseSubjectCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i] || ''));
    const types = ['THEORY', 'PRACTICAL', 'BOTH', 'ACTIVITY'];
    return {
      name: row.name,
      code: row.code || '',
      subjectType: types.includes((row.subjecttype || row['subject type'] || '').toUpperCase())
        ? (row.subjecttype || row['subject type']).toUpperCase() : 'THEORY',
    };
  }).filter((r) => r.name);
}

export const SubjectsIndex = () => {
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [subjectMappings, setSubjectMappings] = useState({});
  const [subjectClassIdsLookup, setSubjectClassIdsLookup] = useState({});
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [importing, setImporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const importRef = useRef();
  
  // Custom multi-select dropdown controls
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    code: '',
    subjectType: 'THEORY',
    description: '',
    classIds: [],
    status: 'ACTIVE',
  });

  // Load reference classes and years
  useEffect(() => {
    Promise.all([
      principalAcademicApi.classes({ limit: 100 }),
      principalAcademicApi.years({ limit: 100 }),
    ])
      .then(([classesRes, yearsRes]) => {
        const activeClasses = (classesRes.data || []).filter((c) => c.status === 'ACTIVE');
        const yearList = yearsRes.data || [];
        setClasses(activeClasses);
        setYears(yearList);
      })
      .catch(() => {});
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    try {
      // Ensure classes and years are loaded
      let activeClasses = classes;
      let activeYears = years;
      if (activeClasses.length === 0 || activeYears.length === 0) {
        const [cRes, yRes] = await Promise.all([
          principalAcademicApi.classes({ limit: 100 }),
          principalAcademicApi.years({ limit: 100 }),
        ]);
        activeClasses = (cRes.data || []).filter((c) => c.status === 'ACTIVE');
        activeYears = yRes.data || [];
        setClasses(activeClasses);
        setYears(activeYears);
      }

      const classMap = new Map(activeClasses.map(c => [c.id, c]));

      // Fetch all sections
      const sectionsRes = await principalAcademicApi.sections({ limit: 1000 });
      const currentSections = (sectionsRes.data || []).filter((s) => {
        if (selectedYear && s.academicYearId !== selectedYear) return false;
        return s.status === 'ACTIVE';
      });

      // Fetch subjects mapped for each active section in parallel
      const mappingsRes = await Promise.all(
        currentSections.map(async (sec) => {
          try {
            const res = await principalAcademicApi.sectionSubjects(sec.id);
            return { classId: sec.classId, subjectIds: (res.data || []).map(item => item.subjectId) };
          } catch {
            return { classId: sec.classId, subjectIds: [] };
          }
        })
      );

      const subjectClassNamesLookup = {};
      const subjectIdsToClassIds = {};

      mappingsRes.forEach(m => {
        const clsObj = classMap.get(m.classId);
        if (clsObj) {
          m.subjectIds.forEach(sid => {
            if (!subjectClassNamesLookup[sid]) subjectClassNamesLookup[sid] = new Set();
            if (!subjectIdsToClassIds[sid]) subjectIdsToClassIds[sid] = new Set();
            subjectClassNamesLookup[sid].add(clsObj.name);
            subjectIdsToClassIds[sid].add(m.classId);
          });
        }
      });

      // Convert sets to arrays
      const lookup = {};
      Object.keys(subjectClassNamesLookup).forEach(sid => {
        lookup[sid] = Array.from(subjectClassNamesLookup[sid]);
      });
      setSubjectMappings(lookup);
      setSubjectClassIdsLookup(subjectIdsToClassIds);

      // Load subjects
      const result = await principalAcademicApi.subjects({ limit: 100 });
      setSubjects(result.data || []);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load subjects'), 'error');
    } finally {
      setLoading(false);
    }
  }, [classes, years, selectedYear, showToast]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  // Filter subjects by status and class locally
  const statusCounts = useMemo(() => {
    const classFiltered = subjects.filter((s) => {
      if (selectedClass) {
        const classIdsSet = subjectClassIdsLookup[s.id];
        if (!classIdsSet || !classIdsSet.has(selectedClass)) return false;
      }
      return true;
    });

    return {
      ALL: classFiltered.length,
      ACTIVE: classFiltered.filter((s) => s.status === 'ACTIVE').length,
      INACTIVE: classFiltered.filter((s) => s.status === 'INACTIVE').length,
    };
  }, [subjects, selectedClass, subjectClassIdsLookup]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (selectedClass) {
        const classIdsSet = subjectClassIdsLookup[s.id];
        if (!classIdsSet || !classIdsSet.has(selectedClass)) return false;
      }
      return true;
    });
  }, [subjects, statusFilter, selectedClass, subjectClassIdsLookup]);

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const parsed = parseSubjectCSV(ev.target.result);
      if (!parsed.length) { showToast('No valid rows found', 'error'); return; }
      setImporting(true);
      let success = 0, failed = 0;
      for (const row of parsed) {
        try { await principalAcademicApi.createSubject(row); success++; }
        catch { failed++; }
      }
      setImporting(false);
      showToast(`${success} imported${failed ? `, ${failed} failed` : ''}`, success > 0 ? 'success' : 'error');
      if (success > 0) loadSubjects();
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        subjectType: form.subjectType,
        description: form.description,
        status: form.status,
      };

      if (editingSubject) {
        await principalAcademicApi.updateSubject(editingSubject.id, payload);
        showToast('Subject updated', 'success');
      } else {
        const res = await principalAcademicApi.createSubject(payload);
        const newSubject = res.data;
        showToast('Subject created', 'success');

        if (form.classIds.length > 0 && newSubject?.id) {
          const currentYear = years.find((y) => y.isCurrent || y.status === 'ACTIVE');
          if (currentYear) {
            const sectionsRes = await principalAcademicApi.sections({ limit: 1000 });
            const classSections = (sectionsRes.data || []).filter(
              (s) => form.classIds.includes(s.classId) && s.academicYearId === currentYear.id && s.status === 'ACTIVE'
            );

            let mappedCount = 0;
            for (const sec of classSections) {
              try {
                await principalAcademicApi.addSectionSubject(sec.id, {
                  subjectId: newSubject.id,
                  maxMarks: 100,
                  passingMarks: 33,
                  isOptional: false,
                });
                mappedCount++;
              } catch (err) {
                console.error(`Failed to assign subject to section ${sec.name}:`, err);
              }
            }
            if (mappedCount > 0) {
              showToast(`Subject automatically mapped to ${mappedCount} sections of selected classes`, 'success');
            }
          }
        }
      }
      setModalOpen(false);
      setEditingSubject(null);
      setForm({ name: '', code: '', subjectType: 'THEORY', description: '', classIds: [], status: 'ACTIVE' });
      setDropdownOpen(false);
      loadSubjects();
    } catch (error) {
      showToast(apiMessage(error, editingSubject ? 'Unable to update subject' : 'Unable to create subject'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setForm({
      name: subject.name || '',
      code: subject.code || '',
      subjectType: subject.subjectType || 'THEORY',
      description: subject.description || '',
      classIds: [],
      status: subject.status || 'ACTIVE',
    });
    setModalOpen(true);
  };

  const handleDelete = (subject) => {
    setDeleteTarget(subject);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await principalAcademicApi.deleteSubject(deleteTarget.id);
      showToast('Subject deleted', 'success');
      loadSubjects();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to delete subject'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <AcademicBreadcrumb items={[{ label: 'Subjects' }]} />
      <PageHeader
        title="Subjects"
        subtitle="Reusable school-wide subject master list."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => downloadFile(SUBJECT_CSV_SAMPLE, 'subjects_sample.csv', 'text/csv')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <Download className="h-3.5 w-3.5" /> Sample CSV
            </button>
            <button type="button" onClick={() => importRef.current?.click()} disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 disabled:opacity-60">
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Import
            </button>
            <input ref={importRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />
            {subjects.length > 0 && (
              <button type="button" onClick={() => exportSubjectsCSV(subjects)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <FileUp className="h-3.5 w-3.5" /> Export
              </button>
            )}
            <button type="button" onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white">
              <Plus className="h-3.5 w-3.5" /> Create Subject
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0 select-none">Academic Year:</span>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 pl-3.5 pr-9 text-xs font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white appearance-none cursor-pointer"
              >
                <option value="">All Academic Years</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0 select-none">Class:</span>
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 pl-3.5 pr-9 text-xs font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white appearance-none cursor-pointer"
              >
                <option value="">All Classes (Global Master)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0 select-none">Status:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'ALL', label: 'All Statuses', count: statusCounts.ALL },
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
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-850'
                  }`}
                >
                  {item.label} <span className={`ml-1 text-[10px] ${statusFilter === item.id ? 'opacity-80' : 'text-slate-400 dark:text-slate-500'}`}>({item.count})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="w-12 px-3.5 py-3 text-center">#</th>
                <th className="px-3.5 py-3">Subject</th>
                <th className="px-3.5 py-3">Code</th>
                <th className="px-3.5 py-3">Type</th>
                <th className="px-3.5 py-3">Assigned Classes</th>
                <th className="px-3.5 py-3">Status</th>
                <th className="px-3.5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="w-12 px-3.5 py-3 text-center"><div className="mx-auto h-3.5 w-4 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-28 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-16 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-16 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-32 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-16 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3 text-right"><div className="ml-auto h-7 w-16 rounded bg-slate-100 dark:bg-slate-800" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <EmptyState title="No subjects yet" description="Create subjects once and assign them to multiple sections." />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="w-12 px-3.5 py-3 text-center">#</th>
                  <th className="px-3.5 py-3">Subject</th>
                  <th className="px-3.5 py-3">Code</th>
                  <th className="px-3.5 py-3">Type</th>
                  <th className="px-3.5 py-3">Assigned Classes</th>
                  <th className="px-3.5 py-3">Status</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-800 dark:text-slate-200">
                {filteredSubjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((subject, index) => {
                  const serialNo = (page - 1) * PAGE_SIZE + index + 1;
                  return (
                    <tr key={subject.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                      <td className="w-12 px-3.5 py-3 text-center font-bold text-slate-400 text-xs">{serialNo}</td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white">{subject.name}</span>
                        {subject.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{subject.description}</div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {subject.code ? (
                          <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            {subject.code}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {subject.subjectType || 'THEORY'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {subjectMappings[subject.id]?.length ? (
                          <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            {subjectMappings[subject.id].join(', ')}
                          </span>
                        ) : (
                          <span className="text-slate-400">Global Only</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <Badge variant={ENTITY_STATUS_VARIANT[subject.status] || 'default'}>{subject.status}</Badge>
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(subject)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition cursor-pointer"
                            title={`Edit ${subject.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(subject)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition cursor-pointer"
                            title={`Delete ${subject.name}`}
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
              {Math.min(page * PAGE_SIZE, filteredSubjects.length)} of {filteredSubjects.length} subjects
            </p>
            {Math.ceil(filteredSubjects.length / PAGE_SIZE) > 1 && (
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
                {Array.from({ length: Math.ceil(filteredSubjects.length / PAGE_SIZE) }, (_, i) => i + 1).map((pageNumber) => (
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
                  disabled={page >= Math.ceil(filteredSubjects.length / PAGE_SIZE)}
                  onClick={() => setPage((prev) => Math.min(Math.ceil(filteredSubjects.length / PAGE_SIZE), prev + 1))}
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

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSubject(null);
          setForm({ name: '', code: '', subjectType: 'THEORY', description: '', classIds: [], status: 'ACTIVE' });
          setDropdownOpen(false);
        }}
        title={editingSubject ? 'Edit Subject' : 'Create Subject'}
      >
        <form
          onSubmit={handleCreate}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Subject Name *</label>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Code</label>
              <input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Type</label>
              <select
                className={inputClass}
                value={form.subjectType}
                onChange={(e) => setForm({ ...form, subjectType: e.target.value })}
              >
                {SUBJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!editingSubject && (
            <div ref={dropdownRef}>
              <label className="mb-1.5 block text-xs font-bold text-slate-500">Assign to Class Standards (Optional)</label>
              
              {/* Custom tags dropdown trigger & popup */}
              <div className="relative">
                <div
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="min-h-[44px] py-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm flex flex-wrap gap-1.5 items-center cursor-pointer outline-none dark:border-slate-800 dark:bg-slate-950"
                >
                  {form.classIds.length === 0 ? (
                    <span className="text-slate-400 select-none">Select Classes (Optional)</span>
                  ) : (
                    form.classIds.map((classId) => {
                      const clsObj = classes.find((c) => c.id === classId);
                      if (!clsObj) return null;
                      return (
                        <span
                          key={classId}
                          className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-lg border border-primary/20"
                        >
                          {clsObj.name}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newIds = form.classIds.filter((id) => id !== classId);
                              setForm({ ...form, classIds: newIds });
                            }}
                            className="hover:bg-primary/20 rounded p-0.5 text-primary transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })
                  )}
                  <span className="ml-auto text-slate-400 text-[10px] select-none">▼</span>
                </div>

                {dropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-full z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950 max-h-48 overflow-y-auto">
                    <div className="space-y-1">
                      {classes.map((c) => {
                        const isChecked = form.classIds.includes(c.id);
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => {
                              const newIds = isChecked
                                ? form.classIds.filter((id) => id !== c.id)
                                : [...form.classIds, c.id];
                              setForm({ ...form, classIds: newIds });
                            }}
                            className={`flex items-center justify-between w-full px-3 py-2 text-left text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer select-none text-slate-800 dark:text-slate-200 ${
                              isChecked ? 'bg-primary/5 text-primary font-bold' : ''
                            }`}
                          >
                            <span>{c.name}</span>
                            {isChecked && <span className="text-primary font-extrabold text-sm">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-1 text-[10px] text-slate-400">The subject will be mapped to all active sections of the checked classes for the current academic session.</p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500">Status</label>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setForm({ ...form, status: 'ACTIVE' })}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  form.status === 'ACTIVE'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, status: 'INACTIVE' })}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  form.status === 'INACTIVE'
                    ? 'bg-slate-700 text-white dark:bg-slate-600'
                    : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Save Subject'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Subject"
        message={`Delete subject "${deleteTarget?.name}"?`}
        confirmText="Delete Subject"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default SubjectsIndex;

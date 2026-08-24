import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { academicPortalApi } from '../../../../shared/api/client';
import { EmptyState } from './components/AcademicUi';
import { apiMessage, ENTITY_STATUS_VARIANT } from './utils';
import { ChevronLeft, ChevronRight, Download, FileUp, Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const CLASS_CSV_SAMPLE = `name,description,status\nNursery,,ACTIVE\nLKG,,ACTIVE\nUKG,,ACTIVE\nClass 1,,ACTIVE`;

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportClassesCSV(classes) {
  const rows = ['name,description,status',
    ...classes.map((c) => [c.name, c.description || '', c.status].join(','))];
  downloadFile(rows.join('\n'), 'classes.csv', 'text/csv');
}

function parseClassCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i] || ''));
    return {
      name: row.name,
      description: row.description || '',
      status: (row.status || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    };
  }).filter((r) => r.name);
}

function getClassDescription(cls) {
  if (cls.description?.trim()) return cls.description;
  return `Reusable ${cls.name} class for academic year planning and section mapping.`;
}

export const ClassesIndex = () => {
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [classMappings, setClassMappings] = useState({});
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [importing, setImporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const importRef = useRef();
  const [form, setForm] = useState({ name: '', description: '', status: 'ACTIVE', academicYearId: '' });

  // Load academic years once
  useEffect(() => {
    academicPortalApi
      .years({ limit: 100 })
      .then((res) => {
        const yearList = res.data || [];
        setYears(yearList);
      })
      .catch(() => {});
  }, []);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch years first if not loaded
      let activeYears = years;
      if (activeYears.length === 0) {
        const yRes = await academicPortalApi.years({ limit: 100 });
        activeYears = yRes.data || [];
        setYears(activeYears);
      }

      // Fetch mapping details for all academic years
      const mappingsRes = await Promise.all(
        activeYears.map(async (y) => {
          try {
            const res = await academicPortalApi.yearClasses(y.id);
            return { yearName: y.name, classIds: (res.data || []).map(item => item.classId) };
          } catch {
            return { yearName: y.name, classIds: [] };
          }
        })
      );

      const classYearsLookup = {};
      mappingsRes.forEach(m => {
        m.classIds.forEach(cid => {
          if (!classYearsLookup[cid]) classYearsLookup[cid] = [];
          classYearsLookup[cid].push(m.yearName);
        });
      });
      setClassMappings(classYearsLookup);

      if (selectedYear) {
        const result = await academicPortalApi.yearClasses(selectedYear);
        const mapped = (result.data || []).map((item) => ({
          ...item.class,
          id: item.classId,
          mappingId: item.id,
        }));
        setClasses(mapped);
      } else {
        const result = await academicPortalApi.classes({ limit: 100 });
        setClasses(result.data || []);
      }
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load classes'), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, years, showToast]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Filter classes by status locally
  const statusCounts = useMemo(() => {
    return {
      ALL: classes.length,
      ACTIVE: classes.filter((c) => c.status === 'ACTIVE').length,
      INACTIVE: classes.filter((c) => c.status === 'INACTIVE').length,
    };
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      if (statusFilter === 'ALL') return true;
      return cls.status === statusFilter;
    });
  }, [classes, statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description?.trim() || `Reusable ${form.name} class for academic year planning and section mapping.`,
        status: form.status,
      };

      if (editingClass) {
        await academicPortalApi.updateClass(editingClass.id, payload);
        showToast('Class updated', 'success');
      } else {
        const res = await academicPortalApi.createClass(payload);
        const newClass = res.data;
        showToast('Class created', 'success');

        if (form.academicYearId && newClass?.id) {
          await academicPortalApi.addClassToYear(form.academicYearId, newClass.id);
          showToast('Class mapped to academic year successfully', 'success');
        }
      }
      setModalOpen(false);
      setEditingClass(null);
      setForm({ name: '', description: '', status: 'ACTIVE', academicYearId: '' });
      loadClasses();
    } catch (error) {
      showToast(apiMessage(error, editingClass ? 'Unable to update class' : 'Unable to create class'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setForm({
      name: cls.name || '',
      description: cls.description || '',
      status: cls.status || 'ACTIVE',
      academicYearId: selectedYear,
    });
    setModalOpen(true);
  };

  const handleDelete = (cls) => {
    setDeleteTarget(cls);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await academicPortalApi.deleteClass(deleteTarget.id);
      showToast('Class deleted', 'success');
      loadClasses();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to delete class'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const parsed = parseClassCSV(ev.target.result);
      if (!parsed.length) { showToast('No valid rows found', 'error'); return; }
      setImporting(true);
      let success = 0, failed = 0;
      for (const row of parsed) {
        try {
          const res = await academicPortalApi.createClass({
            ...row,
            description: row.description?.trim() || `Reusable ${row.name} class for academic year planning and section mapping.`,
          });
          if (selectedYear && res.data?.id) {
            await academicPortalApi.addClassToYear(selectedYear, res.data.id);
          }
          success++;
        } catch { failed++; }
      }
      setImporting(false);
      showToast(`${success} imported${failed ? `, ${failed} failed` : ''}`, success > 0 ? 'success' : 'error');
      if (success > 0) loadClasses();
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const openCreateModal = () => {
    setForm({ name: '', description: '', status: 'ACTIVE', academicYearId: selectedYear });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        subtitle="School-wide class master list. Classes can be reused across academic years."
        actions={
          <div className="flex w-full flex-col gap-3 md:items-end">
            <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
              <button
                type="button"
                onClick={() => downloadFile(CLASS_CSV_SAMPLE, 'classes_sample.csv', 'text/csv')}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <Download className="h-3.5 w-3.5" /> Sample CSV
              </button>
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                disabled={importing}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 disabled:opacity-60"
              >
                {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Import
              </button>
              <input ref={importRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />
              {classes.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportClassesCSV(classes)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <FileUp className="h-3.5 w-3.5" /> Export
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white md:self-end"
            >
              <Plus className="h-3.5 w-3.5" /> Create Class
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
                <option value="">All Classes (School Master List)</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
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
                <th className="px-3.5 py-3">Class</th>
                <th className="px-3.5 py-3">Mapped Academic Years</th>
                <th className="px-3.5 py-3">Description</th>
                <th className="px-3.5 py-3">Status</th>
                <th className="px-3.5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="w-12 px-3.5 py-3 text-center"><div className="mx-auto h-3.5 w-4 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-32 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-48 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-16 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3 text-right"><div className="ml-auto h-7 w-16 rounded bg-slate-100 dark:bg-slate-800" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          title="No classes found"
          description="Try changing the filter options or map a class."
          action={
            <button type="button" onClick={openCreateModal} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm">
              Create & Map Class
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="w-12 px-3.5 py-3 text-center">#</th>
                  <th className="px-3.5 py-3">Class</th>
                  <th className="px-3.5 py-3">Mapped Academic Years</th>
                  <th className="px-3.5 py-3">Description</th>
                  <th className="px-3.5 py-3">Status</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-800 dark:text-slate-200">
                {filteredClasses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((cls, index) => {
                  const serialNo = (page - 1) * PAGE_SIZE + index + 1;
                  return (
                    <tr key={cls.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                      <td className="w-12 px-3.5 py-3 text-center font-bold text-slate-400 text-xs">{serialNo}</td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white">{cls.name}</span>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {classMappings[cls.id]?.length ? (
                          <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            {classMappings[cls.id].join(', ')}
                          </span>
                        ) : (
                          <span className="text-slate-400">Global Only</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-slate-600 dark:text-slate-400">{getClassDescription(cls)}</td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <Badge variant={ENTITY_STATUS_VARIANT[cls.status] || 'default'}>{cls.status}</Badge>
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(cls)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition cursor-pointer"
                            title={`Edit ${cls.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cls)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition cursor-pointer"
                            title={`Delete ${cls.name}`}
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
              {Math.min(page * PAGE_SIZE, filteredClasses.length)} of {filteredClasses.length} classes
            </p>
            {Math.ceil(filteredClasses.length / PAGE_SIZE) > 1 && (
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
                {Array.from({ length: Math.ceil(filteredClasses.length / PAGE_SIZE) }, (_, i) => i + 1).map((pageNumber) => (
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
                  disabled={page >= Math.ceil(filteredClasses.length / PAGE_SIZE)}
                  onClick={() => setPage((prev) => Math.min(Math.ceil(filteredClasses.length / PAGE_SIZE), prev + 1))}
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
          setEditingClass(null);
          setForm({ name: '', description: '', status: 'ACTIVE', academicYearId: '' });
        }}
        title={editingClass ? 'Edit Class' : 'Create Class'}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Class Name *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Nursery, LKG, Class 1"
              required
            />
          </div>
          
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Description</label>
            <input
              className={inputClass}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Reusable class for academic year planning and section mapping"
            />
          </div>

          {!editingClass && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Map to Academic Year</label>
              <select
                className={inputClass}
                value={form.academicYearId}
                onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}
              >
                <option value="">Do Not Map (Global Only)</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">If selected, the class will be added to this academic session automatically.</p>
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
              {saving ? 'Saving...' : editingClass ? 'Update Class' : 'Save Class'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Class"
        message={`Delete class "${deleteTarget?.name}"?`}
        confirmText="Delete Class"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default ClassesIndex;

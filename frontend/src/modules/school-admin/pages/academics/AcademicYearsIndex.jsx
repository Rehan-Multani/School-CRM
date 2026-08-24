import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { academicPortalApi } from '../../../../shared/api/client';
import { AcademicBreadcrumb, EmptyState } from './components/AcademicUi';
import { apiMessage, formatDate, YEAR_STATUS_VARIANT } from './utils';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { Archive, ArchiveRestore, Check, CheckCircle, ChevronLeft, ChevronRight, Download, Eye, FileUp, Loader2, Pencil, Plus, Star, Trash2, Upload, X } from 'lucide-react';

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950';

const STATUSES = ['ALL', 'DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];

const EMPTY_ROW = () => ({ name: '', code: '', startDate: '', endDate: '', status: 'DRAFT' });

function getStatusMeta(year) {
  if (year.status === 'DRAFT') {
    return {
      label: 'Planning stage',
      hint: 'Not started yet. Activate when the session begins.',
    };
  }

  if (year.status === 'ACTIVE' && year.isCurrent) {
    return {
      label: 'Running now',
      hint: 'This is the current live session for the school.',
    };
  }

  if (year.status === 'ACTIVE') {
    return {
      label: 'Active, not current',
      hint: 'Session is active but another year is currently selected.',
    };
  }

  if (year.status === 'COMPLETED') {
    return {
      label: 'Session finished',
      hint: 'Year is closed. You can keep it for records or archive it.',
    };
  }

  return {
    label: 'Hidden from active use',
    hint: 'Archived year kept only for history and reference.',
  };
}

function getNextStep(year) {
  if (year.status === 'DRAFT') return 'Next: Activate';
  if (year.status === 'ACTIVE' && year.isCurrent) return 'Current running session';
  if (year.status === 'ACTIVE') return 'Next: Set Current or Complete';
  if (year.status === 'COMPLETED') return 'Next: Archive if no longer needed';
  return 'Next: Unarchive to use again';
}

// ── CSV / Excel helpers ──────────────────────────────────────────────────────
const CSV_HEADERS = ['name', 'code', 'startDate', 'endDate', 'status'];
const CSV_SAMPLE = `name,code,startDate,endDate,status\n2024-25,2024-25,2024-04-01,2025-03-31,DRAFT\n2025-26,2025-26,2025-04-01,2026-03-31,DRAFT`;

function exportToCSV(years) {
  const rows = [
    CSV_HEADERS.join(','),
    ...years.map((y) =>
      [y.name, y.code || '', y.startDate?.slice(0, 10) || '', y.endDate?.slice(0, 10) || '', y.status].join(',')
    ),
  ];
  downloadFile(rows.join('\n'), 'academic_years.csv', 'text/csv');
}

function downloadSampleCSV() {
  downloadFile(CSV_SAMPLE, 'academic_years_sample.csv', 'text/csv');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i] || ''));
    return {
      name: row.name || '',
      code: row.code || '',
      startDate: row.startdate || row['start date'] || '',
      endDate: row.enddate || row['end date'] || '',
      status: (['DRAFT', 'ACTIVE', 'ARCHIVED'].includes((row.status || '').toUpperCase())
        ? row.status.toUpperCase()
        : 'DRAFT'),
    };
  });
}

// ── BulkCreateModal ─────────────────────────────────────────────────────────
const BulkCreateModal = ({ open, onClose, onSaved }) => {
  const { showToast, ToastComponent } = useToast();
  const [rows, setRows] = useState([EMPTY_ROW()]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const addRow = () => setRows((r) => [...r, EMPTY_ROW()]);
  const removeRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (parsed.length === 0) {
        showToast('No valid rows found in file', 'error');
        return;
      }
      setRows(parsed);
      showToast(`${parsed.length} rows imported from file`, 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    const valid = rows.filter((r) => r.name && r.startDate && r.endDate);
    if (valid.length === 0) {
      showToast('Fill at least one complete row', 'error');
      return;
    }
    setSaving(true);
    let success = 0;
    let failed = 0;
    for (const row of valid) {
      try {
        await academicPortalApi.createYear(row);
        success++;
      } catch {
        failed++;
      }
    }
    setSaving(false);
    if (success > 0) {
      showToast(`${success} academic year${success > 1 ? 's' : ''} created${failed ? `, ${failed} failed` : ''}`, 'success');
      setRows([EMPTY_ROW()]);
      onSaved();
      if (failed === 0) onClose();
    } else {
      showToast('All rows failed to save', 'error');
    }
  };

  if (!open) return null;

  const modalInputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900';

  return (
    <Modal isOpen={open} onClose={onClose} title="Create Academic Years" size="xl">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5 text-primary" /> Add Row
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileUp className="h-3.5 w-3.5 text-indigo-500" /> Import CSV
          </button>
          <button
            type="button"
            onClick={downloadSampleCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5 text-emerald-500" /> Sample CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />
        </div>

        {/* Rows Table */}
        <div className="max-h-[55vh] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
              <tr>
                <th className="px-3 py-3 w-10">#</th>
                <th className="px-3 py-3 min-w-[140px]">Name *</th>
                <th className="px-3 py-3 min-w-[120px]">Code</th>
                <th className="px-3 py-3 min-w-[140px]">Start Date *</th>
                <th className="px-3 py-3 min-w-[140px]">End Date *</th>
                <th className="px-3 py-3 min-w-[110px]">Status</th>
                <th className="px-3 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row, i) => (
                <tr key={i} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 font-bold text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <input
                      className={modalInputClass}
                      placeholder="e.g. 2026-27"
                      value={row.name}
                      onChange={(e) => updateRow(i, 'name', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      className={modalInputClass}
                      placeholder="e.g. 2026-27"
                      value={row.code}
                      onChange={(e) => updateRow(i, 'code', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="date"
                      className={modalInputClass}
                      value={row.startDate}
                      onChange={(e) => updateRow(i, 'startDate', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="date"
                      className={modalInputClass}
                      value={row.endDate}
                      onChange={(e) => updateRow(i, 'endDate', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      className={modalInputClass}
                      value={row.status}
                      onChange={(e) => updateRow(i, 'status', e.target.value)}
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="ACTIVE">ACTIVE</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                        title="Remove Row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Academic Years'}
          </button>
        </div>
      </div>
      <ToastComponent />
    </Modal>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
export const AcademicYearsIndex = () => {
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const importRef = useRef();
  const [importing, setImporting] = useState(false);
  const [yearForm, setYearForm] = useState(EMPTY_ROW());
  const [yearSaving, setYearSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadYears = useCallback(async () => {
    setLoading(true);
    try {
      const result = await academicPortalApi.years();
      setYears(result.data || []);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load academic years'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadYears();
  }, [loadYears]);

  const runAction = async (action, id, successMessage) => {
    try {
      await action(id);
      showToast(successMessage, 'success');
      loadYears();
    } catch (error) {
      showToast(apiMessage(error, 'Action failed'), 'error');
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const toExport = filteredYears.length > 0 ? filteredYears : years;
    exportToCSV(toExport);
  };

  // ── Import from CSV ────────────────────────────────────────────────────────
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (parsed.length === 0) {
        showToast('No valid rows found in file', 'error');
        return;
      }
      setImporting(true);
      let success = 0;
      let failed = 0;
      for (const row of parsed) {
        if (!row.name || !row.startDate || !row.endDate) { failed++; continue; }
        try {
          await academicPortalApi.createYear(row);
          success++;
        } catch {
          failed++;
        }
      }
      setImporting(false);
      showToast(`${success} imported${failed ? `, ${failed} failed` : ''}`, success > 0 ? 'success' : 'error');
      if (success > 0) loadYears();
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredYears = statusFilter === 'ALL' ? years : years.filter((y) => y.status === statusFilter);

  const openEditModal = (year) => {
    setEditingYear(year);
    setYearForm({
      name: year.name || '',
      code: year.code || '',
      startDate: year.startDate?.slice(0, 10) || '',
      endDate: year.endDate?.slice(0, 10) || '',
      status: year.status || 'DRAFT',
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingYear(null);
    setYearForm(EMPTY_ROW());
  };

  const handleUpdateYear = async (e) => {
    e.preventDefault();
    if (!editingYear) return;
    setYearSaving(true);
    try {
      await academicPortalApi.updateYear(editingYear.id, yearForm);
      showToast('Academic year updated', 'success');
      closeEditModal();
      loadYears();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to update academic year'), 'error');
    } finally {
      setYearSaving(false);
    }
  };

  const handleDeleteYear = (year) => {
    setDeleteTarget(year);
  };

  const confirmDeleteYear = async () => {
    if (!deleteTarget) return;
    try {
      await academicPortalApi.deleteYear(deleteTarget.id);
      showToast('Academic year deleted', 'success');
      loadYears();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to delete academic year'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <AcademicBreadcrumb items={[{ label: 'Academic Years' }]} />
      <PageHeader
        title="Academic Years"
        subtitle="Manage academic sessions, activate years, and set the current session."
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
            {/* Import */}
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
            {/* Export */}
            {years.length > 0 && (
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <FileUp className="h-3.5 w-3.5" /> Export
              </button>
            )}
            {/* Create */}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover"
            >
              <Plus className="h-3.5 w-3.5" /> Create Year
            </button>
          </div>
        }
      />

      {/* Status Filter Tabs */}
      {years.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const count = s === 'ALL' ? years.length : years.filter((y) => y.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {s} <span className="ml-1 opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="w-12 px-3.5 py-3 text-center">#</th>
                <th className="px-3.5 py-3">Academic Year</th>
                <th className="px-3.5 py-3">Code</th>
                <th className="px-3.5 py-3">Duration</th>
                <th className="px-3.5 py-3">Status</th>
                <th className="px-3.5 py-3">Current</th>
                <th className="px-3.5 py-3 text-center">Classes</th>
                <th className="px-3.5 py-3 text-center">Students</th>
                <th className="px-3.5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="w-12 px-3.5 py-3 text-center"><div className="mx-auto h-3.5 w-4 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-28 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-16 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-32 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3"><div className="h-4 w-16 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3 text-center"><div className="mx-auto h-4 w-8 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3 text-center"><div className="mx-auto h-4 w-8 rounded bg-slate-100 dark:bg-slate-800" /></td>
                  <td className="px-3.5 py-3 text-right"><div className="ml-auto h-7 w-24 rounded bg-slate-100 dark:bg-slate-800" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : years.length === 0 ? (
        <EmptyState
          title="No academic years yet"
          description="Create your first academic year to start mapping classes, sections, and subjects."
          action={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm"
            >
              Create Academic Year
            </button>
          }
        />
      ) : filteredYears.length === 0 ? (
        <div className="flex min-h-[20vh] flex-col items-center justify-center gap-2 text-slate-400">
          <p className="text-sm font-medium">No {statusFilter} years found</p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ALL');
              setPage(1);
            }}
            className="text-xs text-primary underline"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="w-12 px-3.5 py-3 text-center">#</th>
                  <th className="px-3.5 py-3">Academic Year</th>
                  <th className="px-3.5 py-3">Code</th>
                  <th className="px-3.5 py-3">Duration</th>
                  <th className="px-3.5 py-3">Status</th>
                  <th className="px-3.5 py-3">Current</th>
                  <th className="px-3.5 py-3 text-center">Classes</th>
                  <th className="px-3.5 py-3 text-center">Students</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-800 dark:text-slate-200">
                {filteredYears.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((year, index) => {
                  const serialNo = (page - 1) * PAGE_SIZE + index + 1;
                  return (
                    <tr key={year.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                      <td className="w-12 px-3.5 py-3 text-center font-bold text-slate-400 text-xs">{serialNo}</td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white">{year.name}</span>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {year.code ? (
                          <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            {year.code}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatDate(year.startDate)} – {formatDate(year.endDate)}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <Badge variant={YEAR_STATUS_VARIANT[year.status] || 'default'}>{year.status}</Badge>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {year.isCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <Star className="h-3 w-3" /> Current
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {year.counts?.classes ?? 0}
                      </td>
                      <td className="px-3.5 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {year.counts?.students ?? 0}
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/school-admin/academics/years/${year.id}`}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </Link>
                          {year.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => runAction(academicPortalApi.activateYear, year.id, 'Academic year activated')}
                              className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                              title="Activate Year"
                            >
                              <Check size={15} />
                            </button>
                          )}
                          {year.status === 'ACTIVE' && !year.isCurrent && (
                            <>
                              <button
                                type="button"
                                onClick={() => runAction(academicPortalApi.setCurrentYear, year.id, 'Set as current year')}
                                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition cursor-pointer"
                                title="Set as Current Year"
                              >
                                <Star size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => runAction(academicPortalApi.completeYear, year.id, 'Academic year marked as completed')}
                                className="rounded-lg p-1.5 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition cursor-pointer"
                                title="Mark as Completed"
                              >
                                <CheckCircle size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => runAction(academicPortalApi.archiveYear, year.id, 'Academic year archived')}
                                className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                                title="Archive Year"
                              >
                                <Archive size={15} />
                              </button>
                            </>
                          )}
                          {year.status === 'COMPLETED' && (
                            <button
                              type="button"
                              onClick={() => runAction(academicPortalApi.archiveYear, year.id, 'Academic year archived')}
                              className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                              title="Archive Year"
                            >
                              <Archive size={15} />
                            </button>
                          )}
                          {year.status === 'ARCHIVED' && (
                            <button
                              type="button"
                              onClick={() => runAction(academicPortalApi.unarchiveYear, year.id, 'Academic year unarchived')}
                              className="rounded-lg p-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition cursor-pointer"
                              title="Unarchive Year"
                            >
                              <ArchiveRestore size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(year)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition cursor-pointer"
                            title="Edit Year"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteYear(year)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition cursor-pointer"
                            title="Delete Year"
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
              {Math.min(page * PAGE_SIZE, filteredYears.length)} of {filteredYears.length} academic years
            </p>
            {Math.ceil(filteredYears.length / PAGE_SIZE) > 1 && (
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
                {Array.from({ length: Math.ceil(filteredYears.length / PAGE_SIZE) }, (_, i) => i + 1).map((pageNumber) => (
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
                  disabled={page >= Math.ceil(filteredYears.length / PAGE_SIZE)}
                  onClick={() => setPage((prev) => Math.min(Math.ceil(filteredYears.length / PAGE_SIZE), prev + 1))}
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

      <BulkCreateModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={loadYears} />
      <Modal isOpen={editModalOpen} onClose={closeEditModal} title="Edit Academic Year">
        <form onSubmit={handleUpdateYear} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Academic Year Name *</label>
            <input
              className={inputClass}
              value={yearForm.name}
              onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
              placeholder="e.g. 2026-27"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Code</label>
            <input
              className={inputClass}
              value={yearForm.code}
              onChange={(e) => setYearForm({ ...yearForm, code: e.target.value })}
              placeholder="e.g. AY-2026-27"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Start Date *</label>
              <input
                type="date"
                className={inputClass}
                value={yearForm.startDate}
                onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">End Date *</label>
              <input
                type="date"
                className={inputClass}
                value={yearForm.endDate}
                onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Status</label>
            <select
              className={inputClass}
              value={yearForm.status}
              onChange={(e) => setYearForm({ ...yearForm, status: e.target.value })}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={closeEditModal} className="rounded-xl px-4 py-2 text-xs font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={yearSaving} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {yearSaving ? 'Saving...' : 'Update Academic Year'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteYear}
        title="Delete Academic Year"
        message={`Delete academic year "${deleteTarget?.name}"?`}
        confirmText="Delete Academic Year"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default AcademicYearsIndex;

import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { apiMessage } from '../academics/utils';
import { schoolPortalApi } from '../../../../shared/api/client';
import { Download, FileUp, Loader2 } from 'lucide-react';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950';
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400';

const STATUS_VARIANT = { VALID: 'success', IMPORTED: 'success', INVALID: 'danger', FAILED: 'danger' };

// Bulk CSV import: template download, file picker, dry run (validate only),
// then the real import. Both show a per-row result table.
export function ImportStudentsModal({ isOpen, onClose, years, showToast, onDone }) {
  const [academicYearId, setAcademicYearId] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setResult(null);
      setBusy('');
      return;
    }
    const current = years.find((y) => y.isCurrent) || years[0];
    setAcademicYearId(current?.id || '');
  }, [isOpen, years]);

  const downloadTemplate = async () => {
    try {
      const blob = await schoolPortalApi.studentImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students-import-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to download template'), 'error');
    }
  };

  const run = async (dryRun) => {
    if (!file || !academicYearId) return;
    setBusy(dryRun ? 'dry' : 'import');
    try {
      const res = await schoolPortalApi.importStudentsCsv(file, academicYearId, { dryRun });
      setResult(res.data);
      showToast(res.message || (dryRun ? 'Validated' : 'Imported'), dryRun ? 'info' : 'success');
      if (!dryRun && res.data?.imported > 0) onDone?.();
    } catch (error) {
      showToast(apiMessage(error, dryRun ? 'Validation failed' : 'Import failed'), 'error');
    } finally {
      setBusy('');
    }
  };

  const canRun = Boolean(file && academicYearId && !busy);
  const dryRunClean = result?.dryRun && result.failed?.length === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Students (CSV)" size="xl" titleClassName="text-xl font-extrabold">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className={labelClass}>Academic year</label>
            <select className={inputClass} value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
              <option value="">Select year</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.name}{y.isCurrent ? ' (current)' : ''}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={downloadTemplate} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <Download className="h-3.5 w-3.5" /> Download template
          </button>
        </div>

        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 hover:border-primary dark:border-slate-800"
          onClick={() => fileRef.current?.click()}
        >
          <FileUp className="h-6 w-6" />
          {file ? (
            <p className="font-bold text-slate-800 dark:text-slate-100">{file.name} <span className="font-normal text-slate-400">({Math.ceil(file.size / 1024)} KB)</span></p>
          ) : (
            <p>Click to choose a .csv file (max 2 MB)</p>
          )}
          <p className="text-[11px]">Columns: admissionNumber, firstName, lastName, gender, dateOfBirth (YYYY-MM-DD), className, sectionName, rollNumber, parentName, parentPhone, email, phone, address</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              if (f && f.size > 2 * 1024 * 1024) {
                showToast('CSV must be 2 MB or smaller', 'error');
                e.target.value = '';
                return;
              }
              setFile(f);
              setResult(null);
              e.target.value = '';
            }}
          />
        </div>

        {result && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3 text-xs font-semibold">
              <span>Rows: {result.total}</span>
              {result.dryRun ? <span className="text-emerald-600">Valid: {result.valid}</span> : <span className="text-emerald-600">Imported: {result.imported}</span>}
              <span className="text-rose-600">Errors: {result.failed?.length || 0}</span>
              {result.dryRun && <Badge variant="info">Dry run — nothing was created</Badge>}
            </div>
            <div className="max-h-72 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-left font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-900">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Admission no.</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Class</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.rows || []).map((r) => (
                    <tr key={r.row} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 text-slate-500">{r.row}</td>
                      <td className="px-3 py-2 font-semibold">{r.admissionNumber || '—'}</td>
                      <td className="px-3 py-2">{r.name || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{r.className ? `${r.className} / ${r.sectionName}` : '—'}</td>
                      <td className="px-3 py-2"><Badge variant={STATUS_VARIANT[r.status] || 'default'}>{r.status}</Badge></td>
                      <td className="px-3 py-2 text-rose-600">{r.error || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Close</button>
          <button type="button" disabled={!canRun} onClick={() => run(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-primary px-4 py-2 text-xs font-bold text-primary disabled:opacity-50">
            {busy === 'dry' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Dry run
          </button>
          <button type="button" disabled={!canRun || (result && !result.dryRun)} onClick={() => run(false)} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50" title={dryRunClean ? 'All rows valid' : 'Rows with errors are skipped'}>
            {busy === 'import' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Import
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ImportStudentsModal;

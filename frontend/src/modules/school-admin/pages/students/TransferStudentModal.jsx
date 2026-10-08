import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { apiMessage } from '../academics/utils';
import { schoolPortalApi } from '../../../../shared/api/client';
import { Loader2, Printer, RotateCcw } from 'lucide-react';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950';
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400';

function fmt(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const today = () => new Date().toISOString().slice(0, 10);

// Transfer / leaving modal for one student. If the student has already left,
// it shows the leaving details with "Print TC" and "Reactivate".
export function TransferStudentModal({ isOpen, onClose, student, showToast, onDone }) {
  const [form, setForm] = useState({ type: 'TRANSFERRED', reason: '', leavingDate: today(), tcNumber: '', force: false });
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const [left, setLeft] = useState(null);
  const [tc, setTc] = useState(null);
  const [loadingTc, setLoadingTc] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ type: 'TRANSFERRED', reason: '', leavingDate: today(), tcNumber: '', force: false });
    setPending(null);
    setTc(null);
    setLeft(student?.leaving || null);
  }, [isOpen, student]);

  const submit = async (e) => {
    e.preventDefault();
    if (!student) return;
    setSaving(true);
    try {
      const res = await schoolPortalApi.transferStudent(student.id, form);
      setLeft(res.data?.leaving || { ...form, date: form.leavingDate });
      showToast(res.message || 'Student marked as left', 'success');
      onDone?.();
    } catch (error) {
      const data = error?.response?.data;
      if (error?.response?.status === 409 && data?.code === 'FEES_PENDING') {
        setPending(data);
      } else {
        showToast(apiMessage(error, 'Transfer failed'), 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const reactivate = async () => {
    setSaving(true);
    try {
      const res = await schoolPortalApi.reactivateStudent(student.id);
      showToast(res.message || 'Student reactivated', 'success');
      setLeft(null);
      onDone?.();
      onClose();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to reactivate'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadTc = async () => {
    setLoadingTc(true);
    try {
      const res = await schoolPortalApi.transferCertificate(student.id);
      setTc(res.data);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load certificate'), 'error');
    } finally {
      setLoadingTc(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen && !tc} onClose={onClose} title={left ? 'Student has left' : 'Transfer / Leaving'} size="md" titleClassName="text-xl font-extrabold">
        {!student ? null : left ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="font-bold text-slate-900 dark:text-white">{student.name}</p>
              <p className="text-xs text-slate-500">{student.admissionNumber}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <dt className="text-slate-400">Type</dt><dd className="font-semibold">{left.type}</dd>
                <dt className="text-slate-400">Date</dt><dd className="font-semibold">{fmt(left.date)}</dd>
                <dt className="text-slate-400">TC number</dt><dd className="font-semibold">{left.tcNumber || '—'}</dd>
                <dt className="text-slate-400">Reason</dt><dd className="font-semibold">{left.reason || '—'}</dd>
              </dl>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={reactivate} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                <RotateCcw className="h-3.5 w-3.5" /> Reactivate (undo)
              </button>
              <button type="button" onClick={loadTc} disabled={loadingTc} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white">
                {loadingTc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} Print TC
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="font-bold text-slate-900 dark:text-white">{student.name}</p>
              <p className="text-xs text-slate-500">{student.admissionNumber} · {student.className} / {student.sectionName}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Type</label>
                <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="TRANSFERRED">Transferred (TC issued)</option>
                  <option value="WITHDRAWN">Withdrawn / left</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Leaving date</label>
                <input type="date" className={inputClass} value={form.leavingDate} onChange={(e) => setForm({ ...form, leavingDate: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>TC number (optional)</label>
                <input className={inputClass} value={form.tcNumber} onChange={(e) => setForm({ ...form, tcNumber: e.target.value })} placeholder="e.g. TC/2026/014" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Reason</label>
                <textarea className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950" rows={3} required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
            </div>
            {pending && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-bold">{pending.message}</p>
                <p className="mt-1">{pending.invoiceCount} unpaid invoice(s).</p>
                <label className="mt-2 flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={form.force} onChange={(e) => setForm({ ...form, force: e.target.checked })} />
                  Proceed anyway (fees remain outstanding)
                </label>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              <button type="submit" disabled={saving || (pending && !form.force)} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Mark as {form.type === 'TRANSFERRED' ? 'transferred' : 'withdrawn'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <TransferCertificateModal isOpen={Boolean(tc)} onClose={() => setTc(null)} data={tc} />
    </>
  );
}

// Printable Transfer Certificate. `window.print()` with a print-only stylesheet
// that hides everything except the certificate.
export function TransferCertificateModal({ isOpen, onClose, data }) {
  if (!data) return null;
  const rows = [
    ['Name of student', data.student?.name],
    ['Admission number', data.student?.admissionNumber],
    ['Gender', data.student?.gender],
    ['Date of birth', fmt(data.student?.dateOfBirth)],
    ["Parent / guardian", data.student?.parentName],
    ['Address', data.student?.address],
    ['Date of admission', fmt(data.admissionDate)],
    ['Class / section at leaving', `${data.className || '—'} ${data.sectionName ? `/ ${data.sectionName}` : ''} (${data.academicYear || '—'})`],
    ['Roll number', data.rollNumber || '—'],
    ['Date of leaving', fmt(data.leavingDate)],
    ['Reason for leaving', data.leaving?.reason || '—'],
    ['Status', data.leaving?.type || data.enrollmentStatus || '—'],
  ];
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Certificate"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Close</button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      }
    >
      <style>{`@media print { body * { visibility: hidden !important; } #tc-print, #tc-print * { visibility: visible !important; } #tc-print { position: fixed; inset: 0; padding: 32px; background: #fff; color: #000; } }`}</style>
      <div id="tc-print" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-900 dark:border-slate-700">
        <div className="border-b border-slate-300 pb-3 text-center">
          <h2 className="text-xl font-extrabold uppercase">{data.school?.name}</h2>
          {data.school?.address && <p className="text-xs text-slate-600">{data.school.address}</p>}
          <p className="text-xs text-slate-600">{[data.school?.phone, data.school?.email].filter(Boolean).join(' · ')}</p>
          <h3 className="mt-3 text-base font-bold tracking-widest">TRANSFER CERTIFICATE</h3>
          <p className="text-xs text-slate-600">TC No.: {data.leaving?.tcNumber || '________'} &nbsp;&nbsp; Date: {fmt(data.issuedAt)}</p>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-slate-100">
                <td className="w-1/2 py-1.5 pr-3 text-slate-600">{label}</td>
                <td className="py-1.5 font-semibold">{value || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-600">Certified that the above particulars are correct as per the school records.</p>
        <div className="flex justify-between pt-8 text-xs">
          <span>Prepared by</span>
          <span>Principal (seal &amp; signature)</span>
        </div>
      </div>
    </Modal>
  );
}

export default TransferStudentModal;

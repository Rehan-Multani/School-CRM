import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { admissionsApi, academicPortalApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { Eye, FileCheck, UserPlus, IdCard, Printer, RotateCcw, Trash2 } from 'lucide-react';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white';

const STATUS_META = {
  PENDING_REVIEW: { label: 'Pending Review', variant: 'info' },
  WAITING_LIST: { label: 'Waiting List', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  ENROLLED: { label: 'Enrolled', variant: 'success' },
};

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const emptyOffline = {
  applicantName: '',
  gender: 'MALE',
  dob: '',
  appliedClassId: '',
  guardianName: '',
  phone: '',
  email: '',
  address: '',
  previousSchool: '',
};

export const AdmissionManagement = () => {
  const { showToast, ToastComponent } = useToast();
  const [activeTab, setActiveTab] = useState('review');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, waiting: 0, approved: 0, rejected: 0, enrolled: 0 });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [selectedAdm, setSelectedAdm] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [offlineForm, setOfflineForm] = useState(emptyOffline);
  const [offlineSaving, setOfflineSaving] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, statsRes] = await Promise.all([
        admissionsApi.list({ limit: 300 }),
        admissionsApi.stats().catch(() => null),
      ]);
      setRows(listRes?.data || []);
      if (statsRes?.data) setStats(statsRes.data);
    } catch (err) {
      setError(apiMessage(err, 'Unable to load admissions'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    academicPortalApi
      .classes({ limit: 100 })
      .then((r) => setClasses((r.data || []).filter((c) => c.status !== 'INACTIVE')))
      .catch(() => {});
  }, [load]);

  const filtered = useMemo(() => {
    if (activeTab === 'review') return rows.filter((r) => r.status === 'PENDING_REVIEW');
    if (activeTab === 'waiting') return rows.filter((r) => r.status === 'WAITING_LIST');
    if (activeTab === 'approved') return rows.filter((r) => r.status === 'APPROVED' || r.status === 'ENROLLED');
    return rows;
  }, [rows, activeTab]);

  const refreshOne = (updated) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (selectedAdm?.id === updated.id) setSelectedAdm(updated);
  };

  const doStatus = async (row, status, reason) => {
    setBusyId(row.id);
    try {
      const res = await admissionsApi.setStatus(row.id, status, reason);
      refreshOne(res.data);
      showToast(res.message || 'Application updated', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to update application'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const doApprove = async (row) => {
    setBusyId(row.id);
    try {
      const res = await admissionsApi.approve(row.id);
      const { admission, student, alreadyEnrolled } = res.data || {};
      if (admission) refreshOne(admission);
      showToast(
        alreadyEnrolled
          ? 'Applicant already enrolled'
          : `Approved — Student ID ${student?.id || ''}, Admission No ${admission?.admissionNo || ''}. Now in Student roster.`,
        'success'
      );
      setReviewOpen(false);
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to approve admission'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const submitOffline = async (e) => {
    e.preventDefault();
    if (!offlineForm.applicantName.trim() || !offlineForm.guardianName.trim() || !offlineForm.phone.trim()) {
      return showToast('Name, guardian and phone are required', 'error');
    }
    setOfflineSaving(true);
    try {
      const created = await admissionsApi.create({ ...offlineForm, source: 'OFFLINE' });
      const newId = created?.data?.id;
      if (newId && offlineForm.appliedClassId) {
        try {
          const appr = await admissionsApi.approve(newId);
          showToast(`Offline candidate admitted — Student ID ${appr?.data?.student?.id || ''}`, 'success');
        } catch (err) {
          showToast(
            `Application saved, but auto-enrol failed: ${apiMessage(err, 'approve manually from Pending Review')}`,
            'warning'
          );
        }
      } else {
        showToast('Offline application registered (assign a class, then approve)', 'success');
      }
      setOfflineOpen(false);
      setOfflineForm(emptyOffline);
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to register offline admission'), 'error');
    } finally {
      setOfflineSaving(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    await doStatus(rejectTarget, 'REJECTED', 'Rejected by admin');
    setRejectTarget(null);
    setReviewOpen(false);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await admissionsApi.remove(deleteTarget.id);
      showToast('Application deleted', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to delete application'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = useMemo(
    () => [
      { key: 'applicantName', title: 'Applicant', sortable: true, render: (v) => <span className="font-bold">{v}</span> },
      { key: 'appliedClassLabel', title: 'Target Class', render: (v) => v || '—' },
      { key: 'guardianName', title: 'Guardian', render: (v) => v || '—' },
      { key: 'phone', title: 'Phone', render: (v) => v || '—' },
      { key: 'appliedDate', title: 'Applied', sortable: true, render: (v) => fmtDate(v) },
      {
        key: 'documentsStatus',
        title: 'Docs',
        render: (v) => <Badge variant={v === 'Verified' ? 'success' : v === 'Rejected' ? 'danger' : 'warning'}>{v || 'Pending'}</Badge>,
      },
      {
        key: 'status',
        title: 'Status',
        render: (v) => {
          const m = STATUS_META[v] || { label: v, variant: 'default' };
          return <Badge variant={m.variant}>{m.label}</Badge>;
        },
      },
      {
        key: '_actions',
        title: 'Actions',
        align: 'right',
        render: (_v, row) => (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setSelectedAdm(row);
                setReviewOpen(true);
              }}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
            >
              <Eye className="h-3.5 w-3.5" /> Review
            </button>
            {(row.status === 'APPROVED' || row.status === 'ENROLLED') && (
              <button
                onClick={() => {
                  setSelectedAdm(row);
                  setIdCardOpen(true);
                }}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
              >
                <IdCard className="h-3.5 w-3.5" /> ID Card
              </button>
            )}
            {row.status === 'REJECTED' && (
              <button
                onClick={() => doStatus(row, 'PENDING_REVIEW')}
                className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Re-open
              </button>
            )}
            {row.status !== 'ENROLLED' && (
              <button
                onClick={() => setDeleteTarget(row)}
                className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admission Management"
        subtitle="Manage prospective candidate profiles, document validation, waitlists and admission approvals."
        actions={
          <button
            onClick={() => setOfflineOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm active:scale-95"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Register Offline Admission</span>
          </button>
        }
      />

      <Tabs
        tabs={[
          { id: 'review', label: 'Pending Review', count: stats.pending },
          { id: 'waiting', label: 'Waiting List', count: stats.waiting },
          { id: 'approved', label: 'Approved / Enrolled', count: stats.approved + stats.enrolled },
          { id: 'all', label: 'All Registrations', count: stats.total },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/60 p-10 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button type="button" onClick={load} className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          searchPlaceholder="Search candidates by name, guardian, phone..."
          searchKeys={['applicantName', 'guardianName', 'phone', 'email', 'admissionNo']}
          emptyMessage="No applications in this list."
          csvFilename="admissions.csv"
        />
      )}

      {/* REVIEW MODAL */}
      <Modal isOpen={reviewOpen} onClose={() => setReviewOpen(false)} title="Verify Candidate Admission Details" size="lg">
        {selectedAdm && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <Field label="Candidate Name" value={selectedAdm.applicantName} strong />
              <Field label="Target Class" value={selectedAdm.appliedClassLabel || '—'} strong />
              <Field label="Birth Date" value={fmtDate(selectedAdm.dob)} />
              <Field label="Gender" value={selectedAdm.gender} />
              <Field label="Previous School" value={selectedAdm.previousSchool || '—'} />
              <Field label="Category" value={selectedAdm.category || 'General'} />
            </div>
            <div className="space-y-2">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Guardian Contacts</span>
              <div className="grid grid-cols-2 gap-4 rounded-xl border bg-slate-50 p-3.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950">
                <Field label="Name" value={selectedAdm.guardianName || '—'} />
                <Field label="Phone" value={selectedAdm.phone || '—'} />
                <Field label="Email" value={selectedAdm.email || '—'} />
                <Field label="Address" value={selectedAdm.address || '—'} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <FileCheck className="h-5 w-5 text-indigo-600" />
                <span>Uploaded documents</span>
              </div>
              <Badge variant={selectedAdm.documentsStatus === 'Verified' ? 'success' : 'warning'}>
                {selectedAdm.documentsStatus || 'Pending'}
              </Badge>
            </div>

            {selectedAdm.admissionNo && (
              <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                Enrolled — Admission No {selectedAdm.admissionNo} · Student ID {selectedAdm.studentId}
              </div>
            )}

            {(selectedAdm.status === 'PENDING_REVIEW' || selectedAdm.status === 'WAITING_LIST') && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  onClick={() => setRejectTarget(selectedAdm)}
                  disabled={busyId === selectedAdm.id}
                  className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-600 transition-all hover:bg-rose-50 disabled:opacity-50"
                >
                  Reject Candidate
                </button>
                <div className="flex gap-2">
                  {selectedAdm.status === 'PENDING_REVIEW' && (
                    <button
                      onClick={() => doStatus(selectedAdm, 'WAITING_LIST')}
                      disabled={busyId === selectedAdm.id}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      Move to Waitlist
                    </button>
                  )}
                  <button
                    onClick={() => doApprove(selectedAdm)}
                    disabled={busyId === selectedAdm.id || !selectedAdm.appliedClassId}
                    title={!selectedAdm.appliedClassId ? 'Assign a class first (edit application)' : ''}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50"
                  >
                    {busyId === selectedAdm.id ? 'Processing…' : 'Approve & Create Student'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* OFFLINE MODAL */}
      <Modal isOpen={offlineOpen} onClose={() => setOfflineOpen(false)} title="Register Offline Student Admission" size="lg">
        <form onSubmit={submitOffline} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Candidate Full Name *</label>
              <input className={inputCls} required value={offlineForm.applicantName} onChange={(e) => setOfflineForm({ ...offlineForm, applicantName: e.target.value })} placeholder="e.g. Siddharth Verma" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Gender</label>
              <select className={inputCls} value={offlineForm.gender} onChange={(e) => setOfflineForm({ ...offlineForm, gender: e.target.value })}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Class *</label>
              <select className={inputCls} value={offlineForm.appliedClassId} onChange={(e) => setOfflineForm({ ...offlineForm, appliedClassId: e.target.value })}>
                <option value="">Select class…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Date of Birth</label>
              <input type="date" className={inputCls} value={offlineForm.dob} onChange={(e) => setOfflineForm({ ...offlineForm, dob: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Parent / Guardian Name *</label>
              <input className={inputCls} required value={offlineForm.guardianName} onChange={(e) => setOfflineForm({ ...offlineForm, guardianName: e.target.value })} placeholder="e.g. Ramesh Verma" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Contact Phone *</label>
              <input className={inputCls} required value={offlineForm.phone} onChange={(e) => setOfflineForm({ ...offlineForm, phone: e.target.value })} placeholder="+91 98765 00000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Email</label>
              <input className={inputCls} value={offlineForm.email} onChange={(e) => setOfflineForm({ ...offlineForm, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Previous School</label>
              <input className={inputCls} value={offlineForm.previousSchool} onChange={(e) => setOfflineForm({ ...offlineForm, previousSchool: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">Address</label>
            <input className={inputCls} value={offlineForm.address} onChange={(e) => setOfflineForm({ ...offlineForm, address: e.target.value })} />
          </div>
          <p className="text-[11px] text-slate-400">
            With a class selected, the applicant is enrolled immediately and added to the Student roster.
          </p>
          <button type="submit" disabled={offlineSaving} className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-md disabled:opacity-60">
            {offlineSaving ? 'Processing…' : 'Admit Student & Generate Credentials'}
          </button>
        </form>
      </Modal>

      {/* ID CARD MODAL */}
      <Modal isOpen={idCardOpen} onClose={() => setIdCardOpen(false)} title="Student ID Card Preview">
        {selectedAdm && (
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="relative flex h-[460px] w-80 flex-col items-center justify-between overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl">
              <div className="absolute inset-x-0 top-0 h-4 bg-primary" />
              <div className="mt-3 text-center">
                <h2 className="text-base font-black leading-none tracking-tight text-white">Greenfield Public School</h2>
                <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">
                  Official Student Identity Card
                </span>
              </div>
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-slate-800 bg-slate-900 text-3xl font-black text-slate-500">
                {(selectedAdm.applicantName || '?').charAt(0)}
              </div>
              <div className="space-y-1 text-center">
                <h3 className="text-lg font-bold leading-none text-white">{selectedAdm.applicantName}</h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-400">
                  {selectedAdm.appliedClassLabel || '—'}
                </span>
              </div>
              <div className="w-full space-y-2 border-t border-slate-800 pt-3 text-left text-[11px] font-semibold text-slate-400">
                <div className="flex justify-between">
                  <span>Admission No:</span>
                  <span className="font-bold text-white">{selectedAdm.admissionNo || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Student ID:</span>
                  <span className="font-bold text-white">{selectedAdm.studentId || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guardian:</span>
                  <span className="font-bold text-white">{selectedAdm.guardianName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Emergency:</span>
                  <span className="font-bold text-white">{selectedAdm.phone}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Official ID Badge</span>
            </button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onConfirm={confirmReject}
        title="Reject Candidate"
        message={`Reject the application of "${rejectTarget?.applicantName}"? You can re-open it later.`}
        confirmText="Reject"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Application"
        message={`Permanently delete the application of "${deleteTarget?.applicantName}"?`}
        confirmText="Delete"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

function Field({ label, value, strong }) {
  return (
    <div>
      <span className="block text-[10px] font-bold uppercase text-slate-400">{label}</span>
      <span className={`mt-0.5 block ${strong ? 'text-sm font-bold text-slate-900 dark:text-white' : 'text-xs font-semibold text-slate-700 dark:text-slate-300'}`}>
        {value}
      </span>
    </div>
  );
}

export default AdmissionManagement;

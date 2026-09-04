import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { principalAcademicApi } from '../../../../shared/api/client';
import { CountCards, EmptyState } from '../academics/components/AcademicUi';
import { apiMessage } from '../academics/utils';
import { ArrowLeft, Ban, Loader2, Pencil, Power, Trash2, UserCircle2 } from 'lucide-react';
import { DetailPageSkeleton } from '../../components/ui/SkeletonLoader';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

const STATUS_VARIANT = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  ON_LEAVE: 'warning',
  SUSPENDED: 'danger',
  RESIGNED: 'default',
  TERMINATED: 'danger',
};

const DOCUMENT_CATEGORIES = [
  { key: 'aadhaar', label: 'Aadhaar Card Photo' },
  { key: 'others', label: 'Document' },
];

function buildFileUrl(path) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const _rel = path.startsWith('/') ? path : `/${path}`;
  const _tok = ['school_admin_token','principal_token','accountant_token','hr_token','librarian_token','transport_token','super_admin_token'].reduce((a, k) => a || localStorage.getItem(k), '');
  return `${API_BASE_URL}/platform${_rel}${_tok ? `?t=${encodeURIComponent(_tok)}` : ''}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DetailCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 text-sm font-extrabold text-slate-900 dark:text-white">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{value || '—'}</p>
    </div>
  );
}

export const TeacherDetail = () => {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadTeacher = useCallback(async () => {
    setLoading(true);
    try {
      const result = await principalAcademicApi.getTeacher(teacherId);
      setTeacher(result.data);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load teacher'), 'error');
    } finally {
      setLoading(false);
    }
  }, [teacherId, showToast]);

  useEffect(() => {
    loadTeacher();
  }, [loadTeacher]);

  const documents = useMemo(() => {
    const docs = teacher?.documents;
    if (!docs || Array.isArray(docs) || typeof docs !== 'object') return { aadhaar: [], others: [] };
    return {
      aadhaar: (docs.aadhaar || []).filter(Boolean),
      others: (docs.others || []).filter(Boolean),
    };
  }, [teacher]);

  const hasDocuments = documents.aadhaar.length > 0 || documents.others.length > 0;

  const handleToggleStatus = async () => {
    const nextStatus = teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setBusy(true);
    try {
      await principalAcademicApi.updateTeacherStatus(teacher.id, nextStatus);
      showToast(`Teacher ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'success');
      loadTeacher();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to update teacher status'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await principalAcademicApi.deleteTeacher(teacher.id);
      showToast('Teacher deleted', 'success');
      navigate('/principal/teachers');
    } catch (error) {
      showToast(apiMessage(error, 'Unable to delete teacher'), 'error');
      setBusy(false);
    }
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (!teacher) {
    return (
      <EmptyState
        title="Teacher not found"
        description="This teacher may have been deleted."
        action={
          <Link to="/principal/teachers" className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white">
            Back to Teachers
          </Link>
        }
      />
    );
  }

  const photoUrl = buildFileUrl(teacher.profilePhoto);

  const addressText =
    typeof teacher.address === 'string'
      ? teacher.address
      : [
          teacher.address?.addressLine,
          teacher.address?.city,
          teacher.address?.state,
          teacher.address?.pincode,
        ]
          .filter(Boolean)
          .join(', ') || '—';

  const qualificationText = Array.isArray(teacher.qualifications)
    ? teacher.qualifications
        .map((item) => (typeof item === 'string' ? item : item?.degree))
        .filter(Boolean)
        .join(', ')
    : teacher.qualification || '—';

  return (
    <div className="space-y-6">
      <Link
        to="/principal/teachers"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Teachers
      </Link>

      <PageHeader
        title={teacher.name}
        subtitle={teacher.employeeId || 'No employee ID'}
        actions={
          <>
            <Link
              to={`/principal/teachers?edit=${teacher.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-amber-600 hover:border-amber-300 hover:bg-amber-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-amber-950/20"
            >
              {teacher.status === 'ACTIVE' ? <Ban className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
              {teacher.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-rose-500 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-rose-950/20"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        {photoUrl ? (
          <img src={photoUrl} alt={teacher.name} className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600">
            <UserCircle2 className="h-10 w-10" />
          </div>
        )}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{teacher.name}</h2>
            <Badge variant={STATUS_VARIANT[teacher.status] || 'default'}>{teacher.status}</Badge>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Joined {formatDate(teacher.joiningDate)}
          </p>
          <p className="text-xs text-slate-500">
            {teacher.phone || teacher.mobileNumber || 'No phone'} · {teacher.email || 'No email'}
          </p>
        </div>
      </div>

      <CountCards
        items={[
          { label: 'Total Assignments', value: teacher.counts?.totalAssignments },
          { label: 'Class Teacher Of', value: teacher.counts?.classTeacherSections },
          { label: 'Subject Assignments', value: teacher.counts?.subjectAssignments },
          { label: 'Documents', value: documents.aadhaar.length + documents.others.length },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <DetailCard title="Basic Details">
          <div className="space-y-4">
            <Field label="Full Name" value={teacher.name} />
            <Field label="Gender" value={teacher.gender} />
            <Field label="Date of Birth" value={formatDate(teacher.dateOfBirth)} />
          </div>
        </DetailCard>

        <DetailCard title="Contact Details">
          <div className="space-y-4">
            <Field label="Mobile Number" value={teacher.mobileNumber || teacher.phone} />
            <Field label="Email" value={teacher.email} />
            <Field label="Address" value={addressText} />
          </div>
        </DetailCard>

        <DetailCard title="Professional Details">
          <div className="space-y-4">
            <Field label="Employee ID" value={teacher.employeeId} />
            <Field label="Qualification" value={qualificationText} />
            <Field label="Joining Date" value={formatDate(teacher.joiningDate)} />
            <Field label="Experience" value={teacher.experienceSummary} />
          </div>
        </DetailCard>
      </div>

      <DetailCard title="Documents">
        {hasDocuments ? (
          <div className="grid gap-4 md:grid-cols-2">
            {DOCUMENT_CATEGORIES.map((category) => {
              const items = documents[category.key] || [];
              return (
                <div key={category.key} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
                  <p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    {category.label} ({items.length})
                  </p>
                  {items.length ? (
                    <div className="grid grid-cols-2 gap-3">
                      {items.map((path) => (
                        <a
                          key={path}
                          href={buildFileUrl(path)}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-primary dark:border-slate-800 dark:bg-slate-900"
                        >
                          <img
                            src={buildFileUrl(path)}
                            alt={category.label}
                            className="h-32 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                      Not uploaded
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No documents uploaded"
            description="Upload Aadhaar card photo and other documents from the edit form."
          />
        )}
      </DetailCard>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Teacher"
        message={`"${teacher.name}" will be permanently removed. Teachers with class or subject assignments cannot be deleted — deactivate them instead.`}
        confirmText="Delete Teacher"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default TeacherDetail;

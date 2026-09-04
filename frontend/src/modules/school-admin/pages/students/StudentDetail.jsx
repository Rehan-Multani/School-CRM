import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { schoolPortalApi } from '../../../../shared/api/client';
import { CountCards, EmptyState } from '../academics/components/AcademicUi';
import { apiMessage } from '../academics/utils';
import { ArrowLeft, Ban, Loader2, Pencil, Power, Trash2, UserCircle2 } from 'lucide-react';
import { DetailPageSkeleton } from '../../components/ui/SkeletonLoader';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

const STATUS_VARIANT = {
  ACTIVE: 'success',
  INACTIVE: 'default',
};

const DOCUMENT_CATEGORIES = [
  { key: 'aadhaar', label: 'Aadhaar Card Photo' },
  { key: 'marksheet', label: "Previous Year's Marksheet" },
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

function getInitials(name) {
  return (name || 'Student')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ST';
}

function StudentAvatar({ name, photo, className = 'h-12 w-12' }) {
  const src = buildFileUrl(photo);
  if (src) {
    return <img src={src} alt={name} className={`${className} rounded-2xl object-cover`} />;
  }
  return (
    <div className={`${className} flex items-center justify-center rounded-2xl bg-slate-100 font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300`}>
      {getInitials(name)}
    </div>
  );
}

export const StudentDetail = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadStudent = useCallback(async () => {
    setLoading(true);
    try {
      const result = await schoolPortalApi.getStudent(studentId);
      setStudent(result.data);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load student details'), 'error');
    } finally {
      setLoading(false);
    }
  }, [studentId, showToast]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  const documents = useMemo(() => {
    const docs = student?.documents;
    if (!docs || Array.isArray(docs) || typeof docs !== 'object') return { aadhaar: [], marksheet: [] };
    return {
      aadhaar: (docs.aadhaar || []).filter(Boolean),
      marksheet: (docs.marksheet || []).filter(Boolean),
    };
  }, [student]);

  const hasDocuments = documents.aadhaar.length > 0 || documents.marksheet.length > 0;

  const handleToggleStatus = async () => {
    const nextStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setBusy(true);
    try {
      await schoolPortalApi.updateStudentStatus(student.id, nextStatus);
      showToast(`Student ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'success');
      loadStudent();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to update status'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await schoolPortalApi.deleteStudent(student.id);
      showToast('Student deleted', 'success');
      navigate('/school-admin/students');
    } catch (error) {
      showToast(apiMessage(error, 'Unable to delete student'), 'error');
      setBusy(false);
    }
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (!student) {
    return (
      <EmptyState
        title="Student not found"
        description="This student may have been deleted."
        action={
          <Link to="/school-admin/students" className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white">
            Back to Students
          </Link>
        }
      />
    );
  }

  const photoUrl = buildFileUrl(student.photo);

  return (
    <div className="space-y-6">
      <Link
        to="/school-admin/students"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Students
      </Link>

      <PageHeader
        title={student.name}
        subtitle={`Admission ID: ${student.admissionNumber}`}
        actions={
          <>
            <Link
              to={`/school-admin/students?edit=${student.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Student
            </Link>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-amber-600 hover:border-amber-300 hover:bg-amber-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-amber-950/20"
            >
              {student.status === 'ACTIVE' ? <Ban className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
              {student.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-rose-500 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-rose-950/20"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Student
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        {photoUrl ? (
          <img src={photoUrl} alt={student.name} className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600">
            <UserCircle2 className="h-10 w-10" />
          </div>
        )}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{student.name}</h2>
            <Badge variant={STATUS_VARIANT[student.status] || 'default'}>{student.status}</Badge>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Class: {student.enrollment?.class?.name || '—'} · Section: {student.enrollment?.section?.name || '—'}
          </p>
          <p className="text-xs text-slate-500">
            Roll No: {student.enrollment?.rollNumber || '—'} · Parent: {student.parentName || '—'} ({student.parentPhone || '—'})
          </p>
        </div>
      </div>

      <CountCards
        items={[
          { label: 'Roll Number', value: student.enrollment?.rollNumber || '—' },
          { label: 'Academic Year', value: student.enrollment?.academicYear?.name || '—' },
          { label: 'Status', value: student.status },
          { label: 'Attached Documents', value: documents.aadhaar.length + documents.marksheet.length },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <DetailCard title="Basic Details">
          <div className="space-y-4">
            <Field label="Full Name" value={student.name} />
            <Field label="Gender" value={student.gender} />
            <Field label="Date of Birth" value={formatDate(student.dateOfBirth)} />
            <Field label="Student Email" value={student.email} />
            <Field label="Student Phone" value={student.phone} />
          </div>
        </DetailCard>

        <DetailCard title="Contact Details">
          <div className="space-y-4">
            <Field label="Parent / Guardian" value={student.parentName} />
            <Field label="Guardian Contact" value={student.parentPhone} />
            <Field label="Residential Address" value={student.address} />
          </div>
        </DetailCard>

        <DetailCard title="Academic Placement">
          <div className="space-y-4">
            <Field label="Academic Session" value={student.enrollment?.academicYear?.name} />
            <Field label="Class Standard" value={student.enrollment?.class?.name} />
            <Field label="Assigned Section" value={student.enrollment?.section?.name} />
            <Field label="Admission Number" value={student.admissionNumber} />
            <Field label="Enrollment Date" value={formatDate(student.enrollment?.enrollmentDate)} />
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
            description="Upload Aadhaar card and previous year's marksheet from the edit student form."
          />
        )}
      </DetailCard>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Student"
        message={`"${student.name}" will be permanently removed. This action cannot be undone.`}
        confirmText="Delete Student"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default StudentDetail;

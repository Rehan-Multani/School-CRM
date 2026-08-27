import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { principalAcademicApi, principalHrApi } from '../../../../shared/api/client';
import { EmptyState } from '../academics/components/AcademicUi';
import { apiMessage } from '../academics/utils';
import { Ban, Camera, Eye, ImagePlus, Loader2, Pencil, Plus, Power, Trash2, UserCheck, UserCircle2, Users, X } from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950';

const textAreaClass = `${inputClass} min-h-[96px] resize-y py-3`;

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const DOCUMENT_CATEGORIES = [
  { key: 'aadhaar', label: 'Aadhaar Card Photo', field: 'aadhaarDocuments', hint: 'Front and back.' },
  { key: 'others', label: 'Document', field: 'otherDocuments', hint: 'Any other supporting document.' },
];
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const MAX_DOC_IMAGES = 2;
const MAX_DOC_SIZE = 5 * 1024 * 1024;

const STATUS_VARIANT = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  ON_LEAVE: 'warning',
  SUSPENDED: 'danger',
  RESIGNED: 'default',
  TERMINATED: 'danger',
  PENDING_APPROVAL: 'warning',
  PENDING: 'warning',
  REJECTED: 'danger',
};

const createEmptyDocuments = () => ({ aadhaar: [], others: [] });

const createEmptyForm = () => ({
  fullName: '',
  gender: 'MALE',
  dateOfBirth: '',
  mobileNumber: '',
  email: '',
  address: '',
  employeeId: '',
  qualification: '',
  joiningDate: '',
  experienceSummary: '',
  department: '',
  designation: '',
  documents: createEmptyDocuments(),
});

function buildTeacherPhotoUrl(photo) {
  if (!photo) return '';
  if (/^(https?:|data:|blob:)/.test(photo)) return photo;
  return `${API_BASE_URL}/platform${photo.startsWith('/') ? photo : `/${photo}`}`;
}

function mapDocumentImages(paths) {
  return (Array.isArray(paths) ? paths : [])
    .filter(Boolean)
    .slice(0, MAX_DOC_IMAGES)
    .map((item) => ({ id: item, preview: buildTeacherPhotoUrl(item), path: item, file: null }));
}

function documentsFromTeacher(teacher) {
  const docs = teacher?.documents;
  if (!docs || Array.isArray(docs) || typeof docs !== 'object') return createEmptyDocuments();
  return {
    aadhaar: mapDocumentImages(docs.aadhaar),
    others: mapDocumentImages(docs.others),
  };
}

function revokeDocumentPreviews(docs) {
  DOCUMENT_CATEGORIES.forEach(({ key }) => {
    (docs?.[key] || []).forEach((item) => {
      if (item?.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview);
    });
  });
}

function SummaryCard({ title, value, hint, icon: Icon, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className={`mt-2 text-3xl font-extrabold ${tone}`}>{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SectionBlock({ title, subtitle, children, action }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export const TeacherManagement = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast, ToastComponent } = useToast();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const photoInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await principalAcademicApi.teachers();
      setTeachers(result.data || []);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load teachers'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [deptRes, desigRes] = await Promise.all([principalHrApi.departments(), principalHrApi.designations()]);
        setDepartments(deptRes.data || []);
        setDesignations(desigRes.data || []);
      } catch {
        // Non-blocking: department/designation master data is optional to load
      }
    };
    loadOptions();
  }, []);

  const filteredTeachers = useMemo(() => {
    if (statusFilter === 'ALL') return teachers;
    return teachers.filter((teacher) => teacher.status === statusFilter);
  }, [teachers, statusFilter]);

  const tableRows = useMemo(
    () =>
      filteredTeachers.map((teacher, index) => ({
        ...teacher,
        serial: index + 1,
        assignmentSummary: teacher.counts?.totalAssignments ?? 0,
      })),
    [filteredTeachers]
  );

  const stats = useMemo(() => {
    const active = teachers.filter((teacher) => teacher.status === 'ACTIVE').length;
    const inactive = teachers.filter((teacher) => teacher.status === 'INACTIVE').length;
    const assigned = teachers.filter((teacher) => (teacher.counts?.totalAssignments ?? 0) > 0).length;
    return { total: teachers.length, active, inactive, assigned };
  }, [teachers]);

  const resetModal = () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    revokeDocumentPreviews(form.documents);
    setModalOpen(false);
    setEditingTeacher(null);
    setForm(createEmptyForm());
    setPhotoFile(null);
    setPhotoPreview('');
    setRemovePhoto(false);
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setForm({
      fullName: teacher.fullName || teacher.name || '',
      gender: teacher.gender || 'MALE',
      dateOfBirth: teacher.dateOfBirth ? String(teacher.dateOfBirth).slice(0, 10) : '',
      mobileNumber: teacher.mobileNumber || teacher.phone || '',
      email: teacher.email || '',
      address: teacher.address?.addressLine || '',
      employeeId: teacher.employeeId || '',
      qualification: teacher.qualifications?.map((item) => item.degree).filter(Boolean).join(', ') || '',
      joiningDate: teacher.joiningDate ? String(teacher.joiningDate).slice(0, 10) : '',
      experienceSummary: teacher.experienceSummary || '',
      department: teacher.department || '',
      designation: teacher.designation || '',
      documents: documentsFromTeacher(teacher),
    });
    setPhotoFile(null);
    setPhotoPreview(buildTeacherPhotoUrl(teacher.profilePhoto));
    setRemovePhoto(false);
    setModalOpen(true);
  };

  const editParam = searchParams.get('edit');

  useEffect(() => {
    if (!editParam || !teachers.length) return;
    const target = teachers.find((teacher) => teacher.id === editParam);
    if (target) handleEdit(target);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, teachers]);

  const handleSave = async (e) => {
    e.preventDefault();
    const fullName = form.fullName.trim().replace(/\s+/g, ' ');
    if (
      !fullName ||
      !form.gender ||
      !form.mobileNumber.trim() ||
      !form.employeeId.trim() ||
      !form.qualification.trim() ||
      !form.joiningDate ||
      !form.department ||
      !form.designation
    ) {
      showToast('Fill all required teacher fields before saving', 'error');
      return;
    }
    setSaving(true);
    try {
      const [firstName, ...restName] = fullName.split(' ');
      const payload = new FormData();
      const fields = {
        name: fullName,
        firstName,
        middleName: '',
        lastName: restName.join(' '),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        mobileNumber: form.mobileNumber.trim(),
        email: form.email.trim(),
        employeeId: form.employeeId.trim(),
        joiningDate: form.joiningDate,
        experienceSummary: form.experienceSummary,
        department: form.department,
        designation: form.designation,
      };
      Object.entries(fields).forEach(([key, value]) => payload.append(key, value ?? ''));
      payload.append('address', JSON.stringify({ addressLine: form.address.trim() }));
      payload.append('qualifications', JSON.stringify([{ degree: form.qualification.trim() }]));
      if (photoFile) payload.append('photo', photoFile);
      if (removePhoto) payload.append('removePhoto', 'true');
      payload.append(
        'documentsKeep',
        JSON.stringify({
          aadhaar: form.documents.aadhaar.filter((item) => item.path).map((item) => item.path),
          others: form.documents.others.filter((item) => item.path).map((item) => item.path),
        })
      );
      DOCUMENT_CATEGORIES.forEach(({ key, field }) => {
        form.documents[key].filter((item) => item.file).forEach((item) => payload.append(field, item.file));
      });

      if (editingTeacher) {
        await principalAcademicApi.updateTeacher(editingTeacher.id, payload);
        showToast('Teacher updated', 'success');
      } else {
        await principalAcademicApi.createTeacher(payload);
        showToast('Teacher created', 'success');
      }
      resetModal();
      loadTeachers();
    } catch (error) {
      showToast(apiMessage(error, editingTeacher ? 'Unable to update teacher' : 'Unable to create teacher'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveTeacher = async (teacher) => {
    try {
      await principalHrApi.approveEmployee(teacher.id);
      showToast(`Teacher ${teacher.name || teacher.fullName} approved & activated!`, 'success');
      loadTeachers();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to approve teacher'), 'error');
    }
  };

  const handleToggleStatus = async (teacher) => {
    const nextStatus = teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await principalAcademicApi.updateTeacherStatus(teacher.id, nextStatus);
      showToast(`Teacher ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'success');
      loadTeachers();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to update teacher status'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await principalAcademicApi.deleteTeacher(deleteTarget.id);
      showToast('Teacher deleted', 'success');
      loadTeachers();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to delete teacher'), 'error');
    }
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      showToast('Please upload an image under 2MB', 'error');
      return;
    }
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const handleRemovePhoto = () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview('');
    setRemovePhoto(Boolean(editingTeacher?.profilePhoto));
  };

  const handleDocumentAdd = (category, fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    const remaining = MAX_DOC_IMAGES - (form.documents[category]?.length || 0);
    if (remaining <= 0) {
      showToast('Maximum 2 images allowed for this document', 'error');
      return;
    }
    const accepted = [];
    for (const file of incoming.slice(0, remaining)) {
      if (!file.type.startsWith('image/')) {
        showToast('Only image files are allowed', 'error');
        continue;
      }
      if (file.size > MAX_DOC_SIZE) {
        showToast('Please upload an image under 5MB', 'error');
        continue;
      }
      accepted.push({
        id: `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        preview: URL.createObjectURL(file),
        path: '',
        file,
      });
    }
    if (!accepted.length) return;
    setForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [category]: [...prev.documents[category], ...accepted].slice(0, MAX_DOC_IMAGES),
      },
    }));
  };

  const handleDocumentRemove = (category, id) => {
    setForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [category]: prev.documents[category].filter((item) => {
          if (item.id !== id) return true;
          if (item.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview);
          return false;
        }),
      },
    }));
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const columns = [
    { header: '#', key: 'serial' },
    {
      header: 'Teacher',
      key: 'name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          {row.profilePhoto ? (
            <img src={buildTeacherPhotoUrl(row.profilePhoto)} alt={val} className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
              {(val || 'T').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={() => navigate(`/principal/teachers/${row.id}`)}
              className="text-left font-bold text-slate-900 hover:text-primary dark:text-white"
            >
              {val}
            </button>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">{row.employeeId || 'No employee ID'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Contact',
      key: 'email',
      render: (_, row) => (
        <div>
          <p className="font-semibold text-slate-700 dark:text-slate-200">{row.email || 'No email'}</p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">{row.phone || 'No phone'}</p>
        </div>
      ),
    },
    {
      header: 'Qualification',
      key: 'qualification',
      render: (_, row) => {
        const qual = Array.isArray(row.qualifications)
          ? row.qualifications.map((item) => (typeof item === 'string' ? item : item?.degree)).filter(Boolean).join(', ')
          : row.qualification || '—';
        return (
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200">{qual || '—'}</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              Joined {row.joiningDate ? String(row.joiningDate).slice(0, 10) : '—'}
            </p>
          </div>
        );
      },
    },
    {
      header: 'Assignments',
      key: 'assignmentSummary',
      render: (_, row) => (
        <div>
          <p className="font-bold text-slate-800 dark:text-white">{row.counts?.totalAssignments ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            CT: {row.counts?.classTeacherSections ?? 0} | Subjects: {row.counts?.subjectAssignments ?? 0}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      filterable: true,
      render: (val) => <Badge variant={STATUS_VARIANT[val] || 'default'}>{val}</Badge>,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_, row) => {
        const isPending = row.status === 'PENDING_APPROVAL' || row.status === 'PENDING';
        return (
          <div className="flex items-center gap-1.5">
            {isPending && (
              <button
                type="button"
                onClick={() => handleApproveTeacher(row)}
                className="inline-flex h-8 items-center gap-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs cursor-pointer"
                title={`Approve ${row.name}`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Approve</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/principal/teachers/${row.id}`)}
              className="rounded-full p-1.5 text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
              title={`View ${row.name}`}
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleEdit(row)}
              className="rounded-full p-1.5 text-amber-500 transition hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer"
              title={`Edit ${row.name}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            {!isPending && (
              <button
                type="button"
                onClick={() => handleToggleStatus(row)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title={row.status === 'ACTIVE' ? `Deactivate ${row.name}` : `Activate ${row.name}`}
              >
                {row.status === 'ACTIVE' ? <Ban className="h-4 w-4 text-rose-500" /> : <Power className="h-4 w-4 text-emerald-500" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              className="rounded-full p-1.5 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
              title={`Delete ${row.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Teacher Management"
        subtitle="Create teacher records, review HR onboarding approvals, keep contact details updated, and control active access."
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Add Teacher
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Teachers" value={stats.total} hint="Complete teacher directory" icon={Users} />
        <SummaryCard title="Active" value={stats.active} hint="Available for assignment" icon={UserCheck} tone="text-emerald-600" />
        <SummaryCard title="Pending Approval" value={teachers.filter((t) => t.status === 'PENDING_APPROVAL' || t.status === 'PENDING').length} hint="Awaiting Admin Verification" icon={UserCheck} tone="text-amber-600" />
        <SummaryCard title="Assigned" value={stats.assigned} hint="Teachers with active allocations" icon={UserCheck} tone="text-indigo-600" />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'ALL', label: 'All', count: stats.total },
          { id: 'PENDING_APPROVAL', label: 'Pending Approvals', count: teachers.filter((t) => t.status === 'PENDING_APPROVAL' || t.status === 'PENDING').length },
          { id: 'ACTIVE', label: 'Active', count: stats.active },
          { id: 'INACTIVE', label: 'Inactive', count: stats.inactive },
          { id: 'ON_LEAVE', label: 'On Leave', count: teachers.filter((t) => t.status === 'ON_LEAVE').length },
          { id: 'SUSPENDED', label: 'Suspended', count: teachers.filter((t) => t.status === 'SUSPENDED').length },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStatusFilter(item.id)}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
              statusFilter === item.id
                ? 'bg-primary text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonTable rows={8} columns={5} />
      ) : teachers.length === 0 ? (
        <EmptyState
          title="No teachers added yet"
          description="Create teacher profiles first, then use active teachers in sections and subject assignments."
          action={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
            >
              Add First Teacher
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={tableRows}
          isLoading={loading}
          searchKeys={['employeeId', 'name', 'email', 'phone', 'status']}
          searchPlaceholder="Search by employee ID, teacher name, email, or phone..."
          emptyMessage="No teachers found for the selected filter."
          exportFilename="teachers.csv"
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={resetModal}
        title={editingTeacher ? 'Edit Teacher' : 'Add Teacher'}
        size="2xl"
        titleClassName="text-xl font-extrabold"
      >
        <form onSubmit={handleSave} className="space-y-5">
            <SectionBlock title="Basic Details" subtitle="Name and gender are required. Photo and date of birth are optional.">
              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950">
                <label className="mb-3 block text-xs font-bold text-slate-500">Profile Photo</label>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Teacher preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
                        <UserCircle2 className="h-10 w-10" />
                      </div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-white opacity-0 transition group-hover:opacity-100">
                      <Camera className="h-4 w-4" />
                    </span>
                  </button>
                  <div className="space-y-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200"
                      >
                        <ImagePlus className="h-3.5 w-3.5" />
                        {photoPreview ? 'Replace photo' : 'Upload photo'}
                      </button>
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-rose-500 hover:border-rose-200 dark:border-slate-700"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">Any image type. Converted to WebP after upload. Max 2MB.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-500">Full Name *</label>
                  <input className={inputClass} value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="Rahul Sharma" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Gender *</label>
                  <select className={inputClass} value={form.gender} onChange={(e) => updateField('gender', e.target.value)} required>
                    {GENDERS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Date of Birth</label>
                  <input type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
                </div>
              </div>
            </SectionBlock>

            <SectionBlock title="Contact Details" subtitle="Mobile number is required; email and address are optional.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Mobile Number *</label>
                  <input className={inputClass} value={form.mobileNumber} onChange={(e) => updateField('mobileNumber', e.target.value)} placeholder="+91 98XXXXXXXX" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Email</label>
                  <input type="email" className={inputClass} value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="teacher@school.com" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-500">Address</label>
                  <textarea className={textAreaClass} value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="House no, street, locality, city" />
                </div>
              </div>
            </SectionBlock>

            <SectionBlock
              title="Professional Details"
              subtitle="Employee ID, qualification, and joining date are required."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Employee ID *</label>
                  <input className={inputClass} value={form.employeeId} onChange={(e) => updateField('employeeId', e.target.value)} placeholder="TCH-1001" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Qualification *</label>
                  <input className={inputClass} value={form.qualification} onChange={(e) => updateField('qualification', e.target.value)} placeholder="M.Sc, B.Ed" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Joining Date *</label>
                  <input type="date" className={inputClass} value={form.joiningDate} onChange={(e) => updateField('joiningDate', e.target.value)} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Experience</label>
                  <input className={inputClass} value={form.experienceSummary} onChange={(e) => updateField('experienceSummary', e.target.value)} placeholder="8 years of classroom teaching" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Department *</label>
                  <select className={inputClass} value={form.department} onChange={(e) => updateField('department', e.target.value)} required>
                    <option value="">Select department</option>
                    {departments
                      .filter((d) => d.status === 'ACTIVE' || d.name === form.department)
                      .map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Designation *</label>
                  <select className={inputClass} value={form.designation} onChange={(e) => updateField('designation', e.target.value)} required>
                    <option value="">Select designation</option>
                    {designations
                      .filter((d) => d.status === 'ACTIVE' || d.title === form.designation)
                      .map((d) => (
                        <option key={d.id} value={d.title}>
                          {d.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">
                Class, section, and subject assignments are managed from the academic year flow. Login credentials are generated separately, so no username or password is needed here. Manage Department/Designation options from the sidebar under People.
              </div>
            </SectionBlock>

            <SectionBlock title="Documents" subtitle="Any image type is allowed and converted to WebP after upload.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {DOCUMENT_CATEGORIES.map((category) => {
                  const items = form.documents[category.key] || [];
                  const canAdd = items.length < MAX_DOC_IMAGES;
                  return (
                    <div key={category.key} className="rounded-2xl border border-slate-200 p-4 text-center dark:border-slate-800">
                      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{category.label}</p>
                      <p className="mb-3 mt-1 text-[11px] text-slate-500">{category.hint} Up to 2 images, max 5MB each.</p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {items.map((item) => (
                          <div key={item.id} className="relative w-40 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                            <img src={item.preview} alt={category.label} className="h-32 w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleDocumentRemove(category.key, item.id)}
                              className="absolute right-2 top-2 rounded-lg bg-white/90 p-1 text-rose-500 shadow-sm hover:bg-white"
                              aria-label={`Remove ${category.label}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        {canAdd && (
                          <label className="flex h-32 w-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 text-slate-400 hover:border-primary hover:text-primary dark:border-slate-700">
                            <ImagePlus className="h-5 w-5" />
                            <span className="text-[11px] font-bold">{items.length ? 'Add image' : 'Upload image'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                handleDocumentAdd(category.key, event.target.files);
                                event.target.value = '';
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionBlock>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={resetModal} className="rounded-xl px-4 py-2 text-xs font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {saving ? 'Saving...' : editingTeacher ? 'Update Teacher' : 'Save Teacher'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Teacher"
        message={`"${deleteTarget?.name}" will be permanently removed. Teachers with class or subject assignments cannot be deleted — deactivate them instead.`}
        confirmText="Delete Teacher"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default TeacherManagement;

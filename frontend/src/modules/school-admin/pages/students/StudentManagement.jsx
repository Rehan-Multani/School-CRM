import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { CountCards, EmptyState } from '../academics/components/AcademicUi';
import { apiMessage, ENTITY_STATUS_VARIANT } from '../academics/utils';
import { academicPortalApi, schoolPortalApi } from '../../../../shared/api/client';
import { Camera, Edit3, Eye, ImagePlus, Loader2, Plus, Trash2, UserCheck, UserCircle2, UserX, X } from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const MAX_DOC_IMAGES = 2;
const MAX_DOC_SIZE = 5 * 1024 * 1024;

const DOCUMENT_CATEGORIES = [
  { key: 'aadhaar', label: 'Aadhaar Card Photo', field: 'aadhaarDocuments', hint: 'Front and back.' },
  { key: 'marksheet', label: 'Previous Year\'s Marksheet', field: 'marksheetDocuments', hint: 'Grade sheet / report card.' },
];

const defaultForm = {
  admissionNumber: '',
  firstName: '',
  lastName: '',
  gender: 'MALE',
  dateOfBirth: '',
  email: '',
  phone: '',
  parentName: '',
  parentPhone: '',
  address: '',
  academicYearId: '',
  classId: '',
  sectionId: '',
  rollNumber: '',
  enrollmentDate: '',
  status: 'ACTIVE',
  removePhoto: false,
  documents: { aadhaar: [], marksheet: [] },
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildStudentPhotoUrl(photo) {
  if (!photo) return '';
  if (/^(https?:|data:|blob:)/.test(photo)) return photo;
  const _rel = photo.startsWith('/') ? photo : `/${photo}`;
  const _tok = ['school_admin_token','principal_token','accountant_token','hr_token','librarian_token','transport_token','super_admin_token'].reduce((a, k) => a || localStorage.getItem(k), '');
  return `${API_BASE_URL}/platform${_rel}${_tok ? `?t=${encodeURIComponent(_tok)}` : ''}`;
}

function documentsFromStudent(student) {
  const docs = student?.documents;
  const empty = { aadhaar: [], marksheet: [] };
  if (!docs || Array.isArray(docs) || typeof docs !== 'object') return empty;

  return {
    aadhaar: (docs.aadhaar || []).map((path) => ({
      id: `aadhaar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      preview: buildStudentPhotoUrl(path),
      path,
      file: null,
    })),
    marksheet: (docs.marksheet || []).map((path) => ({
      id: `marksheet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      preview: buildStudentPhotoUrl(path),
      path,
      file: null,
    })),
  };
}

function revokeDocumentPreviews(documents) {
  if (!documents) return;
  Object.values(documents).flat().forEach((item) => {
    if (item.preview?.startsWith('blob:')) {
      URL.revokeObjectURL(item.preview);
    }
  });
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
  const src = buildStudentPhotoUrl(photo);
  if (src) {
    return <img src={src} alt={name} className={`${className} rounded-2xl object-cover`} />;
  }
  return (
    <div className={`${className} flex items-center justify-center rounded-2xl bg-slate-100 font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300`}>
      {getInitials(name)}
    </div>
  );
}

export const StudentManagement = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({
    academicYearId: '',
    classId: '',
    sectionId: '',
    status: '',
  });
  const [form, setForm] = useState(defaultForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [yearClassMap, setYearClassMap] = useState({});
  const photoInputRef = useRef(null);
  const yearClassRequestRef = useRef({});

  const loadYearClasses = useCallback(async (yearId) => {
    if (!yearId || yearClassRequestRef.current[yearId]) return;
    yearClassRequestRef.current[yearId] = true;
    try {
      const result = await academicPortalApi.yearClasses(yearId);
      const classIds = (result.data || [])
        .filter((mapping) => mapping.class?.status !== 'INACTIVE')
        .map((mapping) => mapping.classId);
      setYearClassMap((prev) => ({ ...prev, [yearId]: classIds }));
    } catch (error) {
      // Mapping unavailable — fall back to the full class list for this year.
      yearClassRequestRef.current[yearId] = false;
    }
  }, []);

  useEffect(() => {
    loadYearClasses(form.academicYearId);
  }, [form.academicYearId, loadYearClasses]);

  useEffect(() => {
    loadYearClasses(filters.academicYearId);
  }, [filters.academicYearId, loadYearClasses]);

  const classesForYear = useCallback(
    (yearId, keepClassId) => {
      const allowedIds = yearClassMap[yearId];
      if (!yearId || !Array.isArray(allowedIds)) return classes;
      const allowed = new Set(allowedIds);
      return classes.filter((item) => allowed.has(item.id) || item.id === keepClassId);
    },
    [classes, yearClassMap]
  );

  const formClasses = useMemo(
    () => classesForYear(form.academicYearId, form.classId),
    [classesForYear, form.academicYearId, form.classId]
  );

  const filterClasses = useMemo(
    () => classesForYear(filters.academicYearId, filters.classId),
    [classesForYear, filters.academicYearId, filters.classId]
  );

  const filteredSections = useMemo(() => {
    if (!form.academicYearId || !form.classId) return [];
    return sections.filter((section) => {
      if (section.academicYearId !== form.academicYearId) return false;
      if (section.classId !== form.classId) return false;
      return section.status !== 'INACTIVE';
    });
  }, [form.academicYearId, form.classId, sections]);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const editParam = searchParams.get('edit');

  useEffect(() => {
    if (!editParam || !students.length) return;
    const target = students.find((student) => student.id === editParam);
    if (target) openEditModal(target);
    setSearchParams({}, { replace: true });
  }, [editParam, students, setSearchParams]);

  const loadReferenceData = useCallback(async () => {
    const [yearResult, classResult, sectionResult] = await Promise.all([
      academicPortalApi.years({ limit: 100 }),
      academicPortalApi.classes({ limit: 100 }),
      academicPortalApi.sections({}),
    ]);

    const yearData = yearResult.data || [];
    setYears(yearData);
    setClasses((classResult.data || []).filter((item) => item.status !== 'INACTIVE'));
    setSections(sectionResult.data || []);

    const currentYear = yearData.find((item) => item.isCurrent) || yearData.find((item) => item.status === 'ACTIVE');
    setForm((prev) => ({
      ...prev,
      academicYearId: prev.academicYearId || currentYear?.id || '',
    }));
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.academicYearId) params.academicYearId = filters.academicYearId;
      if (filters.classId) params.classId = filters.classId;
      if (filters.sectionId) params.sectionId = filters.sectionId;
      if (filters.status) params.status = filters.status;
      const result = await schoolPortalApi.students(params);
      setStudents(result.data || []);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load students'), 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    Promise.all([loadReferenceData(), loadStudents()]).catch((error) => {
      showToast(apiMessage(error, 'Unable to initialise student management'), 'error');
      setLoading(false);
    });
  }, [loadReferenceData, loadStudents, showToast]);

  const stats = useMemo(() => {
    const active = students.filter((item) => item.status === 'ACTIVE').length;
    const inactive = students.filter((item) => item.status === 'INACTIVE').length;
    const withdrawn = students.filter((item) => item.enrollment?.status === 'WITHDRAWN').length;
    return [
      { label: 'Total Students', value: students.length },
      { label: 'Active', value: active },
      { label: 'Inactive', value: inactive },
      { label: 'Withdrawn', value: withdrawn },
    ];
  }, [students]);

  const resetForm = () => {
    if (photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    revokeDocumentPreviews(form.documents);
    const currentYear = years.find((item) => item.isCurrent) || years.find((item) => item.status === 'ACTIVE');
    setForm({
      ...defaultForm,
      academicYearId: currentYear?.id || '',
    });
    setEditingStudent(null);
    setPhotoFile(null);
    setPhotoPreview('');
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = async (student) => {
    setSaving(true);
    try {
      const result = await schoolPortalApi.getStudent(student.id);
      const data = result.data;
      setEditingStudent(data);
      setForm({
        admissionNumber: data.admissionNumber || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        gender: data.gender || 'OTHER',
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().slice(0, 10) : '',
        removePhoto: false,
        email: data.email || '',
        phone: data.phone || '',
        parentName: data.parentName || '',
        parentPhone: data.parentPhone || '',
        address: data.address || '',
        academicYearId: data.enrollment?.academicYearId || '',
        classId: data.enrollment?.classId || '',
        sectionId: data.enrollment?.sectionId || '',
        rollNumber: data.enrollment?.rollNumber || '',
        enrollmentDate: data.enrollment?.enrollmentDate
          ? new Date(data.enrollment.enrollmentDate).toISOString().slice(0, 10)
          : '',
        status: data.status || 'ACTIVE',
        documents: documentsFromStudent(data),
      });
      setPhotoFile(null);
      setPhotoPreview(buildStudentPhotoUrl(data.photo));
      setModalOpen(true);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load student details'), 'error');
    } finally {
      setSaving(false);
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

    if (photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setForm((prev) => ({ ...prev, removePhoto: false }));
  };

  const handleRemovePhoto = () => {
    if (photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview('');
    setForm((prev) => ({ ...prev, removePhoto: Boolean(editingStudent?.photo) }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      const values = {
        ...form,
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        rollNumber: form.rollNumber.trim(),
      };

      delete values.documents;

      Object.entries(values).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        payload.append(key, typeof value === 'boolean' ? String(value) : value);
      });

      if (!form.dateOfBirth) payload.delete('dateOfBirth');
      if (!form.enrollmentDate) payload.delete('enrollmentDate');
      if (!form.removePhoto) payload.delete('removePhoto');
      if (photoFile) payload.append('photo', photoFile);

      if (form.documents) {
        if (editingStudent) {
          const keepAadhaar = form.documents.aadhaar.filter((item) => item.path).map((item) => item.path);
          const keepMarksheet = form.documents.marksheet.filter((item) => item.path).map((item) => item.path);

          const originalDocs = editingStudent.documents || { aadhaar: [], marksheet: [] };
          const originalAadhaar = originalDocs.aadhaar || [];
          const originalMarksheet = originalDocs.marksheet || [];
          const removedAadhaar = originalAadhaar.filter((p) => !keepAadhaar.includes(p));
          const removedMarksheet = originalMarksheet.filter((p) => !keepMarksheet.includes(p));
          const removed = [...removedAadhaar, ...removedMarksheet];

          if (removed.length > 0) {
            payload.append('removeDocuments', JSON.stringify(removed));
          }
        }

        DOCUMENT_CATEGORIES.forEach(({ key, field }) => {
          form.documents[key].filter((item) => item.file).forEach((item) => payload.append(field, item.file));
        });
      }

      if (editingStudent) {
        await schoolPortalApi.updateStudent(editingStudent.id, payload);
        showToast('Student updated', 'success');
      } else {
        await schoolPortalApi.createStudent(payload);
        showToast('Student created', 'success');
      }

      setModalOpen(false);
      resetForm();
      loadStudents();
    } catch (error) {
      showToast(apiMessage(error, editingStudent ? 'Unable to update student' : 'Unable to create student'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (student) => {
    const nextStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await schoolPortalApi.updateStudentStatus(student.id, nextStatus);
      showToast(`Student ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'success');
      loadStudents();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to update status'), 'error');
    }
  };

  const handleDelete = (student) => {
    setDeleteTarget(student);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await schoolPortalApi.deleteStudent(deleteTarget.id);
      showToast('Student deleted', 'success');
      loadStudents();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to delete student'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleView = (student) => {
    navigate(`/school-admin/students/${student.id}`);
  };

  const tableRows = useMemo(() => {
    return students.map((student) => ({
      ...student,
      name: student.name || [student.firstName, student.lastName].filter(Boolean).join(' '),
      className: student.enrollment?.class?.name || '—',
      sectionName: student.enrollment?.section?.name || '—',
      academicYearName: student.enrollment?.academicYear?.name || '—',
      enrollmentStatus: student.enrollment?.status || '—',
      guardianPhone: student.parentPhone || student.phone || '—',
      photoUrl: buildStudentPhotoUrl(student.photo),
    }));
  }, [students]);

  const columns = [
    {
      header: 'Student',
      key: 'name',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <StudentAvatar name={row.name} photo={row.photo} className="h-11 w-11" />
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{row.name}</p>
            <p className="text-[11px] text-slate-500">{row.admissionNumber}</p>
          </div>
        </div>
      ),
    },
    { header: 'Academic Year', key: 'academicYearName' },
    {
      header: 'Class / Section',
      key: 'className',
      render: (_, row) => `${row.className} / ${row.sectionName}`,
    },
    { header: 'Guardian', key: 'parentName' },
    { header: 'Phone', key: 'guardianPhone' },
    {
      header: 'Student Status',
      key: 'status',
      render: (value) => <Badge variant={ENTITY_STATUS_VARIANT[value] || 'default'}>{value}</Badge>,
    },
    {
      header: 'Enrollment',
      key: 'enrollmentStatus',
      render: (value) => (
        <Badge variant={value === 'ACTIVE' ? 'success' : value === 'WITHDRAWN' ? 'warning' : 'default'}>{value}</Badge>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleView(row)}
            className="rounded-full p-1.5 text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
            title={`View ${row.name}`}
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="rounded-full p-1.5 text-amber-500 transition hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer"
            title={`Edit ${row.name}`}
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title={row.status === 'ACTIVE' ? `Deactivate ${row.name}` : `Activate ${row.name}`}
          >
            {row.status === 'ACTIVE' ? <UserX className="h-4 w-4 text-rose-500" /> : <UserCheck className="h-4 w-4 text-emerald-500" />}
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="rounded-full p-1.5 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
            title={`Delete ${row.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Management"
        subtitle="Create, update, and monitor student records with enrollment-aware activate and deactivate controls."
        actions={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Add Student
          </button>
        }
      />

      <CountCards items={stats} />

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Academic Year</label>
          <select
            value={filters.academicYearId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, academicYearId: e.target.value, classId: '', sectionId: '' }))
            }
            className={inputClass}
          >
            <option value="">All academic years</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Class</label>
          <select
            value={filters.classId}
            onChange={(e) => setFilters((prev) => ({ ...prev, classId: e.target.value, sectionId: '' }))}
            className={inputClass}
          >
            <option value="">All classes</option>
            {filterClasses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Section</label>
          <select
            value={filters.sectionId}
            onChange={(e) => setFilters((prev) => ({ ...prev, sectionId: e.target.value }))}
            className={inputClass}
          >
            <option value="">All sections</option>
            {sections
              .filter((section) => {
                if (filters.academicYearId && section.academicYearId !== filters.academicYearId) return false;
                if (filters.classId && section.classId !== filters.classId) return false;
                return section.status !== 'INACTIVE';
              })
              .map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className={inputClass}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : students.length === 0 ? (
        <EmptyState
          title="No students found"
          description="Start by adding a student record and mapping them to the correct academic year, class, and section."
          action={
            <button type="button" onClick={openCreateModal} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white">
              Add Student
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={tableRows}
          onRowClick={handleView}
          searchPlaceholder="Search by student, admission number, parent, or email..."
          emptyMessage="No students match the current filters."
          exportFilename="students.csv"
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingStudent ? 'Edit Student' : 'Add Student'}
        size="xl"
        titleClassName="text-xl font-extrabold"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950">
            <label className="mb-3 block text-xs font-bold text-slate-500">Profile Photo</label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Student preview" className="h-full w-full object-cover" />
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
                  accept="image/png,image/jpeg,image/jpg,image/webp"
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
                <p className="text-[11px] text-slate-500">JPG, PNG, or WebP. Max size 2MB.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Admission Number *</label>
              <input className={inputClass} placeholder="e.g. ADM-2026-001" value={form.admissionNumber} onChange={(e) => setForm((prev) => ({ ...prev, admissionNumber: e.target.value }))} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Roll Number</label>
              <input className={inputClass} placeholder="e.g. 17" value={form.rollNumber} onChange={(e) => setForm((prev) => ({ ...prev, rollNumber: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">First Name *</label>
              <input className={inputClass} placeholder="e.g. Aarav" value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Last Name</label>
              <input className={inputClass} placeholder="e.g. Sharma" value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Gender *</label>
              <select className={inputClass} value={form.gender} onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Date of Birth</label>
              <input type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Enrollment Date</label>
              <input type="date" className={inputClass} value={form.enrollmentDate} onChange={(e) => setForm((prev) => ({ ...prev, enrollmentDate: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Parent / Guardian Name *</label>
              <input className={inputClass} placeholder="e.g. Rajesh Sharma" value={form.parentName} onChange={(e) => setForm((prev) => ({ ...prev, parentName: e.target.value }))} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Parent / Guardian Phone *</label>
              <input className={inputClass} placeholder="e.g. +91 98765 43210" value={form.parentPhone} onChange={(e) => setForm((prev) => ({ ...prev, parentPhone: e.target.value }))} required />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Student Email</label>
              <input type="email" className={inputClass} placeholder="e.g. aarav.sharma@school.edu" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Student Phone</label>
              <input className={inputClass} placeholder="e.g. +91 98765 12345" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Address</label>
            <textarea className="min-h-[88px] w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950" placeholder="House / street / locality" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Academic Year *</label>
              <select
                className={inputClass}
                value={form.academicYearId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, academicYearId: e.target.value, classId: '', sectionId: '' }))
                }
                required
              >
                <option value="">Select academic year</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Class *</label>
              <select
                className={inputClass}
                value={form.classId}
                onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value, sectionId: '' }))}
                required
                disabled={!form.academicYearId}
              >
                <option value="">
                  {!form.academicYearId
                    ? 'Select academic year first'
                    : formClasses.length === 0
                      ? 'No classes in this academic year'
                      : 'Select class'}
                </option>
                {formClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Section *</label>
              <select
                className={inputClass}
                value={form.sectionId}
                onChange={(e) => setForm((prev) => ({ ...prev, sectionId: e.target.value }))}
                required
                disabled={!form.classId}
              >
                <option value="">
                  {!form.classId
                    ? 'Select class first'
                    : filteredSections.length === 0
                      ? 'No sections for this class'
                      : 'Select section'}
                </option>
                {filteredSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500">Status</label>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, status: 'ACTIVE' }))}
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
                onClick={() => setForm((prev) => ({ ...prev, status: 'INACTIVE' }))}
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

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950">
            <label className="mb-2 block text-xs font-bold text-slate-500">Student Documents</label>
            <p className="mb-3 text-[11px] text-slate-400">Upload Aadhaar card and previous year's marksheet. Images are converted to WebP after upload.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {DOCUMENT_CATEGORIES.map((category) => {
                const items = form.documents?.[category.key] || [];
                const canAdd = items.length < MAX_DOC_IMAGES;
                return (
                  <div key={category.key} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{category.label}</p>
                    <p className="mb-3 text-[10px] text-slate-400">{category.hint} Up to 2 images, max 5MB each.</p>
                    <div className="flex flex-wrap gap-2">
                      {items.map((item) => (
                        <div key={item.id} className="relative w-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                          <img src={item.preview} alt={category.label} className="h-20 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleDocumentRemove(category.key, item.id)}
                            className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-rose-500 shadow-sm hover:bg-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {canAdd && (
                        <label className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-primary hover:text-primary dark:border-slate-700">
                          <ImagePlus className="h-4 w-4" />
                          <span className="text-[10px] font-bold">Upload image</span>
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
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {saving ? 'Saving...' : editingStudent ? 'Update Student' : 'Create Student'}
            </button>
          </div>
        </form>
      </Modal>



      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Student"
        message={`Delete ${deleteTarget?.name}? This will remove the student record and enrollment history.`}
        confirmText="Delete Student"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default StudentManagement;

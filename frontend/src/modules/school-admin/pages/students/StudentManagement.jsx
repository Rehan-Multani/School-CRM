import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { CountCards, EmptyState } from '../academics/components/AcademicUi';
import { apiMessage, ENTITY_STATUS_VARIANT } from '../academics/utils';
import { sanitizeMobileInput, isValid10DigitMobile } from '../../../../shared/utils/mobileValidation';
import { academicPortalApi, feePortalApi, schoolPortalApi } from '../../../../shared/api/client';
import { ArrowUpRight, Camera, Edit3, Eye, FileUp, ImagePlus, LogOut, Loader2, Plus, UserCheck, UserCircle2, UserX, Wallet, X } from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { formatCurrency } from '../../utils/formatters';
import { fetchAllPages } from '../../../../shared/lib/exportRows';
import { PromoteStudentsModal } from './PromoteStudentsModal';
import { TransferStudentModal } from './TransferStudentModal';
import { ImportStudentsModal } from './ImportStudentsModal';
import { IndiaLocationFields } from '../../components/ui/IndiaLocationFields';

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

const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Other'];
const CASTE_CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'];

const HOUSE_SUGGESTIONS = ['Red House', 'Blue House', 'Green House', 'Yellow House'];

const defaultForm = {
  admissionNumber: '',
  firstName: '',
  lastName: '',
  gender: 'MALE',
  dateOfBirth: '',
  religion: '',
  casteCategory: '',
  caste: '',
  state: '',
  city: '',
  village: '',
  house: '',
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
  if (!value) return 'â';
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

function yearlyAmount(item) {
  const amt = Number(item.amount) || 0;
  switch (item.frequency) {
    case 'MONTHLY':
      return amt * 12;
    case 'QUARTERLY':
      return amt * 4;
    case 'HALF_YEARLY':
      return amt * 2;
    default:
      return amt; // YEARLY / ONE_TIME
  }
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
  // The list is fetched one page at a time; search and paging happen on the server.
  const [pager, setPager] = useState({ page: 1, pageSize: 10, search: '' });
  const [total, setTotal] = useState(0);
  const [serverStats, setServerStats] = useState({ total: 0, active: 0, inactive: 0, withdrawn: 0 });
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({
    academicYearId: '',
    classId: '',
    sectionId: '',
    status: '',
    feeStatus: '',
    minDue: '',
  });
  const [form, setForm] = useState(defaultForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [yearClassMap, setYearClassMap] = useState({});
  const [feeStructurePreview, setFeeStructurePreview] = useState(undefined);
  const [loadingFeePreview, setLoadingFeePreview] = useState(false);
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
      // Mapping unavailable ââââââ fall back to the full class list for this year.
      yearClassRequestRef.current[yearId] = false;
    }
  }, []);

  useEffect(() => {
    loadYearClasses(form.academicYearId);
  }, [form.academicYearId, loadYearClasses]);

  useEffect(() => {
    loadYearClasses(filters.academicYearId);
  }, [filters.academicYearId, loadYearClasses]);

  // Preview the applicable class fee structure as soon as a class + academic
  // year is picked in the Add/Edit Student form.
  useEffect(() => {
    if (!modalOpen || !form.classId || !form.academicYearId) {
      setFeeStructurePreview(undefined);
      return;
    }
    let cancelled = false;
    setLoadingFeePreview(true);
    feePortalApi
      .structures({ academicYearId: form.academicYearId, classId: form.classId, status: 'ACTIVE', limit: 1 })
      .then((res) => {
        const match = (res.data || [])[0];
        if (!match) return null;
        return feePortalApi.getStructure(match.id);
      })
      .then((detail) => {
        if (cancelled) return;
        setFeeStructurePreview(detail?.data || null);
      })
      .catch(() => {
        if (!cancelled) setFeeStructurePreview(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingFeePreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, form.classId, form.academicYearId]);

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

  const feeStructureMandatoryTotal = useMemo(() => {
    if (!feeStructurePreview?.items) return 0;
    return feeStructurePreview.items
      .filter((item) => !item.isOptional)
      .reduce((sum, item) => sum + yearlyAmount(item), 0);
  }, [feeStructurePreview]);

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

  const filterParams = useCallback(() => {
    const params = {};
    if (filters.academicYearId) params.academicYearId = filters.academicYearId;
    if (filters.classId) params.classId = filters.classId;
    if (filters.sectionId) params.sectionId = filters.sectionId;
    if (filters.status) params.status = filters.status;
    if (filters.feeStatus) params.feeStatus = filters.feeStatus;
    if (filters.minDue) params.minDue = filters.minDue;
    if (pager.search) params.search = pager.search;
    return params;
  }, [filters, pager.search]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await schoolPortalApi.students({ ...filterParams(), page: pager.page, limit: pager.pageSize });
      setStudents(result.data || []);
      setTotal(result.pagination?.total ?? (result.data || []).length);
      if (result.stats) setServerStats(result.stats);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load students'), 'error');
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, [filterParams, pager.page, pager.pageSize, showToast]);

  // A changed filter starts again from the first page.
  const updateFilters = useCallback((updater) => {
    setFilters(updater);
    setPager((prev) => ({ ...prev, page: 1 }));
  }, []);

  useEffect(() => {
    loadReferenceData().catch((error) => {
      showToast(apiMessage(error, 'Unable to initialise student management'), 'error');
    });
  }, [loadReferenceData, showToast]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Counts come from the server, for the selected year / class / section.
  const stats = useMemo(
    () => [
      { label: 'Total Students', value: serverStats.total },
      { label: 'Active', value: serverStats.active },
      { label: 'Inactive', value: serverStats.inactive },
      { label: 'Withdrawn', value: serverStats.withdrawn },
    ],
    [serverStats]
  );

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
        religion: data.religion || '',
        casteCategory: data.casteCategory || '',
        caste: data.caste || '',
        state: data.state || '',
        city: data.city || '',
        village: data.village || '',
        house: data.house || '',
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

  useEffect(() => {
    if (!editParam) return;
    // The student may not be on the page currently shown; the modal loads by id.
    openEditModal({ id: editParam });
    setSearchParams({}, { replace: true });
  }, [editParam, setSearchParams]);

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

    if (!isValid10DigitMobile(form.parentPhone, true)) {
      showToast('Parent / Guardian phone must be exactly 10 digits', 'error');
      return;
    }

    if (form.phone && !isValid10DigitMobile(form.phone, false)) {
      showToast('Student phone must be exactly 10 digits', 'error');
      return;
    }

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
      // Sent even when blank so an edit can clear them.
      ['religion', 'casteCategory', 'caste', 'state', 'city', 'village', 'house'].forEach((key) => payload.set(key, (form[key] || '').trim()));
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

  const handleView = (student) => {
    navigate(`/school-admin/students/${student.id}`);
  };

  const toTableRows = (list) =>
    list.map((student) => ({
      ...student,
      name: student.name || [student.firstName, student.lastName].filter(Boolean).join(' '),
      className: student.enrollment?.class?.name || 'â',
      sectionName: student.enrollment?.section?.name || 'â',
      academicYearName: student.enrollment?.academicYear?.name || 'â',
      enrollmentStatus: student.enrollment?.status || 'â',
      guardianPhone: student.parentPhone || student.phone || 'â',
      photoUrl: buildStudentPhotoUrl(student.photo),
    }));

  const tableRows = useMemo(() => toTableRows(students), [students]);

  // Excel / PDF / CSV cover every student matching the filters, not just this page.
  const getExportRows = async () => {
    try {
      const all = await fetchAllPages(schoolPortalApi.students, filterParams(), { limit: 100, maxPages: 100 });
      return all.map((st) => ({
        'Admission No': st.admissionNumber || '',
        Name: st.name || [st.firstName, st.lastName].filter(Boolean).join(' '),
        Class: st.enrollment?.class?.name || '',
        Section: st.enrollment?.section?.name || '',
        'Academic Year': st.enrollment?.academicYear?.name || '',
        Gender: st.gender || '',
        'Date of Birth': st.dateOfBirth ? String(st.dateOfBirth).slice(0, 10) : '',
        Guardian: st.parentName || '',
        Phone: st.parentPhone || st.phone || '',
        Email: st.email || '',
        'Fee Due': Number(st.feeDue) || 0,
        'Fee Overdue': Number(st.feeOverdue) || 0,
        Status: st.status || '',
      }));
    } catch (error) {
      showToast(apiMessage(error, 'Unable to export students'), 'error');
      return [];
    }
  };

  const exportSubtitle = () => {
    const parts = [];
    const year = years.find((y) => y.id === filters.academicYearId);
    const cls = classes.find((c) => c.id === filters.classId);
    const sec = sections.find((c) => c.id === filters.sectionId);
    if (year) parts.push(`Year: ${year.name}`);
    if (cls) parts.push(`Class: ${cls.name}${sec ? " - " + sec.name : ""}`);
    if (filters.status) parts.push(`Status: ${filters.status}`);
    if (filters.feeStatus) parts.push(`Fee: ${filters.feeStatus === 'DUE' ? 'Has dues' : filters.feeStatus === 'OVERDUE' ? 'Overdue' : 'No dues'}`);
    if (filters.minDue) parts.push(`Due ≥ ₹${filters.minDue}`);
    if (pager.search) parts.push(`Search: ${pager.search}`);
    return parts.join('  |  ');
  };

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
      header: 'Fee Due',
      key: 'feeDue',
      render: (value, row) =>
        Number(value) > 0 ? (
          <span className="font-bold text-rose-600">
            {formatCurrency(value)}
            {Number(row.feeOverdue) > 0 && <span className="block text-[10px] font-bold text-rose-400">Overdue {formatCurrency(row.feeOverdue)}</span>}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-emerald-600">Clear</span>
        ),
    },
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
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-indigo-600 cursor-pointer"
            title={row.status === 'ACTIVE' ? `Deactivate ${row.name}` : `Activate ${row.name}`}
          >
            {row.status === 'ACTIVE' ? <UserX className="h-4 w-4 text-rose-500" /> : <UserCheck className="h-4 w-4 text-emerald-500" />}
          </button>
          <button
            type="button"
            onClick={() => setTransferTarget(row)}
            className="rounded-full p-1.5 text-violet-500 transition hover:bg-violet-50 dark:hover:bg-violet-950/50 cursor-pointer"
            title={row.leaving ? `Leaving details / TC for ${row.name}` : `Transfer / TC for ${row.name}`}
          >
            <LogOut className="h-4 w-4" />
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              <FileUp className="h-3.5 w-3.5" /> Import CSV
            </button>
            <button
              type="button"
              onClick={() => setPromoteOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              <ArrowUpRight className="h-3.5 w-3.5" /> Promote students
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add Student
            </button>
          </div>
        }
      />

      <CountCards items={stats} />

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 lg:grid-cols-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Academic Year</label>
          <select
            value={filters.academicYearId}
            onChange={(e) =>
              updateFilters((prev) => ({ ...prev, academicYearId: e.target.value, classId: '', sectionId: '' }))
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
            onChange={(e) => updateFilters((prev) => ({ ...prev, classId: e.target.value, sectionId: '' }))}
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
            onChange={(e) => updateFilters((prev) => ({ ...prev, sectionId: e.target.value }))}
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
            onChange={(e) => updateFilters((prev) => ({ ...prev, status: e.target.value }))}
            className={inputClass}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Fee status</label>
          <select
            value={filters.feeStatus}
            onChange={(e) => updateFilters((prev) => ({ ...prev, feeStatus: e.target.value }))}
            className={inputClass}
          >
            <option value="">All students</option>
            <option value="DUE">Has fee dues</option>
            <option value="OVERDUE">Overdue fees</option>
            <option value="CLEAR">No dues</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Due at least (₹)</label>
          <input
            type="number"
            min="0"
            value={filters.minDue}
            onChange={(e) => updateFilters((prev) => ({ ...prev, minDue: e.target.value, feeStatus: prev.feeStatus || (e.target.value ? "DUE" : "") }))}
            placeholder="e.g. 5000"
            className={inputClass}
          />
        </div>
      </div>

      {!loadedOnce ? (
        <SkeletonTable rows={8} columns={6} />
      ) : serverStats.total === 0 && !pager.search && !filters.status ? (
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
          loading={loading}
          server={{
            total,
            page: pager.page,
            pageSize: pager.pageSize,
            onChange: setPager,
            getExportRows,
          }}
          onRowClick={handleView}
          searchPlaceholder="Search by student, admission number, parent, or email..."
          emptyMessage="No students match the current filters."
          exportFilename="students.csv"
          exportSubtitle={exportSubtitle()}
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
              <label className="mb-1 block text-xs font-bold text-slate-500">Date of Birth *</label>
              <input type="date" required max={new Date().toISOString().split('T')[0]} className={inputClass} value={form.dateOfBirth} onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Enrollment Date</label>
              <input type="date" className={inputClass} value={form.enrollmentDate} onChange={(e) => setForm((prev) => ({ ...prev, enrollmentDate: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Religion</label>
              <select className={inputClass} value={form.religion} onChange={(e) => setForm((prev) => ({ ...prev, religion: e.target.value }))}>
                <option value="">Select religion</option>
                {RELIGIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Caste Category</label>
              <select className={inputClass} value={form.casteCategory} onChange={(e) => setForm((prev) => ({ ...prev, casteCategory: e.target.value }))}>
                <option value="">Select category</option>
                {CASTE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Caste</label>
              <input className={inputClass} placeholder="Write caste, e.g. Maratha" maxLength={80} value={form.caste} onChange={(e) => setForm((prev) => ({ ...prev, caste: e.target.value }))} />
            </div>
          </div>

          <IndiaLocationFields
            value={form}
            inputClass={inputClass}
            labelClass="mb-1 block text-xs font-bold text-slate-500"
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Group / House</label>
              <input
                className={inputClass}
                list="student-house-options"
                placeholder="e.g. Red House"
                maxLength={60}
                value={form.house}
                onChange={(e) => setForm((prev) => ({ ...prev, house: e.target.value }))}
              />
              <datalist id="student-house-options">
                {HOUSE_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Parent / Guardian Name *</label>
              <input className={inputClass} placeholder="e.g. Rajesh Sharma" value={form.parentName} onChange={(e) => setForm((prev) => ({ ...prev, parentName: e.target.value }))} required />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500">Parent / Guardian Phone *</label>
                {form.parentPhone ? (
                  <span className={`text-[10px] font-bold ${form.parentPhone.length === 10 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {form.parentPhone.length}/10 digits
                  </span>
                ) : null}
              </div>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className={inputClass}
                placeholder="9876543210"
                value={form.parentPhone}
                onChange={(e) => setForm((prev) => ({ ...prev, parentPhone: sanitizeMobileInput(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Student Email</label>
              <input type="email" className={inputClass} placeholder="e.g. aarav.sharma@school.edu" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500">Student Phone</label>
                {form.phone ? (
                  <span className={`text-[10px] font-bold ${form.phone.length === 10 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {form.phone.length}/10 digits
                  </span>
                ) : null}
              </div>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className={inputClass}
                placeholder="9876512345"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: sanitizeMobileInput(e.target.value) }))}
              />
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

          {form.classId && form.academicYearId && (
            <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <div className="mb-2 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Applicable Fee Structure (Yearly)</span>
              </div>
              {loadingFeePreview ? (
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking fee structure for this class...
                </p>
              ) : !feeStructurePreview ? (
                <p className="text-xs text-slate-500">
                  Is class ke liye abhi koi fee structure configure nahi hui. Student create hone ke baad Fees &amp; Finance module se bana sakte hain.
                </p>
              ) : (
                <>
                  <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{feeStructurePreview.name}</p>
                  <div className="space-y-1.5">
                    {feeStructurePreview.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-600 dark:text-slate-300">
                          {item.feeHead?.name || 'Fee'}
                          {item.isOptional && <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">(Optional)</span>}
                          <span className="ml-1 text-slate-400">——· {item.frequency}</span>
                        </span>
                        <span className="shrink-0 font-bold text-slate-800 dark:text-white">
                          {formatCurrency(yearlyAmount(item))}/yr
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-indigo-200/60 pt-2.5 dark:border-indigo-900/40">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Estimated Mandatory Total</span>
                    <span className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300">
                      {formatCurrency(feeStructureMandatoryTotal)}/yr
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500">Status</label>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, status: 'ACTIVE' }))}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  form.status === 'ACTIVE'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-indigo-600'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, status: 'INACTIVE' }))}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  form.status === 'INACTIVE'
                    ? 'bg-indigo-600 text-white dark:bg-slate-600'
                    : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-indigo-600'
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



      <PromoteStudentsModal
        isOpen={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        years={years}
        classes={classes}
        sections={sections}
        showToast={showToast}
        onDone={loadStudents}
      />
      <ImportStudentsModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        years={years}
        showToast={showToast}
        onDone={loadStudents}
      />
      <TransferStudentModal
        isOpen={Boolean(transferTarget)}
        onClose={() => setTransferTarget(null)}
        student={transferTarget}
        showToast={showToast}
        onDone={loadStudents}
      />

      <ToastComponent />
    </div>
  );
};

export default StudentManagement;


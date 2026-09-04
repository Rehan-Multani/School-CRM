import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { hrApi } from '../../../../shared/api/client';
import {
  Camera,
  ImagePlus,
  UserCircle2,
  X,
  GraduationCap,
  Users,
  Clock,
  ShieldCheck,
  Briefcase,
  CreditCard,
  FileText,
  UploadCloud,
  Upload,
  Eye,
  EyeOff,
} from 'lucide-react';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const textAreaClass = `${inputClass} min-h-[96px] resize-y py-3`;

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const STAFF_ROLES = [
  { id: 'HR', label: 'HR Officer / Manager' },
  { id: 'ACCOUNTANT', label: 'Accountant / Finance' },
  { id: 'LIBRARIAN', label: 'Librarian' },
  { id: 'TRANSPORT', label: 'Transport / Fleet In-charge' },
  { id: 'STAFF', label: 'General Administrative Staff' },
];

const TEACHER_DOC_CATEGORIES = [
  { key: 'aadhaar', label: 'Aadhaar Card Photo', field: 'aadhaarDocuments', hint: 'Front and back.' },
  { key: 'others', label: 'Document', field: 'otherDocuments', hint: 'Any other supporting document.' },
];

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const MAX_DOC_IMAGES = 3;

const createEmptyDocuments = () => ({ aadhaar: [], others: [], kyc: [] });

const createEmptyForm = (initialType = 'TEACHER') => ({
  employeeType: initialType,
  firstName: '',
  lastName: '',
  fullName: '',
  gender: 'MALE',
  dateOfBirth: '',
  mobileNumber: '',
  email: '',
  password: '',
  address: '',
  employeeId: '',
  qualification: '',
  joiningDate: new Date().toISOString().split('T')[0],
  experienceSummary: '',
  specialization: '',
  department: '',
  designation: '',
  role: initialType === 'TEACHER' ? 'TEACHER' : 'HR',
  basicSalary: '',
  pan: '',
  uan: '',
  emergencyName: '',
  emergencyPhone: '',
  accountName: '',
  accountNumber: '',
  ifscCode: '',
  bankName: '',
  branchName: '',
  accountType: 'SALARY',
  documents: createEmptyDocuments(),
});

function buildPhotoUrl(photo) {
  if (!photo) return '';
  if (/^(https?:|data:|blob:)/.test(photo)) return photo;
  const _rel = photo.startsWith('/') ? photo : `/${photo}`;
  const _tok = ['school_admin_token','principal_token','accountant_token','hr_token','librarian_token','transport_token','super_admin_token'].reduce((a, k) => a || localStorage.getItem(k), '');
  return `${API_BASE_URL}/platform${_rel}${_tok ? `?t=${encodeURIComponent(_tok)}` : ''}`;
}

function SectionBlock({ title, subtitle, icon: Icon, children, action }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
            {Icon && <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
            <span>{title}</span>
          </h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export const EmployeeFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  editingEmployee = null,
  initialType = 'TEACHER',
  departments = [],
  designations = [],
}) => {
  const [form, setForm] = useState(createEmptyForm(initialType));
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const photoInputRef = useRef(null);
  const docInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
      setPhotoPreview('');
      setPhotoFile(null);
      setRemovePhoto(false);
      setError(null);
      return;
    }

    if (editingEmployee) {
      const isTeacher = editingEmployee.employeeType === 'TEACHER';
      const nameParts = (editingEmployee.name || '').split(' ');
      const fName = editingEmployee.firstName || nameParts[0] || '';
      const lName = editingEmployee.lastName || nameParts.slice(1).join(' ') || '';

      const rawDocs = editingEmployee.documents || [];
      const kycDocs = Array.isArray(rawDocs)
        ? rawDocs.map((docPath, idx) => ({
            id: `doc-${idx}`,
            preview: buildPhotoUrl(docPath),
            path: docPath,
            file: null,
          }))
        : [
            ...(editingEmployee.documents?.aadhaar || []).map((p) => ({ id: p, preview: buildPhotoUrl(p), path: p, file: null })),
            ...(editingEmployee.documents?.others || []).map((p) => ({ id: p, preview: buildPhotoUrl(p), path: p, file: null })),
          ];

      setForm({
        employeeType: isTeacher ? 'TEACHER' : 'STAFF',
        firstName: fName,
        lastName: lName,
        fullName: editingEmployee.name || `${fName} ${lName}`.trim(),
        gender: editingEmployee.gender || 'MALE',
        dateOfBirth: editingEmployee.dateOfBirth ? String(editingEmployee.dateOfBirth).slice(0, 10) : '',
        mobileNumber: editingEmployee.phone || '',
        email: editingEmployee.email || '',
        password: '',
        address: typeof editingEmployee.address === 'object' ? editingEmployee.address?.addressLine || '' : editingEmployee.address || '',
        employeeId: editingEmployee.employeeId || '',
        qualification: editingEmployee.qualification || editingEmployee.qualifications?.[0]?.degree || '',
        joiningDate: editingEmployee.joiningDate ? String(editingEmployee.joiningDate).slice(0, 10) : new Date().toISOString().split('T')[0],
        experienceSummary: editingEmployee.experienceSummary || '',
        specialization: editingEmployee.specialization || '',
        department: editingEmployee.department || '',
        designation: editingEmployee.designation || '',
        role: editingEmployee.role || (isTeacher ? 'TEACHER' : 'HR'),
        basicSalary: editingEmployee.basicSalary || editingEmployee.payroll?.basicSalary || '',
        pan: editingEmployee.pan || editingEmployee.payroll?.pan || '',
        uan: editingEmployee.uan || editingEmployee.payroll?.uan || '',
        emergencyName: editingEmployee.emergencyContact?.name || editingEmployee.emergencyContactName || '',
        emergencyPhone: editingEmployee.emergencyContact?.phone || editingEmployee.emergencyContactNumber || '',
        accountName: editingEmployee.bankDetails?.accountName || editingEmployee.payroll?.accountHolderName || '',
        accountNumber: editingEmployee.bankDetails?.accountNumber || editingEmployee.payroll?.accountNumber || '',
        ifscCode: editingEmployee.bankDetails?.ifscCode || editingEmployee.payroll?.ifsc || '',
        bankName: editingEmployee.bankDetails?.bankName || editingEmployee.payroll?.bankName || '',
        branchName: editingEmployee.bankDetails?.branchName || editingEmployee.payroll?.branch || '',
        accountType: editingEmployee.bankDetails?.accountType || 'SALARY',
        documents: {
          aadhaar: (editingEmployee.documents?.aadhaar || []).map((p) => ({ id: p, preview: buildPhotoUrl(p), path: p, file: null })),
          others: (editingEmployee.documents?.others || []).map((p) => ({ id: p, preview: buildPhotoUrl(p), path: p, file: null })),
          kyc: kycDocs,
        },
      });
      setPhotoPreview(buildPhotoUrl(editingEmployee.photo || editingEmployee.profilePhoto));
      setPhotoFile(null);
      setRemovePhoto(false);
    } else {
      setForm(createEmptyForm(initialType));
      setPhotoPreview('');
      setPhotoFile(null);
      setRemovePhoto(false);
    }
  }, [isOpen, editingEmployee, initialType]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP)');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setError('Profile photo must be under 2MB');
      return;
    }
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
    setError(null);
  };

  const handleRemovePhoto = () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoPreview('');
    setPhotoFile(null);
    setRemovePhoto(true);
  };

  const handleKycDocAdd = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const current = form.documents.kyc || [];
    const available = MAX_DOC_IMAGES - current.length;
    if (available <= 0) return;

    const accepted = files.slice(0, available).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      preview: URL.createObjectURL(file),
      path: '',
      file,
    }));

    setForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        kyc: [...(prev.documents.kyc || []), ...accepted],
      },
    }));
  };

  const handleKycDocRemove = (itemId) => {
    setForm((prev) => {
      const items = prev.documents.kyc || [];
      const target = items.find((item) => item.id === itemId);
      if (target?.preview?.startsWith('blob:')) URL.revokeObjectURL(target.preview);
      return {
        ...prev,
        documents: {
          ...prev.documents,
          kyc: items.filter((item) => item.id !== itemId),
        },
      };
    });
  };

  const handleTeacherDocAdd = (categoryKey, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const current = form.documents[categoryKey] || [];
    const available = 2 - current.length;
    if (available <= 0) return;

    const accepted = files.slice(0, available).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      preview: URL.createObjectURL(file),
      path: '',
      file,
    }));

    setForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [categoryKey]: [...(prev.documents[categoryKey] || []), ...accepted],
      },
    }));
  };

  const handleTeacherDocRemove = (categoryKey, itemId) => {
    setForm((prev) => {
      const items = prev.documents[categoryKey] || [];
      const target = items.find((item) => item.id === itemId);
      if (target?.preview?.startsWith('blob:')) URL.revokeObjectURL(target.preview);
      return {
        ...prev,
        documents: {
          ...prev.documents,
          [categoryKey]: items.filter((item) => item.id !== itemId),
        },
      };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    const isTeacher = form.employeeType === 'TEACHER';
    const computedName = isTeacher
      ? form.fullName.trim().replace(/\s+/g, ' ')
      : `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

    if (!computedName) {
      setError(isTeacher ? 'Please enter Full Name' : 'Please enter First Name');
      return;
    }
    if (!form.employeeId.trim()) {
      setError('Employee ID is required');
      return;
    }
    if (!form.email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!editingEmployee && !isTeacher && !form.password) {
      setError('Login password is required for staff user registration');
      return;
    }
    if (!form.department || !form.designation) {
      setError('Department and Designation are required');
      return;
    }

    setSaving(true);
    try {
      const [fName, ...rest] = computedName.split(' ');
      const payload = new FormData();

      const fields = {
        name: computedName,
        firstName: isTeacher ? fName : form.firstName.trim(),
        lastName: isTeacher ? rest.join(' ') : form.lastName.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        phone: form.mobileNumber.trim(),
        mobileNumber: form.mobileNumber.trim(),
        email: form.email.trim(),
        employeeId: form.employeeId.trim(),
        qualification: form.qualification.trim(),
        joiningDate: form.joiningDate,
        experienceSummary: form.experienceSummary,
        specialization: form.specialization,
        department: form.department,
        designation: form.designation,
        employeeType: form.employeeType,
        role: isTeacher ? 'TEACHER' : form.role,
        basicSalary: form.basicSalary,
        pan: form.pan,
        uan: form.uan,
      };

      if (form.password) {
        fields.password = form.password;
      }

      Object.entries(fields).forEach(([key, value]) => payload.append(key, value ?? ''));

      payload.append('address', JSON.stringify({ addressLine: form.address.trim() }));
      payload.append('qualifications', JSON.stringify([{ degree: form.qualification.trim() }]));

      if (form.emergencyName || form.emergencyPhone) {
        payload.append(
          'emergencyContact',
          JSON.stringify({
            name: form.emergencyName.trim(),
            phone: form.emergencyPhone.trim(),
          })
        );
      }

      if (form.accountNumber || form.ifscCode || form.bankName) {
        payload.append(
          'bankDetails',
          JSON.stringify({
            accountName: form.accountName.trim() || computedName,
            accountNumber: form.accountNumber.trim(),
            ifscCode: form.ifscCode.trim().toUpperCase(),
            bankName: form.bankName.trim(),
            branchName: form.branchName.trim(),
            accountType: form.accountType || 'SALARY',
          })
        );
      }

      if (photoFile) payload.append('photo', photoFile);
      if (removePhoto) payload.append('removePhoto', 'true');

      if (isTeacher) {
        payload.append(
          'documentsKeep',
          JSON.stringify({
            aadhaar: form.documents.aadhaar.filter((item) => item.path).map((item) => item.path),
            others: form.documents.others.filter((item) => item.path).map((item) => item.path),
          })
        );
        TEACHER_DOC_CATEGORIES.forEach(({ key, field }) => {
          form.documents[key].filter((item) => item.file).forEach((item) => payload.append(field, item.file));
        });
      } else {
        // Staff KYC documents
        const keepPaths = (form.documents.kyc || []).filter((item) => item.path).map((item) => item.path);
        payload.append('documentsKeep', JSON.stringify(keepPaths));
        (form.documents.kyc || []).filter((item) => item.file).forEach((item) => payload.append('documents', item.file));
      }

      if (editingEmployee) {
        await hrApi.updateEmployee(editingEmployee.id, payload);
      } else {
        await hrApi.createEmployee(payload);
      }

      onSuccess?.(isTeacher ? 'Teacher' : 'Staff Member');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save employee');
    } finally {
      setSaving(false);
    }
  };

  const isTeacher = form.employeeType === 'TEACHER';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingEmployee
          ? `Edit ${isTeacher ? 'Teacher' : 'Staff User'}: ${editingEmployee.name}`
          : `Register New ${isTeacher ? 'Teacher (Faculty)' : 'Staff User'}`
      }
      size="2xl"
      titleClassName="text-xl font-extrabold"
    >
      <form onSubmit={handleSave} className="space-y-6">
        {/* Classification Switcher (if creating new) */}
        {!editingEmployee && (
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => updateField('employeeType', 'TEACHER')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isTeacher
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Teaching Faculty</span>
            </button>
            <button
              type="button"
              onClick={() => updateField('employeeType', 'STAFF')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                !isTeacher
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Non-Teaching Staff</span>
            </button>
          </div>
        )}

        {/* Admin Approval Notice Banner */}
        {!editingEmployee && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
            <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Admin Approval:</strong> New registration defaults to <em>Pending Admin Approval</em> and activates upon School Admin review.
            </span>
          </div>
        )}

        {/* Top Profile Photo Banner (Large & Prominent) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition hover:border-indigo-600 dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
              title="Click to select profile photo"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Staff preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
                  <UserCircle2 className="h-14 w-14" />
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-white opacity-0 transition group-hover:opacity-100">
                <Camera className="h-5 w-5" />
              </span>
            </button>

            <div className="flex-1 text-center sm:text-left">
              <input
                type="file"
                ref={photoInputRef}
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {isTeacher ? 'Teacher Profile Photo' : 'Staff Profile Photo'}
              </h4>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Upload member avatar photo (JPG, PNG, WebP). Converted automatically to WebP. Max 2MB.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-indigo-600 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <ImagePlus className="h-4 w-4" />
                  {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </button>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: PERSONAL & LOGIN DETAILS (MATCHING ADMIN USERMANAGEMENT.JSX)
           ========================================================================= */}
        <SectionBlock
          title="1. Personal & Login Credentials"
          subtitle="Identity, email credentials, and contact details."
          icon={ShieldCheck}
        >
          {isTeacher ? (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-bold text-slate-500">Full Name *</label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-500">Gender *</label>
                <select
                  className={inputClass}
                  value={form.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  required
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-500">Date of Birth</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-500">Mobile Number *</label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.mobileNumber}
                  onChange={(e) => updateField('mobileNumber', e.target.value)}
                  placeholder="+91 98XXXXXXXX"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-500">Email Address</label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="teacher@school.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-bold text-slate-500">Residential Address</label>
                <textarea
                  className={textAreaClass}
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="House no, street, locality, city"
                />
              </div>
            </div>
          ) : (
            /* Non-Teaching Staff Form (Exact 100% UserManagement.jsx fields) */
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-500">First Name *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    placeholder="e.g. Ramesh"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-500">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    placeholder="e.g. Kumar"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-500">Email Address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="staff@school.edu"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-500">
                    {editingEmployee ? 'New Password (Leave blank to keep)' : 'Login Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder={editingEmployee ? '••••••••' : 'Min 6 characters'}
                      required={!editingEmployee}
                      minLength={6}
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-500">Staff Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => updateField('role', e.target.value)}
                    className={inputClass}
                    required
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-500">Phone / Mobile</label>
                  <input
                    type="text"
                    value={form.mobileNumber}
                    onChange={(e) => updateField('mobileNumber', e.target.value)}
                    placeholder="+91 98765 43210"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-500">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    className={inputClass}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-500">Residential Address</label>
                <textarea
                  className={textAreaClass}
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="House no, street, locality, city, pincode"
                />
              </div>
            </div>
          )}
        </SectionBlock>

        {/* =========================================================================
            SECTION 2: EMPLOYMENT & DESIGNATION
           ========================================================================= */}
        <SectionBlock
          title="2. Employment & Designation"
          subtitle="Employee code, institutional placement, and joining date."
          icon={Briefcase}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">Employee ID *</label>
              <input
                type="text"
                value={form.employeeId}
                onChange={(e) => updateField('employeeId', e.target.value)}
                placeholder={isTeacher ? 'TCH-1001' : 'EMP-1024'}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">Joining Date *</label>
              <input
                type="date"
                value={form.joiningDate}
                onChange={(e) => updateField('joiningDate', e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">Department *</label>
              <select
                value={form.department}
                onChange={(e) => updateField('department', e.target.value)}
                required
                className={inputClass}
              >
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
              <label className="mb-1 block text-[11px] font-bold text-slate-500">Designation *</label>
              <select
                value={form.designation}
                onChange={(e) => updateField('designation', e.target.value)}
                required
                className={inputClass}
              >
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

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                {isTeacher ? 'Highest Qualification *' : 'Specialization / Area'}
              </label>
              <input
                type="text"
                value={isTeacher ? form.qualification : form.specialization}
                onChange={(e) => updateField(isTeacher ? 'qualification' : 'specialization', e.target.value)}
                placeholder={isTeacher ? 'M.Sc, B.Ed' : 'e.g. Accounts / Library'}
                required={isTeacher}
                className={inputClass}
              />
            </div>
          </div>

          {!isTeacher && (
            <div className="mt-3.5 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-500">Highest Qualification</label>
                <input
                  type="text"
                  value={form.qualification}
                  onChange={(e) => updateField('qualification', e.target.value)}
                  placeholder="e.g. B.Com, MBA, M.Lib"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-500">Experience Summary</label>
                <input
                  type="text"
                  value={form.experienceSummary}
                  onChange={(e) => updateField('experienceSummary', e.target.value)}
                  placeholder="e.g. 4 years of operational experience"
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </SectionBlock>

        {/* =========================================================================
            SECTION 3: BANK ACCOUNT & PAYROLL DETAILS (MATCHING ADMIN USERMANAGEMENT.JSX)
           ========================================================================= */}
        <SectionBlock
          title="3. Bank Account & Payroll Details"
          subtitle="Monthly remuneration and bank payout routing details."
          icon={CreditCard}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">Basic Salary (₹ / Month)</label>
              <input
                type="number"
                min="0"
                value={form.basicSalary}
                onChange={(e) => updateField('basicSalary', e.target.value)}
                placeholder="e.g. 45000"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">Account Holder Name</label>
              <input
                type="text"
                value={form.accountName}
                onChange={(e) => updateField('accountName', e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">Account Number</label>
              <input
                type="text"
                value={form.accountNumber}
                onChange={(e) => updateField('accountNumber', e.target.value)}
                placeholder="e.g. 501004382910"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">IFSC Code</label>
              <input
                type="text"
                value={form.ifscCode}
                onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                className={`${inputClass} uppercase`}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">Bank Name</label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => updateField('bankName', e.target.value)}
                placeholder="HDFC Bank"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">Branch Name</label>
              <input
                type="text"
                value={form.branchName}
                onChange={(e) => updateField('branchName', e.target.value)}
                placeholder="Main Branch"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">Account Type</label>
              <select
                value={form.accountType}
                onChange={(e) => updateField('accountType', e.target.value)}
                className={inputClass}
              >
                <option value="SALARY">Salary</option>
                <option value="SAVINGS">Savings</option>
                <option value="CURRENT">Current</option>
              </select>
            </div>
          </div>
        </SectionBlock>

        {/* =========================================================================
            SECTION 4: KYC & VERIFICATION DOCUMENTS
           ========================================================================= */}
        {isTeacher ? (
          /* Teacher Documents (Aadhaar & Other) */
          <SectionBlock
            title="4. Verification Documents"
            subtitle="Any image type is allowed and converted to WebP after upload."
            icon={FileText}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {TEACHER_DOC_CATEGORIES.map((category) => {
                const items = form.documents[category.key] || [];
                const canAdd = items.length < 2;
                return (
                  <div key={category.key} className="rounded-2xl border border-slate-200 p-4 text-center dark:border-slate-800">
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{category.label}</p>
                    <p className="mb-3 mt-1 text-[11px] text-slate-500">{category.hint} Up to 2 images, max 5MB each.</p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="relative w-36 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                        >
                          <img src={item.preview} alt={category.label} className="h-28 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleTeacherDocRemove(category.key, item.id)}
                            className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1 text-rose-500 shadow-sm hover:bg-white cursor-pointer"
                            aria-label={`Remove ${category.label}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {canAdd && (
                        <label className="flex h-28 w-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 text-slate-400 hover:border-indigo-600 hover:text-indigo-600 dark:border-slate-700">
                          <ImagePlus className="h-5 w-5" />
                          <span className="text-[11px] font-bold">{items.length ? 'Add image' : 'Upload image'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              handleTeacherDocAdd(category.key, event.target.files);
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
        ) : (
          /* Staff KYC Documents Upload (Exact Dropzone Matching UserManagement.jsx) */
          <SectionBlock
            title="4. KYC & Verification Documents (Max 3 Images)"
            subtitle="Attach Aadhaar, PAN Card, Qualification Degrees, or Identity Proof (JPG, PNG, WebP — Max 5MB each)"
            icon={FileText}
            action={
              <span className="rounded-lg bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                {(form.documents.kyc || []).length} / 3 Uploaded
              </span>
            }
          >
            <input
              type="file"
              ref={docInputRef}
              accept="image/*"
              multiple
              onChange={(e) => {
                handleKycDocAdd(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />

            {(form.documents.kyc || []).length < 3 && (
              <div
                onClick={() => docInputRef.current?.click()}
                className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-6 text-center transition hover:border-indigo-600 hover:bg-indigo-50/10 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-indigo-600"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm transition group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white dark:bg-slate-900">
                  <UploadCloud className="h-6 w-6 text-indigo-600 group-hover:text-white" />
                </div>
                <h5 className="mt-3 text-xs font-bold text-slate-800 dark:text-slate-200">
                  Click to Browse & Upload Documents
                </h5>
                <p className="mt-1 max-w-sm text-[11px] text-slate-500 dark:text-slate-400">
                  Attach Aadhaar, PAN Card, Degrees, or Verification Proofs
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    docInputRef.current?.click();
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-indigo-600 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Choose Documents ({3 - (form.documents.kyc || []).length} slots left)</span>
                </button>
              </div>
            )}

            {(form.documents.kyc || []).length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {form.documents.kyc.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="relative h-28 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950">
                      <img src={item.preview} alt={`Document ${idx + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                      <button
                        type="button"
                        onClick={() => handleKycDocRemove(item.id)}
                        className="absolute right-1.5 top-1.5 rounded-lg bg-rose-500 p-1 text-white shadow-sm transition hover:bg-rose-600 cursor-pointer"
                        title="Remove document"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between px-1">
                      <span className="truncate max-w-[120px] text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        {item.file?.name || `Document #${idx + 1}`}
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold">{item.path ? 'Verified' : 'New'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionBlock>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs font-bold">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {saving
              ? 'Saving...'
              : editingEmployee
              ? `Update ${isTeacher ? 'Teacher' : 'Staff User'}`
              : `Register ${isTeacher ? 'Teacher' : 'Staff User'}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeFormModal;

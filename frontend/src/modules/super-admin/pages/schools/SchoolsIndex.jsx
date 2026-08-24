import React, { useEffect, useRef, useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Button, Badge } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/Dialog';
import { useSuperAdminNotifications } from '../../context/SuperAdminNotificationContext';
import { platformSchoolApi } from '../../../../shared/api/client';
import schoolLogo from '../../../../assets/School_logo.png';
import {
  Plus,
  Search,
  Building2,
  Server,
  Loader2,
  MapPin,
  GraduationCap,
  Phone,
  Camera,
  ImagePlus,
  X,
  Eye,
  Pencil,
  Trash2,
  Ban,
  Play,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';

const DEFAULT_SCHOOL_LOGO = schoolLogo;
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

const SCHOOL_TYPES = ['Public', 'Private', 'Government', 'Government Aided', 'International', 'Other'];
const SCHOOL_BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'Other'];
const SCHOOL_MEDIA = ['English', 'Hindi', 'English + Hindi', 'Other'];
const CLASS_OPTIONS = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Trial', 'Suspended'];
const PAGE_SIZE = 5;

const INDIAN_MOBILE_DIGITS = /^[6-9]\d{9}$/;

function extractMobileDigits(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length > 10) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 10);
}

function formatIndianMobile(value) {
  const digits = extractMobileDigits(value);
  return digits ? `+91${digits}` : '';
}

function isValidIndianMobile(value, required = false) {
  const digits = extractMobileDigits(value);
  if (!digits) return !required;
  return INDIAN_MOBILE_DIGITS.test(digits);
}

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/15';

const selectClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%2364748b%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E")] bg-[size:1.25rem_1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat pr-10 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:ring-indigo-500/15';

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function currentSession() {
  const year = new Date().getFullYear();
  return `${year}-${String(year + 1).slice(-2)}`;
}

const initialForm = () => ({
  name: '',
  code: '',
  schoolId: '',
  type: 'Private',
  board: 'CBSE',
  establishedYear: '',
  logo: '',
  website: '',
  contact: {
    email: '',
    phone: '',
    alternatePhone: '',
    principalName: '',
  },
  address: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
  },
  academic: {
    session: currentSession(),
    classFrom: 'Nursery',
    classTo: '12',
    medium: 'English',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  admin: {
    name: '',
    email: '',
    mobile: '',
  },
  subscriptionPlan: '',
  status: 'Active',
});

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-800/80">
      {Icon && <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
    </div>
  );
}

function assignedPlanName(plan) {
  if (!plan || ['Basic', 'Growth', 'Enterprise'].includes(plan)) return '';
  return plan;
}

function Pulse({ className }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

function SchoolsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 text-center">#</TableHead>
          <TableHead>School</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Board & Type</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Academic</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i} className="hover:bg-transparent">
            <TableCell className="w-12 text-center">
              <Pulse className="mx-auto h-3.5 w-4" />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2.5">
                <Pulse className="h-9 w-9 rounded-xl" />
                <div className="space-y-1.5">
                  <Pulse className="h-3.5 w-32" />
                  <Pulse className="h-2.5 w-24" />
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Pulse className="mb-1.5 h-3 w-16" />
              <Pulse className="h-2.5 w-20" />
            </TableCell>
            <TableCell>
              <Pulse className="mb-1.5 h-3 w-14" />
              <Pulse className="h-2.5 w-16" />
            </TableCell>
            <TableCell>
              <Pulse className="mb-1.5 h-3 w-16" />
              <Pulse className="h-2.5 w-20" />
            </TableCell>
            <TableCell>
              <Pulse className="mb-1.5 h-3 w-14" />
              <Pulse className="h-2.5 w-18" />
            </TableCell>
            <TableCell>
              <Pulse className="h-6 w-16 rounded-full" />
            </TableCell>
            <TableCell>
              <Pulse className="h-6 w-16 rounded-full" />
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1.5">
                <Pulse className="h-7 w-7 rounded-lg" />
                <Pulse className="h-7 w-7 rounded-lg" />
                <Pulse className="h-7 w-7 rounded-lg" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ActionIcon({ label, onClick, className, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
    >
      {children}
    </button>
  );
}
function Field({ id, label, required, hint, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function MobileInput({ id, value, onChange, required, placeholder = '9876543210' }) {
  const digits = extractMobileDigits(value);

  return (
    <div className="flex h-10 w-full overflow-hidden rounded-xl border border-slate-200 bg-white transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-700/80 dark:bg-slate-900/70 dark:focus-within:bg-slate-900 dark:focus-within:ring-indigo-500/15">
      <span className="flex shrink-0 items-center border-r border-slate-200 px-3 text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
        +91
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={10}
        className="h-10 w-full bg-transparent px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        value={digits}
        onChange={(e) => onChange(formatIndianMobile(e.target.value))}
        placeholder={placeholder}
        required={required}
        pattern="[6-9][0-9]{9}"
        title="Enter a 10-digit Indian mobile number starting with 6, 7, 8, or 9"
      />
    </div>
  );
}

export default function SchoolsIndex() {
  const { addNotification } = useSuperAdminNotifications();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [viewingSchool, setViewingSchool] = useState(null);
  const [schoolToDelete, setSchoolToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [copiedField, setCopiedField] = useState('');
  const [resettingId, setResettingId] = useState('');
  const [form, setForm] = useState(initialForm);
  const [codeTouched, setCodeTouched] = useState(false);
  const logoFileRef = useRef(null);

  const loadSchools = async (nextPage = page) => {
    setLoading(true);
    try {
      const result = await platformSchoolApi.list({
        search: search || undefined,
        status: filterStatus,
        plan: filterPlan,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      const meta = result.pagination || { page: nextPage, limit: PAGE_SIZE, total: (result.data || []).length, totalPages: 1 };
      if (meta.totalPages > 0 && nextPage > meta.totalPages) {
        setPage(meta.totalPages);
        return;
      }
      setSchools(result.data || []);
      setPagination(meta);
    } catch (err) {
      addNotification(
        'error',
        err.response?.data?.message || err.message || 'Unable to load schools.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSchools(page);
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, filterPlan, filterStatus, page]);

  const updateForm = (path, value) => {
    setForm((prev) => {
      const next = { ...prev };
      const keys = path.split('.');
      let cursor = next;
      for (let i = 0; i < keys.length - 1; i += 1) {
        cursor[keys[i]] = { ...cursor[keys[i]] };
        cursor = cursor[keys[i]];
      }
      cursor[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const resetForm = () => {
    setForm(initialForm());
    setCodeTouched(false);
    setEditingSchool(null);
    if (logoFileRef.current) logoFileRef.current.value = '';
  };

  const fillFormFromSchool = (school) => {
    setForm({
      name: school.name || '',
      code: school.code || '',
      schoolId: school.schoolId || '',
      type: school.type || 'Private',
      board: school.board || 'CBSE',
      establishedYear: school.establishedYear || '',
      logo: school.logo || '',
      website: school.website || '',
      contact: {
        email: school.contact?.email || '',
        phone: school.contact?.phone || '',
        alternatePhone: school.contact?.alternatePhone || '',
        principalName: school.contact?.principalName || '',
      },
      address: {
        line1: school.address?.line1 || '',
        line2: school.address?.line2 || '',
        city: school.address?.city || '',
        state: school.address?.state || '',
        country: school.address?.country || 'India',
        pincode: school.address?.pincode || '',
      },
      academic: {
        session: school.academic?.session || currentSession(),
        classFrom: school.academic?.classFrom || 'Nursery',
        classTo: school.academic?.classTo || '12',
        medium: school.academic?.medium || 'English',
        workingDays: school.academic?.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      },
      admin: {
        name: school.admin?.name || '',
        email: school.admin?.email || '',
        mobile: school.admin?.mobile || '',
      },
      subscriptionPlan: school.subscriptionPlan || '',
      status: school.status || 'Active',
    });
    setCodeTouched(true);
    setEditingSchool(school);
    setCreateOpen(true);
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addNotification('error', 'Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      addNotification('error', 'Logo image must be 2MB or smaller.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => updateForm('logo', String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    updateForm('logo', '');
    if (logoFileRef.current) logoFileRef.current.value = '';
  };

  const handleNameChange = (name) => {
    updateForm('name', name);
    updateForm('schoolId', slugify(name));
    if (!codeTouched) {
      const code = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('');
      updateForm('code', code ? `${code}${String(Date.now()).slice(-3)}` : '');
    }
  };

  const toggleWorkingDay = (day) => {
    setForm((prev) => {
      const days = prev.academic.workingDays.includes(day)
        ? prev.academic.workingDays.filter((d) => d !== day)
        : [...prev.academic.workingDays, day];
      return { ...prev, academic: { ...prev.academic, workingDays: days } };
    });
  };

  const handleCreateSchool = async (e) => {
    e.preventDefault();

    if (!isValidIndianMobile(form.contact.phone, true)) {
      addNotification('error', 'Phone number must be a 10-digit Indian mobile number (+91).');
      return;
    }

    if (!isValidIndianMobile(form.contact.alternatePhone)) {
      addNotification('error', 'Alternate phone must be a 10-digit Indian mobile number (+91).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        schoolId: form.schoolId || slugify(form.name),
        establishedYear: form.establishedYear || null,
        subscriptionPlan: form.subscriptionPlan || '',
        admin: {
          name: form.contact.principalName || form.name,
          email: form.contact.email,
          mobile: form.contact.phone,
        },
      };
      const result = editingSchool
        ? await platformSchoolApi.update(editingSchool.id, payload)
        : await platformSchoolApi.create(payload);
      if (editingSchool) {
        setSchools((prev) => prev.map((s) => (s.id === editingSchool.id ? result.data : s)));
      } else {
        setPage(1);
        await loadSchools(1);
        if (result.credentials) {
          setCredentials({ ...result.credentials, emailSent: result.emailSent });
        }
      }
      addNotification('success', result.message || `School ${editingSchool ? 'updated' : 'created'}: ${form.name}`);
      setCreateOpen(false);
      resetForm();
    } catch (err) {
      addNotification(
        'error',
        err.response?.data?.message || err.message || 'Unable to create school.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetLogin = async (school) => {
    setResettingId(school.id);
    try {
      const result = await platformSchoolApi.resetLogin(school.id);
      setCredentials(result.credentials);
      addNotification('success', result.message || `Login reset for ${school.name}`);
    } catch (err) {
      addNotification('error', err.response?.data?.message || err.message || 'Unable to reset school login.');
    } finally {
      setResettingId('');
    }
  };

  const copyCredential = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(''), 1600);
    } catch {
      addNotification('error', 'Unable to copy.');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      const result = await platformSchoolApi.updateStatus(id, nextStatus);
      setSchools((prev) => prev.map((s) => (s.id === id ? result.data : s)));
      addNotification('info', `School status updated to ${nextStatus}`);
    } catch (err) {
      addNotification(
        'error',
        err.response?.data?.message || err.message || 'Unable to update school status.'
      );
    }
  };

  const handleDeleteSchool = async () => {
    if (!schoolToDelete) return;
    setDeleting(true);
    try {
      await platformSchoolApi.remove(schoolToDelete.id);
      addNotification('error', `School deleted: ${schoolToDelete.name}`);
      setSchoolToDelete(null);
      const nextPage = schools.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await loadSchools(nextPage);
      }
    } catch (err) {
      addNotification(
        'error',
        err.response?.data?.message || err.message || 'Unable to delete school.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schools Directory</h1>
          <p className="text-xs text-slate-400">
            Manage multi-tenant schools with full academic, contact, and admin structure.
          </p>
        </div>

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus size={14} className="mr-1.5" />
              Add School
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-800/80 dark:bg-slate-900/40">
              <DialogHeader className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-400 dark:ring-indigo-500/20">
                    <Server className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 pr-6">
                    <DialogTitle className="text-base font-semibold leading-snug">
                      {editingSchool ? 'Edit School' : 'Add New School'}
                    </DialogTitle>
                    <DialogDescription className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {editingSchool
                        ? 'Update school details, contact, address, and academic settings.'
                        : 'Create a school tenant with complete structure for students, teachers, fees, attendance, and branches.'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <form onSubmit={handleCreateSchool} className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
              <section className="space-y-4">
                <SectionTitle icon={Building2} title="Basic Information" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="name" label="School Name" required>
                    <input
                      id="name"
                      className={inputClass}
                      value={form.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="ABC Public School"
                      required
                    />
                  </Field>
                  <Field id="code" label="School Code / Unique ID" required hint="Short unique code, e.g. ABC001">
                    <input
                      id="code"
                      className={`${inputClass} font-mono uppercase`}
                      value={form.code}
                      onChange={(e) => {
                        setCodeTouched(true);
                        updateForm('code', e.target.value.toUpperCase());
                      }}
                      placeholder="ABC001"
                      required
                    />
                  </Field>
                  <Field id="type" label="School Type" required>
                    <select id="type" className={selectClass} value={form.type} onChange={(e) => updateForm('type', e.target.value)}>
                      {SCHOOL_TYPES.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </Field>
                  <Field id="board" label="Board" required>
                    <select id="board" className={selectClass} value={form.board} onChange={(e) => updateForm('board', e.target.value)}>
                      {SCHOOL_BOARDS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </Field>
                  <Field id="establishedYear" label="Established Year">
                    <input
                      id="establishedYear"
                      type="number"
                      className={inputClass}
                      value={form.establishedYear}
                      onChange={(e) => updateForm('establishedYear', e.target.value)}
                      placeholder="2010"
                    />
                  </Field>
                  <Field id="logo" label="School Logo" hint="PNG, JPG, or WEBP. Max size 2MB.">
                    <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                      <button
                        type="button"
                        onClick={() => logoFileRef.current?.click()}
                        className="group relative shrink-0"
                        aria-label="Upload school logo"
                      >
                        <img
                          src={form.logo || DEFAULT_SCHOOL_LOGO}
                          alt="School logo preview"
                          className="h-16 w-16 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                        />
                        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/50 text-white opacity-0 transition group-hover:opacity-100">
                          <Camera className="h-4 w-4" />
                        </span>
                      </button>
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          ref={logoFileRef}
                          id="logo"
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => logoFileRef.current?.click()}
                          >
                            <ImagePlus className="h-3.5 w-3.5" />
                            Upload logo
                          </Button>
                          {form.logo && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-rose-500 hover:text-rose-600"
                              onClick={handleRemoveLogo}
                            >
                              <X className="h-3.5 w-3.5" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {form.logo ? 'Logo ready to save with this school.' : 'Optional. Used in school profile and listings.'}
                        </p>
                      </div>
                    </div>
                  </Field>
                  <Field id="website" label="Website">
                    <input
                      id="website"
                      className={inputClass}
                      value={form.website}
                      onChange={(e) => updateForm('website', e.target.value)}
                      placeholder="www.school.edu"
                    />
                  </Field>
                </div>
              </section>

              <section className="space-y-4">
                <SectionTitle icon={Phone} title="Contact" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="contact.email" label="Official Email" required>
                    <input
                      id="contact.email"
                      type="email"
                      className={inputClass}
                      value={form.contact.email}
                      onChange={(e) => updateForm('contact.email', e.target.value)}
                      placeholder="school@example.com"
                      required
                    />
                  </Field>
                  <Field id="contact.phone" label="Phone Number" required hint="10-digit mobile number with +91">
                    <MobileInput
                      id="contact.phone"
                      value={form.contact.phone}
                      onChange={(value) => updateForm('contact.phone', value)}
                      required
                    />
                  </Field>
                  <Field id="contact.alternatePhone" label="Alternate Phone" hint="Optional. 10-digit mobile number with +91">
                    <MobileInput
                      id="contact.alternatePhone"
                      value={form.contact.alternatePhone}
                      onChange={(value) => updateForm('contact.alternatePhone', value)}
                    />
                  </Field>
                  <Field id="contact.principalName" label="Principal Name">
                    <input
                      id="contact.principalName"
                      className={inputClass}
                      value={form.contact.principalName}
                      onChange={(e) => updateForm('contact.principalName', e.target.value)}
                    />
                  </Field>
                </div>
              </section>

              <section className="space-y-4">
                <SectionTitle icon={MapPin} title="Address" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="address.line1" label="Address Line 1" required>
                    <input
                      id="address.line1"
                      className={inputClass}
                      value={form.address.line1}
                      onChange={(e) => updateForm('address.line1', e.target.value)}
                      required
                    />
                  </Field>
                  <Field id="address.line2" label="Address Line 2">
                    <input
                      id="address.line2"
                      className={inputClass}
                      value={form.address.line2}
                      onChange={(e) => updateForm('address.line2', e.target.value)}
                    />
                  </Field>
                  <Field id="address.city" label="City" required>
                    <input
                      id="address.city"
                      className={inputClass}
                      value={form.address.city}
                      onChange={(e) => updateForm('address.city', e.target.value)}
                      required
                    />
                  </Field>
                  <Field id="address.state" label="State" required>
                    <input
                      id="address.state"
                      className={inputClass}
                      value={form.address.state}
                      onChange={(e) => updateForm('address.state', e.target.value)}
                      required
                    />
                  </Field>
                  <Field id="address.country" label="Country" required>
                    <input
                      id="address.country"
                      className={inputClass}
                      value={form.address.country}
                      onChange={(e) => updateForm('address.country', e.target.value)}
                      required
                    />
                  </Field>
                  <Field id="address.pincode" label="Pincode" required>
                    <input
                      id="address.pincode"
                      className={inputClass}
                      value={form.address.pincode}
                      onChange={(e) => updateForm('address.pincode', e.target.value)}
                      required
                    />
                  </Field>
                </div>
              </section>

              <section className="space-y-4">
                <SectionTitle icon={GraduationCap} title="Academic" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="academic.session" label="Academic Session" required>
                    <input
                      id="academic.session"
                      className={inputClass}
                      value={form.academic.session}
                      onChange={(e) => updateForm('academic.session', e.target.value)}
                      placeholder="2026-27"
                      required
                    />
                  </Field>
                  <Field id="academic.medium" label="Medium" required>
                    <select
                      id="academic.medium"
                      className={selectClass}
                      value={form.academic.medium}
                      onChange={(e) => updateForm('academic.medium', e.target.value)}
                    >
                      {SCHOOL_MEDIA.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </Field>
                  <Field id="academic.classFrom" label="Classes From" required>
                    <select
                      id="academic.classFrom"
                      className={selectClass}
                      value={form.academic.classFrom}
                      onChange={(e) => updateForm('academic.classFrom', e.target.value)}
                    >
                      {CLASS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </Field>
                  <Field id="academic.classTo" label="Classes To" required>
                    <select
                      id="academic.classTo"
                      className={selectClass}
                      value={form.academic.classTo}
                      onChange={(e) => updateForm('academic.classTo', e.target.value)}
                    >
                      {CLASS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field id="workingDays" label="Working Days">
                  <div className="flex flex-wrap gap-2">
                    {WORKING_DAYS.map((day) => {
                      const active = form.academic.workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWorkingDay(day)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            active
                              ? 'bg-indigo-600 text-white'
                              : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-slate-600'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </section>

              <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white pt-4 dark:border-slate-800/80 dark:bg-slate-950">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={saving}>
                      {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {editingSchool ? 'Saving...' : 'Creating...'}
                    </>
                  ) : editingSchool ? (
                    'Save Changes'
                  ) : (
                    'Create School'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-3 dark:border-slate-800/80 dark:bg-slate-950">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, code, city..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={filterPlan}
          onChange={(e) => {
            setFilterPlan(e.target.value);
            setPage(1);
          }}
        >
          <option value="All">All subscription plans</option>
          <option value="Basic">Basic Plan</option>
          <option value="Growth">Growth Plan</option>
          <option value="Enterprise">Enterprise Plan</option>
        </Select>
        <Select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="All">All status states</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <SchoolsTableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Board & Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Academic</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="py-16 text-center">
                  <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">No schools found</p>
                  <p className="mt-1 text-xs text-slate-400">Click &quot;Add School&quot; to create the first tenant.</p>
                </TableCell>
              </TableRow>
            ) : (
              schools.map((school, index) => {
                const serialNo = (pagination.page - 1) * pagination.limit + index + 1;
                return (
                  <TableRow key={school.id}>
                    <TableCell className="w-12 text-center font-bold text-slate-400">
                      {serialNo}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {school.logo ? (
                          <img
                            src={school.logo}
                            alt={school.name}
                            className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300">
                            <Building2 size={16} />
                          </div>
                        )}
                        <div className="min-w-0 max-w-[200px]">
                          <div className="truncate font-bold text-slate-900 dark:text-slate-100">{school.name}</div>
                          <div className="truncate text-[11px] text-slate-400">{school.admin?.email || '—'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                        {school.code}
                      </span>
                      <div className="mt-0.5 font-mono text-[10px] text-slate-400">{school.schoolId}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{school.board}</div>
                      <div className="text-[11px] text-slate-400">{school.type}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{school.address?.city || '—'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 pl-4.5">{school.address?.state || ''}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{school.academic?.session || '—'}</div>
                      <div className="text-[11px] text-slate-400">
                        {school.academic?.classFrom}–{school.academic?.classTo} · {school.academic?.medium}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {assignedPlanName(school.subscriptionPlan) ? (
                        <Badge variant={assignedPlanName(school.subscriptionPlan)}>
                          {assignedPlanName(school.subscriptionPlan)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={school.status}>{school.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900">
                        <ActionIcon label="View details" onClick={() => setViewingSchool(school)} className="hover:text-indigo-600">
                          <Eye size={14} />
                        </ActionIcon>
                        <ActionIcon
                          label="Reset school admin login"
                          onClick={() => handleResetLogin(school)}
                          className="hover:text-indigo-600"
                        >
                          {resettingId === school.id ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                        </ActionIcon>
                        <ActionIcon label="Edit school" onClick={() => fillFormFromSchool(school)} className="hover:text-indigo-600">
                          <Pencil size={14} />
                        </ActionIcon>
                        <ActionIcon
                          label={school.status === 'Active' ? 'Suspend school' : 'Activate school'}
                          onClick={() => handleToggleStatus(school.id, school.status)}
                          className={school.status === 'Active' ? 'hover:text-amber-600' : 'hover:text-emerald-600'}
                        >
                          {school.status === 'Active' ? <Ban size={14} /> : <Play size={14} />}
                        </ActionIcon>
                        <ActionIcon label="Delete school" onClick={() => setSchoolToDelete(school)} className="hover:text-rose-600">
                          <Trash2 size={14} />
                        </ActionIcon>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}

      {!loading && pagination.total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} schools
          </p>
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
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-xs font-semibold transition ${
                  pageNumber === page
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-900"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(viewingSchool)} onOpenChange={(open) => { if (!open) setViewingSchool(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>School details</DialogTitle>
            <DialogDescription>Read-only profile for this school tenant.</DialogDescription>
          </DialogHeader>
          {viewingSchool && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                {viewingSchool.logo ? (
                  <img src={viewingSchool.logo} alt="" className="h-14 w-14 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                    <Building2 size={22} />
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold">{viewingSchool.name}</p>
                  <p className="font-mono text-xs text-slate-500">{viewingSchool.code} · {viewingSchool.schoolId}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Type" value={viewingSchool.type} />
                <Detail label="Board" value={viewingSchool.board} />
                <Detail label="Status" value={viewingSchool.status} />
                <Detail label="Plan" value={assignedPlanName(viewingSchool.subscriptionPlan) || 'Not assigned'} />
                <Detail label="Email" value={viewingSchool.contact?.email} />
                <Detail label="Phone" value={viewingSchool.contact?.phone} />
                <Detail label="Principal" value={viewingSchool.contact?.principalName || '—'} />
                <Detail label="Admin email" value={viewingSchool.admin?.email || viewingSchool.contact?.email} />
                <Detail label="Portal login" value={viewingSchool.admin?.hasLogin ? 'Ready' : 'Not issued'} />
                <Detail label="Website" value={viewingSchool.website || '—'} />
                <Detail
                  label="Address"
                  value={`${viewingSchool.address?.line1 || ''}${viewingSchool.address?.city ? `, ${viewingSchool.address.city}` : ''}${viewingSchool.address?.state ? `, ${viewingSchool.address.state}` : ''}`}
                />
                <Detail
                  label="Academic"
                  value={`${viewingSchool.academic?.session || '—'} · ${viewingSchool.academic?.classFrom || ''}–${viewingSchool.academic?.classTo || ''} · ${viewingSchool.academic?.medium || ''}`}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(schoolToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setSchoolToDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete school</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Delete <span className="font-semibold text-slate-900 dark:text-white">{schoolToDelete?.name}</span>? All tenant data for this school will be removed.
            </p>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" disabled={deleting} onClick={() => setSchoolToDelete(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" className="flex-1 gap-2" disabled={deleting} onClick={handleDeleteSchool}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete School
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(credentials)} onOpenChange={(open) => { if (!open) setCredentials(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>School admin login</DialogTitle>
            <DialogDescription>
              {credentials?.emailSent
                ? 'Password has been emailed to the school admin email. Copy it here as a backup — it will not be shown again unless you reset the login.'
                : 'Email is not configured yet, so copy these credentials and share them with the school admin. They will not be shown again unless you reset the login.'}
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-3">
              {[
                { label: 'School ID', value: credentials.schoolId },
                { label: 'Email', value: credentials.email },
                { label: 'Password', value: credentials.password },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                    <p className="truncate font-mono text-sm text-slate-800 dark:text-slate-100">{item.value}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCredential(item.label, item.value)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600 dark:hover:bg-slate-800"
                    aria-label={`Copy ${item.label}`}
                  >
                    {copiedField === item.label ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  </button>
                </div>
              ))}
              <p className="text-xs text-slate-500">
                School admin signs in at <span className="font-semibold">/school-admin/login</span>, then chooses a subscription plan. After that, Super Admin updates invoice status on Billings.
              </p>
              <Button type="button" className="w-full" onClick={() => setCredentials(null)}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-slate-800 dark:text-slate-200">{value || '—'}</p>
    </div>
  );
}

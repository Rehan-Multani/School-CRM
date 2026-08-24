import React, { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { schoolPortalApi } from '../../../../shared/api/client';
import {
  Building2,
  Camera,
  GraduationCap,
  ImagePlus,
  Loader2,
  MapPin,
  Phone,
  Save,
  X,
} from 'lucide-react';
import { SkeletonForm } from '../../components/ui/SkeletonLoader';

const SCHOOL_TYPES = ['Public', 'Private', 'Government', 'Government Aided', 'International', 'Other'];
const SCHOOL_BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'Other'];
const SCHOOL_MEDIA = ['English', 'Hindi', 'English + Hindi', 'Other'];
const CLASS_OPTIONS = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

const selectClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 appearance-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

function apiMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

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
  return /^[6-9]\d{9}$/.test(digits);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.readAsDataURL(file);
  });
}

const emptyForm = () => ({
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
    session: '',
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
});

function Field({ id, label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-slate-600 dark:text-slate-300">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary">{title}</h3>
    </div>
  );
}

function MobileInput({ id, value, onChange, required, disabled }) {
  const digits = extractMobileDigits(value);

  return (
    <div className="flex">
      <span className="inline-flex h-11 items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        +91
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        maxLength={10}
        value={digits}
        onChange={(e) => onChange(formatIndianMobile(e.target.value))}
        required={required}
        disabled={disabled}
        placeholder="9876543210"
        className={`${inputClass} rounded-l-none ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
      />
    </div>
  );
}

export const SchoolConfig = () => {
  const { showToast, ToastComponent } = useToast();
  const { applyUser } = useSchoolAdminAuth();
  const logoFileRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    schoolPortalApi
      .config()
      .then((result) => {
        if (cancelled || !result.data) return;
        setForm({ ...emptyForm(), ...result.data });
      })
      .catch((error) => {
        if (!cancelled) showToast(apiMessage(error, 'Unable to load school configuration'), 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showToast]);

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

  const toggleWorkingDay = (day) => {
    setForm((prev) => {
      const workingDays = prev.academic.workingDays.includes(day)
        ? prev.academic.workingDays.filter((item) => item !== day)
        : [...prev.academic.workingDays, day];
      return {
        ...prev,
        academic: { ...prev.academic, workingDays },
      };
    });
  };

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      showToast('Please upload an image under 2MB', 'error');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateForm('logo', dataUrl);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load image'), 'error');
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      showToast('School name is required', 'error');
      return;
    }
    if (!isValidIndianMobile(form.contact.phone, true)) {
      showToast('Phone number must be a valid 10-digit Indian mobile number', 'error');
      return;
    }
    if (!isValidIndianMobile(form.contact.alternatePhone)) {
      showToast('Alternate phone must be a valid 10-digit Indian mobile number', 'error');
      return;
    }
    if (!isValidIndianMobile(form.admin.mobile, true)) {
      showToast('Admin mobile must be a valid 10-digit Indian mobile number', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await schoolPortalApi.updateConfig(form);
      if (result.data) {
        setForm({ ...emptyForm(), ...result.data });
      }
      if (result.user) {
        applyUser(result.user);
      }
      showToast('School configuration updated successfully', 'success');
    } catch (error) {
      showToast(apiMessage(error, 'Unable to save school configuration'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="School Configuration"
          subtitle="Update your school profile, contact, address, and academic details."
        />
        <SkeletonForm fields={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Configuration"
        subtitle="Update your school profile, contact, address, and academic details."
      />

      <form onSubmit={handleSave} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <section className="space-y-4">
          <SectionTitle icon={Building2} title="School Details" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field id="name" label="School Name" hint="Registered name of the school">
              <input
                id="name"
                className={inputClass}
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                required
              />
            </Field>
            <Field id="type" label="School Type">
              <select
                id="type"
                className={selectClass}
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value)}
              >
                {SCHOOL_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="board" label="Board">
              <select
                id="board"
                className={selectClass}
                value={form.board}
                onChange={(e) => updateForm('board', e.target.value)}
              >
                {SCHOOL_BOARDS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="establishedYear" label="Established Year">
              <input
                id="establishedYear"
                type="number"
                className={inputClass}
                value={form.establishedYear ?? ''}
                onChange={(e) => updateForm('establishedYear', e.target.value)}
                placeholder="e.g. 1998"
              />
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

          <Field id="logo" label="School Logo" hint="Square image recommended. Max size 2MB.">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => logoFileRef.current?.click()}
                className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"
              >
                {form.logo ? (
                  <img src={form.logo} alt="School logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-300 dark:bg-slate-950 dark:text-slate-600">
                    <Building2 className="h-8 w-8" />
                  </div>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-white opacity-0 transition group-hover:opacity-100">
                  <Camera className="h-4 w-4" />
                </span>
              </button>
              <div className="space-y-2">
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => logoFileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Upload logo
                  </button>
                  {form.logo && (
                    <button
                      type="button"
                      onClick={() => updateForm('logo', '')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-rose-500 hover:border-rose-200 dark:border-slate-700"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Field>
        </section>

        <section className="space-y-4">
          <SectionTitle icon={Phone} title="Contact" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field id="contact.email" label="Official Email">
              <input
                id="contact.email"
                type="email"
                className={inputClass}
                value={form.contact.email}
                onChange={(e) => updateForm('contact.email', e.target.value)}
                required
              />
            </Field>
            <Field id="contact.phone" label="Phone Number">
              <MobileInput
                id="contact.phone"
                value={form.contact.phone}
                onChange={(value) => updateForm('contact.phone', value)}
                required
              />
            </Field>
            <Field id="contact.alternatePhone" label="Alternate Phone">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field id="address.line1" label="Address Line 1">
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
            <Field id="address.city" label="City">
              <input
                id="address.city"
                className={inputClass}
                value={form.address.city}
                onChange={(e) => updateForm('address.city', e.target.value)}
                required
              />
            </Field>
            <Field id="address.state" label="State">
              <input
                id="address.state"
                className={inputClass}
                value={form.address.state}
                onChange={(e) => updateForm('address.state', e.target.value)}
                required
              />
            </Field>
            <Field id="address.country" label="Country">
              <input
                id="address.country"
                className={inputClass}
                value={form.address.country}
                onChange={(e) => updateForm('address.country', e.target.value)}
                required
              />
            </Field>
            <Field id="address.pincode" label="Pincode">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field id="academic.session" label="Academic Session">
              <input
                id="academic.session"
                className={inputClass}
                value={form.academic.session}
                onChange={(e) => updateForm('academic.session', e.target.value)}
                placeholder="2026-27"
                required
              />
            </Field>
            <Field id="academic.medium" label="Medium">
              <select
                id="academic.medium"
                className={selectClass}
                value={form.academic.medium}
                onChange={(e) => updateForm('academic.medium', e.target.value)}
              >
                {SCHOOL_MEDIA.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="academic.classFrom" label="Classes From">
              <select
                id="academic.classFrom"
                className={selectClass}
                value={form.academic.classFrom}
                onChange={(e) => updateForm('academic.classFrom', e.target.value)}
              >
                {CLASS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="academic.classTo" label="Classes To">
              <select
                id="academic.classTo"
                className={selectClass}
                value={form.academic.classTo}
                onChange={(e) => updateForm('academic.classTo', e.target.value)}
              >
                {CLASS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
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
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? 'bg-primary text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </Field>
        </section>

        <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Configuration
          </button>
        </div>
      </form>

      <ToastComponent />
    </div>
  );
};

export default SchoolConfig;

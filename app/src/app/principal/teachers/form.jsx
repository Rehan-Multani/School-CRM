import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { principalPeopleApi } from '../../../api/principal/people';
import { useAsync } from '../../../lib/useAsync';
import { useKeyboard } from '../../../lib/useKeyboard';
import { showError, toast } from '../../../lib/notify';
import { Button, Card, Input } from '../../../components/ui';
import { Chip, DateField, ErrorView, FieldLabel, Select, TextArea } from '../../../components/kit';
import { SkeletonForm } from '../../../components/Skeleton';
import { spacing } from '../../../theme';
import {
  DocGroup,
  PhotoField,
  SectionHead,
  dateOnly,
  isEmail,
  isValidMobile,
  sanitizeMobile,
  useHrOptions,
} from '../../../components/principal/people/shared';

const DOCS = [
  { key: 'aadhaar', label: 'Aadhaar Card Photo', field: 'aadhaarDocuments', hint: 'Front and back.' },
  { key: 'others', label: 'Document', field: 'otherDocuments', hint: 'Any other supporting document.' },
];

// Add a teacher, or edit one when opened with `?id=` (web: Teacher Management modal).
export default function PrincipalTeacherForm() {
  const { id } = useLocalSearchParams();
  const existing = useAsync(() => (id ? principalPeopleApi.teacher(id) : Promise.resolve(null)), [id]);
  if (id && existing.loading && !existing.data) return <SkeletonForm fields={9} />;
  if (id && existing.error && !existing.data) return <ErrorView error={existing.error} onRetry={existing.reload} />;
  return <TeacherForm teacher={existing.data?.data || null} />;
}

function TeacherForm({ teacher }) {
  const theme = useTheme();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const hr = useHrOptions();
  const isEdit = Boolean(teacher?.id);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(() => ({
    fullName: teacher?.fullName || teacher?.name || '',
    gender: teacher?.gender || 'MALE',
    dateOfBirth: dateOnly(teacher?.dateOfBirth),
    mobileNumber: teacher?.mobileNumber || teacher?.phone || '',
    email: teacher?.email || '',
    address: typeof teacher?.address === 'string' ? teacher.address : teacher?.address?.addressLine || '',
    employeeId: teacher?.employeeId || '',
    qualification: Array.isArray(teacher?.qualifications) ? teacher.qualifications.map((q) => (typeof q === 'string' ? q : q?.degree)).filter(Boolean).join(', ') : '',
    joiningDate: dateOnly(teacher?.joiningDate),
    experienceSummary: teacher?.experienceSummary || '',
    department: teacher?.department || '',
    designation: teacher?.designation || '',
  }));
  const [photo, setPhoto] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [kept, setKept] = useState(() => ({
    aadhaar: (teacher?.documents?.aadhaar || []).filter(Boolean).slice(0, 2),
    others: (teacher?.documents?.others || []).filter(Boolean).slice(0, 2),
  }));
  const [added, setAdded] = useState({ aadhaar: [], others: [] });
  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const deptOptions = hr.departments.filter((d) => d.status === 'ACTIVE' || d.name === form.department).map((d) => ({ value: d.name, label: d.name }));
  const desigOptions = hr.designations.filter((d) => d.status === 'ACTIVE' || d.title === form.designation).map((d) => ({ value: d.title, label: d.title }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.mobileNumber.trim()) e.mobileNumber = 'Mobile number is required';
    else if (!isValidMobile(form.mobileNumber, true)) e.mobileNumber = 'Mobile number must be exactly 10 digits';
    if (form.email.trim() && !isEmail(form.email)) e.email = 'Enter a valid email address';
    if (!form.employeeId.trim()) e.employeeId = 'Employee ID is required';
    if (!form.qualification.trim()) e.qualification = 'Qualification is required';
    if (!form.joiningDate) e.joiningDate = 'Joining date is required';
    if (!form.department) e.department = 'Select a department';
    if (!form.designation) e.designation = 'Select a designation';
    setErrors(e);
    if (Object.keys(e).length) showError({ message: 'Fill all required teacher fields before saving' }, 'Check the form');
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    const fullName = form.fullName.trim().replace(/\s+/g, ' ');
    const [firstName, ...rest] = fullName.split(' ');
    const fd = new FormData();
    const fields = {
      name: fullName,
      firstName,
      middleName: '',
      lastName: rest.join(' '),
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
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v ?? ''));
    fd.append('address', JSON.stringify({ addressLine: form.address.trim() }));
    fd.append('qualifications', JSON.stringify([{ degree: form.qualification.trim() }]));
    if (photo) fd.append('photo', photo);
    if (removePhoto && !photo) fd.append('removePhoto', 'true');
    fd.append('documentsKeep', JSON.stringify({ aadhaar: kept.aadhaar, others: kept.others }));
    DOCS.forEach(({ key, field }) => added[key].forEach((f) => fd.append(field, f)));

    setSaving(true);
    try {
      if (isEdit) await principalPeopleApi.updateTeacher(teacher.id, fd);
      else await principalPeopleApi.createTeacher(fd);
      toast(isEdit ? 'Teacher updated' : 'Teacher created');
      router.back();
    } catch (e) {
      showError(e, isEdit ? 'Unable to update teacher' : 'Unable to create teacher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: isEdit ? 'Edit Teacher' : 'Add Teacher' }} />
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: Math.max(80, keyboardVisible ? keyboardHeight + 80 : 80) }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <SectionHead>Basic Details</SectionHead>
        <Card>
          <PhotoField
            existing={teacher?.profilePhoto}
            picked={photo}
            removed={removePhoto}
            onPick={(f) => {
              setPhoto(f);
              setRemovePhoto(false);
            }}
            onRemove={() => {
              setPhoto(null);
              setRemovePhoto(Boolean(teacher?.profilePhoto));
            }}
          />
          <Input label="Full Name" required value={form.fullName} onChangeText={set('fullName')} error={errors.fullName} placeholder="Rahul Sharma" />
          <FieldLabel>Gender *</FieldLabel>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            {['MALE', 'FEMALE', 'OTHER'].map((g) => (
              <Chip key={g} label={g.charAt(0) + g.slice(1).toLowerCase()} active={form.gender === g} onPress={() => set('gender')(g)} />
            ))}
          </View>
          <DateField label="Date of Birth" value={form.dateOfBirth} onChange={set('dateOfBirth')} maximumDate={new Date()} />
        </Card>

        <SectionHead>Contact Details</SectionHead>
        <Card>
          <Input
            label={`Mobile Number${form.mobileNumber ? ` (${form.mobileNumber.length}/10)` : ''}`}
            required
            value={form.mobileNumber}
            onChangeText={(v) => set('mobileNumber')(sanitizeMobile(v))}
            keyboardType="number-pad"
            maxLength={10}
            error={errors.mobileNumber}
            placeholder="9876543210"
          />
          <Input label="Email" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={errors.email} placeholder="teacher@school.com" />
          <TextArea label="Address" value={form.address} onChangeText={set('address')} placeholder="House no, street, locality, city" />
        </Card>

        <SectionHead>Professional Details</SectionHead>
        <Card>
          <Input label="Employee ID" required value={form.employeeId} onChangeText={set('employeeId')} error={errors.employeeId} placeholder="TCH-1001" autoCapitalize="characters" />
          <Input label="Qualification" required value={form.qualification} onChangeText={set('qualification')} error={errors.qualification} placeholder="M.Sc, B.Ed" />
          <DateField label="Joining Date *" value={form.joiningDate} onChange={set('joiningDate')} error={errors.joiningDate} />
          <Input label="Experience" value={form.experienceSummary} onChangeText={set('experienceSummary')} placeholder="8 years of classroom teaching" />
          <Select label="Department *" value={form.department} options={deptOptions} onChange={set('department')} error={errors.department} placeholder="Select department" />
          <Select label="Designation *" value={form.designation} options={desigOptions} onChange={set('designation')} error={errors.designation} placeholder="Select designation" />
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            Class, section and subject assignments are managed from Academics. The app login password is set from the teacher profile after saving.
          </Text>
        </Card>

        <SectionHead>Documents</SectionHead>
        <Card>
          {DOCS.map((d) => (
            <DocGroup
              key={d.key}
              title={d.label}
              hint={d.hint}
              kept={kept[d.key]}
              added={added[d.key]}
              onRemoveKept={(p) => setKept((prev) => ({ ...prev, [d.key]: prev[d.key].filter((x) => x !== p) }))}
              onRemoveAdded={(i) => setAdded((prev) => ({ ...prev, [d.key]: prev[d.key].filter((_, idx) => idx !== i) }))}
              onAdd={(files) => setAdded((prev) => ({ ...prev, [d.key]: [...prev[d.key], ...files] }))}
            />
          ))}
        </Card>

        <Button
          title={isEdit ? 'Update Teacher' : 'Save Teacher'}
          icon="checkmark-circle-outline"
          loading={saving}
          loadingTitle="Saving..."
          onPress={submit}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

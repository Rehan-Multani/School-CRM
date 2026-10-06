import { useEffect, useState } from 'react';
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
  useAcademicRefs,
} from '../../../components/principal/people/shared';

const DOCS = [
  { key: 'aadhaar', label: 'Aadhaar Card Photo', field: 'aadhaarDocuments', hint: 'Front and back.' },
  { key: 'marksheet', label: "Previous Year's Marksheet", field: 'marksheetDocuments', hint: 'Grade sheet / report card.' },
];

// Add a student, or edit one when opened with `?id=` (web: Student Management modal).
export default function PrincipalStudentForm() {
  const { id } = useLocalSearchParams();
  const existing = useAsync(() => (id ? principalPeopleApi.student(id) : Promise.resolve(null)), [id]);
  if (id && existing.loading && !existing.data) return <SkeletonForm fields={9} />;
  if (id && existing.error && !existing.data) return <ErrorView error={existing.error} onRetry={existing.reload} />;
  return <StudentForm student={existing.data?.data || null} />;
}

function StudentForm({ student }) {
  const theme = useTheme();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const refs = useAcademicRefs();
  const isEdit = Boolean(student?.id);
  const enr = student?.enrollment;
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(() => ({
    admissionNumber: student?.admissionNumber || '',
    rollNumber: enr?.rollNumber || '',
    firstName: student?.firstName || '',
    lastName: student?.lastName || '',
    gender: student?.gender || 'MALE',
    dateOfBirth: dateOnly(student?.dateOfBirth),
    enrollmentDate: dateOnly(enr?.enrollmentDate),
    parentName: student?.parentName || '',
    parentPhone: student?.parentPhone || '',
    email: student?.email || '',
    phone: student?.phone || '',
    address: student?.address || '',
    academicYearId: enr?.academicYearId || '',
    classId: enr?.classId || '',
    sectionId: enr?.sectionId || '',
    status: student?.status || 'ACTIVE',
  }));
  const [photo, setPhoto] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [kept, setKept] = useState(() => ({
    aadhaar: (student?.documents?.aadhaar || []).filter(Boolean),
    marksheet: (student?.documents?.marksheet || []).filter(Boolean),
  }));
  const [added, setAdded] = useState({ aadhaar: [], marksheet: [] });
  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  // New student: default to the current academic year once the years load.
  useEffect(() => {
    if (!isEdit && !form.academicYearId && refs.currentYear) set('academicYearId')(refs.currentYear.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs.currentYear, isEdit]);
  useEffect(() => {
    refs.loadYearClasses(form.academicYearId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.academicYearId]);

  const yearOptions = refs.years.map((y) => ({ value: y.id, label: y.name }));
  const classOptions = refs.classesForYear(form.academicYearId, form.classId).map((c) => ({ value: c.id, label: c.name }));
  const sectionOptions = refs.sectionsFor(form.academicYearId, form.classId).map((s) => ({ value: s.id, label: s.name }));

  const validate = () => {
    const e = {};
    if (!form.admissionNumber.trim()) e.admissionNumber = 'Admission number is required';
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.parentName.trim()) e.parentName = 'Parent / guardian name is required';
    if (!isValidMobile(form.parentPhone, true)) e.parentPhone = 'Parent / guardian phone must be exactly 10 digits';
    if (form.phone && !isValidMobile(form.phone, false)) e.phone = 'Student phone must be exactly 10 digits';
    if (form.email.trim() && !isEmail(form.email)) e.email = 'Enter a valid email address';
    if (!form.academicYearId) e.academicYearId = 'Select an academic year';
    if (!form.classId) e.classId = 'Select a class';
    if (!form.sectionId) e.sectionId = 'Select a section';
    setErrors(e);
    if (Object.keys(e).length) showError({ message: Object.values(e)[0] }, 'Check the form');
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    const values = {
      ...form,
      admissionNumber: form.admissionNumber.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      parentName: form.parentName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      rollNumber: form.rollNumber.trim(),
    };
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      fd.append(k, v);
    });
    if (photo) fd.append('photo', photo);
    else if (removePhoto && student?.photo) fd.append('removePhoto', 'true');
    if (isEdit) {
      const orig = student.documents || {};
      const removed = [
        ...(orig.aadhaar || []).filter((p) => !kept.aadhaar.includes(p)),
        ...(orig.marksheet || []).filter((p) => !kept.marksheet.includes(p)),
      ];
      if (removed.length) fd.append('removeDocuments', JSON.stringify(removed));
    }
    DOCS.forEach(({ key, field }) => added[key].forEach((f) => fd.append(field, f)));

    setSaving(true);
    try {
      if (isEdit) await principalPeopleApi.updateStudent(student.id, fd);
      else await principalPeopleApi.createStudent(fd);
      toast(isEdit ? 'Student updated' : 'Student created');
      router.back();
    } catch (e) {
      showError(e, isEdit ? 'Unable to update student' : 'Unable to create student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: isEdit ? 'Edit Student' : 'Add Student' }} />
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: Math.max(80, keyboardVisible ? keyboardHeight + 80 : 80) }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Card>
          <PhotoField
            existing={student?.photo}
            picked={photo}
            removed={removePhoto}
            onPick={(f) => {
              setPhoto(f);
              setRemovePhoto(false);
            }}
            onRemove={() => {
              setPhoto(null);
              setRemovePhoto(true);
            }}
          />
        </Card>

        <SectionHead>Student</SectionHead>
        <Card>
          <Input label="Admission Number" required value={form.admissionNumber} onChangeText={set('admissionNumber')} error={errors.admissionNumber} placeholder="e.g. ADM-2026-001" autoCapitalize="characters" />
          <Input label="Roll Number" value={form.rollNumber} onChangeText={set('rollNumber')} placeholder="e.g. 17" />
          <Input label="First Name" required value={form.firstName} onChangeText={set('firstName')} error={errors.firstName} placeholder="e.g. Aarav" />
          <Input label="Last Name" value={form.lastName} onChangeText={set('lastName')} placeholder="e.g. Sharma" />
          <FieldLabel>Gender *</FieldLabel>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            {['MALE', 'FEMALE', 'OTHER'].map((g) => (
              <Chip key={g} label={g.charAt(0) + g.slice(1).toLowerCase()} active={form.gender === g} onPress={() => set('gender')(g)} />
            ))}
          </View>
          <DateField label="Date of Birth" value={form.dateOfBirth} onChange={set('dateOfBirth')} maximumDate={new Date()} />
          <Input label="Student Email" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={errors.email} placeholder="e.g. aarav@school.edu" />
          <Input label="Student Phone" value={form.phone} onChangeText={(v) => set('phone')(sanitizeMobile(v))} keyboardType="number-pad" maxLength={10} error={errors.phone} placeholder="9876512345" />
          <TextArea label="Address" value={form.address} onChangeText={set('address')} placeholder="House / street / locality" />
        </Card>

        <SectionHead>Parent / Guardian</SectionHead>
        <Card>
          <Input label="Parent / Guardian Name" required value={form.parentName} onChangeText={set('parentName')} error={errors.parentName} placeholder="e.g. Rajesh Sharma" />
          <Input
            label={`Parent / Guardian Phone${form.parentPhone ? ` (${form.parentPhone.length}/10)` : ''}`}
            required
            value={form.parentPhone}
            onChangeText={(v) => set('parentPhone')(sanitizeMobile(v))}
            keyboardType="number-pad"
            maxLength={10}
            error={errors.parentPhone}
            placeholder="9876543210"
          />
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            The parent app login is created from the student profile after saving (Create parent login).
          </Text>
        </Card>

        <SectionHead>Enrollment</SectionHead>
        <Card>
          <Select
            label="Academic Year *"
            value={form.academicYearId}
            options={yearOptions}
            error={errors.academicYearId}
            onChange={(v) => setForm((p) => ({ ...p, academicYearId: v, classId: '', sectionId: '' }))}
          />
          <Select
            label="Class *"
            value={form.classId}
            options={classOptions}
            error={errors.classId}
            disabled={!form.academicYearId}
            placeholder={!form.academicYearId ? 'Select academic year first' : classOptions.length ? 'Select class' : 'No classes in this academic year'}
            onChange={(v) => setForm((p) => ({ ...p, classId: v, sectionId: '' }))}
          />
          <Select
            label="Section *"
            value={form.sectionId}
            options={sectionOptions}
            error={errors.sectionId}
            disabled={!form.classId}
            placeholder={!form.classId ? 'Select class first' : sectionOptions.length ? 'Select section' : 'No sections for this class'}
            onChange={set('sectionId')}
          />
          <DateField label="Enrollment Date" value={form.enrollmentDate} onChange={set('enrollmentDate')} />
          <FieldLabel>Status</FieldLabel>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Chip label="Active" active={form.status === 'ACTIVE'} onPress={() => set('status')('ACTIVE')} />
            <Chip label="Inactive" active={form.status === 'INACTIVE'} onPress={() => set('status')('INACTIVE')} />
          </View>
        </Card>

        <SectionHead>Student Documents</SectionHead>
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
          title={isEdit ? 'Update Student' : 'Create Student'}
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

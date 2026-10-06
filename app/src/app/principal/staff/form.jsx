import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { principalPeopleApi } from '../../../api/principal/people';
import { useAsync } from '../../../lib/useAsync';
import { useKeyboard } from '../../../lib/useKeyboard';
import { ymd } from '../../../lib/format';
import { showError, toast } from '../../../lib/notify';
import { Button, Card, Input } from '../../../components/ui';
import { Chip, DateField, ErrorView, FieldLabel, Select } from '../../../components/kit';
import { SkeletonForm } from '../../../components/Skeleton';
import { spacing } from '../../../theme';
import { DocGroup, PhotoField, SectionHead, dateOnly, isEmail, isValidMobile, sanitizeMobile, useHrOptions } from '../../../components/principal/people/shared';
import { ROLES } from '../../../components/principal/people/staffRoles';

// Register a staff user, or edit one when opened with `?id=` (web: Staff Management modal).
export default function PrincipalStaffForm() {
  const { id, role } = useLocalSearchParams();
  const existing = useAsync(() => (id ? principalPeopleApi.user(id) : Promise.resolve(null)), [id]);
  if (id && existing.loading && !existing.data) return <SkeletonForm fields={9} />;
  if (id && existing.error && !existing.data) return <ErrorView error={existing.error} onRetry={existing.reload} />;
  return <StaffForm user={existing.data?.data || null} presetRole={role} />;
}

function StaffForm({ user, presetRole }) {
  const theme = useTheme();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const hr = useHrOptions();
  const isEdit = Boolean(user?.id);
  const bank = user?.bankDetails || {};
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(() => ({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    password: '',
    role: user?.role || (ROLES.some((r) => r.value === presetRole) ? presetRole : 'LIBRARIAN'),
    phone: user?.phone || '',
    gender: user?.gender || 'MALE',
    specialization: user?.specialization || '',
    employeeId: user?.employeeId || `EMP${Math.floor(1000 + Math.random() * 9000)}`,
    joiningDate: user ? dateOnly(user.joiningDate) : ymd(),
    department: user?.department || '',
    designation: user?.designation || '',
    basicSalary: user?.basicSalary !== undefined && user?.basicSalary !== null ? String(user.basicSalary) : '',
    accountName: bank.accountName || '',
    accountNumber: bank.accountNumber || '',
    ifscCode: bank.ifscCode || '',
    bankName: bank.bankName || '',
    branchName: bank.branchName || '',
    accountType: bank.accountType || 'SALARY',
    status: user?.status || 'ACTIVE',
  }));
  const [photo, setPhoto] = useState(null);
  const [keptDocs, setKeptDocs] = useState(() => (Array.isArray(user?.documents) ? user.documents.filter(Boolean) : []));
  const [newDocs, setNewDocs] = useState([]);
  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const deptOptions = hr.departments.filter((d) => d.status === 'ACTIVE' || d.name === form.department).map((d) => ({ value: d.name, label: d.name }));
  const desigOptions = hr.designations.filter((d) => d.status === 'ACTIVE' || d.title === form.designation).map((d) => ({ value: d.title, label: d.title }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!isEmail(form.email)) e.email = 'Enter a valid email address';
    if (!form.employeeId.trim()) e.employeeId = 'Employee ID is required';
    if (!form.department) e.department = 'Select a department';
    if (!form.designation) e.designation = 'Select a designation';
    if (!isEdit && form.password.length < 6) e.password = 'Initial login password must be at least 6 characters';
    if (isEdit && form.password && form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.phone && !isValidMobile(form.phone, false)) e.phone = 'Phone / Mobile number must be exactly 10 digits';
    setErrors(e);
    if (Object.keys(e).length) showError({ message: Object.values(e)[0] }, 'Check the form');
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    const fd = new FormData();
    Object.entries({ ...form, firstName: form.firstName.trim(), email: form.email.trim() }).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === 'password' && isEdit && !v) return;
      fd.append(k, v);
    });
    if (photo) fd.append('photo', photo);
    newDocs.forEach((f) => fd.append('documents', f));
    if (isEdit) (user.documents || []).filter((d) => !keptDocs.includes(d)).forEach((d) => fd.append('removeDocuments', d));

    setSaving(true);
    try {
      if (isEdit) await principalPeopleApi.updateUser(user.id, fd);
      else await principalPeopleApi.createUser(fd);
      toast(isEdit ? `User "${form.firstName}" updated successfully` : `Staff user "${form.firstName}" registered successfully`);
      router.back();
    } catch (e) {
      showError(e, 'Failed to save staff user record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: isEdit ? 'Edit Staff User' : 'Add Staff Member' }} />
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: Math.max(80, keyboardVisible ? keyboardHeight + 80 : 80) }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Card>
          <PhotoField label="Staff Profile Photo" existing={user?.photo} picked={photo} maxBytes={5 * 1024 * 1024} onPick={setPhoto} onRemove={() => setPhoto(null)} />
        </Card>

        <SectionHead>1. Personal & Login Credentials</SectionHead>
        <Card>
          <Input label="First Name" required value={form.firstName} onChangeText={set('firstName')} error={errors.firstName} placeholder="e.g. Ramesh" />
          <Input label="Last Name" value={form.lastName} onChangeText={set('lastName')} placeholder="e.g. Kumar" />
          <Input label="Email Address" required value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={errors.email} placeholder="staff@school.edu" />
          <Input
            label={isEdit ? 'New Password (leave blank to keep current)' : 'Login Password'}
            required={!isEdit}
            secureTextEntry
            value={form.password}
            onChangeText={set('password')}
            autoCapitalize="none"
            error={errors.password}
            placeholder={isEdit ? '********' : 'Min 6 characters'}
          />
          <Select label="Staff Role *" value={form.role} options={ROLES} onChange={set('role')} />
          <Input
            label={`Phone / Mobile${form.phone ? ` (${form.phone.length}/10)` : ''}`}
            value={form.phone}
            onChangeText={(v) => set('phone')(sanitizeMobile(v))}
            keyboardType="number-pad"
            maxLength={10}
            error={errors.phone}
            placeholder="9876543210"
          />
          <FieldLabel>Gender</FieldLabel>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {['MALE', 'FEMALE', 'OTHER'].map((g) => (
              <Chip key={g} label={g.charAt(0) + g.slice(1).toLowerCase()} active={form.gender === g} onPress={() => set('gender')(g)} />
            ))}
          </View>
        </Card>

        <SectionHead>2. Employment & Designation</SectionHead>
        <Card>
          <Input label="Employee ID" required value={form.employeeId} onChangeText={set('employeeId')} error={errors.employeeId} placeholder="e.g. EMP1024" autoCapitalize="characters" />
          <DateField label="Joining Date" value={form.joiningDate} onChange={set('joiningDate')} />
          <Select label="Department *" value={form.department} options={deptOptions} onChange={set('department')} error={errors.department} placeholder="Select department" />
          <Select label="Designation *" value={form.designation} options={desigOptions} onChange={set('designation')} error={errors.designation} placeholder="Select designation" />
          <Input label="Specialization" value={form.specialization} onChangeText={set('specialization')} placeholder="e.g. Mathematics / Finance" />
          {isEdit ? (
            <>
              <FieldLabel>Status</FieldLabel>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Chip label="Active" active={form.status === 'ACTIVE'} onPress={() => set('status')('ACTIVE')} />
                <Chip label="Inactive" active={form.status === 'INACTIVE'} onPress={() => set('status')('INACTIVE')} />
              </View>
            </>
          ) : null}
        </Card>

        <SectionHead>3. Bank Account & Payroll</SectionHead>
        <Card>
          <Input label="Basic Salary (INR / month)" value={form.basicSalary} onChangeText={(v) => set('basicSalary')(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="e.g. 45000" />
          <Input label="Account Holder Name" value={form.accountName} onChangeText={set('accountName')} placeholder="e.g. Ramesh Kumar" />
          <Input label="Account Number" value={form.accountNumber} onChangeText={set('accountNumber')} keyboardType="number-pad" placeholder="e.g. 501004382910" />
          <Input label="IFSC Code" value={form.ifscCode} onChangeText={(v) => set('ifscCode')(v.toUpperCase())} autoCapitalize="characters" placeholder="HDFC0001234" />
          <Input label="Bank Name" value={form.bankName} onChangeText={set('bankName')} placeholder="HDFC Bank" />
          <Input label="Branch Name" value={form.branchName} onChangeText={set('branchName')} placeholder="Connaught Place" />
          <FieldLabel>Account Type</FieldLabel>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {['SALARY', 'SAVINGS', 'CURRENT'].map((a) => (
              <Chip key={a} label={a.charAt(0) + a.slice(1).toLowerCase()} active={form.accountType === a} onPress={() => set('accountType')(a)} />
            ))}
          </View>
        </Card>

        <SectionHead>4. KYC & Verification Documents</SectionHead>
        <Card>
          <DocGroup
            title="Documents"
            hint="Aadhaar, PAN, qualification or identity proof."
            max={3}
            kept={keptDocs}
            added={newDocs}
            onRemoveKept={(p) => setKeptDocs((prev) => prev.filter((x) => x !== p))}
            onRemoveAdded={(i) => setNewDocs((prev) => prev.filter((_, idx) => idx !== i))}
            onAdd={(files) => setNewDocs((prev) => [...prev, ...files])}
          />
        </Card>

        <Button
          title={isEdit ? 'Update Staff User' : 'Create Staff User'}
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

import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '../../../context/ThemeContext';
import { principalPeopleApi } from '../../../api/principal/people';
import { showError, toast } from '../../../lib/notify';
import { Button, Input } from '../../ui';
import { Chip, FieldLabel } from '../../kit';
import { font, spacing } from '../../../theme';
import { isEmail, isValidMobile, sanitizeMobile } from './shared';

const RELATIONS = ['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'];

// Create a parent login for a student: Parent record + child link + password
// (POST /parents with the child, then POST /academic/parents/:id/set-password).
export default function ParentLoginSheet({ visible, student, onClose, onDone }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  // The Modal renders nothing while hidden, so the body's form state starts fresh each time it opens.
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grabber} />
          <ParentLoginBody student={student} onClose={onClose} onDone={onDone} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ParentLoginBody({ student, onClose, onDone }) {
  const styles = useStyles(makeStyles);
  const [first, ...rest] = String(student?.parentName || '').trim().split(/\s+/);
  const [form, setForm] = useState({ firstName: first || '', lastName: rest.join(' '), phone: student?.parentPhone || '', email: '', relationship: 'GUARDIAN', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  // When the parent was created but the password step failed, retry only the password.
  const [createdId, setCreatedId] = useState(null);

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Parent first name is required';
    if (!form.phone && !form.email.trim()) e.phone = 'A phone or email is required for the parent login';
    if (form.phone && !isValidMobile(form.phone, true)) e.phone = 'Phone must be exactly 10 digits';
    if (form.email.trim() && !isEmail(form.email)) e.email = 'Enter a valid email address';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      let parentId = createdId;
      if (!parentId) {
        const res = await principalPeopleApi.createParent({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone,
          email: form.email.trim().toLowerCase(),
          children: [{ studentId: student.id, relationship: form.relationship, isPrimary: true }],
        });
        parentId = res?.data?.id;
        if (!parentId) throw new Error('Parent was created without an id');
        setCreatedId(parentId);
      }
      await principalPeopleApi.setParentPassword(parentId, form.password, form.email.trim().toLowerCase());
      toast('Parent login created');
      onDone?.();
      onClose();
    } catch (err) {
      showError(err, createdId ? 'Parent saved, but the password was not set' : 'Could not create parent login');
    } finally {
      setSaving(false);
    }
  };

  return (
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Create parent login</Text>
            <Text style={styles.sub}>
              Creates a parent account linked to {student?.name || 'this student'}. The parent signs in to the app with their phone number (OTP) or the email and password set here.
            </Text>
            <Input label="Parent first name" required value={form.firstName} onChangeText={set('firstName')} error={errors.firstName} />
            <Input label="Parent last name" value={form.lastName} onChangeText={set('lastName')} />
            <Input label="Phone" value={form.phone} onChangeText={(v) => set('phone')(sanitizeMobile(v))} keyboardType="number-pad" maxLength={10} error={errors.phone} placeholder="9876543210" />
            <Input label="Email (optional)" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={errors.email} />
            <FieldLabel>Relationship</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
              {RELATIONS.map((r) => (
                <Chip key={r} label={r.charAt(0) + r.slice(1).toLowerCase()} active={form.relationship === r} onPress={() => set('relationship')(r)} />
              ))}
            </View>
            <Input label="Password" required secureTextEntry value={form.password} onChangeText={set('password')} autoCapitalize="none" error={errors.password} placeholder="Minimum 8 characters" />
            <Input label="Confirm password" required secureTextEntry value={form.confirm} onChangeText={set('confirm')} autoCapitalize="none" error={errors.confirm} />
            <Button title={createdId ? 'Set password' : 'Create parent login'} icon="people-outline" loading={saving} loadingTitle="Saving..." onPress={submit} />
            <Button title="Cancel" variant="ghost" onPress={onClose} style={{ marginTop: spacing.sm }} />
          </ScrollView>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: { backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: spacing.lg, maxHeight: '92%' },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginBottom: spacing.md },
    title: { fontSize: font.xl, fontWeight: '800', color: t.text },
    sub: { fontSize: font.sm, color: t.textMuted, marginTop: 2, marginBottom: spacing.lg },
  });

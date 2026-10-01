import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { parentApi } from '../../../api/parent';
import { useAsync } from '../../../lib/useAsync';
import { useUnsavedGuard } from '../../../lib/useUnsavedGuard';
import { showError, toast } from '../../../lib/notify';
import { useKeyboard } from '../../../lib/useKeyboard';
import { Button, Card, Input } from '../../../components/ui';
import { ErrorView, TextArea } from '../../../components/kit';
import { SkeletonForm } from '../../../components/Skeleton';
import { font, spacing } from '../../../theme';

const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Doc 03 §7.7 — editable: firstName, lastName, phone, email, address. (The
// photo is changed from the Profile tab.) Mounted only once the profile is
// loaded, so the form state is seeded directly rather than in an effect.
function ProfileForm({ profile }) {
  const theme = useTheme();
  const { refreshSession } = useAuth();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const initial = {
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    phone: profile.phone || '',
    email: profile.email || '',
    address: profile.address || '',
  };
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const dirty = Object.keys(initial).some((k) => f[k] !== initial[k]);
  useUnsavedGuard(dirty && !saving, 'Your changes are not saved yet. Leave without saving?');
  const set = (k) => (v) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: '' } : e));
  };

  const save = async () => {
    const e = {};
    if (!f.firstName.trim()) e.firstName = 'First name is required';
    if (!f.phone.trim()) e.phone = 'Mobile number is required';
    else if (!PHONE_RE.test(f.phone.trim())) e.phone = 'Enter a valid mobile number';
    if (f.email.trim() && !EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await parentApi.updateProfile({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        phone: f.phone.trim(),
        email: f.email.trim(),
        address: f.address.trim(),
      });
      await refreshSession().catch(() => {});
      toast.success('Profile updated');
      router.back();
    } catch (err) {
      showError(err, 'Could not save');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: Math.max(60, keyboardVisible ? keyboardHeight + 80 : 60),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Card style={{ marginBottom: spacing.lg }}>
          <Input label="First name" required icon="person-outline" value={f.firstName} onChangeText={set('firstName')} error={errors.firstName} maxLength={60} autoCapitalize="words" />
          <Input label="Last name" icon="person-outline" value={f.lastName} onChangeText={set('lastName')} maxLength={60} autoCapitalize="words" />
          <Input label="Mobile number" required icon="call-outline" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={15} error={errors.phone} />
          <Input label="Email" icon="mail-outline" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" maxLength={120} error={errors.email} />
          <TextArea label="Address" value={f.address} onChangeText={set('address')} maxLength={300} placeholder="House / flat no., street, area, city, PIN code" />
        </Card>
        <Text style={{ fontSize: font.sm, color: theme.textMuted, marginBottom: spacing.lg, lineHeight: 18 }}>
          Your mobile number or email is also your login ID. If you change it, use the new one the next time you sign in.
        </Text>
        <Button title="Save changes" icon="checkmark-outline" loading={saving} loadingTitle="Saving..." disabled={!dirty} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function EditProfile() {
  const state = useAsync(() => parentApi.profile(), []);
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  if (!state.data) return <SkeletonForm fields={5} />;
  return <ProfileForm profile={state.data} />;
}

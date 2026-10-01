import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { studentApi } from '../../../api/student';
import { useAsync } from '../../../lib/useAsync';
import { showError, toast } from '../../../lib/notify';
import { useKeyboard } from '../../../lib/useKeyboard';
import { Button, Input } from '../../../components/ui';
import { ErrorView, TextArea } from '../../../components/kit';
import { SkeletonForm } from '../../../components/Skeleton';
import { font, radius, spacing } from '../../../theme';
import { alpha } from '../../../theme/colors';

const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

function ContactForm({ profile }) {
  const theme = useTheme();
  const { refreshSession } = useAuth();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const [f, setF] = useState({ phone: profile.phone || '', address: profile.address || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const e = {};
    if (f.phone.trim() && !PHONE_RE.test(f.phone.trim())) e.phone = 'Enter a valid mobile number';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await studentApi.updateProfile({ phone: f.phone.trim(), address: f.address.trim() });
      await refreshSession().catch(() => {});
      toast.success('Contact details updated');
      router.back();
    } catch (err) {
      showError(err, 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: Math.max(60, keyboardVisible ? keyboardHeight + 80 : 60),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Information Notice Banner */}
        <View style={[styles.banner, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.18 : 0.08), borderColor: alpha(theme.primary, 0.25) }]}>
          <View style={[styles.bannerIconBox, { backgroundColor: alpha(theme.primary, 0.15) }]}>
            <Ionicons name="information-circle" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: theme.text }]}>Communication Details</Text>
            <Text style={[styles.bannerText, { color: theme.textMuted }]}>
              Keep your contact phone and address updated for school notifications, emergency alerts, and mailings.
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Input
            label="Mobile Phone Number"
            icon="call-outline"
            value={f.phone}
            onChangeText={(v) => setF((x) => ({ ...x, phone: v }))}
            keyboardType="phone-pad"
            maxLength={15}
            error={errors.phone}
            placeholder="e.g. +91 9876543210"
          />
          <TextArea
            label="Residential Address"
            value={f.address}
            onChangeText={(v) => setF((x) => ({ ...x, address: v }))}
            maxLength={300}
            placeholder="House / flat no., street name, area, city, postal code"
          />
        </View>

        {/* Administration Policy Note */}
        <View style={styles.policyRow}>
          <Ionicons name="lock-closed-outline" size={15} color={theme.textMuted} />
          <Text style={[styles.policyText, { color: theme.textMuted }]}>
            Student name, admission ID, date of birth, and class enrollment are verified official records that can only be amended by the school administrative office.
          </Text>
        </View>

        {/* Action Button */}
        <Button
          title="Save Contact Details"
          icon="checkmark-outline"
          loading={saving}
          loadingTitle="Saving changes..."
          onPress={save}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function EditContact() {
  const state = useAsync(() => studentApi.profile(), []);
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  if (!state.data) return <SkeletonForm fields={2} />;
  return <ContactForm profile={state.data} />;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  bannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: font.sm,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerText: {
    fontSize: font.xs,
    lineHeight: 17,
  },
  card: {
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: spacing.xl,
    paddingHorizontal: 4,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});

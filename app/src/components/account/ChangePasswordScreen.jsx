import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { errorText } from '../../lib/format';
import { showError, toast } from '../../lib/notify';
import { useKeyboardScroll } from '../../lib/useKeyboard';
import { Button, Input } from '../ui';
import { font, radius, spacing } from '../../theme';
import { alpha } from '../../theme/colors';

export default function ChangePasswordScreen({ changePassword }) {
  const theme = useTheme();
  const { setToken } = useAuth();
  const {
    scrollRef,
    keyboardHeight,
    keyboardVisible,
    scrollToInput,
  } = useKeyboardScroll({ defaultOffset: 100, autoReset: false });
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const hasMinLength = f.next.length >= 8;
  const isDifferent = Boolean(f.next && f.current && f.next !== f.current);
  const isMatching = Boolean(f.next && f.confirm && f.next === f.confirm);

  const save = async () => {
    const e = {};
    if (!f.current) e.current = 'Enter your current password';
    if (f.next.length < 8) e.next = 'Must be at least 8 characters';
    else if (f.next === f.current) e.next = 'Must be different from your current password';
    if (f.confirm !== f.next) e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const res = await changePassword(f.current, f.next);
      if (res?.data?.token) await setToken(res.data.token);
      toast.success('Password changed successfully');
      router.back();
    } catch (err) {
      if (err.code === 'CURRENT_PASSWORD_INVALID') setErrors({ current: 'Current password is incorrect' });
      else if (err.code === 'PASSWORD_TOO_SHORT') setErrors({ next: errorText(err) });
      else showError(err, 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  const RuleItem = ({ checked, label }) => (
    <View style={styles.ruleItem}>
      <Ionicons
        name={checked ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={checked ? '#10B981' : theme.textMuted}
      />
      <Text style={[styles.ruleText, { color: checked ? theme.text : theme.textMuted }]}>{label}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: Math.max(60, keyboardVisible ? keyboardHeight + 80 : 60),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Security Banner */}
        <View style={[styles.banner, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.18 : 0.08), borderColor: alpha(theme.primary, 0.25) }]}>
          <View style={[styles.bannerIconBox, { backgroundColor: alpha(theme.primary, 0.15) }]}>
            <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: theme.text }]}>Account Security</Text>
            <Text style={[styles.bannerText, { color: theme.textMuted }]}>
              Updating your password will immediately secure your account and terminate active sessions on any other devices.
            </Text>
          </View>
        </View>

        {/* Input Fields Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Input
            label="Current Password"
            icon="lock-closed-outline"
            secureTextEntry
            value={f.current}
            onChangeText={set('current')}
            onFocus={() => scrollToInput(60)}
            error={errors.current}
            autoCapitalize="none"
            placeholder="Enter current password"
          />
          <Input
            label="New Password"
            icon="key-outline"
            secureTextEntry
            value={f.next}
            onChangeText={set('next')}
            onFocus={() => scrollToInput(140)}
            error={errors.next}
            autoCapitalize="none"
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm New Password"
            icon="key-outline"
            secureTextEntry
            value={f.confirm}
            onChangeText={set('confirm')}
            onFocus={() => scrollToInput(210)}
            error={errors.confirm}
            autoCapitalize="none"
            placeholder="Re-enter new password"
          />
        </View>

        {/* Requirement Checklist */}
        <View style={[styles.checklistCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Text style={[styles.checklistTitle, { color: theme.text }]}>Password Requirements</Text>
          <RuleItem checked={hasMinLength} label="At least 8 characters in length" />
          <RuleItem checked={isDifferent} label="Different from your current password" />
          <RuleItem checked={isMatching} label="Both new passwords match exactly" />
        </View>

        <Button
          title="Update Password"
          icon="lock-closed-outline"
          loading={saving}
          loadingTitle="Updating credentials..."
          onPress={save}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
    width: 38,
    height: 38,
    borderRadius: 19,
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
    marginBottom: spacing.md,
  },
  checklistCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.xl,
    gap: 8,
  },
  checklistTitle: {
    fontSize: font.xs,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

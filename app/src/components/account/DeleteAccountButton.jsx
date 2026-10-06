import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import { ROLES } from '../../api/roles';
import { toast } from '../../lib/notify';
import { errorText } from '../../lib/format';
import { alpha, font, radius, spacing } from '../../theme';

// Red "Delete account" button + confirmation popup, shared by all four role
// apps. Calls the role's `POST …/account/delete` (no password — the popup is
// the confirmation): the app login
// is removed and every device is signed out; the school keeps its records.
const KEPT = {
  TEACHER: 'Attendance, marks and homework you recorded, and your HR record',
  STUDENT: 'Your enrolment, attendance, results and fee records',
  PARENT: "Your children's records and fee payments",
  TRANSPORT: 'Your staff record, and the pickup and drop history you recorded',
  PRINCIPAL: 'Your staff record and everything the school holds. Your login ends on the web panel too',
};

function ModalDangerButton({ title, icon, onPress, loading, disabled, style }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.modalBtn,
        { backgroundColor: theme.danger, opacity: disabled || loading ? 0.6 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? null : <Ionicons name={icon} size={16} color="#FFFFFF" />}
      <Text style={styles.modalBtnText}>{loading ? 'Deleting account...' : title}</Text>
    </Pressable>
  );
}

export default function DeleteAccountButton({ style }) {
  const theme = useTheme();
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { role, clearSession } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const path = ROLES[role]?.deleteAccountPath;
  if (!path) return null;

  const close = () => {
    if (busy) return;
    setOpen(false);
  };

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await api.post(path, {});
      setOpen(false);
      toast.success('Your account has been deleted.', 'Account deleted');
      await clearSession();
    } catch (e) {
      // Inline, not a toast: the toast layer sits behind this native Modal.
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setError('');
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Delete account"
        style={({ pressed }) => [
          s.triggerBtn,
          pressed && { opacity: 0.6, transform: [{ scale: 0.98 }] },
          style,
        ]}
      >
        <Ionicons name="trash-outline" size={14} color={alpha(theme.danger, 0.75)} />
        <Text style={s.triggerText}>Delete Account</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={[s.icon, { backgroundColor: alpha(theme.danger, 0.12) }]}>
                <Ionicons name="warning" size={30} color={theme.danger} />
              </View>
              <Text style={s.title}>Delete your account?</Text>
              <Text style={s.sub}>This cannot be undone from the app.</Text>

              <View style={[s.box, { borderColor: alpha(theme.danger, 0.3), backgroundColor: alpha(theme.danger, 0.05) }]}>
                {['Your app login and password', 'Sign-in on every phone', 'Push notifications and app settings'].map((t) => (
                  <View key={t} style={s.item}>
                    <Ionicons name="close-circle" size={16} color={theme.danger} />
                    <Text style={s.itemText}>{t}</Text>
                  </View>
                ))}
              </View>
              <View style={s.item}>
                <Ionicons name="business-outline" size={16} color={theme.textMuted} />
                <Text style={[s.itemText, { color: theme.textMuted }]}>
                  Stays with the school: {KEPT[role]}. Ask the school office if you need a login again.
                </Text>
              </View>

              {error ? (
                <View style={[s.item, { marginTop: spacing.md }]}>
                  <Ionicons name="alert-circle" size={16} color={theme.danger} />
                  <Text style={[s.itemText, { color: theme.danger }]}>{error}</Text>
                </View>
              ) : null}
              <ModalDangerButton title="Delete my account" icon="trash" onPress={submit} loading={busy} style={{ marginTop: spacing.lg }} />
              <Pressable onPress={close} disabled={busy} style={s.cancel}>
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: font.md }}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBtn: {
    height: 46,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  modalBtnText: { color: '#FFFFFF', fontSize: font.md, fontWeight: '700' },
});

const makeStyles = (t) =>
  StyleSheet.create({
    triggerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radius.md,
      alignSelf: 'center',
    },
    triggerText: {
      fontSize: font.sm,
      fontWeight: '600',
      color: alpha(t.danger, 0.75),
    },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, maxHeight: '90%' },
    icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
    title: { fontSize: font.xl, fontWeight: '800', color: t.text, textAlign: 'center' },
    sub: { fontSize: font.md, color: t.textMuted, textAlign: 'center', marginTop: 4, marginBottom: spacing.lg },
    box: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
    item: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    itemText: { flex: 1, fontSize: font.md, color: t.text },
    cancel: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  });

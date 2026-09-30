import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  DRIVER: 'Your driver record and trip history with the school',
};

function DangerButton({ title, icon, onPress, loading, disabled, style }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: theme.danger, shadowColor: theme.danger, opacity: disabled || loading ? 0.6 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? null : <Ionicons name={icon} size={18} color="#FFFFFF" />}
      <Text style={styles.btnText}>{loading ? 'Deleting account...' : title}</Text>
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
      <DangerButton title="Delete account" icon="trash-outline" onPress={() => {
        setError('');
        setOpen(true);
      }} style={style} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={[s.icon, { backgroundColor: alpha(theme.danger, 0.12) }]}>
                <Ionicons name="warning" size={32} color={theme.danger} />
              </View>
              <Text style={s.title}>Delete your account?</Text>
              <Text style={s.sub}>This cannot be undone from the app.</Text>

              <View style={[s.box, { borderColor: alpha(theme.danger, 0.35), backgroundColor: alpha(theme.danger, 0.06) }]}>
                {['Your app login and password', 'Sign-in on every phone', 'Push notifications and app settings'].map((t) => (
                  <View key={t} style={s.item}>
                    <Ionicons name="close-circle" size={17} color={theme.danger} />
                    <Text style={s.itemText}>{t}</Text>
                  </View>
                ))}
              </View>
              <View style={s.item}>
                <Ionicons name="business-outline" size={17} color={theme.textMuted} />
                <Text style={[s.itemText, { color: theme.textMuted }]}>
                  Stays with the school: {KEPT[role]}. Ask the school office if you need a login again.
                </Text>
              </View>

              {error ? (
                <View style={[s.item, { marginTop: spacing.lg }]}>
                  <Ionicons name="alert-circle" size={17} color={theme.danger} />
                  <Text style={[s.itemText, { color: theme.danger }]}>{error}</Text>
                </View>
              ) : null}
              <DangerButton title="Delete my account" icon="trash" onPress={submit} loading={busy} style={{ marginTop: spacing.xl }} />
              <Pressable onPress={close} disabled={busy} style={s.cancel}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: font.lg }}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  btnText: { color: '#FFFFFF', fontSize: font.lg, fontWeight: '700' },
});

const makeStyles = (t) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, maxHeight: '90%' },
    icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
    title: { fontSize: font.xl, fontWeight: '800', color: t.text, textAlign: 'center' },
    sub: { fontSize: font.md, color: t.textMuted, textAlign: 'center', marginTop: 4, marginBottom: spacing.lg },
    box: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
    item: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    itemText: { flex: 1, fontSize: font.md, color: t.text },
    cancel: { alignItems: 'center', paddingVertical: spacing.lg },
  });

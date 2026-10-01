import { Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui';
import { brandTheme as t, font, radius, spacing } from '../theme';

// Popup shown after an administrator's "force logout" ended this session. By
// the time it appears the user is already on the login screen, so it uses the
// platform brand like every other pre-auth surface.
export default function ForcedLogoutNotice() {
  const { signedOut, dismissSignedOut } = useAuth();
  return (
    <Modal visible={Boolean(signedOut)} transparent animationType="fade" onRequestClose={dismissSignedOut} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name="log-out-outline" size={30} color={t.danger} />
          </View>
          <Text style={styles.title}>You have been signed out</Text>
          <Text style={styles.message}>{signedOut?.message}</Text>
          <Button title="OK" onPress={dismissSignedOut} style={{ alignSelf: 'stretch' }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,26,63,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginBottom: spacing.lg,
  },
  title: { fontSize: font.xl, fontWeight: '800', color: t.text, textAlign: 'center' },
  message: { fontSize: font.md, color: t.textMuted, textAlign: 'center', lineHeight: 20, marginTop: spacing.sm, marginBottom: spacing.xl },
});

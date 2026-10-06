import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalMiscApi } from '../../../api/principal/misc';
import { showError, toast } from '../../../lib/notify';
import { Button } from '../../ui';
import OtpBoxes from '../../OtpBoxes';
import { font, radius, spacing } from '../../../theme';

// Web: OtpVerificationModal. The guardian reads the 6-digit OTP (sent by SMS) to the principal.
export default function PickupOtpModal({ student, sessionId, onVerified, onClose }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const verify = async () => {
    if (otp.length < 6) return;
    setBusy(true);
    try {
      await principalMiscApi.verifySafePickupOtp(sessionId, otp);
      setDone(true);
      toast.success(`${student.name} marked as safely picked up`);
      setTimeout(onVerified, 1200);
    } catch (e) {
      setOtp('');
      showError(e, 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={busy ? undefined : onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Ionicons name="checkmark-circle" size={56} color={theme.success} />
              <Text style={styles.title}>Safe pickup completed</Text>
              <Text style={styles.sub}>{student.name} has been marked as safely picked up.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Verify parent OTP</Text>
              <View style={styles.info}>
                <Text style={styles.name}>{student.name}</Text>
                <Text style={styles.sub}>{[student.className, student.sectionName].filter(Boolean).join(' - ')}</Text>
              </View>
              <Text style={styles.sub}>OTP sent to parent mobile ending {student.maskedParentPhone || '****'}</Text>
              <View style={{ marginVertical: spacing.lg, alignItems: 'center' }}>
                <OtpBoxes value={otp} onChange={setOtp} disabled={busy} />
              </View>
              <Button title="Verify OTP" loadingTitle="Verifying..." loading={busy} disabled={otp.length < 6} onPress={verify} />
              <Button title="Cancel" variant="ghost" disabled={busy} onPress={onClose} style={{ marginTop: spacing.sm }} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    wrap: { flex: 1, justifyContent: 'flex-end' },
    sheet: { backgroundColor: t.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl },
    title: { color: t.text, fontSize: font.xl, fontWeight: '800', marginBottom: spacing.md, textAlign: 'center' },
    info: { backgroundColor: t.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
    name: { color: t.text, fontSize: font.lg, fontWeight: '700' },
    sub: { color: t.textMuted, fontSize: font.sm, marginTop: 2 },
  });

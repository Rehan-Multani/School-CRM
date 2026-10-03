import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { confirm, showError, toast } from '../../../lib/notify';
import { Button, Card, Input } from '../../../components/ui';
import { Badge, Chip, ErrorView, FieldLabel } from '../../../components/kit';
import { font, radius, spacing } from '../../../theme';
import { SkeletonForm } from '../../../components/Skeleton';
import OtpBoxes from '../../../components/OtpBoxes';

// Doc §6.10 — OTP (6 boxes) → handover (person + relationship + confirm) →
// complete. Cancel is available at any step.
const RELATIONSHIPS = ['Parent', 'Guardian', 'Relative', 'Family Friend', 'Authorized Person', 'Other'];

export default function PickupSession() {
  const { sessionId } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => teacherApi.pickupSession(sessionId), [sessionId]);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [person, setPerson] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [handedOver, setHandedOver] = useState(false);
  const s = state.data;

  useEffect(() => {
    if (s?.resendCooldownSeconds != null) setCooldown(s.resendCooldownSeconds);
    if (s?.guardianName && !person) setPerson(s.guardianName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const run = async (kind, fn) => {
    setBusy(kind);
    try {
      const next = await fn();
      if (next) state.setData(next);
      return next;
    } catch (e) {
      showError(e);
      state.reload({ silent: true });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const verify = () =>
    run('verify', async () => {
      const r = await teacherApi.verifyPickup(sessionId, otp);
      toast('OTP verified');
      return r;
    }).then((r) => !r && setOtp(''));

  const resend = () =>
    run('resend', async () => {
      const r = await teacherApi.resendPickupOtp(sessionId);
      toast('OTP resent');
      setOtp('');
      return r;
    });

  const complete = () => {
    if (!person.trim()) return showError({ message: 'Enter the name of the person collecting the student.' });
    if (!handedOver) return showError({ message: 'Confirm that the student has been handed over.' });
    return run('complete', async () => {
      const r = await teacherApi.completePickup(sessionId, { handoverConfirmed: true, pickupPersonName: person.trim(), pickupPersonRelationship: relationship });
      toast('Pickup completed');
      return r;
    });
  };

  const cancel = async () => {
    if (!(await confirm('Cancel pickup?', 'This verification will be cancelled.', { confirmText: 'Cancel pickup', destructive: true }))) return;
    const r = await run('cancel', () => teacherApi.cancelPickup(sessionId));
    if (r) router.back();
  };

  if (state.loading && !s) return <SkeletonForm fields={3} />;
  if (state.error && !s) return <ErrorView error={state.error} onRetry={state.reload} />;

  const status = s.status;
  const done = ['COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(status);
  const verified = status === 'VERIFIED' || Boolean(s.verifiedAt);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.row}>
            <Text style={styles.name}>{s.studentName}</Text>
            <Badge label={status} tone={status === 'COMPLETED' ? 'success' : done ? 'danger' : 'warning'} />
          </View>
          <Text style={styles.muted}>
            {s.className}-{s.sectionName}
            {s.guardianName ? ` · Guardian ${s.guardianName}` : ''}
          </Text>
          <Text style={styles.muted}>OTP sent to {s.maskedMobile}</Text>
        </Card>

        {status === 'COMPLETED' ? (
          <View style={styles.done}>
            <Ionicons name="checkmark-circle" size={64} color={theme.success} />
            <Text style={styles.doneText}>Handed over to {s.pickupPersonName}</Text>
            <Text style={styles.muted}>{s.pickupPersonRelationship}</Text>
            <Button title="Back to students" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: spacing.xl }} />
          </View>
        ) : done ? (
          <View style={styles.done}>
            <Ionicons name="close-circle" size={64} color={theme.danger} />
            <Text style={styles.doneText}>This verification is {String(status).toLowerCase()}.</Text>
            <Button title="Back" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: spacing.xl }} />
          </View>
        ) : !verified ? (
          <>
            <Text style={styles.h}>Enter the OTP from the guardian</Text>
            <OtpBoxes value={otp} onChange={setOtp} disabled={Boolean(busy)} />
            <Text style={styles.muted}>
              {s.attemptsRemaining} attempt{s.attemptsRemaining === 1 ? '' : 's'} left
              {s.otpSecondsRemaining ? ` · expires in ${Math.ceil(s.otpSecondsRemaining / 60)} min` : ''}
            </Text>
            <Button title="Verify OTP" icon="shield-checkmark-outline" loading={busy === 'verify'} loadingTitle="Verifying OTP..." disabled={otp.length !== 6 || Boolean(busy)} onPress={verify} style={{ marginTop: spacing.lg }} />
            <Button
              title={cooldown > 0 ? `Resend OTP in ${cooldown}s` : `Resend OTP (${s.resendsRemaining} left)`}
              variant="secondary"
              loading={busy === 'resend'}
              loadingTitle="Resending OTP..."
              disabled={cooldown > 0 || !s.resendsRemaining || Boolean(busy)}
              onPress={resend}
              style={{ marginTop: spacing.md }}
            />
          </>
        ) : (
          <>
            <Text style={styles.h}>Handover</Text>
            <Input label="Collected by" value={person} onChangeText={setPerson} maxLength={100} placeholder="Full name" />
            <FieldLabel>Relationship</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
              {RELATIONSHIPS.map((r) => (
                <Chip key={r} label={r} active={relationship === r} onPress={() => setRelationship(r)} />
              ))}
            </View>
            <Pressable onPress={() => setHandedOver((h) => !h)} style={styles.check}>
              <Ionicons name={handedOver ? 'checkbox' : 'square-outline'} size={24} color={handedOver ? theme.primary : theme.textMuted} />
              <Text style={{ color: theme.text, fontSize: font.md, flex: 1 }}>The student has been handed over</Text>
            </Pressable>
            <Button title="Complete pickup" icon="checkmark-done" loading={busy === 'complete'} loadingTitle="Completing pickup..." disabled={Boolean(busy)} onPress={complete} />
          </>
        )}

        {!done ? (
          <Button title="Cancel pickup" variant="secondary" loading={busy === 'cancel'} loadingTitle="Cancelling pickup..." disabled={Boolean(busy)} onPress={cancel} style={{ marginTop: spacing.xl }} />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: font.xl, fontWeight: '800', color: t.text, flex: 1 },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 4 },
    h: { fontSize: font.lg, fontWeight: '800', color: t.text, marginTop: spacing.xl },
    check: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    done: { alignItems: 'center', marginTop: spacing.xxl },
    doneText: { fontSize: font.lg, fontWeight: '800', color: t.text, marginTop: spacing.md, textAlign: 'center' },
  });

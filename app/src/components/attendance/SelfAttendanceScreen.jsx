import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { useAsync } from '../../lib/useAsync';
import { toast } from '../../lib/notify';
import { StepError, currentFix } from '../../lib/deviceLocation';
import RefreshableScroll from '../../components/RefreshableScroll';
import { AsyncView, StatusBadge } from '../../components/kit';
import { Button, Card } from '../../components/ui';
import { SkeletonDetail } from '../../components/Skeleton';
import { fmtDate } from '../../lib/format';
import { font, radius, spacing } from '../../theme';

// Staff member's own attendance (teacher / transport manager): fingerprint -> GPS fix -> server checks the fix is
// inside the radius the School Admin set (Settings > Attendance Location).
// The server is the authority on distance; the phone only supplies the fix.

async function verifyFingerprint() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());
  if (!enrolled) {
    throw new StepError('Set up a fingerprint (or screen lock) in your phone settings first.', { settings: true });
  }
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Verify your fingerprint',
    cancelLabel: 'Cancel',
  });
  if (!res.success) {
    throw new StepError(res.error === 'user_cancel' ? 'Fingerprint check was cancelled.' : 'Fingerprint did not match. Try again.');
  }
}

export default function SelfAttendanceScreen({ api }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => api.today(), [], { refetchOnFocus: true });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const markPresent = async (cfg) => {
    setBusy(true);
    setProblem(null);
    try {
      if (cfg.requireBiometric) await verifyFingerprint();
      const fix = await currentFix();
      const body = { ...fix, biometricVerified: cfg.requireBiometric };
      await api.checkIn(body);
      toast('Marked present');
      await state.reload({ silent: true });
    } catch (e) {
      setProblem({ message: e?.message || 'Could not mark attendance', settings: Boolean(e?.settings) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonDetail />}>
        {(res) => {
          const cfg = res?.config || {};
          const rec = res?.record;
          const checkedIn = Boolean(rec?.checkedIn);
          const locked = rec && !checkedIn && ['LEAVE', 'HOLIDAY'].includes(rec.status);

          return (
            <>
              <Card>
                <View style={styles.head}>
                  <Text style={styles.title}>{fmtDate(res?.date)}</Text>
                  {rec ? <StatusBadge status={rec.status} /> : null}
                </View>
                <View style={styles.times}>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>Marked present at</Text>
                    <Text style={styles.timeValue}>{checkedIn ? rec.clockIn : '--:--'}</Text>
                  </View>
                </View>
                {rec?.distanceMeters != null && checkedIn ? (
                  <Text style={styles.muted}>Marked {rec.distanceMeters} m from school</Text>
                ) : null}
              </Card>

              {!cfg.enabled ? (
                <Card style={{ marginTop: spacing.md }}>
                  <View style={styles.note}>
                    <Ionicons name="information-circle-outline" size={20} color={theme.warning} />
                    <Text style={styles.noteText}>
                      Self attendance is not enabled for your school yet. Please ask your school admin to set the school location.
                    </Text>
                  </View>
                </Card>
              ) : locked ? (
                <Card style={{ marginTop: spacing.md }}>
                  <Text style={styles.noteText}>Today is marked as {String(rec.status).toLowerCase()}, so you do not need to mark present.</Text>
                </Card>
              ) : (
                <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
                  {!checkedIn ? (
                    <Button title="Mark Present" icon="finger-print-outline" loading={busy} loadingTitle="Verifying..." onPress={() => markPresent(cfg)} />
                  ) : (
                    <View style={styles.note}>
                      <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                      <Text style={styles.noteText}>You are marked present for today.</Text>
                    </View>
                  )}
                  <Text style={styles.muted}>
                    You must be within {cfg.radiusMeters} m of {cfg.label || 'the school'}
                    {cfg.requireBiometric ? ' and verify your fingerprint' : ''}.
                  </Text>
                </View>
              )}

              {problem ? (
                <Card style={{ marginTop: spacing.md, borderColor: theme.danger }}>
                  <View style={styles.note}>
                    <Ionicons name="alert-circle-outline" size={20} color={theme.danger} />
                    <Text style={[styles.noteText, { color: theme.danger }]}>{problem.message}</Text>
                  </View>
                  {problem.settings ? (
                    <Pressable onPress={() => Linking.openSettings()} style={{ marginTop: spacing.sm }} hitSlop={8}>
                      <Text style={{ color: theme.primary, fontWeight: '800' }}>Open settings</Text>
                    </Pressable>
                  ) : null}
                </Card>
              ) : null}
            </>
          );
        }}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    title: { flex: 1, fontSize: font.xl, fontWeight: '800', color: t.text },
    times: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
    timeBox: { flex: 1, backgroundColor: t.bg, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: t.border },
    timeLabel: { fontSize: font.sm, color: t.textMuted, fontWeight: '600' },
    timeValue: { fontSize: font.xl, fontWeight: '800', color: t.text, marginTop: 2 },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: spacing.sm },
    note: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    noteText: { flex: 1, fontSize: font.md, color: t.text },
  });

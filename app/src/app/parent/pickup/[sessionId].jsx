import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { usePortal } from '../../../context/PortalScope';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { useAsync } from '../../../lib/useAsync';
import { fmtDateTime } from '../../../lib/format';
import { Card } from '../../../components/ui';
import { AsyncView, Badge, SectionTitle } from '../../../components/kit';
import { SkeletonDetail } from '../../../components/Skeleton';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { isActivePickup, pickupStatus } from '../../../components/parent/pickupStatus';
import { font, spacing } from '../../../theme';

function Line({ label, value, styles }) {
  if (!value) return null;
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

// One pickup session, read-only (doc 03 §7.5). The OTP itself is never shown
// here — it only reaches the parent by SMS/push.
export default function PickupDetail() {
  const { sessionId } = useLocalSearchParams();
  const { api, scopeKey } = usePortal();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => api.pickup(sessionId), [sessionId, scopeKey], { refetchOnFocus: true });

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonDetail padded={false} />}>
        {(p) => {
          const st = pickupStatus(p.status);
          return (
            <>
              <Card>
                <View style={styles.row}>
                  <Text style={styles.title}>{p.studentName || 'Pickup'}</Text>
                  <Badge label={st.label} tone={st.tone} />
                </View>
                <Text style={styles.muted}>{[p.className, p.sectionName].filter(Boolean).join(' - ')}</Text>
                {st.text ? (
                  <View style={styles.note}>
                    <Ionicons name={isActivePickup(p.status) ? 'time-outline' : 'information-circle-outline'} size={18} color={theme.textMuted} />
                    <Text style={[styles.muted, { flex: 1, marginTop: 0 }]}>{st.text}</Text>
                  </View>
                ) : null}
              </Card>

              <SectionTitle title="Details" />
              <Card>
                <Line styles={styles} label="Teacher" value={p.teacherName} />
                <Line styles={styles} label="Guardian on record" value={[p.guardianName, p.maskedMobile].filter(Boolean).join(' · ')} />
                <Line styles={styles} label="Picked up by" value={p.pickupPersonName ? `${p.pickupPersonName}${p.pickupPersonRelationship ? ` (${p.pickupPersonRelationship})` : ''}` : ''} />
                <Line styles={styles} label="Handover confirmed" value={p.status === 'COMPLETED' ? (p.handoverConfirmed ? 'Yes' : 'No') : ''} />
              </Card>

              <SectionTitle title="Timeline" />
              <Card>
                <Line styles={styles} label="Started" value={p.initiatedAt ? fmtDateTime(p.initiatedAt) : ''} />
                <Line styles={styles} label="OTP verified" value={p.verifiedAt ? fmtDateTime(p.verifiedAt) : ''} />
                <Line styles={styles} label="Handed over" value={p.completedAt ? fmtDateTime(p.completedAt) : ''} />
                <Line styles={styles} label="Cancelled" value={p.cancelledAt ? fmtDateTime(p.cancelledAt) : ''} />
                <Line styles={styles} label="Expired" value={p.expiredAt ? fmtDateTime(p.expiredAt) : ''} />
              </Card>
            </>
          );
        }}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    title: { flex: 1, fontSize: font.xl, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    note: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
    line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: spacing.md },
    lineLabel: { fontSize: font.md, color: t.textMuted },
    lineValue: { flex: 1, textAlign: 'right', fontSize: font.md, color: t.text, fontWeight: '600' },
  });

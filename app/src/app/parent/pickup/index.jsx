import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { usePortal } from '../../../context/PortalScope';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { fmtDateTime } from '../../../lib/format';
import { Badge, EmptyState } from '../../../components/kit';
import PagedList from '../../../components/PagedList';
import { isActivePickup, pickupStatus } from '../../../components/parent/pickupStatus';
import { alpha, font, radius, spacing } from '../../../theme';

// Doc 03 §7.5 — Safe Pickup, read-only. The parent RECEIVES the OTP (SMS/push)
// when a teacher starts a pickup and says it to the teacher at the gate; the
// app never submits it. This is the history of those pickups.
export default function PickupHistory() {
  const { api, base, scopeKey } = usePortal();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <PagedList
      deps={[scopeKey]}
      cacheKey="parent.pickups"
      fetchPage={(page) => api.pickups({ page, limit: 20 })}
      contentContainerStyle={{ paddingTop: spacing.lg }}
      ListHeaderComponent={
        <View style={[styles.info, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.18 : 0.08), borderColor: alpha(theme.primary, 0.25) }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
          <Text style={styles.infoText}>When a teacher starts a pickup you get an OTP by SMS. Share it only with the teacher at the school gate.</Text>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="No pickups yet" message="Pickups verified by OTP at the school gate will appear here." />}
      renderItem={({ item }) => {
        const st = pickupStatus(item.status);
        return (
          <Pressable
            onPress={() => router.push(`${base}/pickup/${item.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.card, isActivePickup(item.status) && { borderColor: theme.warning }, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.row}>
              <Text style={styles.title}>{fmtDateTime(item.initiatedAt || item.createdAt)}</Text>
              <Badge label={st.label} tone={st.tone} />
            </View>
            <Text style={styles.muted} numberOfLines={1}>
              {item.teacherName ? `Teacher: ${item.teacherName}` : 'Teacher'}
              {item.pickupPersonName ? ` · Picked up by ${item.pickupPersonName}${item.pickupPersonRelationship ? ` (${item.pickupPersonRelationship})` : ''}` : ''}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    info: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
    infoText: { flex: 1, fontSize: font.sm, color: t.text, lineHeight: 18 },
    card: { backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, padding: spacing.md, marginBottom: spacing.sm },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    title: { flex: 1, fontSize: font.md, fontWeight: '700', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 4 },
  });

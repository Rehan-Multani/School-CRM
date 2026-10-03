import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { fmtDate } from '../../../lib/format';
import { confirm, showError, toast } from '../../../lib/notify';
import PagedList from '../../../components/PagedList';
import { EmptyState, StatusBadge } from '../../../components/kit';
import { font, radius, spacing } from '../../../theme';
import { SkeletonCards } from '../../../components/Skeleton';

// Doc §6.7 — PENDING amber, APPROVED green, REJECTED red, CANCELLED grey.
// Cancel only while PENDING.
export default function Leaves() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const list = useRef(null);

  const cancel = async (l) => {
    const ok = await confirm('Cancel leave?', `${fmtDate(l.startDate)} – ${fmtDate(l.endDate)}`, { confirmText: 'Cancel leave', destructive: true });
    if (!ok) return;
    try {
      await teacherApi.cancelLeave(l.id);
      list.current?.update((items) => items.map((x) => (x.id === l.id ? { ...x, status: 'CANCELLED' } : x)));
      toast('Leave cancelled');
    } catch (e) {
      if (e.code === 'LEAVE_NOT_CANCELLABLE') list.current?.reload();
      showError(e);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <PagedList
        ref={list}
        skeleton={<SkeletonCards padded={false} />}
        cacheKey="teacher.leaves"
        fetchPage={(page) => teacherApi.leaves({ page, limit: 20 })}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 110 }}
        ListEmptyComponent={<EmptyState icon="airplane-outline" title="No leave requests" message="Tap + to apply for leave." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title}>
                {String(item.leaveType).replace(/_/g, ' ')} · {item.totalDays} day{item.totalDays === 1 ? '' : 's'}
              </Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.muted}>
              {fmtDate(item.startDate)} – {fmtDate(item.endDate)}
            </Text>
            <Text style={styles.reason} numberOfLines={3}>
              {item.reason}
            </Text>
            {item.rejectionReason ? <Text style={[styles.muted, { color: theme.danger }]}>Reason: {item.rejectionReason}</Text> : null}
            {item.status === 'PENDING' ? (
              <Pressable onPress={() => cancel(item)} style={styles.cancel} hitSlop={6}>
                <Ionicons name="close-circle-outline" size={16} color={theme.danger} />
                <Text style={{ color: theme.danger, fontWeight: '700' }}>Cancel request</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />
      <Pressable onPress={() => router.push('/teacher/leaves/apply')} style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + spacing.xl }]}>
        <Ionicons name="add" size={30} color={theme.onPrimary} />
      </Pressable>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: t.border },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    title: { flex: 1, fontSize: font.md, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 4 },
    reason: { fontSize: font.md, color: t.text, marginTop: spacing.sm },
    cancel: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: spacing.sm },
    fab: { position: 'absolute', right: spacing.xl, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  });

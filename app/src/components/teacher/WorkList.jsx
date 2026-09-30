import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { teacherApi } from '../../api/teacher';
import { fmtDate, ymd } from '../../lib/format';
import PagedList from '../PagedList';
import { Chip, EmptyState, StatusBadge } from '../kit';
import { font, radius, spacing } from '../../theme';
import { SkeletonCards } from '../Skeleton';

// List screen shared by Homework and Assignments: status filter chips,
// infinite scroll, floating "New" button.
const KINDS = {
  homework: {
    fetch: teacherApi.homeworkList,
    base: '/teacher/homework',
    statuses: ['ALL', 'ASSIGNED', 'CLOSED'],
    meta: (x) => `${x.submittedCount ?? 0}/${x.totalStudents ?? 0} submitted`,
    empty: 'No homework yet',
  },
  assignment: {
    fetch: teacherApi.assignmentList,
    base: '/teacher/assignments',
    statuses: ['ALL', 'PUBLISHED', 'DRAFT', 'CLOSED'],
    meta: (x) => `${x.submissionCount ?? 0} submitted · ${x.gradedCount ?? 0} graded · /${x.maxMarks}`,
    empty: 'No assignments yet',
  },
};

export default function WorkList({ kind, sectionId }) {
  const cfg = KINDS[kind];
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState('ALL');

  const header = (
    <View style={styles.filters}>
      {cfg.statuses.map((s) => (
        <Chip key={s} label={s} active={status === s} onPress={() => setStatus(s)} />
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <PagedList
        deps={[status, sectionId]}
        skeleton={<SkeletonCards padded={false} />}
        fetchPage={(page) => cfg.fetch({ page, limit: 20, status, sectionId })}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 110 }}
        ListEmptyComponent={<EmptyState icon="book-outline" title={cfg.empty} message="Tap + to create one." />}
        renderItem={({ item }) => {
          // Compare calendar days: a due date is stored as UTC midnight, so a raw
          // timestamp compare would flag it overdue on the due day itself.
          const overdue = item.status !== 'CLOSED' && item.dueDate && ymd(new Date(item.dueDate)) < ymd();
          return (
            <Pressable onPress={() => router.push(`${cfg.base}/${item.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.muted}>
                {item.subjectName} · {item.className}-{item.sectionName}
              </Text>
              <View style={[styles.row, { marginTop: spacing.sm }]}>
                <Text style={[styles.muted, overdue && { color: theme.danger, fontWeight: '700' }]}>
                  <Ionicons name="calendar-outline" size={12} /> Due {fmtDate(item.dueDate)}
                </Text>
                <Text style={styles.muted}>{cfg.meta(item)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
      <Pressable
        onPress={() => router.push({ pathname: `${cfg.base}/form`, params: sectionId ? { sectionId } : {} })}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primary, bottom: insets.bottom + spacing.xl },
          pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Create ${cfg.noun}`}
      >
        <Ionicons name="add" size={22} color={theme.onPrimary} />
        <Text style={[styles.fabText, { color: theme.onPrimary }]}>New {cfg.noun}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    card: {
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: spacing.md,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
    title: { flex: 1, fontSize: font.md, fontWeight: '800', color: t.text },
    muted: { fontSize: font.xs, color: t.textMuted, marginTop: 2 },
    fab: {
      position: 'absolute',
      right: spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.lg,
      height: 50,
      borderRadius: radius.pill,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    fabText: {
      fontSize: font.sm,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
  });

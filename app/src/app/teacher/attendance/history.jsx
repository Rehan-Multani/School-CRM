import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { fmtDate } from '../../../lib/format';
import PagedList from '../../../components/PagedList';
import { Badge, EmptyState } from '../../../components/kit';
import { font, radius, spacing } from '../../../theme';
import { alpha } from '../../../theme/colors';
import { SkeletonCards } from '../../../components/Skeleton';

export default function AttendanceHistory() {
  const { sectionId } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <PagedList
      deps={[sectionId]}
      skeleton={<SkeletonCards count={3} padded={false} />}
      cacheKey="teacher.attendanceHistory"
      fetchPage={(page) => teacherApi.attendanceHistory({ page, sectionId })}
      contentContainerStyle={{ paddingTop: spacing.md }}
      ListEmptyComponent={
        <EmptyState
          icon="calendar-outline"
          title="No attendance yet"
          message="Days you mark will appear here."
        />
      }
      renderItem={({ item }) => {
        const s = item.summary || {};
        const rate = s.presentRate ?? 0;
        const rateTone = rate >= 75 ? 'success' : rate >= 50 ? 'primary' : 'danger';

        return (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/teacher/attendance/mark',
                params: { sectionId: item.sectionId, date: item.date, title: `${item.className} - ${item.sectionName}` },
              })
            }
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
            ]}
          >
            <View style={styles.topRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar-outline" size={15} color={theme.primary} />
                <Text style={styles.dateText}>{fmtDate(item.date)}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Badge label={`${item.className}-${item.sectionName}`} tone="primary" />
                {item.locked ? (
                  <Badge label="LOCKED" tone="muted" icon="lock-closed" />
                ) : (
                  <Badge label="EDITABLE" tone="info" />
                )}
              </View>
            </View>

            {/* Attendance Counts Row */}
            <View style={styles.statsRow}>
              <View style={[styles.pill, { backgroundColor: alpha(theme.success, 0.12) }]}>
                <Text style={[styles.pillText, { color: theme.success }]}>P: {s.PRESENT ?? 0}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: alpha(theme.danger, 0.12) }]}>
                <Text style={[styles.pillText, { color: theme.danger }]}>A: {s.ABSENT ?? 0}</Text>
              </View>
              {s.LATE ? (
                <View style={[styles.pill, { backgroundColor: alpha(theme.warning, 0.12) }]}>
                  <Text style={[styles.pillText, { color: theme.warning }]}>L: {s.LATE}</Text>
                </View>
              ) : null}
              <View style={[styles.pill, { backgroundColor: alpha(theme.primary, 0.12) }]}>
                <Text style={[styles.pillText, { color: theme.primary }]}>{rate}% Rate</Text>
              </View>
            </View>

            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <Text style={styles.markedBy}>
                {item.markedByName ? `Marked by ${item.markedByName}` : 'Attendance recorded'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: font.xs, fontWeight: '700', color: theme.primary }}>
                  {item.locked ? 'View Sheet' : 'Edit Sheet'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.primary} />
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    dateText: {
      fontSize: font.md,
      fontWeight: '800',
      color: t.text,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
      marginVertical: spacing.xs,
    },
    pill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.sm,
    },
    pillText: {
      fontSize: font.xs,
      fontWeight: '800',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
      paddingTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    markedBy: {
      fontSize: font.xs,
      color: t.textMuted,
      fontWeight: '500',
    },
  });

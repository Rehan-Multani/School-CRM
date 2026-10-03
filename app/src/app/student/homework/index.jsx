import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { usePortal } from '../../../context/PortalScope';
import { fmtDate } from '../../../lib/format';
import PagedList from '../../../components/PagedList';
import { Badge, Chip, EmptyState } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import { homeworkBadge } from '../../../components/student/status';
import { font, radius, spacing } from '../../../theme';
import { alpha } from '../../../theme/colors';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];

export default function HomeworkList() {
  const { api, base, scopeKey } = usePortal();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [status, setStatus] = useState(FILTERS.some((f) => f.value === params.status) ? params.status : 'all');

  return (
    <PagedList
      deps={[status, scopeKey]}
      cacheKey="homework.list"
      fetchPage={(page) => api.homeworkList({ page, limit: 20, status })}
      skeleton={<SkeletonCards padded={false} />}
      ListHeaderComponent={
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md, alignItems: 'center' }}>
          {FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} active={status === f.value} onPress={() => setStatus(f.value)} />
          ))}
        </ScrollView>
      }
      ListEmptyComponent={
        <EmptyState
          icon="book-outline"
          title="No homework found"
          message={status === 'pending' ? 'You are all caught up! No pending homework.' : 'No assignments match the selected filter.'}
        />
      }
      renderItem={({ item }) => {
        const b = homeworkBadge(item);
        const isOverdue = b.tone === 'danger';

        return (
          <Pressable
            onPress={() => router.push(`${base}/homework/${item.id}`)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: isOverdue ? alpha(theme.danger, 0.4) : theme.border,
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
            ]}
          >
            {/* Top row: Subject & Status Badge */}
            <View style={styles.topRow}>
              <View style={[styles.subjectPill, { backgroundColor: alpha(theme.primary, 0.1) }]}>
                <Ionicons name="book-outline" size={13} color={theme.primary} />
                <Text style={[styles.subjectText, { color: theme.primary }]}>{item.subjectName || 'General'}</Text>
              </View>
              <Badge label={b.label} tone={b.tone} />
            </View>

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>

            {item.description ? (
              <Text style={styles.desc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            {/* Footer: Due date, teacher & attachments */}
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name={isOverdue ? 'alert-circle-outline' : 'calendar-outline'} size={14} color={isOverdue ? theme.danger : theme.textMuted} />
                <Text style={[styles.muted, isOverdue && { color: theme.danger, fontWeight: '700' }]}>
                  Due {fmtDate(item.dueDate)}
                </Text>
                {item.teacherName ? <Text style={styles.muted}>· {item.teacherName}</Text> : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {item.attachmentCount ? (
                  <View style={[styles.attach, { backgroundColor: theme.surfaceAlt }]}>
                    <Ionicons name="attach" size={13} color={theme.textMuted} />
                    <Text style={styles.attachText}>{item.attachmentCount}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
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
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
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
      marginBottom: spacing.xs,
    },
    subjectPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    subjectText: {
      fontSize: font.xs,
      fontWeight: '800',
    },
    title: {
      fontSize: font.lg,
      fontWeight: '800',
      color: t.text,
      lineHeight: 22,
      marginTop: 2,
    },
    desc: {
      fontSize: font.sm,
      color: t.textMuted,
      marginTop: 4,
      lineHeight: 18,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    muted: { fontSize: font.xs, color: t.textMuted, fontWeight: '500' },
    attach: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.sm,
    },
    attachText: { fontSize: font.xs, color: t.textMuted, fontWeight: '700' },
  });

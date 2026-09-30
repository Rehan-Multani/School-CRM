import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { studentApi } from '../../../api/student';
import PagedList from '../../../components/PagedList';
import { Badge, EmptyState, ProgressBar } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import { font, radius, spacing } from '../../../theme';
import { alpha } from '../../../theme/colors';

// Doc §6.6 — only PUBLISHED results are listed by the backend.
export default function ResultList() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <PagedList
      fetchPage={(page) => studentApi.results({ page, limit: 20 })}
      skeleton={<SkeletonCards padded={false} />}
      contentContainerStyle={{ paddingTop: spacing.md }}
      ListHeaderComponent={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingBottom: spacing.sm }}>
          <Pressable
            onPress={() => router.push('/student/report-card')}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, paddingVertical: 6, paddingHorizontal: 8 }]}
            hitSlop={8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: font.sm }}>View Report Card</Text>
              <Ionicons name="arrow-forward" size={14} color={theme.primary} />
            </View>
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="ribbon-outline"
          title="No results declared yet"
          message="Results appear here once the school publishes them."
        />
      }
      renderItem={({ item }) => {
        const pct = item.percentage ?? 0;
        const tone = pct >= 75 ? 'success' : pct >= 50 ? 'primary' : pct >= 35 ? 'warning' : 'danger';
        const toneColor = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : tone === 'danger' ? theme.danger : theme.primary;

        return (
          <Pressable
            onPress={() => router.push(`/student/results/${item.examId}`)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
            ]}
          >
            <View style={styles.topRow}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.examIcon, { backgroundColor: alpha(toneColor, 0.12) }]}>
                  <Ionicons name="ribbon-outline" size={18} color={toneColor} />
                </View>
                <Text style={styles.title} numberOfLines={1}>
                  {item.examName || 'Exam'}
                </Text>
              </View>
              {item.resultStatus ? (
                <Badge
                  label={item.resultStatus}
                  tone={item.resultStatus === 'PASS' ? 'success' : 'danger'}
                />
              ) : null}
            </View>

            <View style={styles.scoreRow}>
              <View>
                <Text style={[styles.percentage, { color: toneColor }]}>{pct}%</Text>
                <Text style={styles.marksText}>
                  {item.totalMarks} / {item.maxTotalMarks} Total Marks
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {item.grade ? (
                  <View style={[styles.pill, { backgroundColor: alpha(toneColor, 0.1) }]}>
                    <Text style={[styles.pillText, { color: toneColor }]}>Grade {item.grade}</Text>
                  </View>
                ) : null}
                {item.rank ? (
                  <View style={[styles.pill, { backgroundColor: theme.surfaceAlt }]}>
                    <Text style={[styles.pillText, { color: theme.text }]}>Rank #{item.rank}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={{ marginTop: spacing.sm }}>
              <ProgressBar value={pct / 100} color={toneColor} />
            </View>

            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <Text style={styles.footerPrompt}>Tap to view subject-wise breakdown</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
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
      marginBottom: spacing.sm,
    },
    examIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: font.lg,
      fontWeight: '800',
      color: t.text,
    },
    scoreRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginVertical: spacing.xs,
    },
    percentage: {
      fontSize: font.xxl,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    marksText: {
      fontSize: font.xs,
      fontWeight: '600',
      color: t.textMuted,
      marginTop: 2,
    },
    pill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.pill,
      alignSelf: 'flex-start',
    },
    pillText: {
      fontSize: font.xs,
      fontWeight: '700',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    footerPrompt: {
      fontSize: font.xs,
      color: t.textMuted,
      fontWeight: '500',
    },
  });

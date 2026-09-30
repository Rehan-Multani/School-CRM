import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { useTeacher } from '../../../context/TeacherContext';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { fmtHM, withPrefix } from '../../../lib/format';
import { Card } from '../../../components/ui';
import { Badge, ErrorView, SectionTitle, Stat, StatCard } from '../../../components/kit';
import SchoolHeader from '../../../components/SchoolHeader';
import RefreshableScroll from '../../../components/RefreshableScroll';
import TopInsetBackdrop from '../../../components/TopInsetBackdrop';
import Bell from '../../../components/teacher/Bell';
import HeaderActions from '../../../components/HeaderActions';
import { alpha, font, radius, spacing } from '../../../theme';
import { SkeletonHome } from '../../../components/Skeleton';

// Doc §6.2 — greeting + class-teacher chip, dashboard cards, today's periods,
// quick access to every teacher module.
export default function TeacherHome() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { user } = useAuth();
  const { refreshUnread } = useTeacher();

  const state = useAsync(
    async () => {
      const [dash, today] = await Promise.all([teacherApi.dashboard(), teacherApi.todaySchedule()]);
      return { dash, today };
    },
    [],
    { refetchOnFocus: true },
  );

  const onRefresh = useCallback(async () => {
    await Promise.all([state.reload({ silent: true }), refreshUnread()]);
  }, [state, refreshUnread]);

  const ctSections = user?.classTeacherSections || [];

  const quick = [
    { icon: 'book-outline', label: 'Homework', to: '/teacher/homework', color: '#F59E0B' },
    { icon: 'clipboard-outline', label: 'Assignments', to: '/teacher/assignments', color: '#3B82F6' },
    { icon: 'folder-open-outline', label: 'Materials', to: '/teacher/materials', color: '#8B5CF6' },
    { icon: 'ribbon-outline', label: 'Exams & Marks', to: '/teacher/exams', color: '#EC4899' },
    { icon: 'calendar-outline', label: 'Timetable', to: '/teacher/timetable', color: '#10B981' },
    { icon: 'airplane-outline', label: 'Leaves', to: '/teacher/leaves', color: '#06B6D4' },
    { icon: 'shield-checkmark-outline', label: 'Safe Pickup', to: '/teacher/pickup', color: '#6366F1' },
  ];

  const ctaActions = [
    { icon: 'checkmark-circle-outline', label: 'Take Attendance', to: '/teacher/attendance', color: '#10B981' },
    { icon: 'add-circle-outline', label: 'New Work', to: '/teacher/assignments/form', color: '#3B82F6' },
    { icon: 'people-outline', label: 'View Classes', to: '/teacher/classes', color: '#8B5CF6' },
    { icon: 'create-outline', label: 'Add Marks', to: '/teacher/exams', color: '#F59E0B' },
  ];

  const stats = state.data?.dash?.stats;
  const periods = state.data?.today?.periods || [];
  const next = state.data?.dash?.nextClass;

  return (
    <View style={{ flex: 1 }}>
      <RefreshableScroll underStatusBar onRefresh={onRefresh} contentContainerStyle={{ paddingBottom: 120 }}>
        <SchoolHeader right={<HeaderActions bell={<Bell />} />}>
          {ctSections.length ? (
            <View style={styles.chips}>
              {ctSections.map((s) => (
                <View key={s.sectionId} style={[styles.ctChip, { backgroundColor: alpha('#FFFFFF', 0.22) }]}>
                  <Ionicons name="star" size={13} color={theme.onPrimary} />
                  <Text style={[styles.ctText, { color: theme.onPrimary }]}>
                    Class Teacher · {s.className}-{s.sectionName}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </SchoolHeader>

        <View style={styles.body}>
          {/* Quick CTA Action Pills */}
          <View style={[styles.ctaContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ctaScroll}>
              {ctaActions.map((cta) => (
                <Pressable
                  key={cta.label}
                  onPress={() => router.push(cta.to)}
                  style={({ pressed }) => [
                    styles.ctaBtn,
                    { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <View style={[styles.ctaIcon, { backgroundColor: alpha(cta.color, 0.14) }]}>
                    <Ionicons name={cta.icon} size={16} color={cta.color} />
                  </View>
                  <Text style={[styles.ctaLabel, { color: theme.text }]}>{cta.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {state.loading && !state.data ? (
            <SkeletonHome />
          ) : state.error && !state.data ? (
            <ErrorView error={state.error} onRetry={state.reload} />
          ) : (
            <>
              {/* 4 Summary Stat Cards */}
              <View style={styles.stats}>
                <StatCard
                  icon="time-outline"
                  label="Classes Today"
                  value={stats?.classesToday ?? 0}
                  color={theme.primary}
                  onPress={() => router.push('/teacher/timetable')}
                />
                <StatCard
                  icon="people-outline"
                  label="My Students"
                  value={stats?.students ?? 0}
                  color={theme.success}
                  onPress={() => router.push('/teacher/classes')}
                />
                <StatCard
                  icon="book-outline"
                  label="Active Work"
                  value={stats?.pendingHomework ?? 0}
                  color={theme.warning}
                  onPress={() => router.push('/teacher/homework')}
                />
                <StatCard
                  icon="create-outline"
                  label="Pending Marks"
                  value={stats?.pendingMarks ?? 0}
                  color={theme.danger}
                  onPress={() => router.push('/teacher/exams')}
                />
              </View>

              {/* Class Teacher Attendance Banner if applicable */}
              {ctSections.length ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/teacher/attendance/mark',
                      params: { sectionId: ctSections[0].sectionId, title: `${ctSections[0].className} - ${ctSections[0].sectionName}` },
                    })
                  }
                  style={({ pressed }) => [pressed && { opacity: 0.9 }]}
                >
                  <Card style={[styles.ctAttendanceCard, { borderColor: alpha(theme.primary, 0.3) }]}>
                    <View style={[styles.ctAttendIcon, { backgroundColor: theme.primarySoft }]}>
                      <Ionicons name="calendar-outline" size={22} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ctAttendTitle}>Today's Class Attendance</Text>
                      <Text style={styles.muted}>
                        Section {ctSections[0].className}-{ctSections[0].sectionName}
                      </Text>
                    </View>
                    <View style={[styles.openPill, { backgroundColor: theme.primary }]}>
                      <Text style={[styles.openPillText, { color: theme.onPrimary }]}>Take</Text>
                      <Ionicons name="arrow-forward" size={14} color={theme.onPrimary} />
                    </View>
                  </Card>
                </Pressable>
              ) : null}

              {/* Next Class Highlight */}
              {next ? (
                <Card style={{ marginTop: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.kicker}>NEXT CLASS</Text>
                    {next.room ? <Badge label={withPrefix('Room', next.room)} tone="primary" /> : null}
                  </View>
                  <Text style={styles.nextTitle}>
                    {next.subjectName || 'Period'} · {next.className}-{next.sectionName}
                  </Text>
                  <Text style={styles.muted}>
                    {next.day} · {fmtHM(next.startTime)} – {fmtHM(next.endTime)}
                  </Text>
                </Card>
              ) : null}

              {/* Today's Schedule */}
              <SectionTitle
                title="Today's Schedule"
                right={
                  <Pressable onPress={() => router.push('/teacher/timetable')} hitSlop={8}>
                    <Text style={{ color: theme.primary, fontWeight: '700', fontSize: font.sm }}>Full week →</Text>
                  </Pressable>
                }
              />
              {periods.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
                  {periods.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => router.push(`/teacher/schedule/${p.id}`)}
                      style={({ pressed }) => [styles.period, pressed && { opacity: 0.8 }]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Badge label={`P${p.periodNumber}`} tone="primary" />
                        {p.room ? <Text style={styles.roomTag}>Rm {p.room}</Text> : null}
                      </View>
                      <Text style={styles.periodTime}>
                        {fmtHM(p.startTime)} – {fmtHM(p.endTime)}
                      </Text>
                      <Text style={styles.periodSubject} numberOfLines={1}>
                        {p.subjectName || '—'}
                      </Text>
                      <Text style={styles.muted} numberOfLines={1}>
                        {p.className}-{p.sectionName}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Card>
                  <Text style={styles.muted}>No periods scheduled for today.</Text>
                </Card>
              )}
            </>
          )}

          {/* Quick Access Grid */}
          <SectionTitle title="Quick Modules" />
          <View style={styles.grid}>
            {quick.map((q) => (
              <Pressable
                key={q.to}
                onPress={() => router.push(q.to)}
                style={({ pressed }) => [styles.tile, pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}
              >
                <View style={[styles.tileIcon, { backgroundColor: alpha(q.color || theme.primary, 0.12) }]}>
                  <Ionicons name={q.icon} size={22} color={q.color || theme.primary} />
                </View>
                <Text style={styles.tileText} numberOfLines={1}>
                  {q.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </RefreshableScroll>
      <TopInsetBackdrop color={theme.primary} light={theme.onPrimary === '#FFFFFF'} />
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    body: { paddingHorizontal: spacing.lg, marginTop: -spacing.xl },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    ctChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
    ctText: { fontSize: font.sm, fontWeight: '700' },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    kicker: { fontSize: font.xs, fontWeight: '800', color: t.primary, letterSpacing: 1 },
    nextTitle: { fontSize: font.lg, fontWeight: '800', color: t.text, marginTop: 4 },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    ctaContainer: {
      borderRadius: 18,
      borderWidth: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.lg,
      shadowColor: '#000',
      shadowOpacity: t.isDark ? 0 : 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    ctaScroll: {
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    ctaIcon: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaLabel: {
      fontSize: font.sm,
      fontWeight: '700',
    },
    ctAttendanceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.md,
      borderWidth: 1.5,
    },
    ctAttendIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctAttendTitle: {
      fontSize: font.md,
      fontWeight: '800',
      color: t.text,
    },
    openPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.pill,
    },
    openPillText: {
      fontSize: font.xs,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    roomTag: {
      fontSize: font.xs,
      fontWeight: '600',
      color: t.textMuted,
    },
    period: {
      width: 175,
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    periodTime: { fontSize: font.xs, fontWeight: '600', color: t.textMuted, marginTop: spacing.sm },
    periodSubject: { fontSize: font.lg, fontWeight: '800', color: t.text, marginTop: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    tile: {
      width: '30.5%',
      backgroundColor: t.surface,
      borderRadius: 18,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: t.isDark ? 0 : 1.5,
    },
    tileIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    tileText: { fontSize: font.sm, fontWeight: '700', color: t.text, marginTop: spacing.sm },
  });

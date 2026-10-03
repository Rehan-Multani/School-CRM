import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { useStudent } from '../../../context/StudentContext';
import { studentApi } from '../../../api/student';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate, fmtHM, withPrefix } from '../../../lib/format';
import { Card } from '../../../components/ui';
import { Badge, ErrorView, SectionTitle, StaleNotice, StatCard } from '../../../components/kit';
import { SkeletonHome, SkeletonList } from '../../../components/Skeleton';
import SchoolHeader from '../../../components/SchoolHeader';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { alpha, font, radius, spacing } from '../../../theme';

const QUICK = [
  { icon: 'calendar-outline', label: 'Timetable', to: '/student/timetable' },
  { icon: 'book-outline', label: 'Homework', to: '/student/homework' },
  { icon: 'ribbon-outline', label: 'Results', to: '/student/results' },
  { icon: 'wallet-outline', label: 'Fees', to: '/student/fees' },
  { icon: 'airplane-outline', label: 'Leave', to: '/student/leaves' },
  { icon: 'folder-open-outline', label: 'Material', to: '/student/materials' },
];

/** Exams, events and homework from /upcoming as one date-sorted list. */
function upcomingItems(up) {
  if (!up) return [];
  const rows = [
    ...(up.exams || []).map((e) => ({ key: `e${e.id}`, icon: 'ribbon-outline', title: e.name, date: e.startDate, tag: 'Exam', to: `/student/exams/${e.id}` })),
    ...(up.events || []).map((e) => ({ key: `v${e.id}`, icon: 'calendar-outline', title: e.title, date: e.startAt, tag: 'Event', to: { pathname: '/student/notifications', params: { tab: 'events' } } })),
    ...(up.homework || []).map((h) => ({ key: `h${h.id}`, icon: 'book-outline', title: `${h.subjectName ? `${h.subjectName}: ` : ''}${h.title}`, date: h.dueDate, tag: 'Due', to: `/student/homework/${h.id}` })),
  ];
  return rows.filter((r) => r.date).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 8);
}

export default function StudentHome() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { user } = useAuth();
  const { refreshUnread } = useStudent();

  // Critical: today's numbers and classes. The page is usable as soon as these land.
  const state = useAsync(
    async () => {
      const [dash, today] = await Promise.all([studentApi.dashboard(), studentApi.today()]);
      return { dash, today };
    },
    [],
    { refetchOnFocus: true, cacheKey: 'student.home' },
  );
  // Secondary: the "upcoming" list fills in by itself and never holds the page back.
  const upcoming = useAsync(() => studentApi.upcoming(), [], { refetchOnFocus: true, cacheKey: 'student.upcoming' });

  const onRefresh = useCallback(async () => {
    await Promise.all([state.reload({ silent: true }), upcoming.reload({ silent: true }), refreshUnread()]);
  }, [state, upcoming, refreshUnread]);

  const dash = state.data?.dash;
  const today = state.data?.today;
  const periods = today?.periods || [];
  const current = periods.find((p) => p.id === today?.currentPeriodId) || null;
  const next = dash?.todaySummary?.nextClass || null;
  const dueToday = today?.homeworkDueToday || [];
  const items = upcomingItems(upcoming.data);
  const classLine = [user?.className && user?.sectionName ? withPrefix('Class', `${user.className}-${user.sectionName}`) : withPrefix('Class', user?.className), user?.rollNumber ? `Roll ${user.rollNumber}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ flex: 1 }}>
      <RefreshableScroll onRefresh={onRefresh} contentContainerStyle={{ paddingBottom: 110 }}>
        <SchoolHeader>
          {classLine ? (
            <View style={[styles.chip, { backgroundColor: alpha('#FFFFFF', 0.2) }]}>
              <Ionicons name="school" size={12} color={theme.onPrimary} />
              <Text style={[styles.chipText, { color: theme.onPrimary }]}>{classLine}</Text>
            </View>
          ) : null}
        </SchoolHeader>

        <View style={styles.body}>
          {user?.mustResetPassword ? (
            <Pressable onPress={() => router.push('/student/profile/change-password')}>
              <Card style={[styles.banner, { borderColor: theme.warning }]}>
                <Ionicons name="key-outline" size={20} color={theme.warning} />
                <Text style={styles.bannerText}>Your password was set by the school. Tap to set your own password.</Text>
              </Card>
            </Pressable>
          ) : null}

          {state.loading && !state.data ? (
            <SkeletonHome />
          ) : state.error && !state.data ? (
            <ErrorView error={state.error} onRetry={state.reload} />
          ) : (
            <>
              {state.stale ? <StaleNotice at={state.cachedAt} onRetry={state.reload} /> : null}
              {/* Modern 2x2 Metric Cards */}
              <View style={styles.stats}>
                <StatCard
                  icon="checkmark-done-outline"
                  label="Attendance"
                  value={`${dash?.todaySummary?.attendancePercentage ?? 0}%`}
                  subtitle="Overall record"
                  color={theme.success}
                  onPress={() => router.push('/student/attendance')}
                />
                <StatCard
                  icon="book-outline"
                  label="Pending Work"
                  value={dash?.todaySummary?.pendingHomework ?? 0}
                  subtitle={dueToday.length ? `${dueToday.length} due today` : 'Up to date'}
                  color={theme.warning}
                  onPress={() => router.push({ pathname: '/student/homework', params: { status: 'pending' } })}
                />
                <StatCard
                  icon="calendar-outline"
                  label="Today's Classes"
                  value={periods.length}
                  subtitle={current ? 'Class live now' : `${periods.length} periods`}
                  color={theme.primary}
                  onPress={() => router.push('/student/timetable')}
                />
                <StatCard
                  icon="school-outline"
                  label="Upcoming Exams"
                  value={upcoming.data?.exams?.length ?? '–'}
                  subtitle="Scheduled"
                  color="#8b5cf6"
                  onPress={() => router.push('/student/results')}
                />
              </View>

              {/* Now / Next Class Card */}
              <View style={[styles.scheduleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.scheduleHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="time-outline" size={18} color={theme.primary} />
                    <Text style={{ fontSize: font.md, fontWeight: '800', color: theme.text }}>Class Schedule</Text>
                  </View>
                  <Pressable onPress={() => router.push('/student/timetable')} hitSlop={8}>
                    <Text style={{ fontSize: font.xs, fontWeight: '700', color: theme.primary }}>View Timetable</Text>
                  </Pressable>
                </View>

                {current ? (
                  <View style={[styles.liveClassBox, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.15 : 0.06), borderColor: alpha(theme.primary, 0.25) }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
                        <Text style={[styles.kicker, { color: theme.success }]}>HAPPENING NOW</Text>
                      </View>
                      {current.room ? (
                        <View style={[styles.roomPill, { backgroundColor: alpha(theme.primary, 0.15) }]}>
                          <Text style={{ fontSize: font.xs, fontWeight: '700', color: theme.primary }}>{withPrefix('Room', current.room)}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.title}>{current.subjectName || `Period ${current.periodNumber}`}</Text>
                    <Text style={styles.muted}>
                      {fmtHM(current.startTime)} – {fmtHM(current.endTime)}
                      {current.teacherName ? ` · ${current.teacherName}` : ''}
                    </Text>
                  </View>
                ) : null}

                {next ? (
                  <View style={{ marginTop: current ? spacing.sm : 0, paddingTop: current ? spacing.sm : 0, borderTopWidth: current ? StyleSheet.hairlineWidth : 0, borderTopColor: theme.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={[styles.kicker, { color: theme.textMuted }]}>UP NEXT</Text>
                      {next.room ? <Text style={{ fontSize: font.xs, color: theme.textMuted }}>{withPrefix('Room', next.room)}</Text> : null}
                    </View>
                    <Text style={styles.title}>{next.subjectName || `Period ${next.periodNumber}`}</Text>
                    <Text style={styles.muted}>
                      {next.day && next.day !== today?.day ? `${next.day} · ` : ''}
                      {fmtHM(next.startTime)} – {fmtHM(next.endTime)}
                      {next.teacherName ? ` · ${next.teacherName}` : ''}
                    </Text>
                  </View>
                ) : null}

                {!current && !next ? (
                  <Text style={[styles.muted, { paddingVertical: spacing.sm }]}>No further classes scheduled for today.</Text>
                ) : null}
              </View>

              {/* Homework Due Today Banner */}
              <Pressable onPress={() => router.push({ pathname: '/student/homework', params: { status: 'pending' } })}>
                <Card style={[styles.dueCard, { marginTop: spacing.md }]}>
                  <View style={[styles.dueIcon, { backgroundColor: dueToday.length ? alpha(theme.danger, 0.12) : theme.primarySoft }]}>
                    <Ionicons name="alarm-outline" size={22} color={dueToday.length ? theme.danger : theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dueTitle}>Homework due today</Text>
                    <Text style={styles.muted} numberOfLines={2}>
                      {dueToday.length ? dueToday.map((h) => h.title).join(', ') : 'Nothing due today · All caught up!'}
                    </Text>
                  </View>
                  {dueToday.length ? <Badge label={`${dueToday.length} Due`} tone="danger" /> : <Badge label="Clear" tone="success" />}
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </Card>
              </Pressable>

              {/* Upcoming Items */}
              <SectionTitle title="Upcoming Schedule" />
              {upcoming.loading && !upcoming.data ? (
                <SkeletonList count={3} padded={false} />
              ) : items.length ? (
                <View style={[styles.upcomingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {items.map((it, idx) => (
                    <Pressable
                      key={it.key}
                      onPress={() => router.push(it.to)}
                      style={({ pressed }) => [
                        styles.upRow,
                        idx === items.length - 1 && { borderBottomWidth: 0 },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View style={[styles.upIconBox, { backgroundColor: alpha(it.tag === 'Due' ? theme.warning : it.tag === 'Exam' ? '#8b5cf6' : theme.primary, 0.12) }]}>
                        <Ionicons
                          name={it.icon}
                          size={18}
                          color={it.tag === 'Due' ? theme.warning : it.tag === 'Exam' ? '#8b5cf6' : theme.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.upTitle} numberOfLines={1}>
                          {it.title}
                        </Text>
                        <Text style={styles.muted}>{fmtDate(it.date)}</Text>
                      </View>
                      <Badge label={it.tag} tone={it.tag === 'Due' ? 'warning' : it.tag === 'Exam' ? 'primary' : 'muted'} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Card>
                  <Text style={styles.muted}>
                    {upcoming.error && !upcoming.data ? 'Could not load upcoming items. Pull down to try again.' : 'Nothing coming up this week.'}
                  </Text>
                </Card>
              )}
            </>
          )}

          {/* Quick Access Grid */}
          <SectionTitle title="Quick Access" />
          <View style={styles.grid}>
            {QUICK.map((q) => (
              <Pressable
                key={q.to}
                onPress={() => router.push(q.to)}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={q.label}
              >
                <View style={[styles.tileIcon, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name={q.icon} size={22} color={theme.primary} />
                </View>
                <Text style={[styles.tileText, { color: theme.text }]} numberOfLines={1}>
                  {q.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </RefreshableScroll>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    body: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
    chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, marginTop: spacing.md },
    chipText: { fontSize: font.sm, fontWeight: '700' },
    banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, marginBottom: spacing.lg },
    bannerText: { flex: 1, color: t.text, fontSize: font.md, fontWeight: '600' },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    scheduleCard: {
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      marginTop: spacing.md,
    },
    scheduleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    liveClassBox: {
      borderRadius: radius.md,
      padding: spacing.sm + 4,
      borderWidth: 1,
      marginBottom: spacing.xs,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    roomPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    kicker: { fontSize: font.xs, fontWeight: '800', letterSpacing: 0.6 },
    title: { fontSize: font.md, fontWeight: '800', color: t.text, marginTop: 2 },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    dueCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    dueIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    dueTitle: { fontSize: font.md, fontWeight: '700', color: t.text },
    upcomingCard: {
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
    },
    upRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    upIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    upTitle: { fontSize: font.md, fontWeight: '700', color: t.text },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    tile: {
      width: '30.5%',
      minHeight: 88,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: t.isDark ? 0 : 1,
    },
    tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    tileText: { fontSize: font.sm, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' },
  });

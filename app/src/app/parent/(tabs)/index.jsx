import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useParent } from '../../../context/ParentContext';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { parentApi } from '../../../api/parent';
import { useAsync } from '../../../lib/useAsync';
import { useActivePickup } from '../../../lib/useActivePickup';
import { fmtDate, fmtHM, withPrefix } from '../../../lib/format';
import { fileUrl } from '../../../lib/links';
import { Card } from '../../../components/ui';
import { Avatar, Badge, ErrorView, SectionTitle, StatCard } from '../../../components/kit';
import { SkeletonHome } from '../../../components/Skeleton';
import SchoolHeader from '../../../components/SchoolHeader';
import RefreshableScroll from '../../../components/RefreshableScroll';
import ChildSwitcher, { childClassLine } from '../../../components/parent/ChildSwitcher';
import { money } from '../../../components/student/status';
import { alpha, font, radius, spacing } from '../../../theme';

const QUICK = [
  { icon: 'calendar-outline', label: 'Timetable', to: '/parent/timetable' },
  { icon: 'book-outline', label: 'Homework', to: '/parent/homework' },
  { icon: 'ribbon-outline', label: 'Results', to: '/parent/results' },
  { icon: 'wallet-outline', label: 'Fees', to: '/parent/fees' },
  { icon: 'shield-checkmark-outline', label: 'Pickup', to: '/parent/pickup' },
  { icon: 'bus-outline', label: 'Transport', to: '/parent/transport' },
  { icon: 'folder-open-outline', label: 'Material', to: '/parent/materials' },
];

// Doc 03 §7.1 — "How is my child doing?" at a glance: one card per child
// (tap = switch), then the selected child's attendance, work, dues, next exam.
export default function ParentHome() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { user } = useAuth();
  const { child, children, selectChild, reloadChildren, refreshUnread } = useParent();
  const childId = child?.childId;

  // Pickup OTP banner: one light request per poll, only while this tab is focused.
  // It covers ALL children — a pickup for a child who is not the selected one
  // must still be announced (tapping switches to that child).
  const livePickups = useActivePickup(() => parentApi.activePickups(), [], 15000);
  const readyPickups = (Array.isArray(livePickups) ? livePickups : []).filter((p) => p.otp);

  const overview = useAsync(() => parentApi.overview(), [], { refetchOnFocus: true, cacheKey: 'parent.overview' });
  const dash = useAsync(() => parentApi.dashboard(childId), [childId], { refetchOnFocus: true, cacheKey: 'parent.dashboard' });

  const onRefresh = useCallback(async () => {
    await Promise.all([overview.reload({ silent: true }), dash.reload({ silent: true }), reloadChildren(), refreshUnread()]);
  }, [overview, dash, reloadChildren, refreshUnread]);

  // A stale selection (child unlinked meanwhile) → re-read the list; the
  // context falls back to the first child still linked.
  const stale = dash.error?.code === 'CHILD_ACCESS_DENIED' || dash.error?.code === 'CHILD_NOT_FOUND';
  const retry = () => (stale ? reloadChildren().then(() => dash.reload()) : dash.reload());

  const cards = overview.data?.children || children;
  const d = dash.data;
  const next = d?.todaySummary?.nextClass || null;
  const due = d?.pendingFees?.amount || 0;
  const exam = d?.upcomingExams?.[0] || null;
  const notices = d?.recentNotices || [];

  return (
    <View style={{ flex: 1 }}>
      <RefreshableScroll onRefresh={onRefresh} contentContainerStyle={{ paddingBottom: 110 }}>
        <SchoolHeader>
          <View style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
            <ChildSwitcher />
          </View>
        </SchoolHeader>

        <View style={styles.body}>
          {readyPickups.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                selectChild(p.childId);
                router.push('/parent/pickup');
              }}
              accessibilityRole="button"
              accessibilityLabel={`Pickup OTP is ready${p.studentName ? ` for ${p.studentName}` : ''}. Tap to view.`}
            >
              <Card style={styles.pickupCard}>
                <View style={[styles.dueIcon, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.2 : 0.12) }]}>
                  <Ionicons name="shield-checkmark" size={22} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dueTitle}>Pickup OTP is ready</Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {p.studentName ? `${p.studentName} · tap to view` : 'Tap to view'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Card>
            </Pressable>
          ))}

          {user?.mustResetPassword ? (
            <Pressable onPress={() => router.push('/parent/profile/change-password')}>
              <Card style={[styles.banner, { borderColor: theme.warning }]}>
                <Ionicons name="key-outline" size={20} color={theme.warning} />
                <Text style={styles.bannerText}>Your password was set by the school. Tap to set your own password.</Text>
              </Card>
            </Pressable>
          ) : null}

          {/* All children — only worth a row when there is more than one */}
          {cards.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kidsScroll} contentContainerStyle={styles.kids}>
              {cards.map((c) => {
                const active = c.childId === childId;
                return (
                  <Pressable
                    key={c.childId}
                    onPress={() => selectChild(c.childId)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [styles.kid, active && { borderColor: theme.primary, backgroundColor: theme.primarySoft }, pressed && { opacity: 0.85 }]}
                  >
                    <View style={styles.kidTop}>
                      <Avatar source={fileUrl(c.photo)} name={c.name} size={40} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.kidName} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.muted} numberOfLines={1}>
                          {childClassLine(c)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.kidStats}>
                      <Text style={styles.kidStat}>
                        <Text style={{ color: theme.success, fontWeight: '800' }}>{c.attendancePercentage ?? '–'}%</Text> present
                      </Text>
                      <Text style={styles.kidStat}>
                        <Text style={{ color: c.pendingFees ? theme.danger : theme.success, fontWeight: '800' }}>{c.pendingFees ? money(c.pendingFees) : 'No'}</Text> due
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {dash.loading && !d ? (
            <SkeletonHome />
          ) : dash.error && !d ? (
            <ErrorView error={dash.error} onRetry={retry} />
          ) : (
            <>
              <View style={styles.stats}>
                <StatCard
                  icon="checkmark-done-outline"
                  label="Attendance"
                  value={`${d?.todaySummary?.attendancePercentage ?? 0}%`}
                  subtitle="Overall record"
                  color={theme.success}
                  onPress={() => router.navigate('/parent/attendance')}
                />
                <StatCard
                  icon="book-outline"
                  label="Pending Homework"
                  value={d?.todaySummary?.pendingHomework ?? 0}
                  subtitle="Not submitted yet"
                  color={theme.warning}
                  onPress={() => router.push({ pathname: '/parent/homework', params: { status: 'pending' } })}
                />
                <StatCard
                  icon="wallet-outline"
                  label="Fees Due"
                  value={money(due)}
                  subtitle={due && d?.pendingFees?.nextDueDate ? `Next due ${fmtDate(d.pendingFees.nextDueDate)}` : 'All clear'}
                  color={due ? theme.danger : theme.success}
                  onPress={() => router.push('/parent/fees')}
                />
                <StatCard
                  icon="school-outline"
                  label="Next Exam"
                  value={exam ? fmtDate(exam.startDate) : '–'}
                  subtitle={exam ? exam.name : 'None scheduled'}
                  color={theme.primary}
                  onPress={() => router.push('/parent/exams')}
                />
              </View>

              {/* Fees due → straight to paying */}
              {due ? (
                <Pressable onPress={() => router.push('/parent/fees')} accessibilityRole="button">
                  <Card style={[styles.dueCard, { marginTop: spacing.md }]}>
                    <View style={[styles.dueIcon, { backgroundColor: alpha(theme.danger, 0.12) }]}>
                      <Ionicons name="card-outline" size={22} color={theme.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dueTitle}>{money(due)} fees pending</Text>
                      <Text style={styles.muted}>{d?.pendingFees?.nextDueDate ? `Next due ${fmtDate(d.pendingFees.nextDueDate)} · ` : ''}Tap to view and pay</Text>
                    </View>
                    <Badge label="Pay" tone="danger" />
                  </Card>
                </Pressable>
              ) : null}

              {/* Next class */}
              <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.blockHead}>
                  <View style={styles.rowGap}>
                    <Ionicons name="time-outline" size={18} color={theme.primary} />
                    <Text style={styles.blockTitle}>Next class</Text>
                  </View>
                  <Pressable onPress={() => router.push('/parent/timetable')} hitSlop={8}>
                    <Text style={styles.link}>View Timetable</Text>
                  </Pressable>
                </View>
                {next ? (
                  <>
                    <Text style={styles.title}>{next.subjectName || `Period ${next.periodNumber}`}</Text>
                    <Text style={styles.muted}>
                      {next.day ? `${next.day} · ` : ''}
                      {fmtHM(next.startTime)} – {fmtHM(next.endTime)}
                      {next.teacherName ? ` · ${next.teacherName}` : ''}
                      {next.room ? ` · ${withPrefix('Room', next.room)}` : ''}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.muted}>No upcoming class in the timetable.</Text>
                )}
              </View>

              <SectionTitle title="Quick access" />
              <View style={styles.grid}>
                {QUICK.map((q) => (
                  <Pressable
                    key={q.to}
                    onPress={() => router.push(q.to)}
                    accessibilityRole="button"
                    accessibilityLabel={q.label}
                    style={({ pressed }) => [styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && { opacity: 0.8 }]}
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

              <SectionTitle
                title="Latest notices"
                right={
                  <Pressable onPress={() => router.navigate('/parent/notices')} hitSlop={8}>
                    <Text style={styles.link}>See all</Text>
                  </Pressable>
                }
              />
              <View style={[styles.listCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {notices.length ? (
                  notices.slice(0, 4).map((n, i) => (
                    <Pressable
                      key={n.id}
                      onPress={() => router.push(`/parent/notice/${n.id}`)}
                      style={({ pressed }) => [styles.noticeRow, i === Math.min(notices.length, 4) - 1 && { borderBottomWidth: 0 }, pressed && { opacity: 0.7 }]}
                    >
                      <View style={[styles.dot, { backgroundColor: n.isRead ? 'transparent' : theme.primary }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.noticeTitle, !n.isRead && { fontWeight: '800' }]} numberOfLines={1}>
                          {n.title}
                        </Text>
                        <Text style={styles.muted} numberOfLines={1}>
                          {fmtDate(n.publishAt || n.createdAt)}
                          {n.publishedByName ? ` · ${n.publishedByName}` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </Pressable>
                  ))
                ) : (
                  <Text style={[styles.muted, { paddingVertical: spacing.md }]}>No notices from the school yet.</Text>
                )}
              </View>
            </>
          )}
        </View>
      </RefreshableScroll>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    body: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
    banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, marginBottom: spacing.lg },
    pickupCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
    bannerText: { flex: 1, color: t.text, fontSize: font.md, fontWeight: '600' },
    kidsScroll: { marginHorizontal: -spacing.lg, marginBottom: spacing.md },
    kids: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, gap: spacing.md },
    kid: {
      width: 232,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: t.border,
      backgroundColor: t.surface,
      padding: spacing.md,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    kidTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    kidName: { fontSize: font.md, fontWeight: '800', color: t.text },
    kidStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
    kidStat: { fontSize: font.sm, color: t.textMuted },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    dueCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    dueIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    dueTitle: { fontSize: font.md, fontWeight: '700', color: t.text },
    block: { borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, marginTop: spacing.md },
    blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    blockTitle: { fontSize: font.md, fontWeight: '800', color: t.text },
    rowGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    link: { fontSize: font.xs, fontWeight: '700', color: t.primary },
    title: { fontSize: font.md, fontWeight: '800', color: t.text, marginTop: 2 },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    tile: { width: '30.5%', minHeight: 88, borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    tileText: { fontSize: font.sm, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' },
    listCard: { borderRadius: radius.lg, paddingHorizontal: spacing.md, borderWidth: 1 },
    noticeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
    noticeTitle: { fontSize: font.md, fontWeight: '600', color: t.text },
    dot: { width: 8, height: 8, borderRadius: 4 },
  });

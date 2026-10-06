import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { useAsync } from '../../lib/useAsync';
import { principalMiscApi } from '../../api/principal/misc';
import { Badge, EmptyState, ErrorView, SectionTitle, StatCard, StaleNotice } from '../kit';
import { SkeletonCards } from '../Skeleton';
import { BarChart, ShareBars } from './misc/MiniCharts';
import { font, radius, spacing } from '../../theme';

const inr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
const ACT_TONE = { emerald: 'success', amber: 'warning', purple: 'info', indigo: 'primary' };
const go = (path) => () => router.push(path);

// Web: Principal → Dashboard. KPIs, module pulse, quick links, charts and the activity stream
// (GET /school-portal/dashboard/summary). The Home tab's pull-to-refresh calls ref.reload().
const DashboardSummary = forwardRef(function DashboardSummary(_props, ref) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => principalMiscApi.dashboardSummary().then((r) => r?.data || {}), [], {
    refetchOnFocus: true,
    cacheKey: 'principal.dashboard',
  });
  useImperativeHandle(ref, () => ({ reload: () => state.reload({ silent: true }) }), [state]);

  if (state.loading && !state.data) return <SkeletonCards count={4} padded={false} />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;

  const d = state.data || {};
  const kpi = d.kpi || {};
  const charts = d.charts || {};
  const activities = d.recentActivities || [];
  const palette = [theme.primary, theme.success, theme.warning, '#8B5CF6', '#0EA5E9'];

  return (
    <View>
      {state.stale ? <StaleNotice at={state.cachedAt} onRetry={state.reload} style={{ marginBottom: spacing.md }} /> : null}

      <View style={styles.grid}>
        <StatCard
          style={styles.cell}
          label="Total students"
          value={(Number(kpi.totalStudents) || 0).toLocaleString('en-IN')}
          icon="school-outline"
          subtitle="Enrolled active"
          onPress={go('/principal/students')}
        />
        <StatCard
          style={styles.cell}
          label="Teaching staff"
          value={String(kpi.totalTeachers ?? 0)}
          icon="easel-outline"
          color="#6366F1"
          subtitle={`${kpi.totalEmployees ?? 0} total staff`}
          onPress={go('/principal/teachers')}
        />
        <StatCard
          style={styles.cell}
          label="Daily attendance"
          value={`${kpi.attendanceRate ?? 0}%`}
          icon="checkmark-done-outline"
          color="#0EA5E9"
          subtitle="Staff roll call today"
          onPress={go('/principal/attendance')}
        />
        <StatCard
          style={styles.cell}
          label="Collected today"
          value={inr(kpi.collectedToday)}
          icon="cash-outline"
          color={theme.warning}
          subtitle={`${inr(kpi.collectedMonth)} this month`}
          onPress={go('/principal/fees')}
        />
      </View>

      <SectionTitle title="Module pulse" />
      <View style={styles.grid}>
        <StatCard
          style={styles.cell}
          label="Fee dues outstanding"
          value={inr(kpi.pendingFees)}
          icon="alert-circle-outline"
          color={theme.danger}
          onPress={go('/principal/fees')}
        />
        <StatCard
          style={styles.cell}
          label="Classes / sections"
          value={String(kpi.classesCount || '0 / 0')}
          icon="library-outline"
          color="#6366F1"
          onPress={go('/principal/academics/classes')}
        />
        <StatCard
          style={styles.cell}
          label="Active exam terms"
          value={String(kpi.upcomingExams ?? 0)}
          icon="document-text-outline"
          color={theme.warning}
          onPress={go('/principal/exams')}
        />
        <StatCard
          style={styles.cell}
          label="Leave approval"
          value="Open"
          icon="calendar-outline"
          color={theme.success}
          subtitle="Review desk"
          onPress={go('/principal/leave')}
        />
      </View>

      <SectionTitle title="Fast operations" />
      <View style={styles.quick}>
        {[
          ['Reports', 'bar-chart-outline', '/principal/reports'],
          ['Notifications', 'notifications-outline', '/principal/notifications'],
          ['Meetings', 'people-circle-outline', '/principal/meetings'],
          ['Safe pickup', 'shield-checkmark-outline', '/principal/safe-pickup'],
          ['Events', 'calendar-number-outline', '/principal/events'],
          ['Homework', 'book-outline', '/principal/homework'],
        ].map(([label, , path]) => (
          <Text key={label} style={styles.quickChip} onPress={go(path)} accessibilityRole="button">
            {label}
          </Text>
        ))}
      </View>

      <Panel title="Admissions growth" badge="Monthly" styles={styles}>
        <BarChart data={charts.admissionsTrend} xKey="month" yKey="admissions" color={theme.primary} />
      </Panel>
      <Panel title="Weekly attendance rate %" badge="Mon - Sat" styles={styles}>
        <BarChart data={charts.weeklyAttendance} xKey="day" yKey="attendance" color={theme.success} format={(v) => `${v}%`} />
      </Panel>
      <Panel title="Monthly fee recovery" badge="Cashflow" styles={styles}>
        <BarChart
          data={charts.monthlyFeeTrend}
          xKey="month"
          yKey="collected"
          color={theme.warning}
          format={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
      </Panel>
      <Panel title="Exam performance (avg %)" badge="Evaluations" styles={styles}>
        <BarChart data={charts.examPerformance} xKey="name" yKey="average" color="#8B5CF6" format={(v) => `${v}%`} />
      </Panel>
      <Panel title="Student gender distribution" badge="Demographics" styles={styles}>
        <ShareBars data={charts.genderDistribution} labelKey="name" valueKey="count" colors={palette} />
      </Panel>
      <Panel title="Class-wise strength" badge="Cohorts" styles={styles}>
        <ShareBars data={charts.classStrength} labelKey="class" valueKey="strength" colors={[theme.primary]} />
      </Panel>

      <SectionTitle
        title="Live school activity"
        right={
          <Text style={styles.link} onPress={go('/principal/reports')} accessibilityRole="button">
            View reports
          </Text>
        }
      />
      {activities.length === 0 ? (
        <EmptyState icon="pulse-outline" title="No recent activity" message="Nothing has been recorded recently." />
      ) : (
        <View style={styles.panel}>
          {activities.map((a, i) => (
            <View key={a.id ?? i} style={[styles.actRow, i > 0 && styles.actBorder]}>
              <View style={{ flex: 1 }}>
                <Badge label={String(a.category || 'Activity')} tone={ACT_TONE[a.color] || 'primary'} />
                <Text style={styles.actText}>{a.text}</Text>
              </View>
              <Text style={styles.actTime}>{a.time}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

function Panel({ title, badge, children, styles }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelTitle}>{title}</Text>
        <Badge label={badge} tone="muted" />
      </View>
      {children}
    </View>
  );
}

export default DashboardSummary;

const makeStyles = (t) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
    cell: { width: '47.5%', flexGrow: 1 },
    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    quickChip: {
      color: t.primary,
      backgroundColor: t.primarySoft,
      fontWeight: '700',
      fontSize: font.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
    panel: {
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, gap: spacing.sm },
    panelTitle: { color: t.text, fontWeight: '800', fontSize: font.md, flex: 1 },
    link: { color: t.primary, fontWeight: '700', fontSize: font.sm },
    actRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, alignItems: 'flex-start' },
    actBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
    actText: { color: t.text, fontSize: font.sm, fontWeight: '600', marginTop: 4 },
    actTime: { color: t.textMuted, fontSize: 10, fontWeight: '600' },
  });

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalMonitoringApi as api } from '../../../api/principal/monitoring';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate } from '../../../lib/format';
import RefreshableScroll from '../../../components/RefreshableScroll';
import PagedList from '../../../components/PagedList';
import { AsyncView, Badge, Chip, EmptyState, ProgressBar, SearchBar, Segmented, StatusBadge } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import { BarList } from '../../../components/principal/monitoring/Charts';
import { Panel, StatGrid } from '../../../components/principal/monitoring/Common';
import { font, spacing } from '../../../theme';

const TABS = [
  { value: 'list', label: 'Assignments' },
  { value: 'metrics', label: 'Submission metrics' },
];
const STATUSES = [
  { value: 'ALL', label: 'All' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'CLOSED', label: 'Closed' },
];
const GROUPS = [
  { value: 'subject', label: 'Subject' },
  { value: 'class', label: 'Class' },
  { value: 'teacher', label: 'Teacher' },
];

const rateColor = (theme, v) => (v >= 85 ? theme.success : v >= 50 ? theme.warning : theme.danger);

export default function HomeworkMonitoring() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [tab, setTab] = useState('list');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);
  const [status, setStatus] = useState('ALL');
  const [groupBy, setGroupBy] = useState('subject');

  const stats = useAsync(async () => (await api.homeworkStats())?.data || null, [], { refetchOnFocus: true });
  const monitor = useAsync(async () => (await api.homeworkMonitor({ groupBy }))?.data || [], [groupBy], { refetchOnFocus: true });

  const tabs = <Segmented options={TABS} value={tab} onChange={setTab} />;

  if (tab === 'metrics') {
    return (
      <RefreshableScroll
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}
        onRefresh={() => Promise.all([stats.reload({ silent: true }), monitor.reload({ silent: true })])}
      >
        <Stack.Screen options={{ title: 'Homework' }} />
        {tabs}
        <View style={{ height: spacing.lg }} />
        <AsyncView state={stats} skeleton={<SkeletonCards count={2} padded={false} />}>
          {(s) => (
            <StatGrid
              items={[
                { label: 'Total assignments', value: s?.total ?? 0, icon: 'book-outline' },
                { label: 'Pending evaluation', value: s?.pendingEvaluation ?? 0, icon: 'hourglass-outline', color: theme.warning },
                { label: 'Avg submission', value: s?.avgSubmissionRate == null ? '–' : `${s.avgSubmissionRate}%`, icon: 'trending-up-outline', color: theme.success },
                { label: 'Overdue', value: s?.overdue ?? 0, icon: 'alarm-outline', color: theme.danger },
              ]}
            />
          )}
        </AsyncView>
        <View style={styles.chipRow}>
          {GROUPS.map((g) => (
            <Chip key={g.value} label={g.label} active={groupBy === g.value} onPress={() => setGroupBy(g.value)} />
          ))}
        </View>
        <AsyncView state={monitor} skeleton={<SkeletonCards count={2} padded={false} />}>
          {(rows) => {
            const withRate = rows.filter((m) => m.submissionRate != null);
            return (
              <>
                <Panel title={`Submission rate by ${groupBy}`}>
                  {withRate.length ? (
                    <BarList
                      percent
                      color={theme.success}
                      data={withRate.map((m) => ({ label: m.group, value: m.submissionRate, text: `${m.submissionRate}%` }))}
                    />
                  ) : (
                    <Text style={styles.muted}>No submission data recorded yet.</Text>
                  )}
                </Panel>
                {rows.map((m) => (
                  <View key={m.group} style={styles.card}>
                    <Text style={styles.title}>{m.group}</Text>
                    <Text style={styles.muted}>
                      {m.assignments} assignment{m.assignments === 1 ? '' : 's'} · {m.pendingEvaluation} pending evaluation
                    </Text>
                    <Text style={styles.muted}>Evaluation rate: {m.evaluationRate == null ? '–' : `${m.evaluationRate}%`}</Text>
                  </View>
                ))}
              </>
            );
          }}
        </AsyncView>
      </RefreshableScroll>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Homework' }} />
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md }}>
        {tabs}
        <SearchBar value={q} onChangeText={setQ} placeholder="Search title, subject, teacher, class" />
        <View style={styles.chipRow}>
          {STATUSES.map((s) => (
            <Chip key={s.value} label={s.label} active={status === s.value} onPress={() => setStatus(s.value)} />
          ))}
        </View>
      </View>
      <PagedList
        skeleton={<SkeletonCards padded={false} />}
        cacheKey="principal.homework"
        deps={[search, status]}
        fetchPage={(page) => api.homeworkList({ page, limit: 20, search, status: status === 'ALL' ? undefined : status })}
        ListEmptyComponent={<EmptyState icon="book-outline" title="No homework recorded" message="Nothing matches the current filters." />}
        renderItem={({ item }) => {
          const rate = item.submissionRate;
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/principal/homework/${item.id}`)}>
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <StatusBadge status={item.overdue ? 'OVERDUE' : item.status} />
              </View>
              <Text style={styles.muted}>
                {[item.className, item.sectionName].filter(Boolean).join(' ') || '–'} · {item.subjectName || '–'}
              </Text>
              <Text style={styles.muted}>By {item.teacherName || '–'}</Text>
              <Text style={[styles.muted, item.overdue && { color: theme.danger, fontWeight: '700' }]}>
                Assigned {fmtDate(item.assignedDate)} · Due {fmtDate(item.dueDate)}
              </Text>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={(rate || 0) / 100} color={rateColor(theme, rate || 0)} />
                </View>
                <Text style={styles.rate}>{rate == null ? '–' : `${rate}%`}</Text>
              </View>
              {item.pendingEvaluation ? <Badge label={`${item.pendingEvaluation} pending evaluation`} tone="warning" /> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderRadius: 18, borderWidth: 1, borderColor: t.border, padding: spacing.lg, marginBottom: spacing.md, gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    title: { flex: 1, color: t.text, fontSize: font.lg, fontWeight: '800' },
    muted: { color: t.textMuted, fontSize: font.md },
    rate: { color: t.text, fontWeight: '800', fontSize: font.md, minWidth: 40, textAlign: 'right' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  });

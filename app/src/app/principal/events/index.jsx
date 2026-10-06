import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalMonitoringApi as api } from '../../../api/principal/monitoring';
import { useAsync } from '../../../lib/useAsync';
import RefreshableScroll from '../../../components/RefreshableScroll';
import PagedList from '../../../components/PagedList';
import { AsyncView, Badge, Chip, EmptyState, SearchBar, Segmented } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import { StatGrid } from '../../../components/principal/monitoring/Common';
import { EVENT_STATUS_TONE, fmtEventTime } from '../../../components/principal/monitoring/eventUtils';
import { font, spacing } from '../../../theme';

const TABS = [
  { value: 'list', label: 'Calendar' },
  { value: 'upcoming', label: 'Upcoming' },
];
const STATUSES = ['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];
const CATEGORIES = ['ALL', 'ACADEMIC', 'SPORTS', 'CULTURAL', 'MEETING', 'HOLIDAY', 'EXAM', 'OTHER'];
const label = (v) => (v === 'ALL' ? 'All' : v.charAt(0) + v.slice(1).toLowerCase());

function EventCard({ item }) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/principal/events/${item.id}`)}>
      <View style={styles.row}>
        <Badge label={item.category} tone="info" />
        <Badge label={item.status} tone={EVENT_STATUS_TONE[item.status] || 'muted'} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <View style={styles.line}>
        <Ionicons name="time-outline" size={15} color={theme.textMuted} />
        <Text style={styles.muted}>{fmtEventTime(item.startAt)}</Text>
      </View>
      {item.venue ? (
        <View style={styles.line}>
          <Ionicons name="location-outline" size={15} color={theme.textMuted} />
          <Text style={styles.muted}>{item.venue}</Text>
        </View>
      ) : null}
      <View style={styles.line}>
        <Ionicons name="person-outline" size={15} color={theme.textMuted} />
        <Text style={styles.muted}>{item.leadName || 'No coordinator assigned'}</Text>
      </View>
    </Pressable>
  );
}

export default function EventsMonitoring() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [tab, setTab] = useState('list');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [category, setCategory] = useState('ALL');

  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);

  const stats = useAsync(async () => (await api.eventStats())?.data || null, [], { refetchOnFocus: true });
  const upcoming = useAsync(
    async () => {
      const [a, b] = await Promise.all([
        api.events({ status: 'ONGOING', limit: 50 }),
        api.events({ status: 'UPCOMING', limit: 50 }),
      ]);
      return [...(a?.data || []), ...(b?.data || [])];
    },
    [],
    { refetchOnFocus: true },
  );

  const s = stats.data;
  const tabs = <Segmented options={TABS} value={tab} onChange={setTab} />;
  const statsGrid = s ? (
    <StatGrid
      items={[
        { label: 'Total', value: s.total ?? 0, icon: 'calendar-outline' },
        { label: 'Upcoming', value: s.upcoming ?? 0, icon: 'arrow-forward-circle-outline', color: theme.success },
        { label: 'This month', value: s.thisMonth ?? 0, icon: 'today-outline', color: theme.warning },
        { label: 'Completed', value: s.completed ?? 0, icon: 'checkmark-done-outline', color: theme.textMuted },
      ]}
    />
  ) : null;

  if (tab === 'upcoming') {
    return (
      <RefreshableScroll
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}
        onRefresh={() => Promise.all([stats.reload({ silent: true }), upcoming.reload({ silent: true })])}
      >
        <Stack.Screen options={{ title: 'Events' }} />
        {statsGrid}
        {tabs}
        <View style={{ height: spacing.lg }} />
        <AsyncView
          state={upcoming}
          skeleton={<SkeletonCards padded={false} />}
          empty={{ when: (d) => !d?.length, view: <EmptyState icon="calendar-outline" title="No upcoming events" /> }}
        >
          {(rows) => rows.map((e) => <EventCard key={e.id} item={e} />)}
        </AsyncView>
      </RefreshableScroll>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Events' }} />
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md }}>
        {s ? (
          <Text style={styles.summary}>
            Total {s.total ?? 0} · Upcoming {s.upcoming ?? 0} · This month {s.thisMonth ?? 0} · Completed {s.completed ?? 0}
          </Text>
        ) : null}
        {tabs}
        <SearchBar value={q} onChangeText={setQ} placeholder="Search title, venue, coordinator" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {STATUSES.map((v) => (
            <Chip key={v} label={label(v)} active={status === v} onPress={() => setStatus(v)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map((v) => (
            <Chip key={v} label={label(v)} active={category === v} onPress={() => setCategory(v)} />
          ))}
        </ScrollView>
      </View>
      <PagedList
        skeleton={<SkeletonCards padded={false} />}
        cacheKey="principal.events"
        deps={[search, status, category]}
        fetchPage={(page) => api.events({ page, limit: 20, search, status: status === 'ALL' ? undefined : status, category: category === 'ALL' ? undefined : category })}
        contentContainerStyle={{ paddingTop: spacing.md }}
        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No events found" message="Nothing matches the current filters." />}
        renderItem={({ item }) => <EventCard item={item} />}
      />
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderRadius: 18, borderWidth: 1, borderColor: t.border, padding: spacing.lg, marginBottom: spacing.md, gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    title: { color: t.text, fontSize: font.lg, fontWeight: '800' },
    muted: { flex: 1, color: t.textMuted, fontSize: font.md },
    line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    summary: { color: t.textMuted, fontSize: font.sm, fontWeight: '700' },
    chipRow: { gap: spacing.sm, paddingRight: spacing.lg },
  });

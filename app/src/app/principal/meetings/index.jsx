import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalMiscApi } from '../../../api/principal/misc';
import { fmtDateTime } from '../../../lib/format';
import PagedList from '../../../components/PagedList';
import { Badge, Chip, EmptyState, SearchBar } from '../../../components/kit';
import { MEETING_STATUS_TONE, MEETING_TYPE_LABEL } from '../../../components/principal/misc/meetingUtils';
import { font, radius, spacing } from '../../../theme';

// Web: Principal → Meetings (list + schedule). Server-side search / status filter / paging.
const STATUSES = ['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'];

export default function Meetings() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [stats, setStats] = useState(null);

  const header = (
    <View style={{ paddingTop: spacing.lg }}>
      <View style={styles.statRow}>
        {[
          ['Total', stats?.TOTAL],
          ['Scheduled', stats?.SCHEDULED],
          ['Completed', stats?.COMPLETED],
          ['Cancelled', stats?.CANCELLED],
        ].map(([label, v]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statVal}>{v ?? '–'}</Text>
            <Text style={styles.statLbl}>{label}</Text>
          </View>
        ))}
      </View>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search meetings..." onClear={() => setQ('')} style={{ marginBottom: spacing.md }} />
      <View style={styles.chips}>
        {STATUSES.map((s) => (
          <Chip key={s} label={s === 'ALL' ? 'All' : s[0] + s.slice(1).toLowerCase()} active={status === s} onPress={() => setStatus(s)} />
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Meetings' }} />
      <PagedList
        deps={[q, status]}
        fetchPage={async (page) => {
          const res = await principalMiscApi.meetings({
            page,
            limit: 20,
            status: status === 'ALL' ? undefined : status,
            search: q.trim() || undefined,
          });
          if (page === 1 && res?.stats) setStats(res.stats);
          return res;
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState icon="people-circle-outline" title="No meetings" message="Schedule a meeting with the + button." />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/principal/meetings/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
          >
            <View style={styles.cardTop}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Badge label={item.status} tone={MEETING_STATUS_TONE[item.status] || 'muted'} />
            </View>
            <Text style={styles.sub}>
              {MEETING_TYPE_LABEL[item.type] || item.type} · {fmtDateTime(item.scheduledAt)} · {item.durationMin} min
            </Text>
            {item.participantsLabel ? <Text style={styles.sub}>{item.participantsLabel}</Text> : null}
            {item.agenda ? (
              <Text style={styles.agenda} numberOfLines={2}>
                {item.agenda}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
      <Pressable
        onPress={() => router.push('/principal/meetings/form')}
        accessibilityRole="button"
        accessibilityLabel="Schedule meeting"
        style={[styles.fab, { backgroundColor: theme.primary }]}
      >
        <Ionicons name="add" size={28} color={theme.onPrimary} />
      </Pressable>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    stat: { flex: 1, backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    statVal: { color: t.text, fontSize: font.xl, fontWeight: '800' },
    statLbl: { color: t.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    card: { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
    title: { flex: 1, color: t.text, fontSize: font.md, fontWeight: '800' },
    sub: { color: t.textMuted, fontSize: font.sm, marginTop: 4 },
    agenda: { color: t.text, fontSize: font.sm, marginTop: spacing.sm },
    fab: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  });

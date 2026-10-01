import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { usePortal } from '../../../context/PortalScope';
import { fmtDate } from '../../../lib/format';
import PagedList from '../../../components/PagedList';
import { Badge, Chip, EmptyState } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import { PHASE_TONE } from '../../../components/student/status';
import { font, radius, spacing } from '../../../theme';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];

// Doc §6.6 — `status=all|upcoming|ongoing|completed`; detail has the date sheet.
export default function ExamList() {
  const { api, base, scopeKey } = usePortal();
  const styles = useStyles(makeStyles);
  const [status, setStatus] = useState('all');
  return (
    <PagedList
      deps={[status, scopeKey]}
      fetchPage={(page) => api.exams({ page, limit: 20, status })}
      skeleton={<SkeletonCards padded={false} />}
      ListHeaderComponent={
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md, alignItems: 'center' }}>
          {FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} active={status === f.value} onPress={() => setStatus(f.value)} />
          ))}
        </ScrollView>
      }
      ListEmptyComponent={<EmptyState icon="create-outline" title="No exams" />}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`${base}/exams/${item.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
          <View style={styles.row}>
            <Text style={styles.title}>{item.name}</Text>
            {item.phase ? <Badge label={item.phase.toUpperCase()} tone={PHASE_TONE[item.phase]} /> : null}
          </View>
          <Text style={styles.muted}>
            {String(item.examType || '').replace(/_/g, ' ')} · {fmtDate(item.startDate)} – {fmtDate(item.endDate)}
          </Text>
          {item.resultPublished ? (
            <View style={{ marginTop: spacing.sm }}>
              <Badge label="RESULT DECLARED" tone="success" icon="ribbon-outline" />
            </View>
          ) : null}
        </Pressable>
      )}
    />
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: t.border },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    title: { flex: 1, fontSize: font.lg, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 4 },
  });

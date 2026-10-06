import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalExamsApi } from '../../../api/principal/exams';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate } from '../../../lib/format';
import { confirm, showError, toast } from '../../../lib/notify';
import PagedList from '../../../components/PagedList';
import { Card } from '../../../components/ui';
import { Chip, EmptyState, SearchBar, Select, Stat, StatusBadge } from '../../../components/kit';
import { EXAM_STATUSES, EXAM_TYPES, rows, typeLabel } from '../../../components/principal/exams/constants';
import { font, radius, spacing } from '../../../theme';

const STATUS_FILTERS = ['ALL', ...EXAM_STATUSES];

// Examinations & Terms: stats, search + filters, exam cards (open / edit / delete).
export default function ExamsList() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const listRef = useRef(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [year, setYear] = useState('ALL');

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const stats = useAsync(() => principalExamsApi.stats(), [], { refetchOnFocus: true });
  const years = useAsync(() => principalExamsApi.years(), []);
  const yearOptions = useMemo(
    () => [{ value: 'ALL', label: 'All academic sessions' }, ...rows(years.data).map((y) => ({ value: y.id, label: `${y.name}${y.isCurrent ? ' (Current)' : ''}` }))],
    [years.data],
  );
  const typeOptions = useMemo(() => [{ value: 'ALL', label: 'All exam types' }, ...EXAM_TYPES], []);
  const s = stats.data?.data || {};

  const fetchPage = (page) =>
    principalExamsApi.list({
      page,
      limit: 20,
      search: search || undefined,
      status: status !== 'ALL' ? status : undefined,
      examType: type !== 'ALL' ? type : undefined,
      academicYearId: year !== 'ALL' ? year : undefined,
    });

  const remove = async (exam) => {
    const ok = await confirm(
      'Delete examination?',
      `"${exam.name}" and all its subjects, timetable, marks and results will be permanently removed.`,
      { confirmText: 'Delete', destructive: true },
    );
    if (!ok) return;
    try {
      const res = await principalExamsApi.remove(exam.id);
      toast.success(res?.message || 'Exam term removed');
      listRef.current?.reload();
      stats.reload({ silent: true });
    } catch (e) {
      showError(e, 'Could not delete exam');
    }
  };

  const open = (item) => router.push({ pathname: '/principal/exams/[examId]', params: { examId: item.id, name: item.name } });

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Examinations',
          headerRight: () => (
            <Pressable onPress={() => router.push('/principal/exams/form')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Create exam" style={{ paddingHorizontal: spacing.md }}>
              <Ionicons name="add-circle-outline" size={26} color={theme.onPrimary} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.top}>
        <View style={styles.statsRow}>
          <View style={{ flex: 1 }}><Stat label="Total" value={s.totalExams ?? 0} icon="documents-outline" /></View>
          <View style={{ flex: 1 }}><Stat label="Live" value={s.scheduled ?? 0} icon="time-outline" color={theme.warning} /></View>
          <View style={{ flex: 1 }}><Stat label="Completed" value={s.completed ?? 0} icon="checkmark-done-outline" color="#2563EB" /></View>
          <View style={{ flex: 1 }}><Stat label="Published" value={s.published ?? 0} icon="megaphone-outline" color={theme.success} /></View>
        </View>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search exam name" style={{ marginBottom: spacing.sm }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
          {STATUS_FILTERS.map((st) => (
            <Chip key={st} label={st === 'ALL' ? 'All' : st.replace(/_/g, ' ')} active={status === st} onPress={() => setStatus(st)} />
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}><Select value={year} options={yearOptions} onChange={setYear} placeholder="Session" /></View>
          <View style={{ flex: 1 }}><Select value={type} options={typeOptions} onChange={setType} placeholder="Type" /></View>
        </View>
      </View>
      <PagedList
        ref={listRef}
        fetchPage={fetchPage}
        deps={[search, status, type, year]}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No examinations"
            message="Create an examination term to set up subjects, timetable, marks and report cards."
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Pressable onPress={() => open(item)} accessibilityRole="button">
              <View style={styles.cardHead}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.meta}>{typeLabel(item.examType)} · {item.session}</Text>
              <Text style={styles.meta}>{fmtDate(item.startDate)} – {fmtDate(item.endDate)}</Text>
              {item.classes?.length ? (
                <Text style={styles.classes} numberOfLines={2}>
                  {item.classes.slice(0, 4).map((c) => c.name).join(', ')}
                  {item.classes.length > 4 ? ` +${item.classes.length - 4} more` : ''}
                </Text>
              ) : null}
            </Pressable>
            <View style={styles.actions}>
              <Pressable style={styles.act} onPress={() => open(item)}>
                <Ionicons name="open-outline" size={18} color={theme.primary} />
                <Text style={[styles.actText, { color: theme.primary }]}>Manage</Text>
              </Pressable>
              <Pressable style={styles.act} onPress={() => router.push({ pathname: '/principal/exams/form', params: { examId: item.id } })}>
                <Ionicons name="create-outline" size={18} color={theme.text} />
                <Text style={styles.actText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.act} onPress={() => remove(item)}>
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
                <Text style={[styles.actText, { color: theme.danger }]}>Delete</Text>
              </Pressable>
            </View>
          </Card>
        )}
        contentContainerStyle={{ paddingTop: spacing.sm }}
      />
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    top: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: t.bg },
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    card: { marginBottom: spacing.md },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
    name: { flex: 1, fontSize: font.lg, fontWeight: '800', color: t.text },
    meta: { fontSize: font.sm, color: t.textMuted, marginTop: 3 },
    classes: { fontSize: font.sm, color: t.text, marginTop: spacing.sm, fontWeight: '600' },
    actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: t.border },
    act: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: radius.sm },
    actText: { fontSize: font.sm, fontWeight: '700', color: t.text },
  });

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { Card } from '../../../components/ui';
import { AsyncView, ProgressBar } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, spacing } from '../../../theme';
import { SkeletonCards } from '../../../components/Skeleton';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ROWS = [
  { key: 'PRESENT', label: 'Present', tone: 'success' },
  { key: 'ABSENT', label: 'Absent', tone: 'danger' },
  { key: 'LATE', label: 'Late', tone: 'warning' },
  { key: 'HALF_DAY', label: 'Half day', tone: 'warning' },
  { key: 'LEAVE', label: 'On leave', tone: 'info' },
];

// GET /attendance/summary?sectionId=&month=YYYY-MM with a month stepper.
export default function AttendanceSummary() {
  const { sectionId, title } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const month = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}`;
  const isCurrent = ym.y === now.getFullYear() && ym.m === now.getMonth();

  useEffect(() => {
    if (title) navigation.setOptions({ title: String(title) });
  }, [navigation, title]);

  const state = useAsync(() => teacherApi.attendanceSummary(sectionId, month), [sectionId, month]);
  const step = (d) =>
    setYm(({ y, m }) => {
      const n = new Date(y, m + d, 1);
      return { y: n.getFullYear(), m: n.getMonth() };
    });

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
      <View style={styles.stepper}>
        <Pressable onPress={() => step(-1)} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </Pressable>
        <Text style={styles.month}>
          {MONTHS[ym.m]} {ym.y}
        </Text>
        <Pressable onPress={() => step(1)} disabled={isCurrent} hitSlop={10} style={{ opacity: isCurrent ? 0.3 : 1 }}>
          <Ionicons name="chevron-forward" size={24} color={theme.primary} />
        </Pressable>
      </View>
      <AsyncView state={state} skeleton={<SkeletonCards count={2} padded={false} />}>
        {(d) => {
          const total = Object.values(d.totals || {}).reduce((a, b) => a + b, 0);
          return (
            <>
              <Card style={styles.hero}>
                <Text style={[styles.rate, { color: theme.primary }]}>{d.presentRate ?? '–'}%</Text>
                <Text style={styles.muted}>present rate · {d.daysMarked} day{d.daysMarked === 1 ? '' : 's'} marked</Text>
              </Card>
              <Card style={{ marginTop: spacing.lg }}>
                {ROWS.map((r) => (
                  <View key={r.key} style={{ marginBottom: spacing.md }}>
                    <View style={styles.row}>
                      <Text style={styles.label}>{r.label}</Text>
                      <Text style={[styles.value, { color: theme[r.tone] }]}>{d.totals?.[r.key] ?? 0}</Text>
                    </View>
                    <ProgressBar value={total ? (d.totals?.[r.key] || 0) / total : 0} color={theme[r.tone]} />
                  </View>
                ))}
                <Text style={styles.muted}>Counts are student-days across the month.</Text>
              </Card>
            </>
          );
        }}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    month: { fontSize: font.lg, fontWeight: '800', color: t.text },
    hero: { alignItems: 'center' },
    rate: { fontSize: 44, fontWeight: '800' },
    muted: { fontSize: font.sm, color: t.textMuted },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    label: { fontSize: font.md, color: t.text, fontWeight: '600' },
    value: { fontSize: font.md, fontWeight: '800' },
  });

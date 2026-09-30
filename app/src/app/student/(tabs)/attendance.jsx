import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { studentApi } from '../../../api/student';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate, ymd } from '../../../lib/format';
import { Card } from '../../../components/ui';
import { AsyncView, Badge, ErrorView, SectionTitle } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { alpha, font, radius, spacing } from '../../../theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Doc §6.5 colours: green P, red A, orange L, yellow HD, blue LV.
function statusMeta(theme) {
  return {
    PRESENT: { short: 'P', label: 'Present', color: theme.success },
    ABSENT: { short: 'A', label: 'Absent', color: theme.danger },
    LATE: { short: 'L', label: 'Late', color: '#F97316' },
    HALF_DAY: { short: 'HD', label: 'Half day', color: '#EAB308' },
    LEAVE: { short: 'LV', label: 'Leave', color: '#3B82F6' },
  };
}

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function Ring({ percent, size = 132, stroke = 12 }) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent || 0));
  const color = p >= 75 ? theme.success : p >= 60 ? theme.warning : theme.danger;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.surfaceAlt} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p / 100)}
        />
      </Svg>
      <Text style={{ fontSize: font.xxl, fontWeight: '800', color: theme.text }}>{p}%</Text>
      <Text style={{ fontSize: font.xs, color: theme.textMuted }}>present</Text>
    </View>
  );
}

export default function Attendance() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const meta = statusMeta(theme);
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [picked, setPicked] = useState(null);
  const month = monthKey(cursor);

  const summary = useAsync(() => studentApi.attendanceSummary(), [], { refetchOnFocus: true });
  const monthly = useAsync(() => studentApi.attendanceMonthly(month), [month]);

  const byDate = useMemo(() => new Map((monthly.data?.days || []).map((d) => [d.date, d])), [monthly.data]);

  // Monday-first grid of the visible month (null = padding cell).
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const pad = (first.getDay() + 6) % 7;
    const out = Array(pad).fill(null);
    for (let d = 1; d <= days; d += 1) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const shift = (n) => {
    setPicked(null);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  };
  const isFutureMonth = monthKey(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) > monthKey(new Date());
  const todayStr = ymd();

  const overall = summary.data?.overall;
  const pickedRow = picked ? byDate.get(picked) : null;

  return (
    <RefreshableScroll
      onRefresh={() => Promise.all([summary.reload({ silent: true }), monthly.reload({ silent: true })])}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110, flexGrow: 1 }}
    >
      {summary.loading && !summary.data ? (
        <SkeletonCards count={2} padded={false} />
      ) : summary.error && !summary.data ? (
        <ErrorView error={summary.error} onRetry={summary.reload} />
      ) : (
        <Card style={styles.summary}>
          <Ring percent={overall?.presentPercentage} />
          <View style={{ flex: 1, gap: 6 }}>
            {Object.entries(meta).map(([k, m]) => (
              <View key={k} style={styles.countRow}>
                <View style={[styles.dot, { backgroundColor: m.color }]} />
                <Text style={styles.countLabel}>{m.label}</Text>
                <Text style={styles.countValue}>{overall?.[k] ?? 0}</Text>
              </View>
            ))}
            <Text style={styles.muted}>{overall?.total ?? 0} days recorded</Text>
          </View>
        </Card>
      )}

      <SectionTitle title="Monthly calendar" />
      <Card>
        <View style={styles.monthBar}>
          <Pressable onPress={() => shift(-1)} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.primary} />
          </Pressable>
          <Text style={styles.monthTitle}>
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </Text>
          <Pressable onPress={() => shift(1)} hitSlop={10} disabled={isFutureMonth}>
            <Ionicons name="chevron-forward" size={22} color={isFutureMonth ? theme.border : theme.primary} />
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {WEEK.map((w, i) => (
            <Text key={i} style={styles.weekDay}>
              {w}
            </Text>
          ))}
        </View>
        {monthly.error && !monthly.data ? (
          <ErrorView error={monthly.error} onRetry={monthly.reload} />
        ) : (
          <View style={[styles.grid, monthly.loading && { opacity: 0.5 }]}>
            {cells.map((d, i) => {
              if (!d) return <View key={`p${i}`} style={styles.cell} />;
              const key = ymd(d);
              const row = byDate.get(key);
              const m = row ? meta[row.status] : null;
              const active = picked === key;
              return (
                <Pressable key={key} onPress={() => setPicked(active ? null : key)} style={styles.cell}>
                  <View
                    style={[
                      styles.day,
                      m && { backgroundColor: alpha(m.color, theme.isDark ? 0.35 : 0.18) },
                      key === todayStr && { borderWidth: 1.5, borderColor: theme.primary },
                      active && { borderWidth: 2, borderColor: theme.text },
                    ]}
                  >
                    <Text style={[styles.dayNum, m && { color: m.color, fontWeight: '800' }]}>{d.getDate()}</Text>
                    {m ? <Text style={[styles.dayTag, { color: m.color }]}>{m.short}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {picked ? (
          <View style={[styles.pickedBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: font.md, fontWeight: '700', color: theme.text }}>{fmtDate(picked)}</Text>
              {pickedRow ? (
                <Badge
                  label={meta[pickedRow.status]?.label || pickedRow.status}
                  tone={
                    pickedRow.status === 'PRESENT'
                      ? 'success'
                      : pickedRow.status === 'ABSENT'
                      ? 'danger'
                      : pickedRow.status === 'LEAVE'
                      ? 'info'
                      : 'warning'
                  }
                />
              ) : (
                <Badge label="Not marked" tone="muted" />
              )}
            </View>
            {pickedRow?.note ? <Text style={[styles.muted, { marginTop: 4 }]}>{pickedRow.note}</Text> : null}
          </View>
        ) : null}
        {monthly.data?.summary ? (
          <View style={[styles.monthSummaryRow, { borderTopColor: theme.border }]}>
            <Text style={styles.muted}>This Month's Attendance</Text>
            <Text style={{ fontSize: font.sm, fontWeight: '800', color: theme.text }}>
              {monthly.data.summary.presentPercentage}% ({monthly.data.summary.total} days recorded)
            </Text>
          </View>
        ) : null}
      </Card>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
    countRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    dot: { width: 10, height: 10, borderRadius: 5 },
    countLabel: { flex: 1, fontSize: font.md, color: t.text },
    countValue: { fontSize: font.md, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted },
    monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    monthTitle: { fontSize: font.lg, fontWeight: '800', color: t.text },
    weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
    weekDay: { width: `${100 / 7}%`, textAlign: 'center', fontSize: font.xs, fontWeight: '700', color: t.textMuted },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
    day: { flex: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    dayNum: { fontSize: font.md, color: t.text },
    dayTag: { fontSize: 9, fontWeight: '800' },
    pickedBox: { marginTop: spacing.md, borderRadius: radius.md, padding: spacing.md, gap: 2 },
    monthSummaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
  });

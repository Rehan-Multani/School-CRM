import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { principalMiscApi } from '../../../api/principal/misc';
import { useAsync } from '../../../lib/useAsync';
import { Chip, ListRow, StatCard } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { REPORT_CATEGORIES, REPORT_GROUPS, formatINR } from '../../../components/principal/misc/reportCategories';
import { font, radius, spacing } from '../../../theme';

// Web: Principal → Reports (shared SchoolReportsHub): KPI strip + grouped report catalogue.
export default function Reports() {
  const styles = useStyles(makeStyles);
  const [group, setGroup] = useState('All');
  const summary = useAsync(() => principalMiscApi.reportsSummary().then((r) => r?.data || {}), [], { refetchOnFocus: true, cacheKey: 'principal.reports.summary' });
  const s = summary.data;
  const kpi = (key, fmt = (v) => v) => (summary.error && !s ? '—' : s ? fmt(s[key] ?? 0) : '…');
  const list = group === 'All' ? REPORT_CATEGORIES : REPORT_CATEGORIES.filter((c) => c.group === group);

  return (
    <RefreshableScroll onRefresh={() => summary.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
      <Stack.Screen options={{ title: 'Reports' }} />
      <Text style={styles.sub}>Live reports from every module. Open one to filter, search and share it.</Text>
      <View style={styles.grid}>
        <StatCard style={styles.cell} label="Students" value={kpi('studentsCount')} icon="people-outline" />
        <StatCard style={styles.cell} label="Fees collected" value={kpi('totalCollected', formatINR)} icon="cash-outline" color="#D97706" />
        <StatCard style={styles.cell} label="Fees outstanding" value={kpi('totalDue', formatINR)} icon="alert-circle-outline" color="#DC2626" />
        <StatCard style={styles.cell} label="Staff" value={kpi('staffCount')} icon="id-card-outline" color="#6366F1" />
      </View>

      <View style={styles.chips}>
        {REPORT_GROUPS.map((g) => (
          <Chip key={g} label={g} active={group === g} onPress={() => setGroup(g)} />
        ))}
      </View>

      <View style={styles.card}>
        {list.map((c) => {
          const count = c.countKey && s ? s[c.countKey] : undefined;
          return (
            <ListRow
              key={c.id}
              icon={c.icon}
              title={c.label}
              subtitle={`${c.desc}${count !== undefined ? `  ·  ${count} record${count === 1 ? '' : 's'}` : ''}`}
              onPress={() => router.push({ pathname: '/principal/reports/[category]', params: { category: c.id } })}
            />
          );
        })}
      </View>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    sub: { color: t.textMuted, fontSize: font.sm, marginBottom: spacing.md },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
    cell: { width: '47.5%', flexGrow: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    card: { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  });

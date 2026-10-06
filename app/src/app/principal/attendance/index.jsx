import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalMonitoringApi as api } from '../../../api/principal/monitoring';
import { useAsync } from '../../../lib/useAsync';
import { ymd } from '../../../lib/format';
import RefreshableScroll from '../../../components/RefreshableScroll';
import PagedList from '../../../components/PagedList';
import { AsyncView, Badge, DateField, EmptyState, Segmented, SearchBar, SectionTitle } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import { BarList, TrendBars } from '../../../components/principal/monitoring/Charts';
import { KeyValue, Panel, StatGrid } from '../../../components/principal/monitoring/Common';
import { font, spacing } from '../../../theme';

const TABS = [
  { value: 'students', label: 'Students' },
  { value: 'staff', label: 'Staff' },
  { value: 'trends', label: 'Trends' },
];

const rateTone = (v) => (v >= 90 ? 'success' : v >= 75 ? 'warning' : 'danger');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

export default function AttendanceMonitoring() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [tab, setTab] = useState('students');
  const [date, setDate] = useState(ymd());
  const [q, setQ] = useState('');

  const monitor = useAsync(async () => (await api.studentMonitor(date))?.data || null, [date], { refetchOnFocus: true });
  const trend = useAsync(
    async () => (await api.studentReport(daysAgo(30), ymd()))?.data?.trend || [],
    [],
    { refetchOnFocus: true, cacheKey: 'principal.att.trend' },
  );

  const totals = monitor.data?.totals;
  const sections = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = monitor.data?.sections || [];
    return term ? list.filter((s) => s.label.toLowerCase().includes(term)) : list;
  }, [monitor.data, q]);

  const header = (
    <View style={{ paddingTop: spacing.md }}>
      {totals ? (
        <StatGrid
          items={[
            { label: 'Students marked', value: totals.totalStudents, icon: 'people-outline' },
            { label: 'Present', value: totals.present, icon: 'checkmark-circle-outline', color: theme.success },
            { label: 'Absent', value: totals.absent, icon: 'close-circle-outline', color: theme.danger },
            { label: 'Attendance rate', value: `${totals.presentRate}%`, icon: 'pie-chart-outline', color: theme.warning },
          ]}
        />
      ) : null}
      <Segmented options={TABS} value={tab} onChange={setTab} />
      <View style={{ height: spacing.lg }} />
    </View>
  );

  if (tab === 'staff') {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: 'Attendance' }} />
        <PagedList
          skeleton={<SkeletonCards padded={false} />}
          cacheKey="principal.att.staff"
          fetchPage={async (page) => {
            const r = await api.staffAttendance({ page, limit: 30 });
            return {
              data: r?.data || [],
              pagination: { page: r?.page || page, totalPages: Math.max(1, Math.ceil((r?.total || 0) / (r?.limit || 30))) },
            };
          }}
          keyExtractor={(x) => String(x.Date)}
          ListHeaderComponent={header}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No staff attendance records" />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.title}>{item.Date}</Text>
                <Text style={styles.muted}>{item['Attendance %']}</Text>
              </View>
              <Text style={styles.muted}>Staff marked: {item['Staff Marked']}</Text>
              <View style={styles.chips}>
                <Badge label={`Present ${item.Present}`} tone="success" />
                <Badge label={`Absent ${item.Absent}`} tone="danger" />
                <Badge label={`Leave ${item['On Leave']}`} tone="info" />
                <Badge label={`Half day ${item['Half Day']}`} tone="warning" />
              </View>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <RefreshableScroll
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110 }}
      onRefresh={() => Promise.all([monitor.reload({ silent: true }), trend.reload({ silent: true })])}
    >
      <Stack.Screen options={{ title: 'Attendance' }} />
      {header}
      {tab === 'students' ? (
        <>
          <DateField label="Roll-call date" value={date} onChange={setDate} maximumDate={new Date()} />
          <AsyncView state={monitor} skeleton={<SkeletonCards padded={false} />}>
            {(data) =>
              !data?.marked ? (
                <EmptyState
                  icon="calendar-outline"
                  title="Nothing marked"
                  message={`No section has been marked for ${date} yet. Roll call is captured by the School Admin.`}
                />
              ) : (
                <>
                  <SearchBar value={q} onChangeText={setQ} placeholder="Search class or section" style={{ marginBottom: spacing.md }} />
                  {sections.length === 0 ? (
                    <EmptyState icon="search-outline" title="No matching sections" />
                  ) : (
                    sections.map((s) => (
                      <View key={s.sectionId || s.label} style={styles.card}>
                        <View style={styles.row}>
                          <Text style={styles.title}>{s.label}</Text>
                          <Badge label={`${s.presentRate}%`} tone={rateTone(s.presentRate)} />
                        </View>
                        <Text style={styles.muted}>{s.total} students</Text>
                        <View style={styles.chips}>
                          <Badge label={`Present ${s.present}`} tone="success" />
                          <Badge label={`Absent ${s.absent}`} tone="danger" />
                          {s.breakdown?.LATE ? <Badge label={`Late ${s.breakdown.LATE}`} tone="warning" /> : null}
                          {s.breakdown?.HALF_DAY ? <Badge label={`Half day ${s.breakdown.HALF_DAY}`} tone="warning" /> : null}
                          {s.breakdown?.LEAVE ? <Badge label={`Leave ${s.breakdown.LEAVE}`} tone="info" /> : null}
                        </View>
                      </View>
                    ))
                  )}
                </>
              )
            }
          </AsyncView>
        </>
      ) : (
        <>
          <AsyncView state={trend} skeleton={<SkeletonCards count={2} padded={false} />}>
            {(rows) => (
              <Panel title="Student attendance rate, last 30 days (%)">
                {rows.length ? (
                  <TrendBars
                    percent
                    color={theme.success}
                    data={rows.map((r) => ({ label: r.date, value: r.attendance }))}
                    format={(v) => `${v}%`}
                  />
                ) : (
                  <Text style={styles.muted}>No attendance history yet.</Text>
                )}
              </Panel>
            )}
          </AsyncView>
          <SectionTitle title="Today at a glance" />
          <Panel>
            <KeyValue label="Sections marked" value={monitor.data?.sections?.length ?? 0} />
            <KeyValue label="Absent students" value={totals?.absent ?? 0} valueColor={theme.danger} />
          </Panel>
          {monitor.data?.marked && monitor.data.sections.length ? (
            <Panel title="Attendance by section (lowest first)">
              <BarList
                percent
                color={theme.primary}
                data={monitor.data.sections
                  .slice()
                  .sort((a, b) => a.presentRate - b.presentRate)
                  .slice(0, 10)
                  .map((s) => ({ label: s.label, value: s.presentRate, text: `${s.presentRate}%` }))}
              />
            </Panel>
          ) : null}
        </>
      )}
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderRadius: 18, borderWidth: 1, borderColor: t.border, padding: spacing.lg, marginBottom: spacing.md, gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    title: { flex: 1, color: t.text, fontSize: font.lg, fontWeight: '800' },
    muted: { color: t.textMuted, fontSize: font.md },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  });

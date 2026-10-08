import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useStyles } from '../../../context/ThemeContext';
import { sectionOptions, useTeacher } from '../../../context/TeacherContext';
import { ymd } from '../../../lib/format';
import { useFreshSession } from '../../../lib/useFreshSession';
import { Button, Card } from '../../../components/ui';
import { DateField, EmptyState, ErrorView, ListRow, Select } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, spacing } from '../../../theme';
import { SkeletonForm } from '../../../components/Skeleton';

// Doc §6.4 step 1 — pick section + date (default today, never future), then
// open the mark sheet. History and the monthly summary hang off here too.
export default function AttendanceHome() {
  const styles = useStyles(makeStyles);
  const { user } = useAuth();
  const { slots, loadSlots } = useTeacher();
  const [error, setError] = useState(null);
  const [sectionId, setSectionId] = useState(null);
  const [date, setDate] = useState(ymd());
  useFreshSession(); // class-teacher sections come from the saved session

  useEffect(() => {
    loadSlots().catch(setError);
  }, [loadSlots]);

  // Class-teacher sections first (the usual attendance owner), then taught ones.
  const options = useMemo(() => {
    const out = new Map();
    for (const s of user?.classTeacherSections || []) {
      out.set(s.sectionId, { value: s.sectionId, label: `${s.className} - ${s.sectionName}`, sub: 'Class teacher' });
    }
    for (const o of sectionOptions(slots)) if (!out.has(o.value)) out.set(o.value, o);
    return [...out.values()];
  }, [slots, user?.classTeacherSections]);

  useEffect(() => {
    if (!sectionId && options.length) setSectionId(options[0].value);
  }, [options, sectionId]);

  const current = options.find((o) => o.value === sectionId);

  const body = () => {
    if (error && !slots) return <ErrorView error={error} onRetry={() => loadSlots(true).then(() => setError(null)).catch(setError)} />;
    if (!slots) return <SkeletonForm fields={2} padded={false} />;
    if (!options.length) {
      return <EmptyState icon="people-outline" title="No sections assigned" message="Attendance opens once you are assigned to a section." />;
    }
    return (
      <>
        <Card>
          <Select label="Section" value={sectionId} options={options} onChange={setSectionId} />
          <DateField label="Date" value={date} onChange={setDate} maximumDate={new Date()} />
          <Button
            title="Open attendance sheet"
            icon="checkmark-done-outline"
            disabled={!sectionId}
            onPress={() =>
              router.push({ pathname: '/teacher/attendance/mark', params: { sectionId, date, title: current?.label || '' } })
            }
          />
        </Card>
        <Text style={styles.h}>Reports</Text>
        <Card style={{ paddingVertical: 0 }}>
          <ListRow
            icon="time-outline"
            title="Attendance history"
            subtitle="Every day you have marked"
            onPress={() => router.push({ pathname: '/teacher/attendance/history', params: { sectionId } })}
          />
          <ListRow
            icon="stats-chart-outline"
            title="Monthly summary"
            subtitle={current ? current.label : 'Pick a section'}
            disabled={!sectionId}
            onPress={() => router.push({ pathname: '/teacher/attendance/summary', params: { sectionId, title: current?.label || '' } })}
          />
        </Card>
      </>
    );
  };

  return (
    <RefreshableScroll
      onRefresh={() => loadSlots(true).catch(setError)}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110, flexGrow: 1 }}
    >
      {body()}
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    h: { fontSize: font.lg, fontWeight: '800', color: t.text, marginTop: spacing.xl, marginBottom: spacing.md },
  });

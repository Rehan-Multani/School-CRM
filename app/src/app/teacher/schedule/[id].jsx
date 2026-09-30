import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { DAY_LABELS, fmtHM, withPrefix } from '../../../lib/format';
import { Button, Card } from '../../../components/ui';
import { AsyncView, Badge } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, spacing } from '../../../theme';
import { SkeletonCards } from '../../../components/Skeleton';

// One timetable period, with shortcuts into that section.
export default function ScheduleEntry() {
  const { id } = useLocalSearchParams();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => teacherApi.scheduleEntry(id), [id]);
  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonCards count={1} padded={false} />}>
        {(p) => (
          <>
            <Card>
              <Badge label={`PERIOD ${p.periodNumber}`} />
              <Text style={styles.title}>{p.subjectName || 'Period'}</Text>
              <Text style={styles.muted}>
                {p.className}-{p.sectionName}
                {p.room ? ` · ${withPrefix('Room', p.room)}` : ''}
              </Text>
              <Text style={styles.time}>
                {DAY_LABELS[p.day] || p.day} · {fmtHM(p.startTime)} – {fmtHM(p.endTime)}
              </Text>
            </Card>
            {p.sectionId ? (
              <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
                <Button
                  title="Mark attendance"
                  icon="checkmark-done-outline"
                  onPress={() => router.push({ pathname: '/teacher/attendance/mark', params: { sectionId: p.sectionId, title: `${p.className} - ${p.sectionName}` } })}
                />
                <Button
                  title="View students"
                  icon="people-outline"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/teacher/section/[sectionId]', params: { sectionId: p.sectionId, title: `${p.className} - ${p.sectionName}` } })}
                />
              </View>
            ) : null}
          </>
        )}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    title: { fontSize: font.xxl, fontWeight: '800', color: t.text, marginTop: spacing.sm },
    muted: { fontSize: font.md, color: t.textMuted, marginTop: 4 },
    time: { fontSize: font.lg, color: t.text, marginTop: spacing.md, fontWeight: '700' },
  });

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useStyles, useTheme } from '../../../../context/ThemeContext';
import { principalExamsApi } from '../../../../api/principal/exams';
import { useAsync } from '../../../../lib/useAsync';
import { fmtDate } from '../../../../lib/format';
import { confirm, showError, toast } from '../../../../lib/notify';
import { Button, Card } from '../../../../components/ui';
import { AsyncView, ListRow, SectionTitle, StatusBadge } from '../../../../components/kit';
import RefreshableScroll from '../../../../components/RefreshableScroll';
import { typeLabel } from '../../../../components/principal/exams/constants';
import { font, spacing } from '../../../../theme';

// One exam: summary + publish / edit / delete, and links to its four workflows.
export default function ExamHub() {
  const { examId, name } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [busy, setBusy] = useState(false);
  const state = useAsync(() => principalExamsApi.get(examId), [examId], { refetchOnFocus: true });

  const go = (path, params = {}) => router.push({ pathname: path, params: { examId, ...params } });

  const publish = async (exam) => {
    const ok = await confirm(
      'Publish results?',
      'Results go live in the Student and Parent apps and families are notified.',
      { confirmText: 'Publish' },
    );
    if (!ok) return;
    setBusy(true);
    try {
      await principalExamsApi.update(exam.id, { status: 'PUBLISHED' });
      toast.success('Results published to Student and Parent portals');
      await state.reload({ silent: true });
    } catch (e) {
      showError(e, 'Could not publish results');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (exam) => {
    const ok = await confirm(
      'Delete examination?',
      `"${exam.name}" and all its subjects, timetable, marks and results will be permanently removed.`,
      { confirmText: 'Delete', destructive: true },
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await principalExamsApi.remove(exam.id);
      toast.success(res?.message || 'Exam term removed');
      router.back();
    } catch (e) {
      showError(e, 'Could not delete exam');
      setBusy(false);
    }
  };

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
      <Stack.Screen options={{ title: state.data?.data?.name || (name ? String(name) : 'Examination') }} />
      <AsyncView state={state}>
        {(res) => {
          const exam = res?.data;
          if (!exam) return <Text style={{ color: theme.textMuted }}>Exam not found.</Text>;
          return (
            <>
              <Card>
                <View style={styles.head}>
                  <Text style={styles.name}>{exam.name}</Text>
                  <StatusBadge status={exam.status} />
                </View>
                <Text style={styles.meta}>{typeLabel(exam.examType)} · {exam.session}</Text>
                <Text style={styles.meta}>{fmtDate(exam.startDate)} – {fmtDate(exam.endDate)}</Text>
                <Text style={styles.classes}>{exam.classes?.map((c) => c.name).join(', ') || 'All classes'}</Text>
                {exam.description ? <Text style={[styles.meta, { marginTop: spacing.sm }]}>{exam.description}</Text> : null}
                <View style={{ marginTop: spacing.md }}>
                  {exam.status !== 'PUBLISHED' ? (
                    <Button title="Publish results to portals" icon="send-outline" loading={busy} onPress={() => publish(exam)} />
                  ) : (
                    <Text style={{ color: theme.success, fontWeight: '700', fontSize: font.md }}>Live in Student and Parent portals</Text>
                  )}
                </View>
              </Card>

              <SectionTitle title="Set up and run" />
              <Card style={{ paddingVertical: 0 }}>
                <ListRow icon="library-outline" title="1. Exam subjects" subtitle="Max and passing marks per class" onPress={() => go('/principal/exams/[examId]/subjects')} />
                <ListRow icon="calendar-outline" title="2. Exam schedule" subtitle="Dates, time slots, rooms, invigilators" onPress={() => go('/principal/exams/[examId]/schedule')} />
                <ListRow icon="create-outline" title="3. Marks entry" subtitle="Enter marks class, section and subject wise" onPress={() => go('/principal/exams/[examId]/marks')} />
                <ListRow icon="ribbon-outline" title="4. Results and report cards" subtitle="Compute results, ranks, student report cards" onPress={() => go('/principal/exams/[examId]/results')} />
              </Card>

              <SectionTitle title="Manage" />
              <Card style={{ paddingVertical: 0 }}>
                <ListRow icon="pencil-outline" title="Edit examination" onPress={() => router.push({ pathname: '/principal/exams/form', params: { examId } })} />
                <ListRow icon="trash-outline" iconColor={theme.danger} title="Delete examination" subtitle="Removes subjects, timetable, marks and results" onPress={() => remove(exam)} />
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
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
    name: { flex: 1, fontSize: font.xl, fontWeight: '800', color: t.text },
    meta: { fontSize: font.sm, color: t.textMuted, marginTop: 4 },
    classes: { fontSize: font.sm, color: t.text, marginTop: spacing.sm, fontWeight: '600' },
  });

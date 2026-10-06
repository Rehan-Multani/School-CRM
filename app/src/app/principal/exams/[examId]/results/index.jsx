import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useStyles } from '../../../../../context/ThemeContext';
import { principalExamsApi } from '../../../../../api/principal/exams';
import { useAsync } from '../../../../../lib/useAsync';
import { confirm, showError, toast } from '../../../../../lib/notify';
import { Button, Card } from '../../../../../components/ui';
import { Badge, EmptyState, ErrorView, ListRow, Select } from '../../../../../components/kit';
import RefreshableScroll from '../../../../../components/RefreshableScroll';
import { SkeletonList } from '../../../../../components/Skeleton';
import { rows } from '../../../../../components/principal/exams/constants';
import { font, spacing } from '../../../../../theme';

const ALL = '__all__';
const outcomeTone = (r) => (r === 'PASS' ? 'success' : r === 'COMPARTMENT' ? 'warning' : 'danger');

// Results of one exam per class / section, "Compute final results", and a
// tap-through to each student's report card.
export default function ExamResults() {
  const { examId } = useLocalSearchParams();
  const styles = useStyles(makeStyles);
  const exam = useAsync(() => principalExamsApi.get(examId), [examId]);
  const [classSel, setClassSel] = useState('');
  const [sectionSel, setSectionSel] = useState(ALL);
  const [sections, setSections] = useState({});
  const [calculating, setCalculating] = useState(false);

  const classes = exam.data?.data?.classes;
  const classId = classSel || classes?.[0]?.id || '';

  useEffect(() => {
    if (!classId || sections[classId]) return undefined;
    let live = true;
    principalExamsApi
      .sections(classId)
      .then((r) => live && setSections((s) => ({ ...s, [classId]: rows(r) })))
      .catch(() => live && setSections((s) => ({ ...s, [classId]: [] })));
    return () => {
      live = false;
    };
  }, [classId, sections]);

  const classSections = sections[classId];
  const sectionId = sectionSel !== ALL && classSections?.some((s) => s.id === sectionSel) ? sectionSel : ALL;

  const results = useAsync(
    () =>
      classId
        ? principalExamsApi.results(examId, { classId, sectionId: sectionId === ALL ? undefined : sectionId })
        : Promise.resolve(null),
    [examId, classId, sectionId],
    { refetchOnFocus: true },
  );

  const classOptions = useMemo(() => (classes || []).map((c) => ({ value: c.id, label: c.name })), [classes]);
  const sectionOptions = useMemo(
    () => [{ value: ALL, label: 'All sections' }, ...(classSections || []).map((s) => ({ value: s.id, label: `Section ${s.name}` }))],
    [classSections],
  );

  const calculate = async () => {
    if (!classId || sectionId === ALL) {
      toast.warning('Select a class and a section to compute results');
      return;
    }
    const ok = await confirm('Compute final results?', 'Totals, percentages, grades and ranks are recalculated from the marks entered for this section.', { confirmText: 'Compute' });
    if (!ok) return;
    setCalculating(true);
    try {
      const res = await principalExamsApi.calculateResults(examId, { classId, sectionId });
      toast.success(res?.message || 'Results calculated successfully');
      await results.reload({ silent: true });
    } catch (e) {
      showError(e, 'Could not calculate results');
    } finally {
      setCalculating(false);
    }
  };

  // Previous selection's list stays in `results.data` while the next one loads.
  const list = results.loading || results.error ? null : rows(results.data);

  return (
    <RefreshableScroll onRefresh={() => results.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
      <Stack.Screen options={{ title: 'Results' }} />
      <Select label="Class" value={classId} options={classOptions} onChange={(v) => { setClassSel(v); setSectionSel(ALL); }} disabled={exam.loading} />
      <Select label="Section" value={sectionId} options={sectionOptions} onChange={setSectionSel} />
      <Button title="Compute final results" icon="ribbon-outline" loading={calculating} loadingTitle="Computing..." disabled={sectionId === ALL} onPress={calculate} />
      {sectionId === ALL ? <Text style={styles.hint}>Pick a section to compute results.</Text> : null}
      <View style={{ height: spacing.lg }} />

      {exam.error && !exam.data ? (
        <ErrorView error={exam.error} onRetry={exam.reload} />
      ) : results.error ? (
        <ErrorView error={results.error} onRetry={results.reload} />
      ) : !list ? (
        <SkeletonList count={5} padded={false} />
      ) : !list.length ? (
        <EmptyState icon="ribbon-outline" title="No results computed yet" message="Enter marks, then tap Compute final results to calculate totals, percentage, grade and rank." />
      ) : (
        <Card style={{ paddingVertical: 0 }}>
          {list.map((r) => (
            <ListRow
              key={r.id}
              icon={r.rank > 0 && r.rank <= 3 ? 'trophy-outline' : 'person-outline'}
              iconColor={r.rank === 1 ? '#D97706' : r.rank === 2 ? '#64748B' : r.rank === 3 ? '#C2410C' : undefined}
              title={`${r.rank > 0 ? `#${r.rank}  ` : ''}${r.studentName}`}
              subtitle={`${r.admissionNumber} · ${r.totalMarks}/${r.maxTotalMarks} · ${r.percentage}% · Grade ${r.grade}`}
              right={<Badge label={r.result} tone={outcomeTone(r.result)} />}
              onPress={() =>
                router.push({
                  pathname: '/principal/exams/[examId]/results/[studentId]',
                  params: { examId, studentId: r.studentId, name: r.studentName },
                })
              }
            />
          ))}
        </Card>
      )}
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    hint: { fontSize: font.sm, color: t.textMuted, marginTop: spacing.sm },
  });

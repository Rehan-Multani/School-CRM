import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useStyles, useTheme } from '../../../../../context/ThemeContext';
import { useAuth } from '../../../../../context/AuthContext';
import { principalExamsApi } from '../../../../../api/principal/exams';
import { useAsync } from '../../../../../lib/useAsync';
import { showError } from '../../../../../lib/notify';
import { Button, Card } from '../../../../../components/ui';
import { AsyncView, Badge, SectionTitle } from '../../../../../components/kit';
import RefreshableScroll from '../../../../../components/RefreshableScroll';
import { shareReportCardPdf } from '../../../../../components/principal/exams/reportCardPdf';
import { typeLabel } from '../../../../../components/principal/exams/constants';
import { font, spacing } from '../../../../../theme';

// One student's report card for the exam, with Share / Print as PDF.
export default function ReportCard() {
  const { examId, studentId } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { school } = useAuth();
  const [sharing, setSharing] = useState(false);
  const state = useAsync(() => principalExamsApi.reportCard(examId, studentId), [examId, studentId], { cacheKey: 'principal.reportCard' });

  const share = async (card) => {
    setSharing(true);
    try {
      await shareReportCardPdf({ card, schoolName: school?.name, accent: theme.primary });
    } catch {
      showError({ message: 'Could not create the PDF. Please try again.' }, 'Share failed');
    } finally {
      setSharing(false);
    }
  };

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
      <Stack.Screen options={{ title: 'Report Card' }} />
      <AsyncView state={state}>
        {(res) => {
          const card = res?.data;
          if (!card) return <Text style={{ color: theme.textMuted }}>Report card not available.</Text>;
          const { exam, student, result } = card;
          const passed = result.outcome === 'PASS';
          return (
            <>
              <Card>
                <Text style={styles.school}>{school?.name || 'School'}</Text>
                <Text style={styles.tag}>Academic report and performance evaluation</Text>
                <Text style={styles.exam}>{exam.name} · Session {exam.session}</Text>
                <Text style={styles.meta}>{typeLabel(exam.examType)}</Text>
              </Card>

              <SectionTitle title="Student" />
              <Card>
                <Field label="Name" value={student.name} styles={styles} />
                <Field label="Class and section" value={`${student.className} – ${student.sectionName}`} styles={styles} />
                <Field label="Roll number" value={student.rollNumber} styles={styles} />
                <Field label="Admission no" value={student.admissionNumber} styles={styles} />
                {student.parentName && student.parentName !== '—' ? <Field label="Parent" value={student.parentName} styles={styles} /> : null}
              </Card>

              <SectionTitle title="Subjects" />
              <Card style={{ paddingVertical: spacing.xs }}>
                {(result.subjectResults || []).map((s, i) => (
                  <View key={`${s.subjectName}-${i}`} style={[styles.subRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subName}>{s.subjectName}</Text>
                      <Text style={styles.meta}>Max {s.maxMarks} · Pass {s.passingMarks}</Text>
                    </View>
                    <Text style={styles.obtained}>{s.attendanceStatus === 'PRESENT' ? s.marksObtained : s.attendanceStatus}</Text>
                    <View style={{ width: 28, alignItems: 'center' }}>
                      <Text style={styles.grade}>{s.grade}</Text>
                    </View>
                    <Badge label={s.isPassed ? 'PASS' : 'FAIL'} tone={s.isPassed ? 'success' : 'danger'} />
                  </View>
                ))}
              </Card>

              <SectionTitle title="Summary" />
              <Card>
                <View style={styles.sum}>
                  <Box label="Aggregate" value={`${result.totalMarks}/${result.maxTotalMarks}`} styles={styles} />
                  <Box label="Percentage" value={`${result.percentage}%`} styles={styles} />
                  <Box label="Rank" value={`#${result.rank || '–'}`} styles={styles} />
                  <Box label="Outcome" value={result.outcome} color={passed ? theme.success : theme.danger} styles={styles} />
                </View>
              </Card>

              <View style={{ marginTop: spacing.lg }}>
                <Button title="Share / Print PDF" icon="share-outline" loading={sharing} loadingTitle="Preparing..." onPress={() => share(card)} />
              </View>
            </>
          );
        }}
      </AsyncView>
    </RefreshableScroll>
  );
}

function Field({ label, value, styles }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function Box({ label, value, color, styles }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.boxVal, color && { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    school: { fontSize: font.xl, fontWeight: '800', color: t.primary, textAlign: 'center' },
    tag: { fontSize: font.xs, color: t.textMuted, textAlign: 'center', marginTop: 4, letterSpacing: 0.5 },
    exam: { fontSize: font.md, fontWeight: '700', color: t.text, textAlign: 'center', marginTop: spacing.sm },
    meta: { fontSize: font.sm, color: t.textMuted, marginTop: 2, textAlign: 'left' },
    field: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: spacing.md },
    fieldLabel: { fontSize: font.xs, color: t.textMuted, fontWeight: '700', textTransform: 'uppercase' },
    fieldValue: { fontSize: font.md, color: t.text, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
    subRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
    subName: { fontSize: font.md, fontWeight: '700', color: t.text },
    obtained: { fontSize: font.lg, fontWeight: '800', color: t.text, minWidth: 40, textAlign: 'right' },
    grade: { fontSize: font.md, fontWeight: '800', color: t.textMuted },
    sum: { flexDirection: 'row', gap: spacing.sm },
    boxVal: { fontSize: font.lg, fontWeight: '800', color: t.text, marginTop: 2 },
  });

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { studentApi } from '../../api/student';
import { useAsync } from '../../lib/useAsync';
import { fmtDate } from '../../lib/format';
import { Card } from '../../components/ui';
import { AsyncView, Badge, EmptyState, ProgressBar, SectionTitle } from '../../components/kit';
import { SkeletonCards } from '../../components/Skeleton';
import SubjectBars from '../../components/student/SubjectBars';
import RefreshableScroll from '../../components/RefreshableScroll';
import { font, spacing } from '../../theme';

// Doc §6.6 — every published exam with its subject-wise chart; tap an exam to
// expand it. Aggregate % across all of them on top.
export default function ReportCard() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => studentApi.reportCard(), []);
  const [open, setOpen] = useState(null);

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
      <AsyncView
        state={state}
        skeleton={<SkeletonCards count={3} padded={false} />}
        empty={{
          when: (d) => !d?.exams?.length,
          view: <EmptyState icon="document-text-outline" title="No results yet" message="Your report card fills up as results are declared." />,
        }}
      >
        {(rc) => {
          const expanded = open ?? rc.exams[rc.exams.length - 1]?.id;
          return (
            <>
              <Card>
                <Text style={styles.kicker}>OVERALL</Text>
                <Text style={styles.big}>{rc.aggregatePercentage}%</Text>
                <Text style={styles.muted}>
                  Across {rc.examCount} exam{rc.examCount === 1 ? '' : 's'}
                </Text>
                <View style={{ marginTop: spacing.md }}>
                  <ProgressBar value={(rc.aggregatePercentage || 0) / 100} />
                </View>
              </Card>
              <SectionTitle title="Exams" />
              {rc.exams.map((e) => {
                const isOpen = expanded === e.id;
                return (
                  <Card key={e.id} style={{ marginBottom: spacing.md }}>
                    <Pressable onPress={() => setOpen(isOpen ? '' : e.id)} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{e.examName}</Text>
                        <Text style={styles.muted}>
                          {fmtDate(e.startDate)} · {e.totalMarks}/{e.maxTotalMarks}
                          {e.grade ? ` · ${e.grade}` : ''}
                        </Text>
                      </View>
                      <Badge label={`${e.percentage}%`} tone={e.resultStatus === 'FAIL' ? 'danger' : 'primary'} />
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
                    </Pressable>
                    {isOpen ? (
                      <View style={{ marginTop: spacing.lg }}>
                        <SubjectBars subjects={e.subjects} />
                      </View>
                    ) : null}
                  </Card>
                );
              })}
            </>
          );
        }}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    kicker: { fontSize: font.xs, fontWeight: '800', color: t.primary, letterSpacing: 1 },
    big: { fontSize: font.xxxl, fontWeight: '800', color: t.text, marginTop: 2 },
    title: { fontSize: font.lg, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
  });

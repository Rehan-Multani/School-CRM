import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { usePortal } from '../../../context/PortalScope';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate, fmtHM, withPrefix } from '../../../lib/format';
import { Button, Card } from '../../../components/ui';
import { AsyncView, Badge, EmptyState, SectionTitle } from '../../../components/kit';
import { SkeletonDetail } from '../../../components/Skeleton';
import { PHASE_TONE } from '../../../components/student/status';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, radius, spacing } from '../../../theme';

export default function ExamDetail() {
  const { api, base, scopeKey } = usePortal();
  const { examId } = useLocalSearchParams();
  const styles = useStyles(makeStyles);
  const state = useAsync(async () => {
    const [exam, schedule] = await Promise.all([api.exam(examId), api.examSchedule(examId)]);
    return { exam, papers: schedule?.papers || [] };
  }, [examId, scopeKey], { cacheKey: 'exam.detail' });

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonDetail padded={false} />}>
        {({ exam, papers }) => (
          <>
            <Card>
              <View style={styles.row}>
                <Text style={styles.title}>{exam.name}</Text>
                {exam.phase ? <Badge label={exam.phase.toUpperCase()} tone={PHASE_TONE[exam.phase]} /> : null}
              </View>
              <Text style={styles.muted}>
                {String(exam.examType || '').replace(/_/g, ' ')} · {fmtDate(exam.startDate)} – {fmtDate(exam.endDate)}
              </Text>
              {exam.description ? <Text style={styles.body}>{exam.description}</Text> : null}
            </Card>

            {exam.resultPublished ? (
              <Button
                title="View my result"
                icon="ribbon-outline"
                onPress={() => router.push(`${base}/results/${exam.id}`)}
                style={{ marginTop: spacing.lg }}
              />
            ) : null}

            <SectionTitle title="Date sheet" />
            {papers.length ? (
              papers.map((p) => (
                <View key={p.id} style={styles.paper}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateDay}>{new Date(p.examDate).getDate()}</Text>
                    <Text style={styles.dateMon}>{new Date(p.examDate).toLocaleString('en', { month: 'short' }).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subject}>{p.subjectName || 'Subject'}</Text>
                    <Text style={styles.muted}>
                      {fmtDate(p.examDate)}
                      {p.startTime ? ` · ${fmtHM(p.startTime)}${p.endTime ? ` – ${fmtHM(p.endTime)}` : ''}` : ''}
                    </Text>
                    <Text style={styles.muted}>
                      Max {p.maxMarks} marks{p.room ? ` · ${withPrefix('Room', p.room)}` : ''}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState icon="calendar-outline" title="Date sheet not published" message="Check back later." />
            )}
          </>
        )}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    title: { flex: 1, fontSize: font.xl, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    body: { fontSize: font.lg, color: t.text, marginTop: spacing.md, lineHeight: 23 },
    paper: { flexDirection: 'row', gap: spacing.md, backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: t.border },
    dateBox: { width: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, backgroundColor: t.primarySoft },
    dateDay: { fontSize: font.xl, fontWeight: '800', color: t.primary },
    dateMon: { fontSize: font.xs, fontWeight: '800', color: t.primary },
    subject: { fontSize: font.md, fontWeight: '800', color: t.text },
  });

import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { usePortal } from '../../../context/PortalScope';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate } from '../../../lib/format';
import { Card } from '../../../components/ui';
import { AsyncView, Badge, EmptyState, ErrorView, SectionTitle, Stat } from '../../../components/kit';
import { SkeletonDetail } from '../../../components/Skeleton';
import SubjectBars from '../../../components/student/SubjectBars';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, spacing } from '../../../theme';

export default function ResultDetail() {
  const { api, scopeKey } = usePortal();
  const { examId } = useLocalSearchParams();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => api.result(examId), [examId, scopeKey], { cacheKey: 'result.detail' });

  // RESULT_NOT_PUBLISHED is an expected state, not an error (doc §6.6).
  if (state.error?.code === 'RESULT_NOT_PUBLISHED') {
    return <EmptyState icon="hourglass-outline" title="Result not declared yet" message="You will see it here once the school publishes it." />;
  }
  if (state.error && !state.data && state.error.status === 404) {
    return <ErrorView error={{ message: 'No result found for you in this exam.' }} onRetry={state.reload} />;
  }

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonDetail padded={false} />}>
        {(r) => (
          <>
            <Card>
              <View style={styles.row}>
                <Text style={styles.title}>{r.examName}</Text>
                {r.resultStatus ? <Badge label={r.resultStatus} tone={r.resultStatus === 'PASS' ? 'success' : 'danger'} /> : null}
              </View>
              <Text style={styles.muted}>
                {String(r.examType || '').replace(/_/g, ' ')}
                {r.startDate ? ` · ${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}` : ''}
              </Text>
            </Card>
            <View style={styles.stats}>
              <Stat icon="stats-chart-outline" label="Percentage" value={`${r.percentage}%`} />
              <Stat icon="calculator-outline" label="Total" value={`${r.totalMarks}/${r.maxTotalMarks}`} />
              <Stat icon="school-outline" label="Grade" value={r.grade || '–'} />
              <Stat icon="trophy-outline" label="Rank" value={r.rank || '–'} />
            </View>
            <SectionTitle title="Subject-wise" />
            <Card>
              <SubjectBars subjects={r.subjects} />
            </Card>
            {r.remarks ? (
              <>
                <SectionTitle title="Remarks" />
                <Card>
                  <Text style={styles.body}>{r.remarks}</Text>
                </Card>
              </>
            ) : null}
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
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 4 },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg },
    body: { fontSize: font.lg, color: t.text, lineHeight: 23 },
  });

import { router } from 'expo-router';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate } from '../../../lib/format';
import { Card } from '../../../components/ui';
import { AsyncView, EmptyState, ListRow, StatusBadge } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { spacing } from '../../../theme';
import { SkeletonList } from '../../../components/Skeleton';

// Exams of the current year that include one of the teacher's classes.
export default function Exams() {
  const state = useAsync(() => teacherApi.exams(), []);
  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
      <AsyncView
        skeleton={<SkeletonList count={5} badge padded={false} />}
        state={state}
        empty={{ when: (d) => !d?.length, view: <EmptyState icon="ribbon-outline" title="No exams yet" message="Exams for your classes will show up here." /> }}
      >
        {(exams) => (
          <Card style={{ paddingVertical: 0 }}>
            {exams.map((e) => (
              <ListRow
                key={e.id}
                icon="ribbon-outline"
                title={e.name}
                subtitle={`${String(e.examType || '').replace(/_/g, ' ')} · ${fmtDate(e.startDate)} – ${fmtDate(e.endDate)}`}
                right={<StatusBadge status={e.status} />}
                onPress={() => router.push({ pathname: '/teacher/exams/[examId]', params: { examId: e.id, name: e.name } })}
              />
            ))}
          </Card>
        )}
      </AsyncView>
    </RefreshableScroll>
  );
}

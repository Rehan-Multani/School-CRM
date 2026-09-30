import { useEffect } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { ErrorView } from '../../../components/kit';
import WorkForm from '../../../components/teacher/WorkForm';
import { SkeletonForm } from '../../../components/Skeleton';

// New assignment, or edit when opened with `?id=`.
export default function AssignmentForm() {
  const { id, sectionId } = useLocalSearchParams();
  const navigation = useNavigation();
  const existing = useAsync(() => (id ? teacherApi.assignment(id) : Promise.resolve(null)), [id]);

  useEffect(() => {
    navigation.setOptions({ title: id ? 'Edit Assignment' : 'New Assignment' });
  }, [navigation, id]);

  if (id && existing.loading) return <SkeletonForm fields={7} />;
  if (id && existing.error) return <ErrorView error={existing.error} onRetry={existing.reload} />;
  return <WorkForm kind="assignment" initial={existing.data} presetSectionId={sectionId} />;
}

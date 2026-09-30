import { useEffect } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { ErrorView } from '../../../components/kit';
import WorkForm from '../../../components/teacher/WorkForm';
import { SkeletonForm } from '../../../components/Skeleton';

// New homework, or edit when opened with `?id=`.
export default function HomeworkForm() {
  const { id, sectionId } = useLocalSearchParams();
  const navigation = useNavigation();
  const existing = useAsync(() => (id ? teacherApi.homework(id) : Promise.resolve(null)), [id]);

  useEffect(() => {
    navigation.setOptions({ title: id ? 'Edit Homework' : 'New Homework' });
  }, [navigation, id]);

  if (id && existing.loading) return <SkeletonForm fields={7} />;
  if (id && existing.error) return <ErrorView error={existing.error} onRetry={existing.reload} />;
  return <WorkForm kind="homework" initial={existing.data} presetSectionId={sectionId} />;
}

import { useLocalSearchParams } from 'expo-router';
import WorkList from '../../../components/teacher/WorkList';

export default function HomeworkList() {
  const { sectionId } = useLocalSearchParams();
  return <WorkList kind="homework" sectionId={sectionId} />;
}

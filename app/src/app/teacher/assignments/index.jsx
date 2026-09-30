import { useLocalSearchParams } from 'expo-router';
import WorkList from '../../../components/teacher/WorkList';

export default function AssignmentList() {
  const { sectionId } = useLocalSearchParams();
  return <WorkList kind="assignment" sectionId={sectionId} />;
}

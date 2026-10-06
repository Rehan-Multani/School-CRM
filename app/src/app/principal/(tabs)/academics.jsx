import { StyleSheet } from 'react-native';
import ModuleList from '../../../components/principal/ModuleList';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { spacing } from '../../../theme';

// Web: Academics (years, classes, subjects, subject assignments, class teachers).
export default function PrincipalAcademics() {
  return (
    <RefreshableScroll contentContainerStyle={styles.page}>
      <ModuleList
        items={[
          { icon: 'calendar-outline', title: 'Academic years', subtitle: 'Sessions, classes and sections per year', href: '/principal/academics/years' },
          { icon: 'layers-outline', title: 'Classes', subtitle: 'Class master list', href: '/principal/academics/classes' },
          { icon: 'book-outline', title: 'Subjects', subtitle: 'Subject master list', href: '/principal/academics/subjects' },
          { icon: 'git-network-outline', title: 'Subject assignments', subtitle: 'Subjects and teachers per section', href: '/principal/academics/subject-assignments' },
          { icon: 'person-circle-outline', title: 'Class teachers', subtitle: 'Class teacher of each section', href: '/principal/academics/class-teachers' },
        ]}
      />
    </RefreshableScroll>
  );
}

const styles = StyleSheet.create({ page: { padding: spacing.lg, paddingBottom: 110 } });

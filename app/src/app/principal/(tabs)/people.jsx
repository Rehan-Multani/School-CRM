import { StyleSheet } from 'react-native';
import ModuleList from '../../../components/principal/ModuleList';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { spacing } from '../../../theme';

// Web: Students, Teachers, Staff Management.
export default function PrincipalPeople() {
  return (
    <RefreshableScroll contentContainerStyle={styles.page}>
      <ModuleList
        items={[
          { icon: 'school-outline', title: 'Students', subtitle: 'Admissions, profiles, status, parent logins', href: '/principal/students' },
          { icon: 'easel-outline', title: 'Teachers', subtitle: 'Faculty directory, login and status', href: '/principal/teachers' },
          { icon: 'people-outline', title: 'Staff', subtitle: 'HR, accountant, librarian, transport accounts', href: '/principal/staff' },
        ]}
      />
    </RefreshableScroll>
  );
}

const styles = StyleSheet.create({ page: { padding: spacing.lg, paddingBottom: 110 } });

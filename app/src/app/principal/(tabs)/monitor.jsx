import { StyleSheet } from 'react-native';
import ModuleList from '../../../components/principal/ModuleList';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { spacing } from '../../../theme';

// Web: Attendance, Examination, Homework, Fee monitoring + Leave approval.
export default function PrincipalMonitor() {
  return (
    <RefreshableScroll contentContainerStyle={styles.page}>
      <ModuleList
        items={[
          { icon: 'checkmark-done-outline', title: 'Attendance', subtitle: 'Student and staff attendance', href: '/principal/attendance' },
          { icon: 'document-text-outline', title: 'Exams', subtitle: 'Schedules, marks, results, report cards', href: '/principal/exams' },
          { icon: 'book-outline', title: 'Homework', subtitle: 'Assigned and submitted work', href: '/principal/homework' },
          { icon: 'cash-outline', title: 'Fees', subtitle: 'Collections, dues and defaulters', href: '/principal/fees' },
          { icon: 'calendar-clear-outline', title: 'Leave approval', subtitle: 'Staff leave requests', href: '/principal/leave' },
        ]}
      />
    </RefreshableScroll>
  );
}

const styles = StyleSheet.create({ page: { padding: spacing.lg, paddingBottom: 110 } });

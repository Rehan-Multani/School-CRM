import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStyles } from '../../../context/ThemeContext';
import { SectionTitle } from '../../../components/kit';
import SchoolHeader from '../../../components/SchoolHeader';
import RefreshableScroll from '../../../components/RefreshableScroll';
import DashboardSummary from '../../../components/principal/DashboardSummary';
import ModuleList from '../../../components/principal/ModuleList';
import { useAuth } from '../../../context/AuthContext';
import { font, spacing } from '../../../theme';

// Home = the web dashboard (DashboardSummary) + a shortcut to every module.
export default function PrincipalHome() {
  const styles = useStyles(makeStyles);
  const { user } = useAuth();
  const summary = useRef(null);

  return (
    <RefreshableScroll onRefresh={() => summary.current?.reload()} contentContainerStyle={{ paddingBottom: 110 }}>
      <SchoolHeader>
        <Text style={styles.hello}>Welcome, {user?.firstName || user?.name || 'Principal'}</Text>
      </SchoolHeader>
      <View style={styles.body}>
        <DashboardSummary ref={summary} />
        <SectionTitle title="Quick access" />
        <ModuleList
          items={[
            { icon: 'school-outline', title: 'Students', subtitle: 'Admissions, profiles, status', href: '/principal/students' },
            { icon: 'easel-outline', title: 'Teachers', subtitle: 'Faculty directory', href: '/principal/teachers' },
            { icon: 'people-outline', title: 'Staff', subtitle: 'HR, accountant, librarian, transport', href: '/principal/staff' },
            { icon: 'checkmark-done-outline', title: 'Attendance', subtitle: 'Daily monitoring', href: '/principal/attendance' },
            { icon: 'document-text-outline', title: 'Exams', subtitle: 'Schedules, marks, results', href: '/principal/exams' },
            { icon: 'cash-outline', title: 'Fees', subtitle: 'Collections and dues', href: '/principal/fees' },
          ]}
        />
      </View>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    body: { padding: spacing.lg },
    hello: { color: t.onPrimary, fontSize: font.md, fontWeight: '600' },
  });

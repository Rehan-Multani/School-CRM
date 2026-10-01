import { Tabs } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { useStudent } from '../../../context/StudentContext';
import { spacing } from '../../../theme';
import Bell from '../../../components/student/Bell';
import HeaderActions from '../../../components/HeaderActions';
import FloatingTabBar from '../../../components/FloatingTabBar';
import { HomeHeaderTitle } from '../../../components/SchoolHeader';

// Doc §5 bottom nav: Home · Academics · Attendance · Notifications · Profile.
// All colors come from the school theme, so an admin-panel change repaints live.
const TABS = [
  { name: 'index', title: 'Home' },
  { name: 'academics', title: 'Academics' },
  { name: 'attendance', title: 'Attendance' },
  { name: 'notifications', title: 'Alerts' },
  { name: 'profile', title: 'Profile' },
];

export default function StudentTabs() {
  const theme = useTheme();
  const { unread } = useStudent();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: theme.onPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerLeftContainerStyle: { paddingLeft: spacing.lg },
        headerRightContainerStyle: { paddingRight: spacing.lg },
        sceneStyle: { backgroundColor: theme.bg },
        tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            headerTitle: t.name === 'index' ? () => <HomeHeaderTitle /> : undefined,
            // Show profile icon and bell on all tabs in top-right.
            headerRight: () => (
              <HeaderActions
                bell={<Bell />}
                showProfile={t.name !== 'profile'}
              />
            ),
            ...(t.name === 'notifications' ? { title: 'Notifications', tabBarLabel: 'Alerts', tabBarBadge: unread } : {}),
          }}
        />
      ))}
    </Tabs>
  );
}

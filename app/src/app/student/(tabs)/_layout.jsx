import { Tabs } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { useStudent } from '../../../context/StudentContext';
import Bell from '../../../components/student/Bell';
import HeaderActions from '../../../components/HeaderActions';
import FloatingTabBar from '../../../components/FloatingTabBar';

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
        headerShadowVisible: false,
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
            // Home paints its own hero header (with its own bell).
            headerShown: t.name !== 'index',
            // Show profile icon and bell on all tabs in top-right.
            headerRight: () => (
              <HeaderActions
                bell={t.name === 'notifications' ? null : <Bell />}
                showProfile={true}
              />
            ),
            ...(t.name === 'notifications' ? { title: 'Notifications', tabBarLabel: 'Alerts', tabBarBadge: unread } : {}),
          }}
        />
      ))}
    </Tabs>
  );
}

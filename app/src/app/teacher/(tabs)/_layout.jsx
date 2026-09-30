import { Tabs } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import Bell from '../../../components/teacher/Bell';
import HeaderActions from '../../../components/HeaderActions';
import FloatingTabBar from '../../../components/FloatingTabBar';

// Doc §5 bottom nav: Home · Classes · Attendance · Inbox · Profile. All colors
// come from the school theme, so an admin-panel change repaints live.
const TABS = [
  { name: 'index', title: 'Home' },
  { name: 'classes', title: 'Classes' },
  { name: 'attendance', title: 'Attendance' },
  { name: 'inbox', title: 'Inbox' },
  { name: 'profile', title: 'Profile' },
];

export default function TeacherTabs() {
  const theme = useTheme();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: theme.onPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.bg },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
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
                bell={<Bell />}
                showProfile={true}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

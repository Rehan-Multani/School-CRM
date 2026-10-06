import { Tabs } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { spacing } from '../../../theme';
import HeaderActions from '../../../components/HeaderActions';
import Bell from '../../../components/principal/Bell';
import FloatingTabBar from '../../../components/FloatingTabBar';
import { HomeHeaderTitle } from '../../../components/SchoolHeader';

// Bottom nav: Home (dashboard) · People (students / teachers / staff) ·
// Academics (years, classes, subjects …) · Monitor (attendance, exams, homework,
// fees, leave) · Profile (account + the rest: meetings, events, reports, safe
// pickup, settings). All colors come from the school theme.
const TABS = [
  { name: 'index', title: 'Home' },
  { name: 'people', title: 'People' },
  { name: 'academics', title: 'Academics' },
  { name: 'monitor', title: 'Monitor' },
  { name: 'profile', title: 'Profile' },
];

export default function PrincipalTabs() {
  const theme = useTheme();
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
            headerRight: () => <HeaderActions bell={<Bell />} showProfile={t.name !== 'profile'} />,
          }}
        />
      ))}
    </Tabs>
  );
}

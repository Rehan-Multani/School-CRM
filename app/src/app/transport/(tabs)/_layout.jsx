import { Tabs } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { spacing } from '../../../theme';
import HeaderActions from '../../../components/HeaderActions';
import FloatingTabBar from '../../../components/FloatingTabBar';
import { HomeHeaderTitle } from '../../../components/SchoolHeader';

// Bottom nav: Home (today's routes) · Fleet (vehicles + drivers) · Profile.
// All colors come from the school theme, so an admin-panel change repaints live.
const TABS = [
  { name: 'index', title: 'Home' },
  { name: 'fleet', title: 'Fleet' },
  { name: 'profile', title: 'Profile' },
];

export default function TransportTabs() {
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
            headerRight: () => <HeaderActions showProfile={t.name !== 'profile'} />,
          }}
        />
      ))}
    </Tabs>
  );
}

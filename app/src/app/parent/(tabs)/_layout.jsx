import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { spacing } from '../../../theme';
import Bell from '../../../components/parent/Bell';
import ChildSwitcher from '../../../components/parent/ChildSwitcher';
import HeaderActions from '../../../components/HeaderActions';
import FloatingTabBar from '../../../components/FloatingTabBar';
import { HomeHeaderTitle } from '../../../components/SchoolHeader';

// Doc 03 §0 bottom nav: Home · Academics · Attendance · Notices · Profile, with
// the child switcher + 🔔 in the app bar. Colors follow the school theme live.
const TABS = [
  { name: 'index', title: 'Home' },
  { name: 'academics', title: 'Academics' },
  { name: 'attendance', title: 'Attendance' },
  { name: 'notices', title: 'Notices' },
  { name: 'profile', title: 'Profile' },
];
// Tabs that show one child's data carry the switcher in the app bar.
const CHILD_TABS = new Set(['academics', 'attendance']);

export default function ParentTabs() {
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
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {CHILD_TABS.has(t.name) ? <ChildSwitcher /> : null}
                <HeaderActions bell={<Bell />} showProfile={t.name !== 'profile'} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../context/ThemeContext';
import { PrincipalProvider } from '../../context/PrincipalContext';
import { principalApi } from '../../api/principal';
import { registerPushToken } from '../../lib/permissions';
import HeaderBack from '../../components/HeaderBack';

// Principal flow = bottom tabs `(tabs)` + pushed screens, one folder per web
// module (students, teachers, staff, academics, attendance, exams, homework,
// fees, leave, meetings, events, reports, notifications, safe-pickup, settings).
// A pushed screen sets its own title with <Stack.Screen options={{ title }} />.
// Every header is painted in the school's live primary color.
export default function PrincipalLayout() {
  const theme = useTheme();

  // After login, hand the device push token to the backend.
  useEffect(() => {
    const t = setTimeout(() => registerPushToken((token) => principalApi.registerDevice(token)), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <PrincipalProvider>
      <StatusBar style={theme.onPrimary === '#FFFFFF' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.primary },
          headerTintColor: theme.onPrimary,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => <HeaderBack home="/principal" />,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile/change-password" options={{ title: 'Change Password' }} />
      </Stack>
    </PrincipalProvider>
  );
}

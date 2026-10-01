import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../context/ThemeContext';
import HeaderBack from '../../components/HeaderBack';
import { transportApi } from '../../api/transport';
import { registerPushToken } from '../../lib/permissions';

// Transport Manager flow = bottom tabs `(tabs)` (Home · Fleet · Profile) + the
// pushed route screen where pickup / drop is recorded. Every header is painted
// in the school's live primary color.
export default function TransportLayout() {
  const theme = useTheme();

  // After login, hand the device push token to the backend — the manager gets
  // no event pushes, but app-update and force-logout notices reach the phone.
  useEffect(() => {
    const t = setTimeout(() => registerPushToken((token) => transportApi.registerDevice(token)), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <StatusBar style={theme.onPrimary === '#FFFFFF' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.primary },
          headerTintColor: theme.onPrimary,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => <HeaderBack home="/transport" />,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="route/[routeId]" options={{ title: 'Route' }} />
        <Stack.Screen name="profile/change-password" options={{ title: 'Change Password' }} />
      </Stack>
    </>
  );
}

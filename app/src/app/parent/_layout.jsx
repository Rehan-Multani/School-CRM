import { useEffect, useMemo } from 'react';
import { Pressable, Text } from 'react-native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../context/ThemeContext';
import { ParentProvider, useParent } from '../../context/ParentContext';
import { PortalScopeProvider } from '../../context/PortalScope';
import { childApi, parentApi } from '../../api/parent';
import { registerPushToken } from '../../lib/permissions';
import HeaderBack from '../../components/HeaderBack';
import NoChildren from '../../components/parent/NoChildren';
import { ErrorView } from '../../components/kit';
import { Loader } from '../../components/ui';

// Parent flow (doc 03) = bottom tabs `(tabs)` + pushed screens. Almost every
// screen shows ONE child: the academics / attendance / fee screens are the
// Student app's screens, pointed at the selected child through the PortalScope
// (read-only, plus Pay Now on fees).
function ParentShell() {
  const theme = useTheme();
  const { child, childrenLoaded, childrenError, reloadChildren, setUnread, refreshUnread } = useParent();
  const childId = child?.childId;

  // Doc §5: after login, hand the device push token to the backend.
  useEffect(() => {
    const t = setTimeout(() => registerPushToken((token, platform) => parentApi.registerDevice(token, platform)), 4000);
    return () => clearTimeout(t);
  }, []);

  const scope = useMemo(
    () => ({
      // Child-scoped reads + the parent-level inbox, under the student method names.
      api: { ...parentApi, ...(childId ? childApi(childId) : {}) },
      base: '/parent',
      readOnly: true,
      canPay: true,
      scopeKey: childId || 'none',
      role: 'PARENT',
      inboxTab: 'notices',
      setUnread,
      refreshUnread,
    }),
    [childId, setUnread, refreshUnread],
  );

  if (!childrenLoaded) {
    return childrenError ? <ErrorView error={childrenError} onRetry={reloadChildren} /> : <Loader />;
  }
  // NO_LINKED_CHILDREN (doc §1): nothing to show until the school links a student.
  if (!child) return <NoChildren />;

  return (
    <PortalScopeProvider value={scope}>
      <StatusBar style={theme.onPrimary === '#FFFFFF' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.primary },
          headerTintColor: theme.onPrimary,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => <HeaderBack home="/parent" />,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="timetable" options={{ title: 'Timetable' }} />
        <Stack.Screen name="homework/index" options={{ title: 'Homework' }} />
        <Stack.Screen name="homework/[id]" options={{ title: 'Homework' }} />
        <Stack.Screen name="classwork/index" options={{ title: 'Classwork' }} />
        <Stack.Screen name="classwork/[id]" options={{ title: 'Classwork' }} />
        <Stack.Screen name="materials/index" options={{ title: 'Study Material' }} />
        <Stack.Screen name="exams/index" options={{ title: 'Exams' }} />
        <Stack.Screen name="exams/[examId]" options={{ title: 'Exam' }} />
        <Stack.Screen name="results/index" options={{ title: 'Results' }} />
        <Stack.Screen name="results/[examId]" options={{ title: 'Result' }} />
        <Stack.Screen name="report-card" options={{ title: 'Report Card' }} />
        <Stack.Screen
          name="fees/index"
          options={{
            title: 'Fees & Payments',
            headerRight: () => (
              <Pressable onPress={() => router.push('/parent/fees/receipts')} hitSlop={10} accessibilityRole="button">
                <Text style={{ color: theme.onPrimary, fontWeight: '700' }}>Receipts</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name="fees/[id]" options={{ title: 'Invoice' }} />
        <Stack.Screen name="fees/receipts" options={{ title: 'Receipts' }} />
        <Stack.Screen name="fees/receipt/[paymentId]" options={{ title: 'Receipt' }} />
        <Stack.Screen name="pickup/index" options={{ title: 'Pickup History' }} />
        <Stack.Screen name="pickup/[sessionId]" options={{ title: 'Pickup' }} />
        <Stack.Screen name="notice/[id]" options={{ title: 'Notice' }} />
        <Stack.Screen name="child" options={{ title: 'Child Profile' }} />
        <Stack.Screen name="profile/edit" options={{ title: 'Edit Profile' }} />
        <Stack.Screen name="profile/settings" options={{ title: 'Notification Settings' }} />
        <Stack.Screen name="profile/change-password" options={{ title: 'Change Password' }} />
      </Stack>
    </PortalScopeProvider>
  );
}

export default function ParentLayout() {
  return (
    <ParentProvider>
      <ParentShell />
    </ParentProvider>
  );
}

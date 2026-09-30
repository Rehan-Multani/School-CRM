import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../context/ThemeContext';
import { StudentProvider } from '../../context/StudentContext';
import { studentApi } from '../../api/student';
import { registerPushToken } from '../../lib/permissions';
import HeaderBack from '../../components/HeaderBack';

// Student flow = bottom tabs `(tabs)` + pushed detail screens. Mostly read-only
// (doc §0): a student can only write homework submissions, leave, own
// phone/address/photo, settings and password. Every header is painted in the
// school's live primary color.
export default function StudentLayout() {
  const theme = useTheme();

  // Doc §4: after login, hand the device push token to the backend.
  useEffect(() => {
    const t = setTimeout(() => registerPushToken((token, platform) => studentApi.registerDevice(token, platform)), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <StudentProvider>
      <StatusBar style={theme.onPrimary === '#FFFFFF' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.primary },
          headerTintColor: theme.onPrimary,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => <HeaderBack home="/student" />,
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
        <Stack.Screen name="fees/index" options={{ title: 'Fees' }} />
        <Stack.Screen name="fees/[id]" options={{ title: 'Invoice' }} />
        <Stack.Screen name="leaves/index" options={{ title: 'My Leaves' }} />
        <Stack.Screen name="leaves/form" options={{ title: 'Apply Leave' }} />
        <Stack.Screen name="notice/[id]" options={{ title: 'Notice' }} />
        <Stack.Screen name="profile/edit" options={{ title: 'Edit Contact' }} />
        <Stack.Screen name="profile/academic" options={{ title: 'Academic Info' }} />
        <Stack.Screen name="profile/documents" options={{ title: 'My Documents' }} />
        <Stack.Screen name="profile/settings" options={{ title: 'Notification Settings' }} />
        <Stack.Screen name="profile/change-password" options={{ title: 'Change Password' }} />
      </Stack>
    </StudentProvider>
  );
}

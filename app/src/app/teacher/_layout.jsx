import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../context/ThemeContext';
import { TeacherProvider } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacher';
import { registerPushToken } from '../../lib/permissions';
import HeaderBack from '../../components/HeaderBack';

// Teacher flow = bottom tabs `(tabs)` + pushed detail screens. Every header is
// painted in the school's live primary color.
export default function TeacherLayout() {
  const theme = useTheme();

  // Doc §6.9: after login, hand the device push token to the backend.
  useEffect(() => {
    const t = setTimeout(() => registerPushToken((token, platform) => teacherApi.registerDevice(token, platform)), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <TeacherProvider>
      <StatusBar style={theme.onPrimary === '#FFFFFF' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.primary },
          headerTintColor: theme.onPrimary,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => <HeaderBack home="/teacher" />,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="timetable" options={{ title: 'My Timetable' }} />
        <Stack.Screen name="schedule/[id]" options={{ title: 'Period' }} />
        <Stack.Screen name="section/[sectionId]" options={{ title: 'Students' }} />
        <Stack.Screen name="student/[studentId]" options={{ title: 'Student' }} />
        <Stack.Screen name="attendance/mark" options={{ title: 'Mark Attendance' }} />
        <Stack.Screen name="attendance/history" options={{ title: 'Attendance History' }} />
        <Stack.Screen name="attendance/summary" options={{ title: 'Monthly Summary' }} />
        <Stack.Screen name="homework/index" options={{ title: 'Homework' }} />
        <Stack.Screen name="homework/form" options={{ title: 'Homework' }} />
        <Stack.Screen name="homework/[id]" options={{ title: 'Homework' }} />
        <Stack.Screen name="assignments/index" options={{ title: 'Assignments' }} />
        <Stack.Screen name="assignments/form" options={{ title: 'Assignment' }} />
        <Stack.Screen name="assignments/[id]" options={{ title: 'Assignment' }} />
        <Stack.Screen name="materials/index" options={{ title: 'Study Materials' }} />
        <Stack.Screen name="materials/new" options={{ title: 'Upload Material' }} />
        <Stack.Screen name="exams/index" options={{ title: 'Exams' }} />
        <Stack.Screen name="exams/[examId]" options={{ title: 'Exam' }} />
        <Stack.Screen name="exams/marks" options={{ title: 'Marks Entry' }} />
        <Stack.Screen name="leaves/index" options={{ title: 'My Leaves' }} />
        <Stack.Screen name="leaves/apply" options={{ title: 'Apply Leave' }} />
        <Stack.Screen name="notice/[id]" options={{ title: 'Notice' }} />
        <Stack.Screen name="messages" options={{ title: 'School Office' }} />
        <Stack.Screen name="profile/edit" options={{ title: 'Edit Profile' }} />
        <Stack.Screen name="profile/change-password" options={{ title: 'Change Password' }} />
        <Stack.Screen name="profile/settings" options={{ title: 'Notification Settings' }} />
        <Stack.Screen name="profile/documents" options={{ title: 'My Documents' }} />
        <Stack.Screen name="pickup/index" options={{ title: 'Safe Pickup' }} />
        <Stack.Screen name="pickup/[sessionId]" options={{ title: 'Pickup Verification', gestureEnabled: false }} />
      </Stack>
    </TeacherProvider>
  );
}

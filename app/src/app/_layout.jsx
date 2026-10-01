import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useEffect } from 'react';
import AnimatedSplash, { SPLASH_MIN_MS } from '../components/AnimatedSplash';
import OfflineBanner from '../components/OfflineBanner';
import SubscriptionBlocked from '../components/SubscriptionBlocked';
import ForcedLogoutNotice from '../components/ForcedLogoutNotice';
import AppUpdateGate from '../components/AppUpdateGate';
import ToastContainer from '../components/Toast';
import ConfirmModalContainer from '../components/ConfirmModal';
import { requestStartupPermissions } from '../lib/permissions';
import { usePushHandling } from '../lib/usePushHandling';

// Keep the native splash up until AnimatedSplash has painted its copy of it.
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { role } = useAuth();
  const theme = useTheme();

  // Each role only ever sees its own route tree; logged-out users only see login.
  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Protected guard={!role}>
          <Stack.Screen name="login" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'TEACHER'}>
          <Stack.Screen name="teacher" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'STUDENT'}>
          <Stack.Screen name="student" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'PARENT'}>
          <Stack.Screen name="parent" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'TRANSPORT'}>
          <Stack.Screen name="transport" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

function Boot() {
  const { booting, role } = useAuth();
  usePushHandling(booting ? null : role);

  // Ask for notification + camera permission once the splash has faded out.
  useEffect(() => {
    if (booting) return undefined;
    const t = setTimeout(() => requestStartupPermissions(), SPLASH_MIN_MS + 600);
    return () => clearTimeout(t);
  }, [booting]);

  return (
    <AnimatedSplash ready={!booting}>
      <RootNavigator />
      <SubscriptionBlocked />
      <ForcedLogoutNotice />
      <AppUpdateGate />
      <OfflineBanner />
      <ToastContainer />
      <ConfirmModalContainer />
    </AnimatedSplash>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <Boot />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

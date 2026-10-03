import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { font, spacing } from '../theme';
import { Button } from './ui';

// Full-screen notice for HTTP 402 (school subscription expired). The user is
// NOT logged out — once the school renews, "Try again" lets them straight in.
export default function SubscriptionBlocked() {
  const { blocked, retryBlocked, logout } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);
  if (!blocked) return null;
  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };
  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name="lock-closed-outline" size={36} color={theme.primary} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>Subscription expired</Text>
      <Text style={[styles.msg, { color: theme.textMuted }]}>{blocked}</Text>
      <Text style={[styles.msg, { color: theme.textMuted }]}>Please contact your school office.</Text>
      <Button title="Try again" icon="refresh" onPress={retryBlocked} style={styles.btn} />
      <Button title="Logout" variant="secondary" onPress={doLogout} loading={loggingOut} loadingTitle="Signing out..." style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, zIndex: 100 },
  icon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontSize: font.xl, fontWeight: '800' },
  msg: { fontSize: font.md, textAlign: 'center', marginTop: spacing.sm },
  btn: { alignSelf: 'stretch', marginTop: spacing.md },
});

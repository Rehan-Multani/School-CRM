import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useStyles, useTheme } from '../context/ThemeContext';
import { font, radius, spacing } from '../theme';
import RefreshableScroll from './RefreshableScroll';
import TopInsetBackdrop from './TopInsetBackdrop';
import { Button, Card } from './ui';
import SchoolHeader from './SchoolHeader';
import DeleteAccountButton from './account/DeleteAccountButton';

// Placeholder home for a flow that is not built yet.
// Already school-themed, so live theme changes can be checked on every role.
export default function ComingSoon({ title }) {
  const { logout } = useAuth();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);
  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <RefreshableScroll underStatusBar contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
        <SchoolHeader />
        <View style={{ padding: spacing.lg, marginTop: -spacing.xl }}>
          <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <Ionicons name="rocket-outline" size={40} color={theme.primary} />
            <Text style={styles.title}>{title} app coming soon</Text>
            <Text style={styles.sub}>We are building this section. Stay tuned!</Text>
          </Card>
          <Button
            title="Sign Out"
            icon="log-out-outline"
            variant="secondary"
            onPress={doLogout}
            loading={loggingOut}
            loadingTitle="Signing out..."
            style={[styles.signOutBtn, { marginTop: spacing.xl }]}
            textStyle={styles.signOutText}
          />
          <DeleteAccountButton style={{ marginTop: spacing.sm }} />
        </View>
      </RefreshableScroll>
      <TopInsetBackdrop color={theme.primary} light={theme.onPrimary === '#FFFFFF'} />
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    title: { fontSize: font.xl, fontWeight: '800', color: t.text, marginTop: spacing.md },
    sub: { fontSize: font.md, color: t.textMuted, marginTop: spacing.xs, textAlign: 'center' },
    signOutBtn: {
      height: 46,
      minHeight: 46,
      borderRadius: radius.md,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    signOutText: {
      fontSize: font.md,
      fontWeight: '600',
      color: t.text,
    },
  });

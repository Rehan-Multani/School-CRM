import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useParent } from '../../context/ParentContext';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { font, spacing } from '../../theme';
import RefreshableScroll from '../RefreshableScroll';
import SchoolHeader from '../SchoolHeader';
import { Button, Card } from '../ui';
import DeleteAccountButton from '../account/DeleteAccountButton';

// Whole-app state when no student is linked to this parent (NO_LINKED_CHILDREN):
// there is nothing child-scoped to show, so offer a re-check and the account exits.
export default function NoChildren() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { reloadChildren } = useParent();
  const [busy, setBusy] = useState(null);

  const run = (name, fn) => async () => {
    setBusy(name);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <RefreshableScroll underStatusBar onRefresh={reloadChildren} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
        <SchoolHeader />
        <View style={{ padding: spacing.lg, marginTop: -spacing.xl }}>
          <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <Ionicons name="people-outline" size={44} color={theme.primary} />
            <Text style={styles.title}>No student linked yet</Text>
            <Text style={styles.sub}>No student is linked to your account. Please contact the school office to link your child.</Text>
          </Card>
          <Button title="Check again" icon="refresh" loading={busy === 'check'} loadingTitle="Checking..." onPress={run('check', reloadChildren)} style={{ marginTop: spacing.lg }} />
          <Button title="Logout" icon="log-out-outline" variant="secondary" loading={busy === 'logout'} loadingTitle="Logging out..." onPress={run('logout', logout)} style={{ marginTop: spacing.md }} />
          <DeleteAccountButton style={{ marginTop: spacing.md }} />
        </View>
      </RefreshableScroll>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    title: { fontSize: font.xl, fontWeight: '800', color: t.text, marginTop: spacing.md, textAlign: 'center' },
    sub: { fontSize: font.md, color: t.textMuted, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 },
  });

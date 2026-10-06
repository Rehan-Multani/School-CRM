import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { fileUrl } from '../../../lib/links';
import { confirm } from '../../../lib/notify';
import { Button, Card } from '../../../components/ui';
import { Avatar, ListRow, SectionTitle } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import DeleteAccountButton from '../../../components/account/DeleteAccountButton';
import ModuleList from '../../../components/principal/ModuleList';
import { font, spacing } from '../../../theme';

// Profile = who is signed in + the web modules that do not fit a tab
// (meetings, events, reports, safe pickup, notifications, settings) + account.
export default function PrincipalProfile() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { user, school, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const doLogout = async () => {
    if (await confirm('Logout?', 'You will need to sign in again to access your account.', { confirmText: 'Logout', destructive: true })) {
      setLoggingOut(true);
      try {
        await logout();
      } finally {
        setLoggingOut(false);
      }
    }
  };

  const rows = [
    { icon: 'mail-outline', label: 'Email', value: user?.email },
    { icon: 'call-outline', label: 'Mobile', value: user?.phone },
    { icon: 'id-card-outline', label: 'Employee ID', value: user?.employeeId },
    { icon: 'business-outline', label: 'School', value: school?.name || user?.schoolName },
  ].filter((r) => r.value);

  return (
    <RefreshableScroll contentContainerStyle={styles.page}>
      <Card style={styles.hero}>
        <Avatar source={fileUrl(user?.photo) || undefined} name={user?.name} size={76} />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.muted}>{user?.designation || 'Principal'}</Text>
      </Card>

      <SectionTitle title="Details" />
      <Card style={{ paddingVertical: spacing.xs }}>
        {rows.map((r) => (
          <ListRow key={r.label} icon={r.icon} title={r.value} subtitle={r.label} />
        ))}
      </Card>

      <SectionTitle title="School" />
      <ModuleList
        items={[
          { icon: 'notifications-outline', title: 'Notifications', subtitle: 'Send and review announcements', href: '/principal/notifications' },
          { icon: 'videocam-outline', title: 'Meetings', subtitle: 'Schedule and minutes', href: '/principal/meetings' },
          { icon: 'sparkles-outline', title: 'Events', subtitle: 'School events calendar', href: '/principal/events' },
          { icon: 'bar-chart-outline', title: 'Reports', subtitle: 'Summaries and exports', href: '/principal/reports' },
          { icon: 'shield-checkmark-outline', title: 'Safe pickup', subtitle: 'Verify and review pickups', href: '/principal/safe-pickup' },
          { icon: 'settings-outline', title: 'Settings', subtitle: 'Your profile and preferences', href: '/principal/settings' },
        ]}
      />

      <SectionTitle title="Account" />
      <Card style={{ paddingVertical: spacing.xs }}>
        <ListRow icon="key-outline" title="Change password" onPress={() => router.push('/principal/profile/change-password')} />
      </Card>

      <Button
        title="Logout"
        icon="log-out-outline"
        variant="outline"
        onPress={doLogout}
        loading={loggingOut}
        loadingTitle="Logging out..."
        style={{ marginTop: spacing.xl }}
        textStyle={{ color: theme.danger }}
      />
      <DeleteAccountButton style={{ marginTop: spacing.lg }} />
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    page: { padding: spacing.lg, paddingBottom: 110 },
    hero: { alignItems: 'center', gap: 4, paddingVertical: spacing.xl },
    name: { fontSize: font.xl, fontWeight: '800', color: t.text, marginTop: spacing.sm },
    muted: { fontSize: font.sm, color: t.textMuted },
  });

import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useAsync } from '../../lib/useAsync';
import { showError } from '../../lib/notify';
import { Card } from '../ui';
import { AsyncView } from '../kit';
import RefreshableScroll from '../RefreshableScroll';
import { font, radius, spacing } from '../../theme';
import { alpha } from '../../theme/colors';
import { SkeletonList } from '../Skeleton';

const PREFS = [
  { key: 'notice', label: 'Notices & Announcements', sub: 'School-wide broadcasts and circulars', icon: 'megaphone-outline', color: '#3B82F6' },
  { key: 'event', label: 'School Events', sub: 'Sports, cultural and academic calendar events', icon: 'calendar-outline', color: '#8B5CF6' },
  { key: 'homework', label: 'Homework & Assignments', sub: 'Submission deadlines and work assigned', icon: 'book-outline', color: '#F59E0B' },
  { key: 'attendance', label: 'Attendance Alerts', sub: 'Daily attendance mark and leave updates', icon: 'checkmark-circle-outline', color: '#10B981' },
  { key: 'exam', label: 'Exams & Date Sheets', sub: 'Exam schedules and hall announcements', icon: 'school-outline', color: '#EC4899' },
  { key: 'result', label: 'Result Declarations', sub: 'Report cards and score publications', icon: 'ribbon-outline', color: '#6366F1' },
  { key: 'leave', label: 'Leave Requests & Approvals', sub: 'Status changes on submitted leaves', icon: 'airplane-outline', color: '#06B6D4' },
  { key: 'fee', label: 'Fee Invoices & Dues', sub: 'Payment receipts and upcoming due reminders', icon: 'wallet-outline', color: '#F97316' },
  { key: 'general', label: 'General Updates', sub: 'System notifications and portal reminders', icon: 'notifications-outline', color: '#64748B' },
];

export default function NotificationSettingsScreen({ load, save }) {
  const theme = useTheme();
  const state = useAsync(() => load(), []);
  const [saving, setSaving] = useState(null);

  const toggle = async (key, value) => {
    const before = state.data;
    state.setData((d) => ({ ...d, notificationPrefs: { ...d.notificationPrefs, [key]: value } }));
    setSaving(key);
    try {
      await save({ [key]: value });
    } catch (e) {
      state.setData(before);
      showError(e, 'Not saved');
    } finally {
      setSaving(null);
    }
  };

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonList count={9} icon={false} padded={false} />}>
        {(d) => (
          <>
            {/* Header info */}
            <View style={styles.headerBox}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Notification Channels</Text>
              <Text style={[styles.headerSub, { color: theme.textMuted }]}>
                Choose which alert categories you want to receive on this mobile device.
              </Text>
            </View>

            <Card style={{ paddingVertical: 0, overflow: 'hidden' }}>
              {PREFS.map((p, idx) => {
                const c = p.color || theme.primary;
                const isChecked = Boolean(d.notificationPrefs?.[p.key]);
                return (
                  <View
                    key={p.key}
                    style={[
                      styles.row,
                      {
                        borderBottomColor: theme.border,
                        borderBottomWidth: idx === PREFS.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={[styles.iconBox, { backgroundColor: alpha(c, theme.isDark ? 0.22 : 0.12) }]}>
                      <Ionicons name={p.icon} size={20} color={c} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: theme.text }]}>{p.label}</Text>
                      <Text style={[styles.rowSub, { color: theme.textMuted }]} numberOfLines={1}>{p.sub}</Text>
                    </View>
                    <Switch
                      value={isChecked}
                      disabled={saving === p.key}
                      onValueChange={(v) => toggle(p.key, v)}
                      trackColor={{ true: theme.primary, false: theme.border }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                );
              })}
            </Card>

            {d.account?.loginEmail ? (
              <View style={styles.loginRow}>
                <Ionicons name="mail-outline" size={14} color={theme.textMuted} />
                <Text style={[styles.loginText, { color: theme.textMuted }]}>Logged in account: {d.account.loginEmail}</Text>
              </View>
            ) : null}
          </>
        )}
      </AsyncView>
    </RefreshableScroll>
  );
}

const styles = StyleSheet.create({
  headerBox: {
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  headerTitle: {
    fontSize: font.md,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: font.xs,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: font.md,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingHorizontal: 4,
  },
  loginText: {
    fontSize: font.xs,
    fontWeight: '500',
  },
});

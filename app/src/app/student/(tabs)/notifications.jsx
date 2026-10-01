import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { usePortal } from '../../../context/PortalScope';
import { fmtDate, fmtDateTime, fmtTime } from '../../../lib/format';
import { showError, toast } from '../../../lib/notify';
import PagedList from '../../../components/PagedList';
import { Badge, Chip, EmptyState, ListRow, Segmented } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import { alpha, font, radius, spacing } from '../../../theme';
import { openNotificationLink } from '../../../lib/pushRouting';

function ReadAllLink({ onPress }) {
  const theme = useTheme();
  return (
    <View style={stylesStatic.readAllWrap}>
      <View>
        <Text style={[stylesStatic.sectionTitle, { color: theme.text }]}>Recent Alerts</Text>
        <Text style={[stylesStatic.sectionSub, { color: theme.textMuted }]}>School updates & personal notices</Text>
      </View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          stylesStatic.markAllBtn,
          { backgroundColor: alpha(theme.primary, 0.1), borderColor: alpha(theme.primary, 0.2) },
          pressed && { opacity: 0.75 },
        ]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Mark all as read"
      >
        <Ionicons name="checkmark-done" size={14} color={theme.primary} />
        <Text style={[stylesStatic.markAllText, { color: theme.primary }]}>Mark all read</Text>
      </Pressable>
    </View>
  );
}

function getNotificationMeta(title = '', body = '', theme) {
  const text = `${title} ${body}`.toLowerCase();
  if (text.includes('attendance')) {
    return { icon: 'calendar-outline', color: theme.warning || '#f59e0b' };
  }
  if (text.includes('exam') || text.includes('mark') || text.includes('result')) {
    return { icon: 'school-outline', color: '#8b5cf6' };
  }
  if (text.includes('homework') || text.includes('assignment')) {
    return { icon: 'document-text-outline', color: theme.info || '#3b82f6' };
  }
  if (text.includes('fee') || text.includes('fee payment')) {
    return { icon: 'cash-outline', color: theme.success || '#10b981' };
  }
  if (text.includes('timetable') || text.includes('schedule') || text.includes('period')) {
    return { icon: 'time-outline', color: '#06b6d4' };
  }
  return { icon: 'notifications-outline', color: theme.primary };
}

// Tap marks one read; the tab badge / bell stay in sync via the role context.
function Notifications() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { api, role, setUnread, refreshUnread } = usePortal();
  const list = useRef(null);

  const markAll = async () => {
    try {
      await api.markAllNotificationsRead();
      list.current?.update((items) => items.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
      toast.success('All marked as read');
    } catch (e) {
      showError(e);
    }
  };

  const open = async (n) => {
    // Deep link (homework, leave, result…) opens that screen; read or not.
    if (n.link?.type) openNotificationLink(role, n.link);
    if (n.isRead) return;
    list.current?.update((items) => items.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    try {
      await api.markNotificationRead(n.id);
    } catch {
      // badge re-syncs below either way
    } finally {
      refreshUnread();
    }
  };

  return (
    <PagedList
      ref={list}
      fetchPage={(page) => api.notifications({ page, limit: 20 })}
      ListHeaderComponent={<ReadAllLink onPress={markAll} />}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110, flexGrow: 1 }}
      ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="You're all caught up" subtitle="No new alerts right now" />}
      renderItem={({ item }) => {
        const meta = getNotificationMeta(item.title, item.body, theme);
        const unread = !item.isRead;

        return (
          <Pressable
            onPress={() => open(item)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: unread
                  ? (theme.isDark ? alpha(theme.primary, 0.16) : '#F4F7FF')
                  : theme.surface,
                borderColor: unread
                  ? alpha(theme.primary, 0.35)
                  : theme.border,
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
            ]}
            accessibilityRole="button"
          >
            <View style={[styles.iconBox, { backgroundColor: alpha(meta.color, theme.isDark ? 0.22 : 0.12) }]}>
              <Ionicons name={meta.icon} size={22} color={meta.color} />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.headerRow}>
                <Text style={[styles.cardTitle, unread && styles.unreadTitle, { color: theme.text }]} numberOfLines={2}>
                  {item.title}
                </Text>

                {unread && (
                  <View style={[styles.newBadge, { backgroundColor: alpha(theme.primary, 0.15) }]}>
                    <View style={[styles.newDot, { backgroundColor: theme.primary }]} />
                    <Text style={[styles.newText, { color: theme.primary }]}>New</Text>
                  </View>
                )}
              </View>

              {item.body ? (
                <Text style={[styles.cardBody, { color: unread ? theme.text : theme.textMuted }]} numberOfLines={3}>
                  {item.body}
                </Text>
              ) : null}

              <View style={styles.footerRow}>
                <Ionicons name="time-outline" size={13} color={theme.textMuted} />
                <Text style={[styles.time, { color: theme.textMuted }]}>{fmtDateTime(item.createdAt)}</Text>
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

// Opening a notice marks it read (on the detail screen).
function Notices() {
  const { api, base } = usePortal();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const list = useRef(null);
  const markAll = async () => {
    try {
      await api.markAllNoticesRead();
      list.current?.update((items) => items.map((n) => ({ ...n, isRead: true })));
      toast.success('All notices marked read');
    } catch (e) {
      showError(e);
    }
  };
  return (
    <PagedList
      ref={list}
      fetchPage={(page) => api.notices({ page, limit: 20 })}
      ListHeaderComponent={<ReadAllLink onPress={markAll} />}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110, flexGrow: 1 }}
      ListEmptyComponent={<EmptyState icon="megaphone-outline" title="No notices" subtitle="No announcements posted yet" />}
      renderItem={({ item }) => {
        const unread = !item.isRead;
        return (
          <Pressable
            onPress={() => {
              list.current?.update((items) => items.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
              router.push(`${base}/notice/${item.id}`);
            }}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: unread
                  ? (theme.isDark ? alpha(theme.primary, 0.16) : '#F4F7FF')
                  : theme.surface,
                borderColor: unread
                  ? alpha(theme.primary, 0.35)
                  : theme.border,
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
            ]}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: alpha(item.pinned ? theme.warning || '#f59e0b' : theme.primary, theme.isDark ? 0.22 : 0.12),
                },
              ]}
            >
              <Ionicons
                name={item.pinned ? 'pin' : 'megaphone-outline'}
                size={22}
                color={item.pinned ? theme.warning || '#f59e0b' : theme.primary}
              />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.headerRow}>
                <Text style={[styles.cardTitle, unread && styles.unreadTitle, { color: theme.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.pinned && <Badge label="PINNED" tone="warning" />}
                {unread && !item.pinned && (
                  <View style={[styles.newBadge, { backgroundColor: alpha(theme.primary, 0.15) }]}>
                    <View style={[styles.newDot, { backgroundColor: theme.primary }]} />
                    <Text style={[styles.newText, { color: theme.primary }]}>New</Text>
                  </View>
                )}
              </View>

              <View style={styles.footerRow}>
                <Ionicons name="calendar-outline" size={13} color={theme.textMuted} />
                <Text style={[styles.time, { color: theme.textMuted }]}>
                  {item.publishedByName ? `${item.publishedByName} · ` : ''}
                  {fmtDate(item.publishAt)}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} style={{ alignSelf: 'center' }} />
          </Pressable>
        );
      }}
    />
  );
}

function Events() {
  const { api } = usePortal();
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const [scope, setScope] = useState('upcoming');
  return (
    <PagedList
      deps={[scope]}
      fetchPage={(page) => api.events({ page, limit: 20, scope })}
      skeleton={<SkeletonCards padded={false} />}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110, flexGrow: 1 }}
      ListHeaderComponent={
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md }}>
          <Chip label="Upcoming" active={scope === 'upcoming'} onPress={() => setScope('upcoming')} />
          <Chip label="Past" active={scope === 'past'} onPress={() => setScope('past')} />
        </View>
      }
      ListEmptyComponent={<EmptyState icon="calendar-outline" title={scope === 'past' ? 'No past events' : 'No upcoming events'} />}
      renderItem={({ item }) => {
        const d = new Date(item.startAt);
        return (
          <View style={styles.event}>
            <View style={[styles.dateBox, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.22 : 0.12) }]}>
              <Text style={[styles.day, { color: theme.primary }]}>{d.getDate()}</Text>
              <Text style={[styles.mon, { color: theme.primary }]}>{d.toLocaleString('en', { month: 'short' }).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.muted}>
                {item.allDay ? 'All day' : `${fmtTime(item.startAt)} – ${fmtTime(item.endAt)}`}
                {item.location ? ` · ${item.location}` : ''}
              </Text>
              {item.description ? (
                <Text style={styles.body} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                {item.category ? <Badge label={item.category} /> : null}
                {item.cancelled ? <Badge label="CANCELLED" tone="danger" /> : null}
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}

const TABS = ['notifications', 'notices', 'events'];

export default function StudentNotifications() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const { inboxTab } = usePortal();
  const [tab, setTab] = useState(inboxTab);
  const [seenParam, setSeenParam] = useState(null);

  if (params.tab && params.tab !== seenParam) {
    setSeenParam(params.tab);
    if (TABS.includes(params.tab)) setTab(params.tab);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'notifications', label: 'Alerts' },
            { value: 'notices', label: 'Notices' },
            { value: 'events', label: 'Events' },
          ]}
        />
      </View>
      {tab === 'notifications' ? <Notifications /> : tab === 'notices' ? <Notices /> : <Events />}
    </View>
  );
}

const stylesStatic = StyleSheet.create({
  readAllWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: font.md,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: font.xs,
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  markAllText: {
    fontWeight: '700',
    fontSize: font.xs,
  },
});

const makeStyles = (t) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      borderRadius: 20,
      padding: spacing.md + 2,
      marginBottom: spacing.md,
      borderWidth: 1,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    cardTitle: {
      flex: 1,
      fontSize: font.md,
      fontWeight: '700',
      lineHeight: 21,
    },
    unreadTitle: {
      fontWeight: '900',
    },
    newBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
      marginLeft: 6,
    },
    newDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    newText: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    cardBody: {
      fontSize: font.sm,
      marginTop: 4,
      lineHeight: 19,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: spacing.sm + 2,
    },
    time: {
      fontSize: font.xs,
      fontWeight: '600',
    },
    event: {
      flexDirection: 'row',
      gap: spacing.md,
      backgroundColor: t.surface,
      borderRadius: 18,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    dateBox: {
      width: 52,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    day: { fontSize: font.xl, fontWeight: '800' },
    mon: { fontSize: font.xs, fontWeight: '800' },
    title: { fontSize: font.md, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    body: { fontSize: font.sm, color: t.text, marginTop: 4 },
  });

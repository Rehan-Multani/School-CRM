import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacher';
import { fmtDateTime } from '../../lib/format';
import { showError, toast } from '../../lib/notify';
import PagedList from '../../components/PagedList';
import { EmptyState } from '../../components/kit';
import { alpha, font, radius, spacing } from '../../theme';
import { openNotificationLink } from '../../lib/pushRouting';

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
  if (text.includes('fee') || text.includes('salary') || text.includes('pay')) {
    return { icon: 'cash-outline', color: theme.success || '#10b981' };
  }
  if (text.includes('timetable') || text.includes('schedule') || text.includes('period')) {
    return { icon: 'time-outline', color: '#06b6d4' };
  }
  return { icon: 'notifications-outline', color: theme.primary };
}

export default function Notifications() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation();
  const { setUnread, refreshUnread } = useTeacher();
  const list = useRef(null);

  useEffect(() => {
    const markAll = async () => {
      try {
        await teacherApi.markAllNotificationsRead();
        list.current?.update((items) => items.map((n) => ({ ...n, isRead: true })));
        setUnread(0);
        toast.success('All marked as read');
      } catch (e) {
        showError(e);
      }
    };
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={markAll}
          hitSlop={12}
          style={({ pressed }) => [
            styles.headerMarkBtn,
            { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.25)' },
            pressed && { opacity: 0.75, backgroundColor: 'rgba(255,255,255,0.28)' },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Mark all notifications as read"
        >
          <Ionicons name="checkmark-done" size={14} color={theme.onPrimary} />
          <Text style={[styles.headerMarkText, { color: theme.onPrimary }]}>Mark all read</Text>
        </Pressable>
      ),
    });
  }, [navigation, theme.onPrimary, setUnread, styles]);

  const open = async (n) => {
    // Deep link (homework, leave, result…) opens that screen; read or not.
    if (n.link?.type) openNotificationLink('TEACHER', n.link);
    if (n.isRead) return;
    list.current?.update((items) => items.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    try {
      await teacherApi.markNotificationRead(n.id);
    } finally {
      refreshUnread();
    }
  };

  return (
    <PagedList
      ref={list}
      cacheKey="teacher.notifications"
      fetchPage={(page) => teacherApi.notifications({ page, limit: 20 })}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110, flexGrow: 1 }}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text style={[styles.listHeaderTitle, { color: theme.text }]}>Recent Notifications</Text>
          <Text style={[styles.listHeaderSub, { color: theme.textMuted }]}>
            Updates, period schedules & institutional alerts
          </Text>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="notifications-off-outline"
          title="You're all caught up"
          subtitle="No new notifications at this time"
        />
      }
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
                <Text
                  style={[styles.title, unread && styles.unreadTitle, { color: theme.text }]}
                  numberOfLines={2}
                >
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
                <Text style={[styles.body, { color: unread ? theme.text : theme.textMuted }]} numberOfLines={3}>
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

const makeStyles = (t) =>
  StyleSheet.create({
    headerMarkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.pill,
      borderWidth: 1,
      marginRight: 4,
    },
    headerMarkText: {
      fontWeight: '700',
      fontSize: font.xs,
    },
    listHeader: {
      marginBottom: spacing.md,
      paddingHorizontal: 2,
    },
    listHeaderTitle: {
      fontSize: font.md,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    listHeaderSub: {
      fontSize: font.xs,
      marginTop: 2,
    },
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
    title: {
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
    body: {
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
  });

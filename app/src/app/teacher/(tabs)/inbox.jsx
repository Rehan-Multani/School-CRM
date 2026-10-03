import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate, fmtDateTime, fmtTime } from '../../../lib/format';
import { showError, toast } from '../../../lib/notify';
import PagedList from '../../../components/PagedList';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { Badge, Chip, EmptyState, ErrorView, ListRow, Segmented } from '../../../components/kit';
import { Card } from '../../../components/ui';
import { font, radius, spacing } from '../../../theme';
import { SkeletonList } from '../../../components/Skeleton';

// Doc §6.8 — Notices (unread dot, open = read, mark all), Events
// (Upcoming / Past), Messages (one thread with the school office).
function Notices() {
  const theme = useTheme();
  const list = useRef(null);
  const markAll = async () => {
    try {
      await teacherApi.markAllNoticesRead();
      list.current?.update((items) => items.map((n) => ({ ...n, isRead: true })));
      toast('All notices marked read');
    } catch (e) {
      showError(e);
    }
  };
  return (
    <PagedList
      ref={list}
      cacheKey="teacher.notices"
      fetchPage={(page) => teacherApi.notices({ page, limit: 20 })}
      ListHeaderComponent={
        <Pressable onPress={markAll} style={{ alignSelf: 'flex-end', paddingVertical: spacing.md }} hitSlop={6}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Mark all read</Text>
        </Pressable>
      }
      ListEmptyComponent={<EmptyState icon="megaphone-outline" title="No notices" />}
      renderItem={({ item }) => (
        <ListRow
          icon={item.pinned ? 'pin' : 'megaphone-outline'}
          title={item.title}
          subtitle={`${item.publishedByName ? `${item.publishedByName} · ` : ''}${fmtDate(item.publishAt)}`}
          unread={!item.isRead}
          onPress={() => {
            list.current?.update((items) => items.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
            router.push(`/teacher/notice/${item.id}`);
          }}
        />
      )}
    />
  );
}

function Events() {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const [scope, setScope] = useState('upcoming');
  return (
    <PagedList
      deps={[scope]}
      cacheKey="teacher.events"
      fetchPage={(page) => teacherApi.events({ page, limit: 20, scope })}
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
            <View style={[styles.dateBox, { backgroundColor: theme.primarySoft }]}>
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

function Messages() {
  const state = useAsync(() => teacherApi.conversations(), [], { refetchOnFocus: true, cacheKey: 'teacher.conversations' });
  if (state.loading && !state.data) return <SkeletonList count={1} />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
      <Card style={{ paddingVertical: 0 }}>
        {(state.data || []).map((c) => (
          <ListRow
            key={c.id}
            icon="business-outline"
            title={c.title}
            subtitle={c.lastMessage ? `${c.lastMessage.direction === 'IN' ? 'You: ' : ''}${c.lastMessage.body} · ${fmtDateTime(c.lastMessage.createdAt)}` : 'Send a message to the school office'}
            unread={c.unread > 0}
            right={c.unread ? <Badge label={String(c.unread)} /> : null}
            onPress={() => router.push({ pathname: '/teacher/messages', params: { id: c.id, title: c.title } })}
          />
        ))}
      </Card>
    </RefreshableScroll>
  );
}

export default function Inbox() {
  const [tab, setTab] = useState('notices');
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'notices', label: 'Notices' },
            { value: 'events', label: 'Events' },
            { value: 'messages', label: 'Messages' },
          ]}
        />
      </View>
      {tab === 'notices' ? <Notices /> : tab === 'events' ? <Events /> : <Messages />}
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    event: { flexDirection: 'row', gap: spacing.md, backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: t.border },
    dateBox: { width: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
    day: { fontSize: font.xl, fontWeight: '800' },
    mon: { fontSize: font.xs, fontWeight: '800' },
    title: { fontSize: font.md, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    body: { fontSize: font.sm, color: t.text, marginTop: 4 },
  });

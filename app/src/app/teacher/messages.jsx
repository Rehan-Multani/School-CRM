import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { teacherApi } from '../../api/teacher';
import { fmtDateTime } from '../../lib/format';
import { showError } from '../../lib/notify';
import { pollWhileActive } from '../../lib/foreground';
import { ErrorView } from '../../components/kit';
import { font, radius, spacing } from '../../theme';
import { SkeletonChat } from '../../components/Skeleton';

// Doc §6.8 — chat with the school office. No sockets: poll every 15 s while
// the screen is focused and the app is on screen. Messages capped at 4000
// chars (server enforces too).
const POLL_MS = 15000;
const PAGE = 100;

// The API pages oldest→newest, so the newest messages are on the last page.
// `lastPage` remembers which page that is: a long conversation costs one
// request per poll, not two.
async function fetchLatest(conversationId, lastPage) {
  const res = await teacherApi.messages(conversationId, { page: lastPage.current, limit: PAGE });
  const pages = res?.pagination?.totalPages || 1;
  if (pages === lastPage.current) return res?.data || [];
  lastPage.current = pages;
  const last = await teacherApi.messages(conversationId, { page: pages, limit: PAGE });
  return last?.data || [];
}

const lastId = (rows) => rows?.[rows.length - 1]?.id;

export default function Messages() {
  const { id, title } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const lastPage = useRef(1);
  const listRef = useRef(null);

  useEffect(() => {
    if (title) navigation.setOptions({ title: String(title) });
  }, [navigation, title]);

  const load = useCallback(async () => {
    try {
      const rows = await fetchLatest(id, lastPage);
      // An unchanged poll must not re-render (and re-scroll) the whole chat.
      setItems((prev) => (prev && prev.length === rows.length && lastId(prev) === lastId(rows) ? prev : rows));
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
      return pollWhileActive(load, POLL_MS);
    }, [load]),
  );

  const send = async () => {
    const body = text.trim();
    // The ref closes the gap before `sending` re-renders: a double tap sends once.
    if (!body || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const msg = await teacherApi.sendMessage(id, body);
      setItems((prev) => [...(prev || []), msg]);
      setText('');
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      showError(e, 'Not sent');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (!items && error) return <ErrorView error={error} onRetry={load} />;
  if (!items) return <SkeletonChat />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 44}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={[styles.muted, { textAlign: 'center', marginTop: spacing.xxl }]}>No messages yet. Say hello to the school office.</Text>}
        renderItem={({ item }) => {
          const mine = item.direction === 'IN';
          return (
            <View style={[styles.bubble, mine ? [styles.mine, { backgroundColor: theme.primary }] : styles.theirs]}>
              {!mine && item.fromName ? <Text style={[styles.from, { color: theme.primary }]}>{item.fromName}</Text> : null}
              <Text style={{ color: mine ? theme.onPrimary : theme.text, fontSize: font.md }}>{item.body}</Text>
              <Text style={[styles.time, { color: mine ? theme.onPrimary : theme.textMuted }]}>{fmtDateTime(item.createdAt)}</Text>
            </View>
          );
        }}
      />
      <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          placeholderTextColor={theme.textMuted}
          multiline
          maxLength={4000}
          style={styles.input}
        />
        <Pressable onPress={send} disabled={!text.trim() || sending} hitSlop={6} accessibilityRole="button" accessibilityLabel="Send message" style={[styles.send, { backgroundColor: theme.primary, opacity: !text.trim() || sending ? 0.5 : 1 }]}>
          <Ionicons name="send" size={18} color={theme.onPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    muted: { color: t.textMuted, fontSize: font.sm },
    bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
    mine: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
    theirs: { alignSelf: 'flex-start', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderBottomLeftRadius: 4 },
    from: { fontSize: font.xs, fontWeight: '800', marginBottom: 2 },
    time: { fontSize: 10, opacity: 0.75, marginTop: 4, alignSelf: 'flex-end' },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border },
    input: { flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 21, paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 10, backgroundColor: t.surfaceAlt, color: t.text, fontSize: font.md },
    send: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  });

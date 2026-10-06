import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { principalMiscApi } from '../../../api/principal/misc';
import { useAsync } from '../../../lib/useAsync';
import { fmtDateTime } from '../../../lib/format';
import { showError, toast } from '../../../lib/notify';
import { Button, Input } from '../../../components/ui';
import { AsyncView, Badge, Chip, EmptyState, FieldLabel, Segmented, TextArea } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, radius, spacing } from '../../../theme';

// Web: Principal → Notifications. "Inbox" = notices addressed to principals
// (GET /notifications/inbox); "School" = send a push to chosen audiences + the sent history
// (GET/POST /school-portal/notifications).
const AUDIENCES = [
  { key: 'principal', label: 'Principal' },
  { key: 'accountant', label: 'Accountant' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'student', label: 'Student' },
  { key: 'parent', label: 'Parent' },
  { key: 'hr', label: 'HR' },
  { key: 'librarian', label: 'Librarian' },
  { key: 'transport', label: 'Transport' },
];
const audienceNames = (list = []) => AUDIENCES.filter((a) => list.includes(a.key)).map((a) => a.label).join(', ');

function deliveryNote(item) {
  const d = item.delivery;
  if (!d?.firebaseConfigured) return null;
  if (d.skippedReason) {
    if (/(firebase|push).*not configured/i.test(d.skippedReason)) return null;
    return { tone: 'warning', text: d.skippedReason.replace(/firebase/gi, 'Push service') };
  }
  if (d.success > 0) return { tone: 'success', text: `Sent to ${d.success} device(s)` };
  return { tone: 'danger', text: 'No registered devices matched this audience' };
}

export default function Notifications() {
  const styles = useStyles(makeStyles);
  const [tab, setTab] = useState('inbox');
  const inbox = useAsync(() => principalMiscApi.inbox().then((r) => r?.data || []), [], { refetchOnFocus: true, cacheKey: 'principal.inbox' });
  const school = useAsync(() => principalMiscApi.notifications(), [], { refetchOnFocus: true });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <RefreshableScroll
        onRefresh={() => (tab === 'inbox' ? inbox.reload({ silent: true }) : school.reload({ silent: true }))}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: spacing.lg }}>
          <Segmented
            options={[
              { value: 'inbox', label: 'Inbox' },
              { value: 'school', label: 'Send & history' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        {tab === 'inbox' ? (
          <AsyncView
            state={inbox}
            empty={{
              when: (d) => !d?.length,
              view: <EmptyState icon="notifications-off-outline" title="You're all caught up" message="No notices at the moment." />,
            }}
          >
            {(items) =>
              items.map((n) => (
                <View key={n.id} style={styles.card}>
                  <Text style={styles.title}>{n.title}</Text>
                  {n.body ? <Text style={styles.body}>{n.body}</Text> : null}
                  <Text style={styles.time}>{fmtDateTime(n.createdAt)}</Text>
                </View>
              ))
            }
          </AsyncView>
        ) : (
          <SchoolNotifications state={school} styles={styles} />
        )}
      </RefreshableScroll>
    </KeyboardAvoidingView>
  );
}

function SchoolNotifications({ state, styles }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [picked, setPicked] = useState([]);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const toggle = (k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const send = async () => {
    const e = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!body.trim()) e.body = 'Message is required';
    if (!picked.length) e.audiences = 'Choose at least one audience';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSending(true);
    try {
      const res = await principalMiscApi.sendNotification({ title: title.trim(), body: body.trim(), audiences: picked });
      setTitle('');
      setBody('');
      setPicked([]);
      toast.success(res?.message || 'Notification sent');
      state.reload({ silent: true });
    } catch (err) {
      showError(err, 'Could not send');
    } finally {
      setSending(false);
    }
  };

  const active = Boolean(state.data?.firebaseConfigured);
  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.sectionHead}>Send notification</Text>
        <Text style={styles.note}>
          {active
            ? 'Push service is active. Alerts go to registered devices of the chosen audiences.'
            : 'Push service is inactive. The notification is saved to history only.'}
        </Text>
        <Input label="Title" value={title} onChangeText={setTitle} maxLength={120} error={errors.title} placeholder="Fee reminder, circular, alert..." required />
        <TextArea label="Message" value={body} onChangeText={setBody} maxLength={1000} error={errors.body} placeholder="Write the message" />
        <FieldLabel>Target audience</FieldLabel>
        <View style={styles.chips}>
          {AUDIENCES.map((a) => (
            <Chip key={a.key} label={a.label} active={picked.includes(a.key)} onPress={() => toggle(a.key)} />
          ))}
        </View>
        {errors.audiences ? <Text style={styles.err}>{errors.audiences}</Text> : null}
        <Button title="Send notification" loadingTitle="Sending..." icon="send-outline" loading={sending} onPress={send} style={{ marginTop: spacing.lg }} />
      </View>

      <Text style={styles.sectionOut}>Sent history</Text>
      <AsyncView
        state={state}
        empty={{ when: (d) => !d?.data?.length, view: <EmptyState icon="paper-plane-outline" title="Nothing sent yet" message="Notifications you send will appear here." /> }}
      >
        {(res) =>
          res.data.map((n) => {
            const note = deliveryNote(n);
            return (
              <View key={n.id} style={styles.card}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.body}>{n.body}</Text>
                <Text style={styles.time}>
                  {audienceNames(n.audiences) || 'No audience'}
                  {n.createdAt ? ` · ${fmtDateTime(n.createdAt)}` : ''}
                </Text>
                {note ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <Badge label={note.text} tone={note.tone} />
                  </View>
                ) : null}
              </View>
            );
          })
        }
      </AsyncView>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
    title: { color: t.text, fontSize: font.md, fontWeight: '800' },
    body: { color: t.text, fontSize: font.md, marginTop: 4, lineHeight: 20 },
    time: { color: t.textMuted, fontSize: font.xs, marginTop: spacing.sm, fontWeight: '600' },
    sectionHead: { color: t.text, fontSize: font.lg, fontWeight: '800' },
    sectionOut: { color: t.text, fontSize: font.lg, fontWeight: '800', marginVertical: spacing.md },
    note: { color: t.textMuted, fontSize: font.sm, marginVertical: spacing.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    err: { color: t.danger, fontSize: font.sm, marginTop: spacing.xs },
  });

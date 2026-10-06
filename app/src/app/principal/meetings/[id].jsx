import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { principalMiscApi } from '../../../api/principal/misc';
import { useAsync } from '../../../lib/useAsync';
import { fmtDateTime } from '../../../lib/format';
import { confirm, showError, toast } from '../../../lib/notify';
import { Button } from '../../../components/ui';
import { AsyncView, Badge, TextArea } from '../../../components/kit';
import { SkeletonDetail } from '../../../components/Skeleton';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { MEETING_STATUS_TONE, MEETING_TYPE_LABEL } from '../../../components/principal/misc/meetingUtils';
import { font, radius, spacing } from '../../../theme';

// Web: meeting row actions — edit, mark completed (with minutes), cancel, delete.
function Row({ label, value, styles }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.k}>{label}</Text>
      <Text style={styles.v}>{value}</Text>
    </View>
  );
}

export default function MeetingDetail() {
  const { id } = useLocalSearchParams();
  const styles = useStyles(makeStyles);
  const meeting = useAsync(() => fetchOne(id), [id], { refetchOnFocus: true });
  const [completing, setCompleting] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn, okMsg, leave) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      if (leave) router.back();
      else {
        setCompleting(false);
        meeting.reload({ silent: true });
      }
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const complete = () => run(() => principalMiscApi.setMeetingStatus(id, 'COMPLETED', minutes.trim()), 'Meeting marked completed');
  const cancel = async () => {
    if (await confirm('Cancel meeting?', 'It stays in the list marked cancelled.', { confirmText: 'Cancel meeting', destructive: true })) {
      run(() => principalMiscApi.setMeetingStatus(id, 'CANCELLED'), 'Meeting cancelled');
    }
  };
  const remove = async () => {
    if (await confirm('Delete meeting?', 'This permanently deletes the meeting.', { confirmText: 'Delete', destructive: true })) {
      run(() => principalMiscApi.deleteMeeting(id), 'Meeting deleted', true);
    }
  };

  return (
    <RefreshableScroll onRefresh={() => meeting.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Meeting' }} />
      <AsyncView state={meeting} skeleton={<SkeletonDetail />}>
        {(m) => (
          <View>
            <View style={styles.card}>
              <View style={styles.top}>
                <Text style={styles.title}>{m.title}</Text>
                <Badge label={m.status} tone={MEETING_STATUS_TONE[m.status] || 'muted'} />
              </View>
              <Row styles={styles} label="Type" value={MEETING_TYPE_LABEL[m.type] || m.type} />
              <Row styles={styles} label="Scheduled" value={fmtDateTime(m.scheduledAt)} />
              <Row styles={styles} label="Duration" value={m.durationMin ? `${m.durationMin} min` : ''} />
              <Row styles={styles} label="Mode" value={m.mode === 'ONLINE' ? 'Online' : 'In person'} />
              <Row styles={styles} label="Venue" value={m.venue} />
              <Row styles={styles} label="Meeting link" value={m.meetingLink} />
              <Row styles={styles} label="Participants" value={m.participantsLabel} />
              <Row styles={styles} label="Organizer" value={m.organizerName} />
              <Row styles={styles} label="Agenda" value={m.agenda} />
              <Row styles={styles} label="Minutes" value={m.minutes} />
            </View>

            {m.status === 'SCHEDULED' ? (
              completing ? (
                <View style={styles.card}>
                  <TextArea label="Minutes / outcome (optional)" value={minutes} onChangeText={setMinutes} placeholder="Key decisions and action items" />
                  <Button title="Mark completed" loadingTitle="Saving..." loading={busy} onPress={complete} />
                  <Button title="Back" variant="ghost" onPress={() => setCompleting(false)} style={{ marginTop: spacing.sm }} />
                </View>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <Button title="Edit" variant="outline" icon="create-outline" onPress={() => router.push({ pathname: '/principal/meetings/form', params: { id } })} />
                  <Button
                    title="Mark completed"
                    icon="checkmark-circle-outline"
                    onPress={() => {
                      setMinutes(m.minutes || '');
                      setCompleting(true);
                    }}
                  />
                  <Button title="Cancel meeting" variant="secondary" icon="ban-outline" loading={busy} onPress={cancel} />
                </View>
              )
            ) : null}
            {!completing ? <Button title="Delete" variant="danger" icon="trash-outline" loading={busy} onPress={remove} style={{ marginTop: spacing.sm }} /> : null}
          </View>
        )}
      </AsyncView>
    </RefreshableScroll>
  );
}

function fetchOne(id) {
  return principalMiscApi.meeting(id).then((r) => r?.data);
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
    title: { flex: 1, color: t.text, fontSize: font.lg, fontWeight: '800' },
    row: { paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
    k: { color: t.textMuted, fontSize: font.xs, fontWeight: '700', textTransform: 'uppercase' },
    v: { color: t.text, fontSize: font.md, marginTop: 2 },
  });

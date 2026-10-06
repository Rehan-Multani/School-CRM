import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { principalMiscApi } from '../../../api/principal/misc';
import { useAsync } from '../../../lib/useAsync';
import { useKeyboard } from '../../../lib/useKeyboard';
import { useUnsavedGuard } from '../../../lib/useUnsavedGuard';
import { showError, toast } from '../../../lib/notify';
import { Button, Input } from '../../../components/ui';
import { DateField, ErrorView, Segmented, Select, TextArea } from '../../../components/kit';
import { SkeletonForm } from '../../../components/Skeleton';
import TimeField from '../../../components/principal/misc/TimeField';
import { MEETING_TYPES, MEETING_TYPE_LABEL, joinDateTime, splitDateTime } from '../../../components/principal/misc/meetingUtils';
import { spacing } from '../../../theme';

// Web: "Schedule New Session" / "Edit Meeting" form. `?id=` edits (only SCHEDULED meetings).
const EMPTY = {
  title: '',
  type: 'STAFF',
  date: '',
  time: '',
  durationMin: '30',
  mode: 'IN_PERSON',
  venue: '',
  meetingLink: '',
  participantsLabel: 'All Academic Staff',
  agenda: '',
};
const TYPE_OPTIONS = MEETING_TYPES.map((t) => ({ value: t, label: MEETING_TYPE_LABEL[t] }));

function fromMeeting(m) {
  if (!m) return null;
  const { date, time } = splitDateTime(m.scheduledAt);
  return {
    title: m.title || '',
    type: m.type || 'STAFF',
    date,
    time,
    durationMin: String(m.durationMin || 30),
    mode: m.mode || 'IN_PERSON',
    venue: m.venue || '',
    meetingLink: m.meetingLink || '',
    participantsLabel: m.participantsLabel || '',
    agenda: m.agenda || '',
  };
}

export default function MeetingForm() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const existing = useAsync(() => (id ? principalMiscApi.meeting(id).then((r) => r?.data) : Promise.resolve(null)), [id]);
  const [edits, setEdits] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useUnsavedGuard(dirty && !saving);

  const base = id ? fromMeeting(existing.data) : EMPTY;
  const f = edits || base;

  if (id && !f) {
    if (existing.error) return <ErrorView error={existing.error} onRetry={existing.reload} />;
    return <SkeletonForm />;
  }

  const set = (k) => (v) => {
    setDirty(true);
    setEdits((p) => ({ ...(p || base), [k]: v }));
  };

  const save = async () => {
    const e = {};
    if (!f.title.trim()) e.title = 'Title is required';
    if (!f.date) e.date = 'Pick a date';
    if (!f.time) e.time = 'Pick a time';
    const dur = Number(f.durationMin);
    if (!Number.isFinite(dur) || dur <= 0) e.durationMin = 'Duration must be positive';
    if (f.meetingLink.trim() && !/^https?:\/\//i.test(f.meetingLink.trim())) e.meetingLink = 'Link must start with http(s)://';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const body = {
        title: f.title.trim(),
        type: f.type,
        scheduledAt: joinDateTime(f.date, f.time),
        durationMin: Math.floor(dur),
        mode: f.mode,
        venue: f.venue.trim(),
        meetingLink: f.meetingLink.trim(),
        participantsLabel: f.participantsLabel.trim(),
        agenda: f.agenda.trim(),
      };
      if (id) await principalMiscApi.updateMeeting(id, body);
      else await principalMiscApi.createMeeting(body);
      setDirty(false);
      toast.success(id ? 'Meeting updated' : 'Meeting scheduled');
      router.back();
    } catch (err) {
      showError(err, 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? 'Edit Meeting' : 'Schedule Meeting' }} />
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: Math.max(60, keyboardVisible ? keyboardHeight + 80 : 60) }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Input label="Meeting title" required value={f.title} onChangeText={set('title')} error={errors.title} placeholder="e.g. Annual Syllabus Coverage Review" maxLength={150} />
        <Select label="Meeting category" value={f.type} options={TYPE_OPTIONS} onChange={set('type')} />
        <Input label="Participants" value={f.participantsLabel} onChangeText={set('participantsLabel')} placeholder="e.g. All Academic Staff" maxLength={150} />
        <DateField label="Date" value={f.date} onChange={set('date')} error={errors.date} />
        <TimeField label="Time" value={f.time} onChange={set('time')} error={errors.time} />
        <Input label="Duration (minutes)" value={f.durationMin} onChangeText={(v) => set('durationMin')(v.replace(/\D/g, ''))} keyboardType="number-pad" error={errors.durationMin} maxLength={4} />
        <View style={{ marginBottom: spacing.lg }}>
          <Segmented
            options={[
              { value: 'IN_PERSON', label: 'In person' },
              { value: 'ONLINE', label: 'Online' },
            ]}
            value={f.mode}
            onChange={set('mode')}
          />
        </View>
        <Input label="Venue" value={f.venue} onChangeText={set('venue')} placeholder="e.g. Conference Room" maxLength={150} />
        {f.mode === 'ONLINE' ? (
          <Input label="Meeting link" value={f.meetingLink} onChangeText={set('meetingLink')} placeholder="https://..." autoCapitalize="none" keyboardType="url" error={errors.meetingLink} />
        ) : null}
        <TextArea label="Agenda" value={f.agenda} onChangeText={set('agenda')} placeholder="Points to discuss in this meeting" />
        <Button title={id ? 'Update meeting' : 'Schedule meeting'} loadingTitle="Saving..." loading={saving} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

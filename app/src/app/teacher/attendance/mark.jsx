import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { newIdempotencyKey, teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { useUnsavedGuard } from '../../../lib/useUnsavedGuard';
import { fmtDate } from '../../../lib/format';
import { confirm, showError, toast } from '../../../lib/notify';
import { Button } from '../../../components/ui';
import { Badge, EmptyState, ErrorView } from '../../../components/kit';
import { alpha, font, radius, spacing } from '../../../theme';
import { SkeletonSheet } from '../../../components/Skeleton';

// Doc §6.4 — the mark sheet. Save = POST (first time, Idempotency-Key) or
// PATCH with only the changed rows; Finalize locks the day (read-only after).
const STATUSES = [
  { key: 'PRESENT', short: 'P', tone: 'success' },
  { key: 'ABSENT', short: 'A', tone: 'danger' },
  { key: 'LATE', short: 'L', tone: 'warning' },
  { key: 'HALF_DAY', short: 'HD', tone: 'warning' },
  { key: 'LEAVE', short: 'LV', tone: 'muted' },
];

export default function MarkAttendance() {
  const { sectionId, date, title } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [marks, setMarks] = useState({}); // studentId -> { status, note }
  const [noteFor, setNoteFor] = useState(null);
  const [busy, setBusy] = useState(null); // 'save' | 'finalize'
  const saveKey = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: title ? String(title) : 'Mark Attendance' });
  }, [navigation, title]);

  const sheet = useAsync(() => teacherApi.attendanceSheet(sectionId, date), [sectionId, date]);

  // Reset local edits whenever a fresh sheet arrives.
  useEffect(() => {
    if (!sheet.data) return;
    const m = {};
    for (const e of sheet.data.entries || []) m[e.studentId] = { status: e.status, note: e.note || '' };
    setMarks(m);
  }, [sheet.data]);

  const entries = useMemo(() => sheet.data?.entries || [], [sheet.data]);
  const locked = Boolean(sheet.data?.locked);
  const attendanceId = sheet.data?.attendanceId;

  const original = useMemo(() => {
    const m = {};
    for (const e of entries) m[e.studentId] = { status: e.status, note: e.note || '' };
    return m;
  }, [entries]);

  const changed = useMemo(
    () =>
      entries
        .filter((e) => {
          const a = marks[e.studentId];
          const b = original[e.studentId];
          return a && b && (a.status !== b.status || a.note !== b.note);
        })
        .map((e) => ({ studentId: e.studentId, status: marks[e.studentId].status, note: marks[e.studentId].note })),
    [entries, marks, original],
  );

  // Leaving with un-saved status changes asks first (doc: most important flow).
  useUnsavedGuard(!locked && changed.length > 0 && busy !== 'save', 'Attendance changes are not saved yet. Leave without saving?');

  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0, LEAVE: 0 };
    for (const e of entries) c[marks[e.studentId]?.status || 'PRESENT'] += 1;
    return c;
  }, [entries, marks]);

  // Stable callbacks so a tap re-renders only the row it changed (StudentRow is memoized).
  const setStatus = useCallback(
    (sid, status) => {
      if (locked) return;
      setMarks((m) => ({ ...m, [sid]: { ...(m[sid] || { note: '' }), status } }));
    },
    [locked],
  );
  const setNote = useCallback((sid, note) => {
    setMarks((m) => ({ ...m, [sid]: { ...(m[sid] || { status: 'PRESENT' }), note } }));
  }, []);
  const toggleNote = useCallback((sid) => setNoteFor((cur) => (cur === sid ? null : sid)), []);

  const markAllPresent = () => {
    if (locked) return;
    setMarks((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, status: 'PRESENT' }])));
  };

  const save = async () => {
    const firstSave = !attendanceId;
    if (!firstSave && !changed.length) {
      toast.info('No changes to save');
      return;
    }
    setBusy('save');
    try {
      let doc;
      if (firstSave) {
        // One key per Save tap; reused if the same tap is retried after a network error.
        saveKey.current = saveKey.current || newIdempotencyKey();
        const records = entries.map((e) => ({ studentId: e.studentId, status: marks[e.studentId].status, note: marks[e.studentId].note }));
        doc = await teacherApi.submitAttendance({ sectionId, date, records }, saveKey.current);
      } else {
        doc = await teacherApi.patchAttendance(attendanceId, changed);
      }
      saveKey.current = null;
      toast.success('Attendance saved successfully');
      await sheet.reload({ silent: true });
      return doc;
    } catch (e) {
      if (e.code === 'ATTENDANCE_FINALIZED') await sheet.reload({ silent: true });
      showError(e, 'Could not save attendance');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const finalize = async () => {
    if (!attendanceId || changed.length) {
      showError({ message: 'Save the attendance first, then finalize.' }, 'Not saved yet');
      return;
    }
    const ok = await confirm(
      'Finalize attendance?',
      `Attendance for ${fmtDate(date)} will be locked. You will not be able to change it after this.`,
      { confirmText: 'Finalize', destructive: true },
    );
    if (!ok) return;
    setBusy('finalize');
    try {
      await teacherApi.finalizeAttendance(attendanceId);
      toast.success('Attendance finalized successfully');
      await sheet.reload({ silent: true });
    } catch (e) {
      showError(e, 'Could not finalize attendance');
    } finally {
      setBusy(null);
    }
  };

  if (sheet.loading && !sheet.data) return <SkeletonSheet />;
  if (sheet.error && !sheet.data) return <ErrorView error={sheet.error} onRetry={sheet.reload} />;

  const header = (
    <View style={styles.header}>
      <View style={styles.headRow}>
        <Text style={styles.date}>{fmtDate(date)}</Text>
        {locked ? (
          <Badge label="FINALIZED" icon="lock-closed" tone="muted" />
        ) : attendanceId ? (
          <Badge label="SAVED" tone="success" />
        ) : (
          <Badge label="NOT SAVED" tone="warning" />
        )}
      </View>
      <View style={styles.countRow}>
        {STATUSES.map((s) => (
          <View key={s.key} style={styles.count}>
            <Text style={[styles.countNum, { color: theme[s.tone] || theme.textMuted }]}>{counts[s.key]}</Text>
            <Text style={styles.countLabel}>{s.key === 'HALF_DAY' ? 'Half' : s.key[0] + s.key.slice(1).toLowerCase()}</Text>
          </View>
        ))}
      </View>
      {sheet.data?.markedByName ? <Text style={styles.muted}>Last marked by {sheet.data.markedByName}</Text> : null}
      {!locked && entries.length ? (
        <Pressable onPress={markAllPresent} style={styles.allPresent} hitSlop={6}>
          <Ionicons name="checkmark-circle-outline" size={18} color={theme.primary} />
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Mark all present</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.studentId}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No students" message={sheet.data?.message || 'This section has no active students.'} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}
        // A reload replaces local marks with the server's — only offer it when
        // nothing is unsaved, so a stray pull can't wipe a half-taken roll call.
        onRefresh={changed.length ? undefined : () => sheet.reload({ silent: true })}
        refreshing={false}
        extraData={marks}
        initialNumToRender={12}
        windowSize={7}
        renderItem={({ item }) => {
          const m = marks[item.studentId];
          return (
            <StudentRow
              item={item}
              status={m?.status || 'PRESENT'}
              note={m?.note || ''}
              noteOpen={noteFor === item.studentId}
              locked={locked}
              onStatus={setStatus}
              onToggleNote={toggleNote}
              onNote={setNote}
              styles={styles}
              theme={theme}
            />
          );
        }}
      />
      {!locked && entries.length ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {/* Clear Pre-Submit Summary Bar */}
          <View style={[styles.preSubmitBar, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: theme.success }]}>{counts.PRESENT}</Text>
              <Text style={styles.summaryLbl}>Present</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: theme.danger }]}>{counts.ABSENT}</Text>
              <Text style={styles.summaryLbl}>Absent</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: theme.warning }]}>{counts.LATE}</Text>
              <Text style={styles.summaryLbl}>Late</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: theme.textMuted }]}>{counts.LEAVE}</Text>
              <Text style={styles.summaryLbl}>Leave</Text>
            </View>
          </View>

          <View style={styles.btnRow}>
            <Button
              title={attendanceId ? `Save Changes${changed.length ? ` (${changed.length})` : ''}` : 'Save Attendance'}
              icon="save-outline"
              loading={busy === 'save'}
              loadingTitle="Saving..."
              disabled={Boolean(busy)}
              onPress={save}
              style={{ flex: 1.2 }}
            />
            <Button
              title="Finalize"
              icon="lock-closed-outline"
              variant="secondary"
              loading={busy === 'finalize'}
              loadingTitle="Finalizing..."
              disabled={Boolean(busy) || !attendanceId}
              onPress={finalize}
              style={{ flex: 0.8 }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

// One student card. Memoized: its props only change when THIS student's
// status/note/note-box changes, so marking a 60-student roll stays instant.
const StudentRow = memo(function StudentRow({ item, status, note, noteOpen, locked, onStatus, onToggleNote, onNote, styles, theme }) {
  const sid = item.studentId;
  return (
    <View style={styles.card}>
      <View style={styles.studentRow}>
        <Text style={styles.roll}>{item.rollNumber || '–'}</Text>
        <Text style={styles.student} numberOfLines={1}>
          {item.studentName}
        </Text>
        {!locked ? (
          <Pressable onPress={() => onToggleNote(sid)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add note">
            <Ionicons name={note ? 'chatbox-ellipses' : 'chatbox-ellipses-outline'} size={20} color={note ? theme.primary : theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.chips}>
        {STATUSES.map((s) => {
          const active = status === s.key;
          const c = theme[s.tone] || theme.textMuted;
          return (
            <Pressable
              key={s.key}
              disabled={locked}
              onPress={() => onStatus(sid, s.key)}
              style={({ pressed }) => [
                styles.chip,
                { borderColor: active ? c : theme.border, backgroundColor: active ? c : theme.surfaceAlt },
                pressed && { opacity: 0.8 },
                locked && !active && { opacity: 0.35 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Mark ${s.key.replace('_', ' ').toLowerCase()}`}
            >
              <Text style={{ color: active ? theme.white : theme.text, fontWeight: '800', fontSize: font.md }}>{s.short}</Text>
            </Pressable>
          );
        })}
      </View>
      {noteOpen && !locked ? (
        <TextInput
          value={note}
          onChangeText={(v) => onNote(sid, v)}
          placeholder="Note (optional)"
          placeholderTextColor={theme.textMuted}
          maxLength={200}
          style={styles.note}
        />
      ) : note ? (
        <Text style={styles.muted}>Note: {note}</Text>
      ) : null}
    </View>
  );
});

const makeStyles = (t) =>
  StyleSheet.create({
    header: { marginBottom: spacing.md },
    headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    date: { fontSize: font.xl, fontWeight: '800', color: t.text },
    countRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: t.border },
    count: { alignItems: 'center', flex: 1 },
    countNum: { fontSize: font.xl, fontWeight: '800' },
    countLabel: { fontSize: font.xs, color: t.textMuted, fontWeight: '600' },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: spacing.sm },
    allPresent: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginTop: spacing.md },
    card: { backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: t.border },
    studentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    roll: { minWidth: 30, fontSize: font.md, fontWeight: '800', color: t.primary },
    student: { flex: 1, fontSize: font.md, fontWeight: '700', color: t.text },
    chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    chip: {
      flex: 1,
      height: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1.5,
    },
    note: { marginTop: spacing.sm, height: 42, borderRadius: radius.sm, borderWidth: 1, borderColor: t.border, paddingHorizontal: spacing.sm, color: t.text, backgroundColor: alpha(t.primary, 0.04) },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.border,
      shadowColor: '#000',
      shadowOpacity: t.isDark ? 0 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -3 },
      elevation: 8,
    },
    preSubmitBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      marginBottom: spacing.sm,
    },
    summaryItem: {
      alignItems: 'center',
      flex: 1,
    },
    summaryNum: {
      fontSize: font.md,
      fontWeight: '800',
    },
    summaryLbl: {
      fontSize: 10,
      fontWeight: '600',
      color: t.textMuted,
    },
    btnRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
  });

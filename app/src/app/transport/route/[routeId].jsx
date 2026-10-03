import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { transportApi } from '../../../api/transport';
import { useAsync } from '../../../lib/useAsync';
import { fmtTime, ymd } from '../../../lib/format';
import { confirm, showError } from '../../../lib/notify';
import { Card } from '../../../components/ui';
import { Avatar, EmptyState, ErrorView, ProgressBar, SearchBar, Segmented } from '../../../components/kit';
import { SkeletonSheet } from '../../../components/Skeleton';
import RefreshableScroll from '../../../components/RefreshableScroll';
import DayStepper from '../../../components/transport/DayStepper';
import { alpha, font, radius, spacing } from '../../../theme';

const LEGS = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'drop', label: 'Drop' },
];

// What a leg reads and writes on a student row.
const LEG = {
  pickup: { status: 'pickupStatus', done: 'PICKED_UP', at: 'pickedUpAt', time: 'pickupTime', action: 'Pick up', doneLabel: 'Picked up' },
  drop: { status: 'dropStatus', done: 'DROPPED', at: 'droppedAt', time: 'dropTime', action: 'Drop', doneLabel: 'Dropped' },
};

/** Students in stop order, including stops nobody rides from. */
function groupByStop(stops, students) {
  const groups = stops.map((s) => ({ key: s.id, stop: s, students: [] }));
  const byId = new Map(groups.map((g) => [g.key, g]));
  const loose = [];
  for (const s of students) (byId.get(s.stop?.id)?.students || loose).push(s);
  if (loose.length) groups.push({ key: 'none', stop: null, students: loose });
  return groups;
}

// The search box only earns its space once the list is longer than a screen.
const SEARCH_FROM = 6;

const matches = (student, query) =>
  [student.name, student.className, student.admissionNumber, student.rollNumber].some((v) =>
    String(v || '').toLowerCase().includes(query)
  );

const withCounts = (data, students) => ({
  ...data,
  students,
  pickedUpCount: students.filter((s) => s.pickupStatus === 'PICKED_UP').length,
  droppedCount: students.filter((s) => s.dropStatus === 'DROPPED').length,
});

// One route's day: the manager marks each child picked up (morning) and
// dropped (afternoon), and can undo a wrong tap. The list is the server's —
// each tap updates the row at once and is put back if the server refuses.
export default function RouteRun() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const params = useLocalSearchParams();
  const routeId = String(params.routeId);
  const [date, setDate] = useState(() => (typeof params.date === 'string' && params.date ? params.date : ymd()));
  const [leg, setLeg] = useState('pickup');
  const [busy, setBusy] = useState({}); // studentId → true while its request is in flight
  const [search, setSearch] = useState('');

  const state = useAsync(() => transportApi.route(routeId, date), [routeId, date]);
  const data = state.data;
  const L = LEG[leg];

  // A reply is for the day it was sent on: if the manager has stepped to
  // another day meanwhile, it must not repaint that day's list.
  const patchStudent = (studentId, patch, day) =>
    state.setData((d) =>
      d && d.date === day ? withCounts(d, d.students.map((s) => (s.studentId === studentId ? { ...s, ...patch } : s))) : d
    );

  const send = async (student, undo) => {
    if (busy[student.studentId]) return;
    const day = date;
    const before = { [L.status]: student[L.status], [L.at]: student[L.at] };
    setBusy((b) => ({ ...b, [student.studentId]: true }));
    patchStudent(student.studentId, undo ? { [L.status]: 'PENDING', [L.at]: null } : { [L.status]: L.done, [L.at]: new Date().toISOString() }, day);
    try {
      const row = await (undo ? transportApi.undo : transportApi.mark)(student.studentId, leg, day);
      if (row) {
        patchStudent(
          student.studentId,
          { pickupStatus: row.pickupStatus, pickedUpAt: row.pickedUpAt, dropStatus: row.dropStatus, droppedAt: row.droppedAt },
          day
        );
      }
    } catch (err) {
      patchStudent(student.studentId, before, day);
      showError(err, undo ? 'Could not undo' : 'Could not save');
      // The student may have left the route, or the route lost its driver.
      if (err.status === 404 || err.status === 409) state.reload({ silent: true });
    } finally {
      setBusy((b) => {
        const next = { ...b };
        delete next[student.studentId];
        return next;
      });
    }
  };

  const undo = async (student) => {
    if (leg === 'pickup' && student.dropStatus === 'DROPPED') {
      showError({ message: 'This student is already dropped. Undo the drop first.', status: 409 });
      return;
    }
    const ok = await confirm(`Undo ${L.doneLabel.toLowerCase()}?`, `${student.name} will go back to pending for ${leg}.`, {
      confirmText: 'Undo',
      destructive: true,
    });
    if (ok) send(student, true);
  };

  const done = data ? (leg === 'pickup' ? data.pickedUpCount : data.droppedCount) : 0;
  const total = data?.totalStudents || 0;
  // While another day is loading the rows on screen are still the old day's —
  // a tap now would be recorded against the day in the stepper.
  const stale = Boolean(data) && (state.loading || data.date !== date);
  const query = search.trim().toLowerCase();
  const visible = data ? (query ? data.students.filter((s) => matches(s, query)) : data.students) : [];
  // With a search on, only the stops that have a match are worth showing.
  const groups = data ? groupByStop(data.stops, visible).filter((g) => !query || g.students.length) : [];

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: data?.route?.routeName || 'Route' }} />

      {state.loading && !data ? (
        <SkeletonSheet padded={false} />
      ) : state.error && !data ? (
        <ErrorView error={state.error} onRetry={state.reload} />
      ) : (
        <>
          <Card style={styles.head}>
            <View style={styles.headRow}>
              <Ionicons name="bus" size={18} color={theme.primary} />
              <Text style={styles.headText} numberOfLines={1}>
                {data.route.vehicle
                  ? `${data.route.vehicle.vehicleNumber} · ${data.route.vehicle.capacity} seats`
                  : 'No vehicle assigned'}
              </Text>
            </View>
            <View style={styles.headRow}>
              <Ionicons name="person" size={18} color={theme.primary} />
              <Text style={styles.headText} numberOfLines={1}>
                {data.route.driver?.name || 'No driver assigned'}
              </Text>
              {data.route.driver?.mobile ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${data.route.driver.mobile}`).catch(() => {})}
                  hitSlop={8}
                  style={[styles.call, { backgroundColor: alpha(theme.success, 0.14) }]}
                  accessibilityLabel="Call driver"
                >
                  <Ionicons name="call" size={14} color={theme.success} />
                  <Text style={[styles.callText, { color: theme.success }]}>Call</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>

          {data.ready ? null : (
            <View style={[styles.notice, { backgroundColor: alpha(theme.warning, 0.12), borderColor: alpha(theme.warning, 0.4) }]}>
              <Ionicons name="alert-circle" size={18} color={theme.warning} />
              <Text style={styles.noticeText}>
                This route needs a vehicle and a driver before pickup or drop can be recorded. Ask the school office to assign them.
              </Text>
            </View>
          )}

          <DayStepper date={date} onChange={setDate} />
          <Segmented options={LEGS} value={leg} onChange={setLeg} />

          <View style={styles.progress}>
            <Text style={styles.progressText}>
              {L.doneLabel} {done} of {total}
            </Text>
            <ProgressBar value={total ? done / total : 0} color={leg === 'pickup' ? theme.success : theme.warning} />
          </View>

          {total === 0 && !data.stops.length ? (
            <EmptyState
              icon="trail-sign-outline"
              title="No stops or students yet"
              message="Stops and student assignments are added by the school office in the admin panel."
            />
          ) : (
            <View style={stale ? { opacity: 0.5 } : null}>
              {total >= SEARCH_FROM ? (
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search student or class" style={styles.search} />
              ) : null}
              {query && !visible.length ? (
                <EmptyState icon="search-outline" title="No student found" message={`Nobody on this route matches “${search.trim()}”.`} />
              ) : null}
              {groups.map((g) => (
                <View key={g.key} style={styles.group}>
                  <View style={styles.stopRow}>
                    <View style={[styles.stopDot, { backgroundColor: theme.primary }]}>
                      <Text style={styles.stopNum}>{g.stop?.sequenceOrder ?? '–'}</Text>
                    </View>
                    <Text style={styles.stopName} numberOfLines={1}>
                      {g.stop?.stopName || 'No stop'}
                    </Text>
                    {g.stop ? <Text style={styles.stopTime}>{g.stop[L.time]}</Text> : null}
                  </View>

                  {g.students.length ? (
                    g.students.map((s) => (
                      <StudentRow
                        key={s.studentId}
                        student={s}
                        leg={leg}
                        disabled={!data.ready || stale || Boolean(busy[s.studentId])}
                        onMark={() => send(s, false)}
                        onUndo={() => undo(s)}
                      />
                    ))
                  ) : (
                    <Text style={styles.noRiders}>No students at this stop</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </RefreshableScroll>
  );
}

function StudentRow({ student, leg, disabled, onMark, onUndo }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const L = LEG[leg];
  const isDone = student[L.status] === L.done;
  // A child who never boarded cannot be dropped.
  const blocked = leg === 'drop' && student.pickupStatus !== 'PICKED_UP';
  const color = leg === 'pickup' ? theme.success : theme.warning;

  return (
    <View style={styles.student}>
      <Avatar name={student.name} size={38} />
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName} numberOfLines={1}>
          {student.name}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {[student.className, student.rollNumber ? `Roll ${student.rollNumber}` : student.admissionNumber].filter(Boolean).join(' · ')}
        </Text>
      </View>

      {isDone ? (
        <Pressable
          onPress={onUndo}
          disabled={disabled}
          style={[styles.done, { backgroundColor: alpha(color, 0.14), borderColor: alpha(color, 0.4) }]}
          accessibilityLabel={`${L.doneLabel}. Tap to undo`}
        >
          <Ionicons name="checkmark-circle" size={16} color={color} />
          <View>
            <Text style={[styles.doneText, { color }]}>{L.doneLabel}</Text>
            {student[L.at] ? <Text style={[styles.doneTime, { color }]}>{fmtTime(student[L.at])}</Text> : null}
          </View>
        </Pressable>
      ) : blocked ? (
        <View style={[styles.done, { borderColor: theme.border }]}>
          <Text style={styles.muted}>Not picked up</Text>
        </View>
      ) : (
        <Pressable
          onPress={onMark}
          disabled={disabled}
          style={({ pressed }) => [styles.markBtn, { backgroundColor: theme.primary }, (pressed || disabled) && { opacity: 0.6 }]}
          accessibilityRole="button"
        >
          <Text style={[styles.markText, { color: theme.onPrimary }]}>{L.action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    page: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
    head: { gap: spacing.sm, marginBottom: spacing.lg },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    headText: { flex: 1, fontSize: font.md, fontWeight: '600', color: t.text },
    call: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
    callText: { fontSize: font.sm, fontWeight: '800' },
    notice: {
      flexDirection: 'row',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    noticeText: { flex: 1, fontSize: font.sm, color: t.text, lineHeight: 18 },
    progress: { gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.lg },
    search: { marginBottom: spacing.lg },
    progressText: { fontSize: font.md, fontWeight: '800', color: t.text },

    group: { marginBottom: spacing.lg },
    stopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    stopDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    stopNum: { color: t.onPrimary, fontSize: font.xs, fontWeight: '800' },
    stopName: { flex: 1, fontSize: font.md, fontWeight: '800', color: t.text },
    stopTime: { fontSize: font.sm, fontWeight: '700', color: t.textMuted },
    noRiders: { fontSize: font.sm, color: t.textMuted, marginLeft: 32 },

    student: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    studentName: { fontSize: font.md, fontWeight: '700', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted },
    // Used one-handed at a bus stop — keep the target big.
    markBtn: { minWidth: 92, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
    markText: { fontSize: font.md, fontWeight: '800' },
    done: {
      minWidth: 92,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
    },
    doneText: { fontSize: font.sm, fontWeight: '800' },
    doneTime: { fontSize: font.xs, fontWeight: '600' },
  });

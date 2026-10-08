import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePortal } from '../../../context/PortalScope';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate, fmtTime } from '../../../lib/format';
import { Card } from '../../../components/ui';
import { AsyncView, Badge, EmptyState, SectionTitle } from '../../../components/kit';
import { SkeletonDetail } from '../../../components/Skeleton';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { alpha, font, radius, spacing } from '../../../theme';

const HISTORY_LIMIT = 30;

// One leg of the day (pickup / drop) as a status chip.
function LegChip({ label, leg, theme }) {
  const done = Boolean(leg?.done);
  const c = done ? theme.success : theme.textMuted;
  return (
    <View style={[chip.wrap, { backgroundColor: alpha(c, theme.isDark ? 0.22 : 0.12), borderColor: alpha(c, 0.3) }]}>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={c} />
      <View>
        <Text style={[chip.label, { color: c }]}>{label}</Text>
        <Text style={[chip.sub, { color: theme.textMuted }]}>{done ? fmtTime(leg.at) || 'Done' : 'Pending'}</Text>
      </View>
    </View>
  );
}

const chip = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  label: { fontSize: font.sm, fontWeight: '800' },
  sub: { fontSize: font.xs, marginTop: 1 },
});

function Line({ label, value, styles }) {
  if (!value) return null;
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

// Shared by the Student app (own ride) and the Parent app (selected child via
// PortalScope). Read-only: pickup / drop are recorded by the driver or the
// transport manager; this screen only shows what they marked.
export default function Transport() {
  const { api, scopeKey } = usePortal();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => api.transport(), [scopeKey], { refetchOnFocus: true, cacheKey: `transport.${scopeKey}` });
  const history = useAsync(
    () => api.transportHistory({ page: 1, limit: HISTORY_LIMIT }).then((r) => r?.data || []),
    [scopeKey],
    { refetchOnFocus: true, cacheKey: `transport.history.${scopeKey}` },
  );

  const reload = () => Promise.all([state.reload({ silent: true }), history.reload({ silent: true })]);
  const call = (mobile) => Linking.openURL(`tel:${String(mobile).replace(/[^\d+]/g, '')}`).catch(() => {});

  return (
    <RefreshableScroll onRefresh={reload} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
      <AsyncView
        state={state}
        skeleton={<SkeletonDetail padded={false} />}
        empty={{
          when: (d) => !d?.assigned,
          view: (
            <EmptyState
              icon="bus-outline"
              title="No transport assigned"
              message="School transport has not been assigned yet. Contact the school office to get a route and stop."
            />
          ),
        }}
      >
        {(d) => {
          const route = d.route || {};
          const stop = d.stop;
          const rows = history.data || [];
          return (
            <>
              {/* Route card */}
              <Card>
                <View style={styles.row}>
                  <View style={[styles.busIcon, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.22 : 0.12) }]}>
                    <Ionicons name="bus-outline" size={24} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{route.name || 'Route'}</Text>
                    <Text style={styles.muted}>
                      {route.vehicle ? `${route.vehicle.number}${route.vehicle.capacity ? ` · ${route.vehicle.capacity} seats` : ''}` : 'Bus not assigned yet'}
                    </Text>
                  </View>
                  {route.status === 'INACTIVE' ? <Badge label="Inactive" tone="warning" /> : null}
                </View>
                {stop ? (
                  <View style={styles.stopBox}>
                    <Line styles={styles} label="My stop" value={stop.name} />
                    <Line styles={styles} label="Pickup" value={stop.pickupTime} />
                    <Line styles={styles} label="Drop" value={stop.dropTime} />
                  </View>
                ) : null}
              </Card>

              {/* Driver */}
              <SectionTitle title="Driver" />
              <Card>
                {route.driver ? (
                  <View style={styles.row}>
                    <View style={[styles.busIcon, { backgroundColor: alpha(theme.success, theme.isDark ? 0.22 : 0.12) }]}>
                      <Ionicons name="person-outline" size={22} color={theme.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverName}>{route.driver.name}</Text>
                      {route.driver.mobile ? <Text style={styles.muted}>{route.driver.mobile}</Text> : null}
                    </View>
                    {route.driver.mobile ? (
                      <Pressable
                        onPress={() => call(route.driver.mobile)}
                        accessibilityRole="button"
                        accessibilityLabel="Call driver"
                        style={({ pressed }) => [styles.callBtn, { backgroundColor: theme.primary }, pressed && { opacity: 0.8 }]}
                      >
                        <Ionicons name="call" size={18} color={theme.onPrimary} />
                        <Text style={[styles.callText, { color: theme.onPrimary }]}>Call</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.muted}>Driver not assigned yet.</Text>
                )}
              </Card>

              {/* Today */}
              <SectionTitle title="Today" right={<Text style={styles.muted}>{fmtDate(d.today?.date)}</Text>} />
              <View style={styles.chips}>
                <LegChip label="Picked up" leg={d.today?.pickup} theme={theme} />
                <LegChip label="Dropped" leg={d.today?.drop} theme={theme} />
              </View>

              {/* Stops */}
              <SectionTitle title="Route stops" />
              <Card>
                {(d.stops || []).map((s, idx, arr) => {
                  const mine = s.isMine || s.id === stop?.id;
                  const c = mine ? theme.primary : theme.border;
                  return (
                    <View key={s.id} style={[styles.stopRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={styles.timeline}>
                        <View style={[styles.dot, { backgroundColor: mine ? theme.primary : theme.surfaceAlt, borderColor: c }]}>
                          <Text style={[styles.dotText, { color: mine ? theme.onPrimary : theme.textMuted }]}>{s.sequenceOrder}</Text>
                        </View>
                        {idx < arr.length - 1 ? <View style={[styles.rail, { backgroundColor: theme.border }]} /> : null}
                      </View>
                      <View style={[styles.stopBody, mine && { backgroundColor: alpha(theme.primary, theme.isDark ? 0.18 : 0.08), borderColor: alpha(theme.primary, 0.25) }]}>
                        <View style={styles.row}>
                          <Text style={[styles.stopName, mine && { color: theme.primary }]} numberOfLines={2}>{s.name}</Text>
                          {mine ? <Badge label="My stop" tone="primary" /> : null}
                        </View>
                        <Text style={styles.muted}>
                          Pickup {s.pickupTime || '--'} · Drop {s.dropTime || '--'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                {!d.stops?.length ? <Text style={styles.muted}>No stops on this route yet.</Text> : null}
              </Card>

              {/* History */}
              <SectionTitle title="History" />
              <Card>
                {history.loading && !history.data ? (
                  <Text style={styles.muted}>Loading...</Text>
                ) : rows.length ? (
                  rows.map((r, idx) => (
                    <View key={r.id} style={[styles.histRow, idx === rows.length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={styles.histDate}>{fmtDate(r.date)}</Text>
                      <View style={styles.histLegs}>
                        <Badge label={r.pickup?.done ? `Up ${fmtTime(r.pickup.at)}` : 'No pickup'} tone={r.pickup?.done ? 'success' : 'muted'} />
                        <Badge label={r.drop?.done ? `Down ${fmtTime(r.drop.at)}` : 'No drop'} tone={r.drop?.done ? 'success' : 'muted'} />
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>{history.error ? 'Could not load history. Pull down to try again.' : 'No pickup or drop recorded yet.'}</Text>
                )}
              </Card>
            </>
          );
        }}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    title: { fontSize: font.xl, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    busIcon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    stopBox: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: t.border, paddingTop: spacing.sm },
    line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: spacing.md },
    lineLabel: { fontSize: font.md, color: t.textMuted },
    lineValue: { flex: 1, textAlign: 'right', fontSize: font.md, color: t.text, fontWeight: '600' },
    driverName: { fontSize: font.lg, fontWeight: '700', color: t.text },
    callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
    callText: { fontSize: font.sm, fontWeight: '800' },
    chips: { flexDirection: 'row', gap: spacing.sm },
    stopRow: { flexDirection: 'row', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: t.border, paddingBottom: spacing.sm, marginBottom: spacing.sm },
    timeline: { width: 28, alignItems: 'center' },
    dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    dotText: { fontSize: font.xs, fontWeight: '800' },
    rail: { width: 2, flex: 1, marginTop: 4, minHeight: 12 },
    stopBody: { flex: 1, borderWidth: 1, borderColor: 'transparent', borderRadius: radius.md, padding: spacing.sm },
    stopName: { flex: 1, fontSize: font.md, fontWeight: '700', color: t.text },
    histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: t.border },
    histDate: { fontSize: font.md, fontWeight: '600', color: t.text },
    histLegs: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 },
  });

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { transportApi } from '../../../api/transport';
import { useAsync } from '../../../lib/useAsync';
import { ymd } from '../../../lib/format';
import { Card } from '../../../components/ui';
import { Badge, EmptyState, ErrorView, ProgressBar, SectionTitle, StatCard } from '../../../components/kit';
import { SkeletonHome } from '../../../components/Skeleton';
import SchoolHeader from '../../../components/SchoolHeader';
import RefreshableScroll from '../../../components/RefreshableScroll';
import DayStepper from '../../../components/transport/DayStepper';
import { alpha, font, spacing } from '../../../theme';

// Home: every route of the school for one day, with how far its pickup and
// drop have got. Tapping a route opens its student list for the same day.
export default function TransportHome() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [date, setDate] = useState(() => ymd());

  const state = useAsync(() => transportApi.overview(date), [date], { refetchOnFocus: true });
  const totals = state.data?.totals;
  const routes = state.data?.routes || [];

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ paddingBottom: 110 }}>
      <SchoolHeader>
        <View style={[styles.chip, { backgroundColor: alpha('#FFFFFF', 0.2) }]}>
          <Ionicons name="bus" size={12} color={theme.onPrimary} />
          <Text style={[styles.chipText, { color: theme.onPrimary }]}>Transport Manager</Text>
        </View>
      </SchoolHeader>

      <View style={styles.body}>
        <DayStepper date={date} onChange={setDate} />

        {state.loading && !state.data ? (
          <SkeletonHome />
        ) : state.error && !state.data ? (
          <ErrorView error={state.error} onRetry={state.reload} />
        ) : (
          <View style={state.loading ? { opacity: 0.5 } : null}>
            <View style={styles.stats}>
              <StatCard icon="people-outline" label="Students" value={totals.students} subtitle="On transport" style={styles.stat} />
              <StatCard
                icon="log-in-outline"
                label="Picked up"
                value={totals.pickedUp}
                subtitle={`of ${totals.students}`}
                color={theme.success}
                style={styles.stat}
              />
              <StatCard
                icon="home-outline"
                label="Dropped"
                value={totals.dropped}
                subtitle={`of ${totals.students}`}
                color={theme.warning}
                style={styles.stat}
              />
            </View>
            <Text style={styles.fleetLine}>
              {totals.routes} route{totals.routes === 1 ? '' : 's'} · {totals.activeVehicles} of {totals.vehicles} vehicles active ·{' '}
              {totals.activeDrivers} of {totals.drivers} drivers active
            </Text>

            <SectionTitle title="Routes" />
            {routes.length ? (
              routes.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => router.push({ pathname: '/transport/route/[routeId]', params: { routeId: r.id, date } })}
                  style={({ pressed }) => pressed && { opacity: 0.75 }}
                >
                  <Card style={styles.route}>
                    <View style={styles.routeTop}>
                      <View style={[styles.routeIcon, { backgroundColor: theme.primarySoft }]}>
                        <Ionicons name="bus" size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeName} numberOfLines={1}>
                          {r.routeName}
                        </Text>
                        <Text style={styles.muted} numberOfLines={1}>
                          {[r.vehicle?.vehicleNumber || 'No vehicle', r.driver?.name || 'No driver'].join(' · ')}
                        </Text>
                      </View>
                      {r.ready ? null : <Badge label="Not ready" tone="warning" />}
                      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                    </View>

                    <Leg label="Picked up" done={r.pickedUpCount} total={r.totalStudents} color={theme.success} />
                    <Leg label="Dropped" done={r.droppedCount} total={r.totalStudents} color={theme.warning} />
                    <Text style={styles.muted}>
                      {r.totalStops} stop{r.totalStops === 1 ? '' : 's'} · {r.totalStudents} student{r.totalStudents === 1 ? '' : 's'}
                    </Text>
                  </Card>
                </Pressable>
              ))
            ) : (
              <EmptyState
                icon="bus-outline"
                title="No routes yet"
                message="Routes, stops and student assignments are set up by the school office in the admin panel."
              />
            )}
          </View>
        )}
      </View>
    </RefreshableScroll>
  );
}

function Leg({ label, done, total, color }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.leg}>
      <Text style={styles.legLabel}>{label}</Text>
      <ProgressBar value={total ? done / total : 0} color={color} style={{ flex: 1 }} />
      <Text style={styles.legCount}>
        {done}/{total}
      </Text>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    body: { padding: spacing.lg },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: 999,
      marginTop: spacing.md,
    },
    chipText: { fontSize: font.sm, fontWeight: '700' },
    stats: { flexDirection: 'row', gap: spacing.md },
    stat: { flex: 1 },
    fleetLine: { fontSize: font.sm, color: t.textMuted, marginTop: spacing.md, marginBottom: spacing.sm },
    route: { marginBottom: spacing.md, gap: spacing.sm },
    routeTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
    routeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    routeName: { fontSize: font.lg, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted },
    leg: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    legLabel: { width: 68, fontSize: font.sm, color: t.textMuted, fontWeight: '600' },
    legCount: { width: 44, textAlign: 'right', fontSize: font.sm, fontWeight: '800', color: t.text },
  });

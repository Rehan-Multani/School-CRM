import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { transportApi } from '../../../api/transport';
import { useAsync } from '../../../lib/useAsync';
import { fileUrl } from '../../../lib/links';
import { Card } from '../../../components/ui';
import { AsyncView, Avatar, Badge, EmptyState, Segmented } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { alpha, font, radius, spacing } from '../../../theme';

const VIEWS = [
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'drivers', label: 'Drivers' },
];

const pretty = (v) =>
  String(v || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

// The fleet, read-only: every vehicle and driver and the route each one
// serves. Adding or changing them is done by the school office on the web.
export default function Fleet() {
  const styles = useStyles(makeStyles);
  const [view, setView] = useState('vehicles');
  const state = useAsync(() => transportApi.fleet(), [], { refetchOnFocus: true });

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={styles.page}>
      <Segmented options={VIEWS} value={view} onChange={setView} />
      <View style={{ height: spacing.lg }} />
      <AsyncView state={state} skeleton={<SkeletonCards count={4} padded={false} />}>
        {(data) =>
          view === 'vehicles' ? (
            data.vehicles.length ? (
              data.vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)
            ) : (
              <EmptyState icon="bus-outline" title="No vehicles yet" message="Vehicles are added by the school office in the admin panel." />
            )
          ) : data.drivers.length ? (
            data.drivers.map((d) => <DriverCard key={d.id} driver={d} />)
          ) : (
            <EmptyState icon="person-outline" title="No drivers yet" message="Drivers are added by the school office in the admin panel." />
          )
        }
      </AsyncView>
    </RefreshableScroll>
  );
}

function Line({ icon, text }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={15} color={theme.textMuted} />
      <Text style={styles.lineText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function VehicleCard({ vehicle }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="bus" size={20} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {vehicle.vehicleNumber}
          </Text>
          <Text style={styles.muted} numberOfLines={1}>
            {[pretty(vehicle.vehicleType), vehicle.model].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Badge label={pretty(vehicle.status)} tone={vehicle.status === 'ACTIVE' ? 'success' : 'muted'} />
      </View>
      <Line icon="people-outline" text={`${vehicle.capacity} seats · ${pretty(vehicle.fuelType)}`} />
      <Line icon="person-outline" text={vehicle.driver ? vehicle.driver.name : 'No driver assigned'} />
      <Line icon="map-outline" text={vehicle.route ? vehicle.route.routeName : 'Not on a route'} />
    </Card>
  );
}

function DriverCard({ driver }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <Avatar source={fileUrl(driver.photo) || undefined} name={driver.name} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {driver.name}
          </Text>
          <Text style={styles.muted} numberOfLines={1}>
            {driver.mobile}
          </Text>
        </View>
        {driver.status === 'ACTIVE' ? null : <Badge label={pretty(driver.status)} tone="muted" />}
        {driver.mobile ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${driver.mobile}`).catch(() => {})}
            hitSlop={8}
            style={[styles.call, { backgroundColor: alpha(theme.success, 0.14) }]}
            accessibilityLabel={`Call ${driver.name}`}
          >
            <Ionicons name="call" size={16} color={theme.success} />
          </Pressable>
        ) : null}
      </View>
      <Line icon="card-outline" text={`Licence ${driver.licenseNumber}`} />
      <Line icon="bus-outline" text={driver.vehicle ? driver.vehicle.vehicleNumber : 'No vehicle assigned'} />
      <Line icon="map-outline" text={driver.route ? driver.route.routeName : 'Not on a route'} />
    </Card>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    page: { padding: spacing.lg, paddingBottom: 110, flexGrow: 1 },
    card: { marginBottom: spacing.md, gap: spacing.sm },
    top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
    icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: font.lg, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted },
    line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    lineText: { flex: 1, fontSize: font.md, color: t.text },
    call: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  });

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { principalMiscApi } from '../../../api/principal/misc';
import { fmtDateTime } from '../../../lib/format';
import PagedList from '../../../components/PagedList';
import { Badge, Chip, DateField, EmptyState, Select } from '../../../components/kit';
import { useCascade, useSafePickupSettings } from '../../../components/principal/misc/useSafePickupFilters';
import { font, radius, spacing } from '../../../theme';

// Web: Safe Pickup History — every pickup session, newest first (class / section / date range / status filters).
const STATUSES = ['ALL', 'PENDING', 'OTP_SENT', 'VERIFIED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
const TONE = { COMPLETED: 'success', VERIFIED: 'success', PENDING: 'warning', OTP_SENT: 'warning', CANCELLED: 'muted', EXPIRED: 'danger' };
const label = (s) => (s === 'ALL' ? 'All' : s.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()));

export default function SafePickupHistory() {
  const styles = useStyles(makeStyles);
  const settings = useSafePickupSettings();
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [status, setStatus] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const cascade = useCascade(settings.data, '', classId);
  const hasFilters = Boolean(classId || sectionId || status !== 'ALL' || from || to);

  const header = (
    <View style={{ paddingTop: spacing.lg }}>
      <Select label="Class" value={classId} options={cascade.classOptions} onChange={(v) => { setClassId(v); setSectionId(''); }} />
      <Select label="Section" value={sectionId} options={cascade.sectionOptions} onChange={setSectionId} />
      <View style={styles.chips}>
        {STATUSES.map((s) => (
          <Chip key={s} label={label(s)} active={status === s} onPress={() => setStatus(s)} />
        ))}
      </View>
      <DateField label="From date" value={from} onChange={setFrom} maximumDate={to ? new Date(`${to}T00:00:00`) : undefined} />
      <DateField label="To date" value={to} onChange={setTo} minimumDate={from ? new Date(`${from}T00:00:00`) : undefined} />
      {hasFilters ? (
        <View style={styles.chips}>
          <Chip
            label="Clear filters"
            onPress={() => {
              setClassId('');
              setSectionId('');
              setStatus('ALL');
              setFrom('');
              setTo('');
            }}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Pickup History' }} />
      <PagedList
        deps={[classId, sectionId, status, from, to]}
        fetchPage={(page) =>
          principalMiscApi.safePickupHistory({
            page,
            limit: 25,
            classId: classId || undefined,
            sectionId: sectionId || undefined,
            status: status === 'ALL' ? undefined : status,
            from: from || undefined,
            to: to || undefined,
          })
        }
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState icon="time-outline" title="No pickup records" message="No safe pickup sessions match these filters." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.name}>{item.studentName}</Text>
              <Badge label={String(item.status).replace(/_/g, ' ')} tone={TONE[item.status] || 'muted'} />
            </View>
            <Text style={styles.sub}>{[item.className, item.sectionName].filter(Boolean).join(' - ')}</Text>
            <Text style={styles.sub}>Guardian mobile: {item.maskedMobile || '—'}</Text>
            {item.pickupPersonName ? (
              <Text style={styles.sub}>
                Picked up by {item.pickupPersonName}
                {item.pickupPersonRelationship ? ` (${item.pickupPersonRelationship})` : ''}
              </Text>
            ) : null}
            {item.teacherName ? <Text style={styles.sub}>Initiated by {item.teacherName}</Text> : null}
            <Text style={styles.time}>
              {fmtDateTime(item.completedAt || item.verifiedAt || item.initiatedAt || item.date)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    card: { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
    name: { flex: 1, color: t.text, fontSize: font.md, fontWeight: '800' },
    sub: { color: t.textMuted, fontSize: font.sm, marginTop: 2 },
    time: { color: t.textMuted, fontSize: font.xs, fontWeight: '600', marginTop: spacing.sm },
  });

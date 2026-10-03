import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { newIdempotencyKey, teacherApi } from '../../../api/teacher';
import { confirm, showError } from '../../../lib/notify';
import PagedList from '../../../components/PagedList';
import { Badge, EmptyState } from '../../../components/kit';
import { font, radius, spacing } from '../../../theme';
import { SkeletonList } from '../../../components/Skeleton';

const ATT_TONE = { PRESENT: 'success', ABSENT: 'danger', LATE: 'warning', HALF_DAY: 'warning', LEAVE: 'muted', UNMARKED: 'muted' };

// Doc §6.10 — class teachers only, and only when the Super Admin enabled Safe
// Pickup for the school. Tap a student → OTP goes to the guardian's mobile.
export default function PickupStudents() {
  const { user, school } = useAuth();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [starting, setStarting] = useState(null);
  const keys = useRef({});

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Two independent gates (doc §6.10) — say exactly which one is closed.
  if (!school?.features?.safePickup) {
    return (
      <EmptyState
        icon="shield-outline"
        title="Safe Pickup is not enabled"
        message="Your school has not switched on Safe Pickup yet. Please contact the school office."
      />
    );
  }
  if (!user?.isClassTeacher) {
    return (
      <EmptyState
        icon="people-circle-outline"
        title="For class teachers only"
        message="Safe Pickup lets a class teacher hand students over after the guardian's OTP. You are not a class teacher of any section."
      />
    );
  }

  const start = async (s) => {
    if (s.activeSessionId) {
      router.push(`/teacher/pickup/${s.activeSessionId}`);
      return;
    }
    const ok = await confirm('Send pickup OTP?', `An OTP will be sent to ${s.name}'s registered guardian mobile.`, { confirmText: 'Send OTP' });
    if (!ok) return;
    keys.current[s.id] = keys.current[s.id] || newIdempotencyKey();
    setStarting(s.id);
    try {
      const session = await teacherApi.initiatePickup(s.id, keys.current[s.id]);
      delete keys.current[s.id];
      router.push(`/teacher/pickup/${session.id}`);
    } catch (e) {
      showError(e, 'Could not start pickup');
    } finally {
      setStarting(null);
    }
  };

  return (
    <PagedList
      deps={[query]}
      skeleton={<SkeletonList icon={false} badge padded={false} />}
      fetchPage={(page) => teacherApi.pickupStudents({ page, limit: 30, q: query })}
      ListHeaderComponent={
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search student" placeholderTextColor={theme.textMuted} style={styles.searchInput} maxLength={60} />
        </View>
      }
      ListEmptyComponent={<EmptyState icon="people-outline" title="No students" />}
      renderItem={({ item }) => {
        const disabled = !item.pickupEnabled || item.alreadyPickedUpToday || !item.hasGuardianMobile;
        const reason = !item.pickupEnabled
          ? 'Pickup not enabled for this class'
          : item.alreadyPickedUpToday
            ? 'Already picked up today'
            : !item.hasGuardianMobile
              ? 'No guardian mobile on file'
              : item.activeSessionId
                ? 'Verification in progress — tap to continue'
                : 'Tap to send OTP';
        return (
          <Pressable disabled={disabled || starting === item.id} onPress={() => start(item)} style={({ pressed }) => [styles.card, (disabled || pressed) && { opacity: disabled ? 0.55 : 0.8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {item.rollNumber ? `${item.rollNumber}. ` : ''}
                {item.name}
              </Text>
              <Text style={styles.muted}>
                {item.className}-{item.sectionName} · {reason}
              </Text>
            </View>
            {item.alreadyPickedUpToday ? <Badge label="PICKED UP" tone="success" icon="checkmark" /> : <Badge label={item.attendanceStatus} tone={ATT_TONE[item.attendanceStatus]} />}
          </Pressable>
        );
      }}
    />
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 46, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, marginVertical: spacing.md },
    searchInput: { flex: 1, color: t.text, fontSize: font.md },
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: t.border },
    name: { fontSize: font.md, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
  });

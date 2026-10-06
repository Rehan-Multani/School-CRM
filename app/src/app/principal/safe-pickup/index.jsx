import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { principalMiscApi } from '../../../api/principal/misc';
import { showError, toast } from '../../../lib/notify';
import { Button } from '../../../components/ui';
import { Badge, EmptyState, ErrorView, Select, SearchBar } from '../../../components/kit';
import { SkeletonList } from '../../../components/Skeleton';
import PagedList from '../../../components/PagedList';
import PickupOtpModal from '../../../components/principal/misc/PickupOtpModal';
import { useCascade, useSafePickupSettings } from '../../../components/principal/misc/useSafePickupFilters';
import { font, radius, spacing } from '../../../theme';

// Web: Principal → Safe Pickup. Pick a student -> OTP goes to the guardian -> enter it to complete.
// Pickup is only offered when the Super Admin enabled it for the school (settings.schoolEnabled)
// and the student's class (student.pickupEnabled).
export default function SafePickup() {
  const styles = useStyles(makeStyles);
  const settings = useSafePickupSettings();
  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [q, setQ] = useState('');
  const [active, setActive] = useState(null); // { student, sessionId }
  const [sendingId, setSendingId] = useState(null);
  const list = useRef(null);
  const cascade = useCascade(settings.data, yearId, classId);

  if (settings.loading && !settings.data) return <SkeletonList />;
  if (settings.error && !settings.data) return <ErrorView error={settings.error} onRetry={settings.reload} />;
  if (settings.data && settings.data.schoolEnabled === false) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: 'Safe Pickup' }} />
        <EmptyState
          icon="shield-outline"
          title="Safe pickup is not available"
          message="Safe pickup is not enabled for your school. Please contact the platform administrator."
        />
      </View>
    );
  }

  const start = async (student) => {
    setSendingId(student.id);
    try {
      const res = await principalMiscApi.sendSafePickupOtp(student.id);
      toast.success('OTP sent to the registered guardian');
      setActive({ student, sessionId: res?.data?.id });
    } catch (e) {
      // A verification is already running for this student: continue with it.
      if (student.activeSessionId) setActive({ student, sessionId: student.activeSessionId });
      else showError(e, 'Could not send OTP');
    } finally {
      setSendingId(null);
    }
  };

  const header = (
    <View style={{ paddingTop: spacing.lg }}>
      <Text style={styles.intro}>Verify and mark students as safely picked up by their guardians.</Text>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search by name or admission no." onClear={() => setQ('')} style={{ marginBottom: spacing.md }} />
      <Select label="Academic year" value={yearId} options={cascade.yearOptions} onChange={(v) => { setYearId(v); setClassId(''); setSectionId(''); }} />
      <Select label="Class" value={classId} options={cascade.classOptions} onChange={(v) => { setClassId(v); setSectionId(''); }} />
      <Select label="Section" value={sectionId} options={cascade.sectionOptions} onChange={setSectionId} />
      <Button title="View pickup history" variant="outline" icon="time-outline" onPress={() => router.push('/principal/safe-pickup/history')} style={{ marginBottom: spacing.lg }} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Safe Pickup' }} />
      <PagedList
        ref={list}
        deps={[yearId, classId, sectionId, q]}
        fetchPage={(page) =>
          principalMiscApi.safePickupStudents({
            page,
            limit: 20,
            academicYearId: yearId || undefined,
            classId: classId || undefined,
            sectionId: sectionId || undefined,
            q: q.trim() || undefined,
          })
        }
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No students found" message="Try changing the filters." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.top}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>
                  {item.admissionNumber} · {[item.className, item.sectionName].filter(Boolean).join(' - ')}
                </Text>
                <Text style={styles.sub}>Parent: {item.maskedParentPhone || '—'}</Text>
              </View>
              {item.alreadyPickedUpToday ? <Badge label="Picked up" tone="success" /> : !item.pickupEnabled ? <Badge label="Disabled" tone="muted" /> : null}
            </View>
            {!item.alreadyPickedUpToday && item.pickupEnabled ? (
              <Pressable onPress={() => start(item)} disabled={sendingId === item.id} style={styles.btn} accessibilityRole="button">
                <Text style={styles.btnTxt}>{sendingId === item.id ? 'Sending OTP...' : item.activeSessionId ? 'Resume pickup' : 'Start pickup'}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />
      {active ? (
        <PickupOtpModal
          student={active.student}
          sessionId={active.sessionId}
          onClose={() => setActive(null)}
          onVerified={() => {
            setActive(null);
            list.current?.reload();
          }}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    intro: { color: t.textMuted, fontSize: font.sm, marginBottom: spacing.md },
    card: { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
    top: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    name: { color: t.text, fontSize: font.md, fontWeight: '800' },
    sub: { color: t.textMuted, fontSize: font.sm, marginTop: 2 },
    btn: { marginTop: spacing.md, backgroundColor: t.primary, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
    btnTxt: { color: t.onPrimary, fontWeight: '800', fontSize: font.md },
  });

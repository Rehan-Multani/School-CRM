import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate } from '../../../lib/format';
import { Card } from '../../../components/ui';
import { AsyncView, Badge, SectionTitle } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, spacing } from '../../../theme';
import { SkeletonDetail } from '../../../components/Skeleton';

const STATUS_TONE = { PRESENT: 'success', ABSENT: 'danger', LATE: 'warning', HALF_DAY: 'warning', LEAVE: 'muted' };

function Row({ label, value, styles, onPress, icon }) {
  if (!value) return null;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {icon ? <Ionicons name={icon} size={20} color={styles.iconColor.color} /> : null}
    </Pressable>
  );
}

// Student detail — backend returns 403 STUDENT_ACCESS_DENIED for anyone not
// enrolled in one of this teacher's sections.
export default function StudentDetail() {
  const { studentId } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(async () => {
    const [student, attendance] = await Promise.all([
      teacherApi.student(studentId),
      teacherApi.studentAttendance(studentId).catch(() => null),
    ]);
    return { student, attendance };
  }, [studentId]);

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonDetail avatar rows={4} padded={false} />}>
        {({ student: s, attendance: a }) => (
          <>
            <View style={styles.head}>
              <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
                <Text style={{ color: theme.primary, fontSize: font.xxl, fontWeight: '800' }}>{(s.name || 'S')[0]}</Text>
              </View>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.label}>
                Roll {s.rollNumber || '—'} · {s.admissionNumber}
              </Text>
              {s.attendancePercent != null ? (
                <View style={{ marginTop: spacing.sm }}>
                  <Badge label={`Attendance ${s.attendancePercent}%`} tone={s.attendancePercent >= 75 ? 'success' : 'danger'} />
                </View>
              ) : null}
            </View>
            <Card>
              <Row styles={styles} label="Gender" value={s.gender} />
              <Row styles={styles} label="Date of birth" value={fmtDate(s.dateOfBirth)} />
              <Row styles={styles} label="Parent / Guardian" value={s.parentName} />
              <Row
                styles={styles}
                label="Parent phone"
                value={s.parentPhone}
                icon="call-outline"
                onPress={s.parentPhone ? () => Linking.openURL(`tel:${String(s.parentPhone).replace(/[^\d+]/g, '')}`) : null}
              />
            </Card>
            {a?.log?.length ? (
              <>
                <SectionTitle title="Recent attendance" right={<Text style={styles.label}>{a.presentRate ?? '–'}% present</Text>} />
                <Card>
                  {a.log.slice(0, 15).map((l) => (
                    <View key={`${l.date}-${l.sectionId}`} style={styles.logRow}>
                      <Text style={styles.value}>{fmtDate(l.date)}</Text>
                      <Badge label={l.status.replace('_', ' ')} tone={STATUS_TONE[l.status]} />
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        )}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    head: { alignItems: 'center', marginBottom: spacing.lg },
    avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
    name: { fontSize: font.xl, fontWeight: '800', color: t.text },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
    label: { fontSize: font.sm, color: t.textMuted },
    value: { fontSize: font.md, color: t.text, marginTop: 2 },
    logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
    iconColor: { color: t.primary },
  });

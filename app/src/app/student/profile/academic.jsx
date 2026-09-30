import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { studentApi } from '../../../api/student';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate } from '../../../lib/format';
import { Card } from '../../../components/ui';
import { AsyncView, Badge, SectionTitle } from '../../../components/kit';
import { SkeletonDetail } from '../../../components/Skeleton';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, radius, spacing } from '../../../theme';
import { alpha } from '../../../theme/colors';

function Row({ icon, label, value, styles, theme, isLast }) {
  if (!value) return null;
  return (
    <View style={[styles.row, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.iconBox, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.2 : 0.08) }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

// GET /academic-info + /guardians — both read-only.
export default function AcademicInfo() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(async () => {
    const [info, guardians] = await Promise.all([studentApi.academicInfo(), studentApi.guardians()]);
    return { info, guardians };
  }, []);

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonDetail padded={false} />}>
        {({ info, guardians }) => (
          <>
            <SectionTitle title="Enrollment & Batch Details" />
            <Card>
              <Row styles={styles} theme={theme} icon="card-outline" label="Admission Number" value={info.admissionNumber} />
              <Row styles={styles} theme={theme} icon="school-outline" label="Class & Section" value={info.className ? `${info.className} - ${info.sectionName || ''}` : ''} />
              <Row styles={styles} theme={theme} icon="bookmark-outline" label="Roll Number" value={info.rollNumber} />
              <Row styles={styles} theme={theme} icon="calendar-outline" label="Academic Year" value={info.academicYear} />
              <Row styles={styles} theme={theme} icon="time-outline" label="Enrolled On" value={info.enrollmentDate ? fmtDate(info.enrollmentDate) : ''} />

              <View style={[styles.row, { borderBottomWidth: 0 }]}>
                <View style={[styles.iconBox, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.2 : 0.08) }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.label}>Enrollment Status</Text>
                  <Badge label={info.enrollmentStatus || 'ACTIVE'} tone={info.enrollmentStatus === 'ACTIVE' ? 'success' : 'muted'} />
                </View>
              </View>
            </Card>

            <SectionTitle title="Parent / Guardian Details" />
            <Card>
              {guardians.parentName || guardians.parentPhone ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={[styles.guardianAvatar, { backgroundColor: alpha('#10B981', 0.12) }]}>
                    <Ionicons name="person" size={24} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guardianName}>{guardians.parentName || 'Parent / Guardian'}</Text>
                    <Text style={styles.guardianPhone}>{guardians.parentPhone || 'No contact on file'}</Text>
                  </View>
                  {guardians.parentPhone ? (
                    <Pressable
                      onPress={() => Linking.openURL(`tel:${String(guardians.parentPhone).replace(/[^\d+]/g, '')}`)}
                      style={({ pressed }) => [
                        styles.callBtn,
                        { backgroundColor: alpha(theme.primary, 0.12) },
                        pressed && { opacity: 0.7 },
                      ]}
                      accessibilityRole="button"
                    >
                      <Ionicons name="call" size={16} color={theme.primary} />
                      <Text style={{ fontSize: font.xs, fontWeight: '700', color: theme.primary }}>Call</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.label, { paddingVertical: spacing.md }]}>No guardian details on file.</Text>
              )}
            </Card>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, paddingHorizontal: 4 }}>
              <Ionicons name="information-circle-outline" size={15} color={theme.textMuted} />
              <Text style={{ fontSize: font.xs, color: theme.textMuted }}>Contact the school administration to update these details.</Text>
            </View>
          </>
        )}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { fontSize: font.xs, fontWeight: '600', color: t.textMuted },
    value: { fontSize: font.md, fontWeight: '700', color: t.text, marginTop: 2 },
    guardianAvatar: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    guardianName: {
      fontSize: font.md,
      fontWeight: '800',
      color: t.text,
    },
    guardianPhone: {
      fontSize: font.sm,
      color: t.textMuted,
      marginTop: 2,
    },
    callBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
  });

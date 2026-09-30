import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { teacherApi } from '../../api/teacher';
import { useAsync } from '../../lib/useAsync';
import { DAY_LABELS, fmtHM, withPrefix } from '../../lib/format';
import { AsyncView, Badge, Chip, EmptyState } from '../../components/kit';
import RefreshableScroll from '../../components/RefreshableScroll';
import { font, radius, spacing } from '../../theme';
import { alpha } from '../../theme/colors';
import { SkeletonChips, SkeletonList } from '../../components/Skeleton';

const todayCode = [null, 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date().getDay()] || 'MON';

function isPeriodNow(p, selectedDay) {
  if (selectedDay !== todayCode || !p.startTime || !p.endTime) return false;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const [sH, sM] = p.startTime.split(':').map(Number);
  const [eH, eM] = p.endTime.split(':').map(Number);
  const startMins = sH * 60 + (sM || 0);
  const endMins = eH * 60 + (eM || 0);
  return nowMins >= startMins && nowMins <= endMins;
}

export default function Timetable() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [day, setDay] = useState(todayCode);
  const state = useAsync(() => teacherApi.timetable(), []);

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonList header={<SkeletonChips count={6} />} badge padded={false} />}>
        {(tt) => {
          const periods = tt.timetable?.[day] || [];
          return (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}>
                {(tt.days || []).map((d) => {
                  const count = tt.timetable?.[d]?.length;
                  const isToday = d === todayCode;
                  return (
                    <Chip
                      key={d}
                      label={`${d}${isToday ? ' (Today)' : ''}${count ? ` · ${count}` : ''}`}
                      active={d === day}
                      onPress={() => setDay(d)}
                    />
                  );
                })}
              </ScrollView>

              <View style={styles.dayRow}>
                <Text style={styles.day}>{DAY_LABELS[day] || day}</Text>
                <Badge label={`${periods.length} Periods`} tone={day === todayCode ? 'primary' : 'muted'} />
              </View>

              {periods.length ? (
                <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                  {periods.map((p) => {
                    const active = isPeriodNow(p, day);

                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => router.push(`/teacher/schedule/${p.id}`)}
                        style={({ pressed }) => [
                          styles.periodCard,
                          {
                            backgroundColor: theme.surface,
                            borderColor: active ? theme.primary : theme.border,
                            borderWidth: active ? 1.5 : 1,
                          },
                          active && {
                            backgroundColor: theme.isDark ? alpha(theme.primary, 0.12) : alpha(theme.primary, 0.04),
                          },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <View style={styles.cardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.periodBox, { backgroundColor: active ? theme.primary : alpha(theme.primary, 0.12) }]}>
                              <Text style={[styles.periodNumber, { color: active ? theme.onPrimary : theme.primary }]}>
                                P{p.periodNumber}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="time-outline" size={14} color={theme.textMuted} />
                              <Text style={styles.timeText}>
                                {fmtHM(p.startTime)} – {fmtHM(p.endTime)}
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {active ? <Badge label="LIVE NOW" tone="success" icon="radio-button-on" /> : null}
                            <Badge label={withPrefix('Class', `${p.className}-${p.sectionName}`)} tone="primary" />
                          </View>
                        </View>

                        <Text style={styles.subjectTitle}>
                          {p.subjectName || 'Period'}
                        </Text>

                        <View style={styles.cardFooter}>
                          {p.room ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="business-outline" size={13} color={theme.textMuted} />
                              <Text style={styles.footerMuted}>{withPrefix('Room', p.room)}</Text>
                            </View>
                          ) : <View />}

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontSize: font.xs, fontWeight: '700', color: theme.primary }}>Details</Text>
                            <Ionicons name="chevron-forward" size={14} color={theme.primary} />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <EmptyState icon="cafe-outline" title="No periods scheduled" message="Nothing scheduled for this day." />
              )}
            </>
          );
        }}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    day: { fontSize: font.xl, fontWeight: '800', color: t.text },
    periodCard: {
      borderRadius: radius.md,
      padding: spacing.md,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    periodBox: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    periodNumber: {
      fontSize: font.xs,
      fontWeight: '800',
    },
    timeText: {
      fontSize: font.xs,
      fontWeight: '600',
      color: t.textMuted,
    },
    subjectTitle: {
      fontSize: font.lg,
      fontWeight: '800',
      color: t.text,
      marginTop: 2,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      paddingTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
    },
    footerMuted: {
      fontSize: font.xs,
      fontWeight: '600',
      color: t.textMuted,
    },
  });

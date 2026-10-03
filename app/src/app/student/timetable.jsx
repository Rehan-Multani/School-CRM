import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { usePortal } from '../../context/PortalScope';
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
  const { api, scopeKey } = usePortal();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { width: screenWidth } = useWindowDimensions();
  const [day, setDay] = useState(todayCode);
  const state = useAsync(() => api.timetable(), [scopeKey], { cacheKey: 'timetable' });
  const dayScrollRef = useRef(null);
  const dayLayouts = useRef({});

  const scrollToDay = (targetDay, animated = true) => {
    const layout = dayLayouts.current[targetDay];
    if (layout && dayScrollRef.current) {
      const chipCenter = layout.x + layout.width / 2;
      const scrollX = Math.max(0, chipCenter - screenWidth / 2);
      dayScrollRef.current.scrollTo({ x: scrollX, animated });
    }
  };

  const handleSelectDay = (selectedDay) => {
    setDay(selectedDay);
    scrollToDay(selectedDay, true);
  };

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonList header={<SkeletonChips count={6} />} badge padded={false} />}>
        {(tt) => {
          const periods = tt.timetable?.[day] || [];
          return (
            <>
              {/* Day selection chips */}
              <ScrollView
                ref={dayScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dayScroll}
                contentContainerStyle={styles.dayScrollContent}
              >
                {(tt.days || []).map((d) => {
                  const count = tt.timetable?.[d]?.length;
                  const isToday = d === todayCode;
                  return (
                    <Chip
                      key={d}
                      label={`${d}${isToday ? ' (Today)' : ''}${count ? ` · ${count}` : ''}`}
                      active={d === day}
                      onPress={() => handleSelectDay(d)}
                      onLayout={(e) => {
                        const { x, width } = e.nativeEvent.layout;
                        dayLayouts.current[d] = { x, width };
                        if (d === day) {
                          const chipCenter = x + width / 2;
                          const scrollX = Math.max(0, chipCenter - screenWidth / 2);
                          dayScrollRef.current?.scrollTo({ x: scrollX, animated: false });
                        }
                      }}
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
                      <View
                        key={p.id}
                        style={[
                          styles.periodCard,
                          {
                            backgroundColor: theme.surface,
                            borderColor: active ? theme.primary : theme.border,
                            borderWidth: active ? 1.5 : 1,
                          },
                          active && {
                            backgroundColor: theme.isDark ? alpha(theme.primary, 0.12) : alpha(theme.primary, 0.04),
                          },
                        ]}
                      >
                        {/* Time & Period Pill */}
                        <View style={styles.cardHeader}>
                          <View style={styles.headerLeft}>
                            <View style={[styles.periodBox, { backgroundColor: active ? theme.primary : alpha(theme.primary, 0.12) }]}>
                              <Text style={[styles.periodNumber, { color: active ? theme.onPrimary : theme.primary }]}>
                                P{p.periodNumber}
                              </Text>
                            </View>
                            <View style={styles.timeRow}>
                              <Ionicons name="time-outline" size={14} color={theme.textMuted} />
                              <Text style={styles.timeText} numberOfLines={1}>
                                {fmtHM(p.startTime)} – {fmtHM(p.endTime)}
                              </Text>
                            </View>
                          </View>

                          {active ? (
                            <Badge label="LIVE NOW" tone="success" icon="radio-button-on" />
                          ) : p.room ? (
                            <View style={[styles.roomBadge, { backgroundColor: theme.surfaceAlt }]}>
                              <Ionicons name="business-outline" size={12} color={theme.textMuted} />
                              <Text style={styles.roomText}>{withPrefix('Room', p.room)}</Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Subject Title */}
                        <Text style={styles.subjectTitle}>
                          {p.subjectName || `Period ${p.periodNumber}`}
                        </Text>

                        {/* Teacher & Room footer if active */}
                        <View style={styles.cardFooter}>
                          {p.teacherName ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <Ionicons name="person-outline" size={13} color={theme.textMuted} />
                              <Text style={styles.teacherText}>{p.teacherName}</Text>
                            </View>
                          ) : null}
                          {active && p.room ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="location-outline" size={13} color={theme.primary} />
                              <Text style={{ fontSize: font.xs, fontWeight: '700', color: theme.primary }}>{withPrefix('Room', p.room)}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <EmptyState icon="cafe-outline" title="No periods scheduled" message="There are no classes scheduled for this day." />
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
    dayScroll: {
      flexGrow: 0,
      marginHorizontal: -spacing.lg,
      marginBottom: spacing.xs,
    },
    dayScrollContent: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      alignItems: 'center',
    },
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
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1,
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
    roomBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    roomText: {
      fontSize: font.xs,
      fontWeight: '700',
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
    teacherText: {
      fontSize: font.xs,
      fontWeight: '600',
      color: t.textMuted,
    },
  });

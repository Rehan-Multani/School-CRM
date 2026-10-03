import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { fmtDate, parseYmd, ymd } from '../../lib/format';
import { font, radius, spacing } from '../../theme';

// ‹ Today · 1 Oct 2026 › — steps one day at a time and never past today:
// pickup / drop can only be recorded for a day that has already happened.
export default function DayStepper({ date, onChange }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const today = ymd();
  const isToday = date === today;

  const shift = (days) => {
    const d = parseYmd(date);
    d.setDate(d.getDate() + days);
    const next = ymd(d);
    if (next <= today) onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => shift(-1)} hitSlop={10} style={styles.arrow} accessibilityLabel="Previous day">
        <Ionicons name="chevron-back" size={20} color={theme.primary} />
      </Pressable>
      <Pressable onPress={() => onChange(today)} disabled={isToday} style={styles.label}>
        <Ionicons name="calendar-outline" size={16} color={theme.textMuted} />
        <Text style={styles.text}>{isToday ? `Today · ${fmtDate(date)}` : fmtDate(date)}</Text>
      </Pressable>
      <Pressable onPress={() => shift(1)} disabled={isToday} hitSlop={10} style={styles.arrow} accessibilityLabel="Next day">
        <Ionicons name="chevron-forward" size={20} color={isToday ? theme.border : theme.primary} />
      </Pressable>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radius.md,
      marginBottom: spacing.lg,
    },
    arrow: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
    label: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    text: { fontSize: font.md, fontWeight: '700', color: t.text },
  });

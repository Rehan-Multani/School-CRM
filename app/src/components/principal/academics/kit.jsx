// Small shared UI pieces for the Principal -> Academics screens.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { useKeyboard } from '../../../lib/useKeyboard';
import { Badge, Chip } from '../../kit';
import { Button } from '../../ui';
import { font, radius, spacing } from '../../../theme';

export const YEAR_TONE = { DRAFT: 'muted', ACTIVE: 'success', COMPLETED: 'info', ARCHIVED: 'warning' };
export const ENTITY_TONE = { ACTIVE: 'success', INACTIVE: 'muted' };

export const SUBJECT_TYPES = ['THEORY', 'PRACTICAL', 'BOTH', 'ACTIVITY'];
export const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export function teacherLabel(t) {
  return `${t.name} (${t.department || 'Faculty'})`;
}

export function yearHint(year) {
  if (year.status === 'DRAFT') return 'Planning stage. Activate when the session begins.';
  if (year.status === 'ACTIVE' && year.isCurrent) return 'Running now: the current live session.';
  if (year.status === 'ACTIVE') return 'Active, not current. Set current or complete it.';
  if (year.status === 'COMPLETED') return 'Session finished. Archive it if no longer needed.';
  return 'Archived. Unarchive to use it again.';
}

/** Keyboard-aware scrolling form container. */
export function FormScreen({ children }) {
  const theme = useTheme();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: Math.max(80, keyboardVisible ? keyboardHeight + 80 : 80) }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Horizontal row of filter chips: `options = [{ value, label, count? }]`. */
export function FilterChips({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.count != null ? `${o.label} (${o.count})` : o.label}
          active={o.value === value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </ScrollView>
  );
}

/** Small tappable action: icon + label, tinted by tone (primary | success | warning | danger | info | muted). */
export function ActionPill({ icon, label, onPress, tone = 'primary', disabled }) {
  const theme = useTheme();
  const color =
    { primary: theme.primary, success: theme.success, warning: theme.warning, danger: theme.danger, info: '#0284C7', muted: theme.textMuted }[tone] ||
    theme.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: color,
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      {icon ? <Ionicons name={icon} size={14} color={color} /> : null}
      <Text style={{ color, fontSize: font.sm, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function ActionRow({ children }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>{children}</View>;
}

/** Wrapping grid of label/value cards. */
export function CountGrid({ items }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <View key={it.label} style={styles.count}>
          <Text style={styles.countLabel}>{it.label}</Text>
          <Text style={styles.countValue} numberOfLines={1}>
            {it.value ?? 0}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Muted meta line used inside cards. */
export function Meta({ children }) {
  const theme = useTheme();
  return <Text style={{ color: theme.textMuted, fontSize: font.sm, marginTop: 3 }}>{children}</Text>;
}

export function StatusBadge({ status, map = ENTITY_TONE }) {
  return <Badge label={status || 'ACTIVE'} tone={map[status] || 'muted'} />;
}

/** Slices a long list; `more` is a "Show more" button (or null). */
export function useShowMore(items, step = 20) {
  const [count, setCount] = useState(step);
  const visible = items.slice(0, count);
  const more =
    items.length > count ? (
      <Button title={`Show more (${items.length - count} left)`} variant="secondary" onPress={() => setCount((c) => c + step)} />
    ) : null;
  return { visible, more };
}

/** Checkbox row. */
export function ToggleRow({ label, value, onChange }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: Boolean(value) }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}
    >
      <Ionicons name={value ? 'checkbox' : 'square-outline'} size={22} color={value ? theme.primary : theme.textMuted} />
      <Text style={{ color: theme.text, fontSize: font.md, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    count: {
      flexGrow: 1,
      flexBasis: '45%',
      backgroundColor: t.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
      padding: spacing.md,
    },
    countLabel: { color: t.textMuted, fontSize: font.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    countValue: { color: t.text, fontSize: font.xl, fontWeight: '800', marginTop: 2 },
  });

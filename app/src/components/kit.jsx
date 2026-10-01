import { useState } from 'react';
import { FlatList, Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '../context/ThemeContext';
import { alpha, font, radius, spacing } from '../theme';
import { fmtDate, parseYmd, ymd } from '../lib/format';
import { Button } from './ui';
import { SkeletonList } from './Skeleton';
import NetworkState from './NetworkState';

// Small, theme-aware building blocks shared by the role screens.

// ---------------------------------------------------------------- Badge
const TONES = {
  success: (t) => t.success,
  danger: (t) => t.danger,
  warning: (t) => t.warning,
  muted: (t) => t.textMuted,
  primary: (t) => t.primary,
  info: () => '#0284C7',
};

export function Badge({ label, tone = 'primary', icon }) {
  const theme = useTheme();
  const c = (TONES[tone] || TONES.primary)(theme);
  return (
    <View
      style={[
        kitStatic.badge,
        {
          backgroundColor: alpha(c, theme.isDark ? 0.22 : 0.12),
          borderColor: alpha(c, theme.isDark ? 0.4 : 0.25),
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={12} color={c} style={{ marginRight: 4 }} /> : null}
      <Text style={[kitStatic.badgeText, { color: c }]}>{label}</Text>
    </View>
  );
  
}


// Comprehensive status → badge tone.
export const STATUS_TONE = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'muted',
  ASSIGNED: 'primary',
  ACTIVE: 'primary',
  CLOSED: 'muted',
  DRAFT: 'muted',
  PUBLISHED: 'success',
  SUBMITTED: 'primary',
  GRADED: 'success',
  EVALUATED: 'success',
  LATE: 'warning',
  OVERDUE: 'danger',
  SCHEDULED: 'primary',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  PRESENT: 'success',
  ABSENT: 'danger',
  LEAVE: 'info',
  HALF_DAY: 'warning',
  PASS: 'success',
  FAIL: 'danger',
  MEDICAL: 'warning',
  EXEMPTED: 'info',
};

export function StatusBadge({ status }) {
  if (!status) return null;
  return <Badge label={String(status).replace(/_/g, ' ')} tone={STATUS_TONE[String(status).toUpperCase()] || 'muted'} />;
}

// ---------------------------------------------------------------- Chip / Segmented
export function Chip({ label, active, onPress, color, disabled, style }) {
  const theme = useTheme();
  const c = color || theme.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={[
        kitStatic.chip,
        { borderColor: active ? c : theme.border, backgroundColor: active ? c : theme.surface },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Text style={{ color: active ? '#FFFFFF' : theme.text, fontWeight: '700', fontSize: font.sm }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented({ options, value, onChange }) {
  const theme = useTheme();
  return (
    <View style={[kitStatic.segment, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[kitStatic.segmentItem, active && { backgroundColor: theme.surface, shadowOpacity: 0.08, elevation: 1 }]}
          >
            <Text style={{ fontWeight: '700', color: active ? theme.primary : theme.textMuted, fontSize: font.md }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- states
export function EmptyState({ icon = 'file-tray-outline', title, message, action }) {
  const theme = useTheme();
  return (
    <View style={kitStatic.center}>
      <View style={[kitStatic.emptyIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={30} color={theme.primary} />
      </View>
      <Text style={[kitStatic.emptyTitle, { color: theme.text }]}>{title}</Text>
      {message ? <Text style={[kitStatic.emptyMsg, { color: theme.textMuted }]}>{message}</Text> : null}
      {action}
    </View>
  );
}

// Failed load → offline / server-down / error illustration (auto-retries when
// the connection comes back). Every screen's error path goes through here.
export function ErrorView({ error, onRetry }) {
  return <NetworkState error={error} onRetry={onRetry} />;
}

// First-load placeholder. Kept under the old name so any screen that still
// renders <Spinner /> gets a skeleton list, never a spinner.
export function Spinner() {
  return <SkeletonList />;
}

/**
 * Loading / error / content switch for a `useAsync` result. `skeleton` is the
 * screen-shaped placeholder for the first load (default: list rows; the
 * parent usually already pads, so the default is unpadded).
 */
export function AsyncView({ state, children, empty, skeleton }) {
  if (state.loading && !state.data) return skeleton || <SkeletonList padded={false} />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  if (empty && empty.when(state.data)) return empty.view;
  return children(state.data);
}

// ---------------------------------------------------------------- rows & headers
export function PageHeader({ title, subtitle, badge, right, style }) {
  const theme = useTheme();
  return (
    <View style={[{ marginBottom: spacing.lg }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: font.xxl, fontWeight: '800', color: theme.text, letterSpacing: -0.3 }}>{title}</Text>
          {badge}
        </View>
        {right}
      </View>
      {subtitle ? <Text style={{ fontSize: font.sm, color: theme.textMuted, marginTop: 4 }}>{subtitle}</Text> : null}
    </View>
  );
}

export function Avatar({ source, name, size = 42, style }) {
  const theme = useTheme();
  const src = typeof source === 'string' ? { uri: source } : source;
  const uri = typeof source === 'string' ? source : source?.uri;
  const [prevUri, setPrevUri] = useState(uri);
  const [failed, setFailed] = useState(false);
  if (prevUri !== uri) {
    setPrevUri(uri);
    setFailed(false);
  }

  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

  const hasImage = Boolean(uri && !failed);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: alpha(theme.primary, theme.isDark ? 0.22 : 0.12),
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: alpha(theme.primary, 0.2),
        },
        style,
      ]}
    >
      {hasImage ? (
        <Image
          source={src}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ fontSize: Math.max(12, size * 0.38), fontWeight: '900', color: theme.primary }}>
          {initials}
        </Text>
      )}
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...', onClear, style }) {
  const theme = useTheme();
  return (
    <View style={[kitStatic.searchBarWrap, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }, style]}>
      <Ionicons name="search" size={18} color={theme.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        style={[kitStatic.searchBarInput, { color: theme.text }]}
        autoCorrect={false}
      />
      {value ? (
        <Pressable onPress={onClear || (() => onChangeText(''))} hitSlop={8} style={{ padding: 4 }}>
          <Ionicons name="close-circle" size={18} color={theme.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionTitle({ title, right }) {
  const theme = useTheme();
  return (
    <View style={kitStatic.sectionTitle}>
      <Text style={{ fontSize: font.lg, fontWeight: '800', color: theme.text }}>{title}</Text>
      {right}
    </View>
  );
}

export function ListRow({ icon, iconColor, title, subtitle, right, onPress, unread, disabled }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: alpha(iconColor || theme.primary, theme.isDark ? 0.22 : 0.12) }]}>
          <Ionicons name={icon} size={20} color={iconColor || theme.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, unread && { fontWeight: '800' }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={theme.textMuted} /> : null}
    </Pressable>
  );
}

export function Stat({ label, value, icon, color, onPress }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const c = color || theme.primary;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.stat, pressed && { opacity: 0.75 }]}>
      <View style={[styles.rowIcon, { backgroundColor: alpha(c, theme.isDark ? 0.22 : 0.12) }]}>
        <Ionicons name={icon} size={18} color={c} />
      </View>
      <Text style={styles.statValue}>{value ?? '–'}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function StatCard({ label, value, icon, color, subtitle, onPress, style }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const c = color || theme.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.statCard,
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      <View style={styles.statCardTop}>
        <View style={[styles.statIconBox, { backgroundColor: alpha(c, theme.isDark ? 0.22 : 0.12) }]}>
          <Ionicons name={icon} size={20} color={c} />
        </View>
        {subtitle ? <Text style={styles.statCardSub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.statCardVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value ?? '–'}</Text>
      <Text style={styles.statCardLbl} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, height = 8, color, style }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number(value) || 0));
  const activeColor = color || theme.primary;
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: theme.surfaceAlt, overflow: 'hidden' }, style]}>
      <View style={{ width: `${Math.round(clamped * 100)}%`, height: '100%', backgroundColor: activeColor, borderRadius: height / 2 }} />
    </View>
  );
}

// ---------------------------------------------------------------- form fields
export function FieldLabel({ children }) {
  const theme = useTheme();
  return <Text style={{ fontSize: font.md, color: theme.text, fontWeight: '600', marginBottom: spacing.sm }}>{children}</Text>;
}

export function TextArea({ label, error, style, ...props }) {
  const theme = useTheme();
  return (
    <View style={[{ marginBottom: spacing.lg }, style]}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <TextInput
        multiline
        textAlignVertical="top"
        placeholderTextColor={theme.textMuted}
        style={{
          minHeight: 110,
          borderWidth: 1.5,
          borderColor: error ? theme.danger : theme.border,
          borderRadius: radius.md,
          padding: spacing.md,
          backgroundColor: theme.surfaceAlt,
          color: theme.text,
          fontSize: font.lg,
        }}
        {...props}
      />
      {error ? <Text style={{ color: theme.danger, fontSize: font.sm, marginTop: spacing.xs }}>{error}</Text> : null}
    </View>
  );
}

function FieldBox({ label, value, placeholder, icon, onPress, error, disabled }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          borderWidth: 1.5,
          borderColor: error ? theme.danger : theme.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          backgroundColor: theme.surfaceAlt,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text style={{ flex: 1, fontSize: font.lg, color: value ? theme.text : theme.textMuted }} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name={icon} size={20} color={theme.textMuted} />
      </Pressable>
      {error ? <Text style={{ color: theme.danger, fontSize: font.sm, marginTop: spacing.xs }}>{error}</Text> : null}
    </View>
  );
}

/** Dropdown: `options = [{ value, label, sub? }]`. */
export function Select({ label, value, options, onChange, placeholder, error, disabled }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <FieldBox
        label={label}
        value={current?.label}
        placeholder={placeholder || (label ? `Select ${label.toLowerCase()}` : 'Select')}
        icon="chevron-down"
        onPress={() => setOpen(true)}
        error={error}
        disabled={disabled}
      />
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={kitStatic.backdrop} onPress={() => setOpen(false)} />
        <View style={[kitStatic.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={[kitStatic.grabber, { backgroundColor: theme.border }]} />
          {label ? <Text style={{ fontSize: font.lg, fontWeight: '800', color: theme.text, marginBottom: spacing.sm }}>{label}</Text> : null}
          <FlatList
            data={options}
            keyExtractor={(o) => String(o.value)}
            style={{ maxHeight: 420 }}
            ListEmptyComponent={<Text style={{ color: theme.textMuted, padding: spacing.lg }}>Nothing to choose from.</Text>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                style={{ paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: font.lg, color: theme.text, fontWeight: item.value === value ? '800' : '500' }}>{item.label}</Text>
                  {item.sub ? <Text style={{ color: theme.textMuted, fontSize: font.sm }}>{item.sub}</Text> : null}
                </View>
                {item.value === value ? <Ionicons name="checkmark" size={20} color={theme.primary} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

/** Date field bound to a YYYY-MM-DD string. */
export function DateField({ label, value, onChange, minimumDate, maximumDate, error, disabled }) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const onPick = (event, date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && date) onChange(ymd(date));
  };
  return (
    <>
      <FieldBox
        label={label}
        value={value ? fmtDate(value) : ''}
        placeholder="Pick a date"
        icon="calendar-outline"
        onPress={() => setOpen((o) => !o)}
        error={error}
        disabled={disabled}
      />
      {open ? (
        <View style={Platform.OS === 'ios' ? { marginTop: -spacing.md, marginBottom: spacing.lg } : null}>
          <DateTimePicker
            value={parseYmd(value || ymd())}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            accentColor={theme.primary}
            themeVariant={theme.isDark ? 'dark' : 'light'}
            onChange={onPick}
          />
          {Platform.OS === 'ios' ? <Button title="Done" variant="secondary" onPress={() => setOpen(false)} /> : null}
        </View>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- styles
const kitStatic = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: font.xs, fontWeight: '800', letterSpacing: 0.3 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  segment: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm, shadowColor: '#000', shadowOpacity: 0, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, minHeight: 280 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyTitle: { fontSize: font.lg, fontWeight: '800', textAlign: 'center' },
  emptyMsg: { fontSize: font.md, textAlign: 'center', marginTop: spacing.xs },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: spacing.lg },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBarInput: {
    flex: 1,
    height: '100%',
    fontSize: font.md,
  },
});

const makeStyles = (t) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: font.lg, color: t.text, fontWeight: '600' },
    rowSub: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    dot: { width: 9, height: 9, borderRadius: 5 },
    stat: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: t.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: t.isDark ? 1 : 0,
      borderColor: t.border,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: t.isDark ? 0 : 1,
    },
    statValue: { fontSize: font.xxl, fontWeight: '800', color: t.text, marginTop: spacing.sm },
    statLabel: { fontSize: font.sm, color: t.textMuted },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: t.surface,
      borderRadius: 18,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.04,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: t.isDark ? 0 : 2,
    },
    statCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    statIconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statCardSub: {
      flexShrink: 1,
      marginLeft: spacing.sm,
      textAlign: 'right',
      fontSize: font.xs,
      color: t.textMuted,
      fontWeight: '600',
    },
    statCardVal: {
      fontSize: font.xxl,
      fontWeight: '800',
      color: t.text,
      letterSpacing: -0.5,
    },
    statCardLbl: {
      fontSize: font.sm,
      fontWeight: '600',
      color: t.textMuted,
      marginTop: 2,
    },
  });

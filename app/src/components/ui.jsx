import { forwardRef, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../context/ThemeContext';
import { font, radius, spacing } from '../theme';

// While `loading`, the button is disabled and shows `loadingTitle` (e.g.
// "Signing in...") in place of its title — no spinner.
export function Button({
  title,
  onPress,
  loading,
  loadingTitle,
  disabled,
  variant = 'primary',
  icon,
  style,
  textStyle,
}) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const off = disabled || loading;
  // `loading` only disables the button after the next render, so two taps in
  // the same frame could both submit. While an async onPress is running,
  // further taps are ignored synchronously.
  const inFlight = useRef(false);
  const handlePress = (e) => {
    if (inFlight.current || !onPress) return;
    const out = onPress(e);
    if (out && typeof out.then === 'function') {
      inFlight.current = true;
      const release = () => {
        inFlight.current = false;
      };
      out.then(release, release);
    }
  };

  let btnStyle = styles.btnPrimary;
  let fg = theme.onPrimary;

  if (variant === 'secondary') {
    btnStyle = styles.btnSecondary;
    fg = theme.text;
  } else if (variant === 'danger') {
    btnStyle = styles.btnDanger;
    fg = '#FFFFFF';
  } else if (variant === 'outline') {
    btnStyle = styles.btnOutline;
    fg = theme.primary;
  } else if (variant === 'ghost') {
    btnStyle = styles.btnGhost;
    fg = theme.primary;
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(off), busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.btn,
        btnStyle,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        off && { opacity: loading ? 0.7 : 0.55 },
        style,
      ]}
    >
      {loading ? (
        <Text style={[styles.btnText, { color: fg }, textStyle]}>{loadingTitle || 'Please wait...'}</Text>
      ) : (
        <View style={styles.btnRow}>
          {icon ? <Ionicons name={icon} size={18} color={fg} style={{ marginRight: spacing.sm }} /> : null}
          <Text style={[styles.btnText, { color: fg }, textStyle]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export const Input = forwardRef(function Input(
  { label, icon, error, required, secureTextEntry, style, ...props },
  ref,
) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={[{ marginBottom: spacing.lg }, style]}>
      {label ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
          <Text style={styles.label}>{label}</Text>
          {required ? <Text style={{ color: theme.danger, marginLeft: 3, fontWeight: '700' }}>*</Text> : null}
        </View>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          focused && { borderColor: theme.primary, backgroundColor: theme.surface },
          error && { borderColor: theme.danger },
        ]}
      >
        {icon ? <Ionicons name={icon} size={20} color={focused ? theme.primary : theme.textMuted} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          secureTextEntry={isPassword && hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {isPassword ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs }}>
          <Ionicons name="alert-circle" size={14} color={theme.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
});

export function Card({ children, style }) {
  const styles = useStyles(makeStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Loader() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    btn: {
      height: 50,
      minHeight: 48,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    btnPrimary: {
      backgroundColor: t.primary,
      shadowColor: t.primary,
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    btnSecondary: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    btnDanger: {
      backgroundColor: t.danger,
      shadowColor: t.danger,
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    btnOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: t.primary,
    },
    btnGhost: {
      backgroundColor: 'transparent',
    },
    btnRow: { flexDirection: 'row', alignItems: 'center' },
    btnText: { fontSize: font.md, fontWeight: '700', letterSpacing: 0.2 },
    label: { fontSize: font.md, color: t.text, fontWeight: '600' },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 50,
      borderWidth: 1.5,
      borderColor: t.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      backgroundColor: t.surfaceAlt,
      gap: spacing.sm,
    },
    input: { flex: 1, height: '100%', fontSize: font.md, color: t.text },
    error: { color: t.danger, fontSize: font.xs, fontWeight: '600' },
    card: {
      backgroundColor: t.surface,
      borderRadius: 18,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 3 },
      elevation: t.isDark ? 0 : 1.5,
    },
  });

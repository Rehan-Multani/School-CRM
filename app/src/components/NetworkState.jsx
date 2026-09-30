import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useOffline } from '../lib/useNetwork';
import { errorText } from '../lib/format';
import { alpha, font, spacing } from '../theme';
import { Button } from './ui';

// Full-area state for a failed load. Picks the right story:
//   • device offline            → "No internet connection" (+ auto-retry when back)
//   • online but server down    → "Server not reachable"
//   • anything else             → "Something went wrong" + the server's message
const KINDS = {
  offline: {
    icon: 'wifi-outline',
    slash: true,
    title: 'No internet connection',
    message: 'Check your Wi-Fi or mobile data. We will reload automatically when you are back online.',
  },
  server: {
    icon: 'server-outline',
    slash: false,
    title: 'Server not reachable',
    message: "We couldn't reach the school server. Please try again in a moment.",
  },
  error: {
    icon: 'alert-circle-outline',
    slash: false,
    title: 'Something went wrong',
    message: null,
  },
};

function Illustration({ icon, slash, tone }) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const ring = (delay) => ({
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35 - delay, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6 + delay] }) }],
  });
  return (
    <View style={styles.illo}>
      <Animated.View style={[styles.ring, { borderColor: tone }, ring(0)]} />
      <Animated.View style={[styles.ring, { borderColor: tone }, ring(0.15)]} />
      <View style={[styles.circle, { backgroundColor: alpha(tone, theme.isDark ? 0.2 : 0.1) }]}>
        <View style={[styles.inner, { backgroundColor: theme.surface, shadowColor: tone }]}>
          <Ionicons name={icon} size={44} color={tone} />
          {slash ? <View style={[styles.slash, { backgroundColor: tone, borderColor: theme.surface }]} /> : null}
        </View>
      </View>
    </View>
  );
}

export default function NetworkState({ error, onRetry, compact = false }) {
  const theme = useTheme();
  const offline = useOffline();
  const kind = offline || error?.code === 'OFFLINE' ? 'offline' : error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT' || error?.status >= 500 ? 'server' : 'error';
  const k = KINDS[kind];
  const tone = kind === 'error' ? theme.danger : kind === 'offline' ? theme.warning : theme.primary;

  // Back online after an offline failure → reload by itself.
  const wasOffline = useRef(offline);
  useEffect(() => {
    if (wasOffline.current && !offline && onRetry) onRetry();
    wasOffline.current = offline;
  }, [offline, onRetry]);

  return (
    <View style={[styles.wrap, compact && { minHeight: 0, paddingVertical: spacing.lg }]}>
      <Illustration icon={k.icon} slash={k.slash} tone={tone} />
      <Text style={[styles.title, { color: theme.text }]}>{k.title}</Text>
      <Text style={[styles.msg, { color: theme.textMuted }]}>{k.message || errorText(error)}</Text>
      {offline ? (
        <View style={[styles.tips, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {['Turn off Airplane mode', 'Turn on Wi-Fi or mobile data', 'Move closer to your router'].map((t) => (
            <View key={t} style={styles.tipRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.textMuted} />
              <Text style={{ color: theme.textMuted, fontSize: font.sm }}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {onRetry ? (
        <Button title="Try again" icon="refresh" onPress={() => onRetry()} style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, minHeight: 420 },
  illo: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  ring: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 2 },
  circle: { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center' },
  inner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  slash: { position: 'absolute', width: 58, height: 5, borderRadius: 3, borderWidth: 1.5, transform: [{ rotate: '-45deg' }] },
  title: { fontSize: font.xl, fontWeight: '800', textAlign: 'center' },
  msg: { fontSize: font.md, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20, maxWidth: 320 },
  tips: { marginTop: spacing.lg, borderRadius: 14, borderWidth: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: 6, alignSelf: 'stretch' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btn: { marginTop: spacing.xl, alignSelf: 'stretch' },
});

import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../lib/useNetwork';
import { font, spacing } from '../theme';

// Floating pill just above the bottom tab bar (never over the screen header):
// red "No internet connection" while offline, then a short green
// "Back online" once the connection returns.
const BACK_ONLINE_MS = 2200;

export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const offline = useOffline();
  const [mode, setMode] = useState(null); // null | 'offline' | 'online'
  const anim = useRef(new Animated.Value(0)).current;
  const wasOffline = useRef(false);

  useEffect(() => {
    let t;
    if (offline) {
      wasOffline.current = true;
      setMode('offline');
    } else if (wasOffline.current) {
      wasOffline.current = false;
      setMode('online');
      t = setTimeout(() => setMode(null), BACK_ONLINE_MS);
    }
    return () => clearTimeout(t);
  }, [offline]);

  useEffect(() => {
    Animated.spring(anim, { toValue: mode ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
  }, [mode, anim]);

  const online = mode === 'online';
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pill,
        { bottom: insets.bottom + 100, backgroundColor: online ? '#16A34A' : '#1F2937' },
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        },
      ]}
    >
      <Ionicons name={online ? 'wifi' : 'cloud-offline-outline'} size={16} color={online ? '#FFFFFF' : '#FCA5A5'} />
      <Text style={styles.text}>{online ? 'Back online' : 'No internet connection'}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 100,
    elevation: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  text: { color: '#FFFFFF', fontSize: font.md, fontWeight: '700' },
});

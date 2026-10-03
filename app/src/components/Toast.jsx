import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { subscribeToasts } from '../lib/notify';
import { useTheme } from '../context/ThemeContext';

const VARIANTS = {
  success: {
    icon: 'checkmark-circle',
    title: 'Success',
    color: '#10B981',
    lightBg: '#ECFDF5',
    darkBg: 'rgba(16, 185, 129, 0.15)',
    lightBorder: '#A7F3D0',
    darkBorder: 'rgba(16, 185, 129, 0.35)',
    duration: 3500,
  },
  error: {
    icon: 'alert-circle',
    title: 'Error',
    color: '#EF4444',
    lightBg: '#FEF2F2',
    darkBg: 'rgba(239, 68, 68, 0.15)',
    lightBorder: '#FECACA',
    darkBorder: 'rgba(239, 68, 68, 0.35)',
    duration: 4500,
  },
  warning: {
    icon: 'warning',
    title: 'Warning',
    color: '#F59E0B',
    lightBg: '#FFFBEB',
    darkBg: 'rgba(245, 158, 11, 0.15)',
    lightBorder: '#FDE68A',
    darkBorder: 'rgba(245, 158, 11, 0.35)',
    duration: 4000,
  },
  info: {
    icon: 'information-circle',
    title: 'Info',
    color: '#3B82F6',
    lightBg: '#EFF6FF',
    darkBg: 'rgba(59, 130, 246, 0.15)',
    lightBorder: '#BFDBFE',
    darkBorder: 'rgba(59, 130, 246, 0.35)',
    duration: 3500,
  },
};

function ToastCard({ toast, onDismiss, theme }) {
  const variant = VARIANTS[toast.type] || VARIANTS.info;
  const [anim] = useState(() => new Animated.Value(0));
  const isClosing = useRef(false);

  const handleDismiss = () => {
    if (isClosing.current) return;
    isClosing.current = true;
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      onDismiss(toast.id);
    });
  };

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();

    const dur = toast.duration || variant.duration;
    const timer = setTimeout(handleDismiss, dur);
    return () => clearTimeout(timer);
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, 0],
  });

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  const isDark = Boolean(theme?.isDark);
  const title = toast.title || variant.title;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#141C2F' : '#FFFFFF',
          borderColor: isDark ? variant.darkBorder : variant.lightBorder,
          shadowColor: isDark ? '#000000' : '#0F172A',
          opacity: anim,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {/* Accent left indicator */}
      <View style={[styles.accentStrip, { backgroundColor: variant.color }]} />

      <View style={[styles.iconWrap, { backgroundColor: isDark ? variant.darkBg : variant.lightBg }]}>
        <Ionicons name={variant.icon} size={18} color={variant.color} />
      </View>

      <View style={styles.contentWrap}>
        {title ? (
          <Text style={[styles.title, { color: isDark ? '#F1F5F9' : '#0F172A' }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {toast.message ? (
          <Text style={[styles.message, { color: isDark ? '#94A3B8' : '#475569' }]} numberOfLines={3}>
            {toast.message}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={handleDismiss}
        hitSlop={8}
        style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
      >
        <Ionicons name="close" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
      </Pressable>
    </Animated.View>
  );
}

export default function ToastContainer() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [toasts, setToasts] = useState([]);

  // Phones: centred just below the status bar (the floating tab bar owns the
  // bottom edge). Tablets / web: stacked in the top-right corner.
  const isLargeScreen = width >= 768;

  useEffect(() => {
    return subscribeToasts(({ action, toast: newToast, id }) => {
      if (action === 'ADD') {
        setToasts((prev) => {
          // If the exact same message + type already exists, replace it
          const filtered = prev.filter(
            (t) => !(t.message === newToast.message && t.type === newToast.type)
          );
          const updated = [...filtered, newToast];
          return updated.slice(-4);
        });
      } else if (action === 'DISMISS') {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }
    });
  }, []);

  const handleDismiss = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  const statusBarHeight = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 0;
  const topOffset = Platform.OS === 'web' ? 16 : Math.max(insets.top, statusBarHeight) + 12;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        { top: topOffset },
        isLargeScreen ? { right: 4, width: 432, alignItems: 'flex-end' } : { left: 0, right: 0, alignItems: 'center' },
      ]}
    >
      {toasts.map((item) => (
        <ToastCard
          key={item.id}
          toast={item}
          onDismiss={handleDismiss}
          theme={theme}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 99999,
    elevation: 99999,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  card: {
    width: Platform.OS === 'web' ? 380 : '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  message: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

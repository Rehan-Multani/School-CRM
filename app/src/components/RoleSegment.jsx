import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import GlassSurface from './GlassSurface';
import { useLiquidSlide } from '../lib/useLiquidSlide';
import { alpha, brandTheme as t, font, radius } from '../theme';

// Role selector for the pre-auth screens (login, forgot password). One glass thumb
// slides between the roles over a brand-tinted track, stretching mid-flight, instead
// of each item switching its own background on and off.

const PAD = 4;
const BORDER = 1;
export const SEGMENT_SPRING = { damping: 20, stiffness: 240, mass: 0.8 };

function SegmentItem({ role, active, onPress }) {
  const focus = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    focus.set(withSpring(active ? 1 : 0, SEGMENT_SPRING));
  }, [active, focus]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + focus.get() * 0.04 }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(focus.get(), [0, 1], [t.textMuted, t.primary]),
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Animated.View style={[styles.itemContent, contentStyle]}>
        <Ionicons name={role.icon} size={17} color={active ? t.primary : t.textMuted} />
        <Animated.Text style={[styles.text, active && styles.textActive, textStyle]}>{role.label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export default function RoleSegment({ roles, value, onChange, style }) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, roles.findIndex((r) => r.key === value));
  const itemWidth = width > 0 ? (width - (PAD + BORDER) * 2) / roles.length : 0;
  const { position, stretch } = useLiquidSlide(index, SEGMENT_SPRING);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: position.get() * itemWidth },
      { scaleX: 1 + stretch.get() * 0.16 },
      { scaleY: 1 - stretch.get() * 0.07 },
    ],
  }));

  return (
    <View
      style={[styles.segment, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {itemWidth > 0 ? (
        <Animated.View pointerEvents="none" style={[styles.thumb, { width: itemWidth }, thumbStyle]}>
          <GlassSurface radius={radius.md} fill="rgba(255,255,255,0.86)" interactive style={styles.thumbGlass} />
        </Animated.View>
      ) : null}
      {roles.map((r) => (
        <SegmentItem key={r.key} role={r} active={r.key === value} onPress={() => onChange(r.key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: alpha(t.primary, 0.08),
    borderWidth: BORDER,
    borderColor: alpha(t.primary, 0.1),
    borderRadius: radius.md + 2,
    padding: PAD,
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
  },
  thumbGlass: { flex: 1 },
  item: { flex: 1, paddingVertical: 8, borderRadius: radius.md },
  itemContent: { alignItems: 'center', gap: 3 },
  text: { fontSize: font.sm, fontWeight: '600', color: t.textMuted },
  textActive: { fontWeight: '700' },
});

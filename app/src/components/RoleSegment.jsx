import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { alpha, brandTheme as t, font, radius, spacing } from '../theme';

// Role selector for the pre-auth screens (login, forgot password). Each role is its
// own card with a colour-coded icon badge; the active card is lifted with a brand
// border + soft tint, matching the app's sign-in design.

export const SEGMENT_SPRING = { damping: 20, stiffness: 240, mass: 0.8 };

function RoleCard({ role, active, onPress }) {
  const focus = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    focus.set(withSpring(active ? 1 : 0, SEGMENT_SPRING));
  }, [active, focus]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + focus.get() * 0.03 }],
  }));

  const accent = role.color || t.primary;

  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Animated.View
        style={[styles.card, active && styles.cardActive, cardStyle]}
      >
        <View style={[styles.badge, { backgroundColor: alpha(accent, 0.14) }]}>
          <Ionicons name={role.solidIcon || role.icon} size={18} color={accent} />
        </View>
        <Text
          style={[styles.text, active && styles.textActive]}
          numberOfLines={1}
        >
          {role.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function RoleSegment({ roles, value, onChange, style }) {
  return (
    <View style={[styles.segment, style]} accessibilityRole="tablist">
      {roles.map((r) => (
        <RoleCard key={r.key} role={r} active={r.key === value} onPress={() => onChange(r.key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    gap: 6,
  },
  item: { flex: 1 },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: 2,
    borderRadius: radius.md + 2,
    borderWidth: 1.5,
    borderColor: alpha(t.text, 0.08),
    backgroundColor: t.surface,
  },
  cardActive: {
    borderColor: t.primary,
    backgroundColor: alpha(t.primary, 0.06),
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 10.5, fontWeight: '600', color: t.textMuted, letterSpacing: -0.1 },
  textActive: { fontWeight: '700', color: t.text },
});

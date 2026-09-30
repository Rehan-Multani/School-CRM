import { useEffect } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme';

// Skeleton placeholders shown while a screen's first load is in flight — the
// shape of the real content, pulsing, instead of a spinner.
//
// One shared pulse drives every bone on screen so they breathe in sync; it
// only runs while at least one bone is mounted.
const pulse = new Animated.Value(0);
let users = 0;
let loop = null;

function usePulse() {
  useEffect(() => {
    users += 1;
    if (users === 1) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      loop.start();
    }
    return () => {
      users -= 1;
      if (users === 0 && loop) {
        loop.stop();
        loop = null;
      }
    };
  }, []);
  return pulse;
}

const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

/** One grey block. `w` / `h` accept numbers or percentages. */
export function Bone({ w = '100%', h = 14, r = 6, style }) {
  const theme = useTheme();
  usePulse();
  return (
    <Animated.View
      style={[{ width: w, height: h, borderRadius: r, backgroundColor: theme.isDark ? theme.surfaceAlt : '#E5E9F0', opacity }, style]}
    />
  );
}

function Box({ children, style }) {
  const theme = useTheme();
  return (
    <View style={[{ backgroundColor: theme.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

/** List rows: icon + two text lines (+ optional right badge). */
export function SkeletonRow({ icon = true, badge = false }) {
  const theme = useTheme();
  return (
    <View style={[s.row, { borderBottomColor: theme.border }]}>
      {icon ? <Bone w={40} h={40} r={12} /> : null}
      <View style={{ flex: 1, gap: 8 }}>
        <Bone w="70%" h={14} />
        <Bone w="45%" h={11} />
      </View>
      {badge ? <Bone w={56} h={20} r={10} /> : null}
    </View>
  );
}

export function SkeletonList({ count = 8, icon = true, badge = false, header = null, padded = true }) {
  return (
    <View style={padded ? s.pad : null}>
      {header}
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} icon={icon} badge={badge} />
      ))}
    </View>
  );
}

/** Stacked cards: title + badge, two meta lines. Homework, leaves, materials… */
export function SkeletonCards({ count = 5, header = null, padded = true }) {
  return (
    <View style={padded ? s.pad : null}>
      {header}
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} style={{ marginBottom: spacing.md, gap: 10 }}>
          <View style={s.between}>
            <Bone w="60%" h={16} />
            <Bone w={64} h={20} r={10} />
          </View>
          <Bone w="45%" h={11} />
          <View style={s.between}>
            <Bone w="30%" h={11} />
            <Bone w="35%" h={11} />
          </View>
        </Box>
      ))}
    </View>
  );
}

/** Chip row placeholder (filters / segmented control). */
export function SkeletonChips({ count = 3 }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <Bone key={i} w={78} h={32} r={16} />
      ))}
    </View>
  );
}

/** Detail page: header card with title/meta/body, then a list card. */
export function SkeletonDetail({ rows = 5, avatar = false, padded = true }) {
  return (
    <View style={padded ? s.pad : null}>
      {avatar ? (
        <View style={{ alignItems: 'center', marginBottom: spacing.lg, gap: 10 }}>
          <Bone w={76} h={76} r={38} />
          <Bone w="45%" h={18} />
          <Bone w="30%" h={12} />
        </View>
      ) : null}
      <Box style={{ gap: 10 }}>
        <View style={s.between}>
          <Bone w="65%" h={20} />
          {!avatar ? <Bone w={64} h={20} r={10} /> : null}
        </View>
        <Bone w="50%" h={12} />
        <Bone w="40%" h={12} />
        <Bone w="95%" h={12} style={{ marginTop: 8 }} />
        <Bone w="85%" h={12} />
        <Bone w="60%" h={12} />
      </Box>
      <Bone w="35%" h={18} style={{ marginTop: spacing.xl, marginBottom: spacing.md }} />
      <Box style={{ paddingVertical: 0 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} icon={false} badge />
        ))}
      </Box>
    </View>
  );
}

/** Form: label + field pairs, then a button. */
export function SkeletonForm({ fields = 6, padded = true }) {
  return (
    <View style={padded ? s.pad : null}>
      {Array.from({ length: fields }).map((_, i) => (
        <View key={i} style={{ marginBottom: spacing.lg, gap: 8 }}>
          <Bone w="30%" h={12} />
          <Bone h={52} r={12} />
        </View>
      ))}
      <Bone h={52} r={12} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

/** Teacher home body: 2×2 stats, next class, period strip. */
export function SkeletonHome() {
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} style={{ flex: 1, minWidth: '45%', gap: 10 }}>
            <Bone w={36} h={36} r={12} />
            <Bone w="40%" h={24} />
            <Bone w="70%" h={11} />
          </Box>
        ))}
      </View>
      <Box style={{ marginTop: spacing.lg, gap: 8 }}>
        <Bone w="25%" h={10} />
        <Bone w="70%" h={16} />
        <Bone w="50%" h={11} />
      </Box>
      <Bone w="40%" h={18} style={{ marginTop: spacing.xl, marginBottom: spacing.md }} />
      <ScrollView horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} style={{ width: 170, gap: 8 }}>
            <Bone w={34} h={20} r={10} />
            <Bone w="70%" h={11} />
            <Bone w="80%" h={16} />
            <Bone w="50%" h={11} />
          </Box>
        ))}
      </ScrollView>
    </View>
  );
}

/** Attendance / marks sheet: summary strip then per-student cards with chips. */
export function SkeletonSheet({ count = 7, chips = 5, padded = true }) {
  return (
    <View style={padded ? s.pad : null}>
      <View style={s.between}>
        <Bone w="45%" h={22} />
        <Bone w={80} h={20} r={10} />
      </View>
      <Box style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.lg }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <Bone w={26} h={20} />
            <Bone w={40} h={10} />
          </View>
        ))}
      </Box>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} style={{ marginBottom: spacing.sm, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Bone w={24} h={16} />
            <Bone w="55%" h={15} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {Array.from({ length: chips }).map((__, j) => (
              <Bone key={j} h={32} r={8} style={{ flex: 1 }} w={null} />
            ))}
          </View>
        </Box>
      ))}
    </View>
  );
}

/** Chat: alternating bubbles. */
export function SkeletonChat({ padded = true } = {}) {
  const widths = ['62%', '48%', '70%', '40%', '58%', '66%'];
  return (
    <View style={padded ? s.pad : null}>
      {widths.map((w, i) => (
        <Bone key={i} w={w} h={i % 3 === 0 ? 58 : 42} r={16} style={{ alignSelf: i % 2 ? 'flex-end' : 'flex-start', marginBottom: spacing.md }} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  pad: { padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

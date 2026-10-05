import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassSurface, { LIQUID_GLASS } from './GlassSurface';
import { useTheme } from '../context/ThemeContext';
import { useTeacher } from '../context/TeacherContext';
import { useLiquidSlide } from '../lib/useLiquidSlide';
import { alpha } from '../theme';

const TAB_DEFAULTS = {
  index: { title: 'Home', icon: 'home' },
  classes: { title: 'Classes', icon: 'people' },
  attendance: { title: 'Attendance', icon: 'checkmark-done-circle' },
  inbox: { title: 'Inbox', icon: 'mail' },
  academics: { title: 'Academics', icon: 'library' },
  notifications: { title: 'Alerts', icon: 'notifications' },
  notices: { title: 'Notices', icon: 'megaphone' },
  fleet: { title: 'Fleet', icon: 'bus' },
  profile: { title: 'Profile', icon: 'person' },
};

const SLIDE_SPRING = { damping: 20, stiffness: 240, mass: 0.8 };
const FOCUS_SPRING = { damping: 14, stiffness: 220, mass: 0.7 };
const PRESS_SPRING = { damping: 16, stiffness: 320, mass: 0.6 };

function TabItem({
  route,
  isFocused,
  options,
  onPress,
  onLongPress,
  badgeCount,
  theme,
}) {
  const press = useSharedValue(1);
  const focus = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    focus.set(withSpring(isFocused ? 1 : 0, FOCUS_SPRING));
  }, [isFocused, focus]);

  const handlePressIn = () => press.set(withSpring(0.9, PRESS_SPRING));
  const handlePressOut = () => press.set(withSpring(1, PRESS_SPRING));

  const contentStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.get() }] }));
  // The focused icon lifts and grows a touch as the shared pill lands under it.
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: focus.get() * -1 }, { scale: 1 + focus.get() * 0.1 }],
  }));

  const tabInfo = TAB_DEFAULTS[route.name] || {
    title: options.title || route.name,
    icon: 'ellipse',
  };

  const title =
    options.tabBarLabel !== undefined
      ? options.tabBarLabel
      : options.title !== undefined
        ? options.title
        : tabInfo.title;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel || title}
    >
      <Animated.View style={[styles.tabContent, contentStyle]}>
        <View style={styles.iconWrapper}>
          <Animated.View style={iconStyle}>
            {typeof options.tabBarIcon === 'function' ? (
              options.tabBarIcon({
                focused: isFocused,
                color: isFocused ? theme.primary : theme.textMuted,
                size: 21,
              })
            ) : (
              <Ionicons
                name={isFocused ? tabInfo.icon : `${tabInfo.icon}-outline`}
                size={21}
                color={isFocused ? theme.primary : theme.textMuted}
              />
            )}
          </Animated.View>

          {badgeCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.danger }]}>
              <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
            </View>
          ) : null}
        </View>

        {/* Tab Label */}
        <Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color: isFocused ? theme.primary : theme.textMuted,
              fontWeight: isFocused ? '700' : '600',
            },
          ]}
        >
          {title}
        </Text>

        {/* Keeps the row height the shared indicator's dot is laid out against. */}
        <View style={styles.activeDot} />
      </Animated.View>
    </Pressable>
  );
}

// One pill + dot shared by every tab: it springs from the old tab to the new one
// instead of each tab fading its own, and the pill stretches mid-flight like a drop
// of liquid. It is laid out with the same styles as a TabItem (the blank label only
// reserves the label's height), so it always lines up.
function ActiveIndicator({ index, tabWidth, theme }) {
  const { position, stretch } = useLiquidSlide(index, SLIDE_SPRING);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.get() * tabWidth }],
  }));
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + stretch.get() * 0.35 }, { scaleY: 1 - stretch.get() * 0.12 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.indicator, { width: tabWidth }, slideStyle]}>
      <View style={styles.tabContent}>
        <View style={styles.iconWrapper}>
          <Animated.View
            style={[
              styles.activePill,
              { backgroundColor: alpha(theme.primary, theme.isDark ? 0.26 : 0.14), borderColor: alpha(theme.primary, 0.22) },
              pillStyle,
            ]}
          />
        </View>
        <Text numberOfLines={1} style={styles.tabLabel}>
          {' '}
        </Text>
        <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />
      </View>
    </Animated.View>
  );
}

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState(0);

  let teacherContext = null;
  try {
    teacherContext = useTeacher?.();
  } catch {
    // not in TeacherProvider
  }
  const unreadCount = teacherContext?.unread || 0;

  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute.key]?.options || {};

  // Respect tabBarStyle.display === 'none' (e.g. for nested screens)
  if (currentOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  // Ensure safe spacing on devices with home indicator (iOS) or navigation bar (Android)
  const bottomOffset = Math.max(insets.bottom, 10) + (Platform.OS === 'ios' ? 2 : 6);

  return (
    <View pointerEvents="box-none" style={[styles.floatingWrapper, { paddingBottom: bottomOffset }]}>
      {/* Scrolled content passes behind the glass bar. Real Liquid Glass keeps it
          legible by itself; the frosted stand-in has no blur, so a soft scrim dims
          what is under it. */}
      {LIQUID_GLASS ? null : (
        <LinearGradient
          pointerEvents="none"
          colors={[alpha(theme.bg, 0), alpha(theme.bg, 0.6), alpha(theme.bg, 0.6)]}
          locations={[0, 0.4, 1]}
          style={styles.fade}
        />
      )}
      <GlassSurface
        radius={28}
        isDark={theme.isDark}
        fill={alpha(theme.surface, 0.82)}
        style={styles.floatingBar}
      >
        <View style={styles.tabsRow} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
          {rowWidth > 0 ? (
            <ActiveIndicator index={state.index} tabWidth={rowWidth / state.routes.length} theme={theme} />
          ) : null}
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const { options } = descriptors[route.key];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const badgeCount =
              options.tabBarBadge !== undefined
                ? options.tabBarBadge
                : route.name === 'inbox'
                  ? unreadCount
                  : 0;

            return (
              <TabItem
                key={route.key}
                route={route}
                isFocused={isFocused}
                options={options}
                onPress={onPress}
                onLongPress={onLongPress}
                badgeCount={badgeCount}
                theme={theme}
              />
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -18,
    bottom: 0,
  },
  floatingBar: {
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minHeight: 52,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconWrapper: {
    width: 48,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 3,
    letterSpacing: -0.1,
  },
  activeDot: {
    width: 12,
    height: 2.5,
    borderRadius: 1.5,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
  },
});

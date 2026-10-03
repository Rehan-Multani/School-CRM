import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useTeacher } from '../context/TeacherContext';
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

function TabItem({
  route,
  isFocused,
  options,
  onPress,
  onLongPress,
  badgeCount,
  theme,
}) {
  const pressAnim = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      friction: 7,
      tension: 110,
      useNativeDriver: true,
    }).start();
  }, [isFocused, focusAnim]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.92,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 6,
      tension: 110,
      useNativeDriver: true,
    }).start();
  };

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

  const pillScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  });

  const iconScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const dotScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

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
      <Animated.View style={[styles.tabContent, { transform: [{ scale: pressAnim }] }]}>
        {/* Soft Pill behind the Icon */}
        <View style={styles.iconWrapper}>
          <Animated.View
            style={[
              styles.activePill,
              {
                backgroundColor: theme.primarySoft,
                borderColor: alpha(theme.primary, 0.16),
                opacity: focusAnim,
                transform: [{ scale: pillScale }],
              },
            ]}
          />
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
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

        {/* Subtle Active Pill Dot Indicator */}
        <Animated.View
          style={[
            styles.activeDot,
            {
              backgroundColor: theme.primary,
              opacity: focusAnim,
              transform: [{ scaleX: dotScale }, { scaleY: dotScale }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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
    <View style={[styles.floatingWrapper, { paddingBottom: bottomOffset, backgroundColor: theme.bg }]}>
      {/* Opaque footer + soft fade: scrolled content ends above the bar instead of
          showing through behind and below the pill. */}
      <LinearGradient
        pointerEvents="none"
        colors={[alpha(theme.bg, 0), theme.bg]}
        style={styles.fade}
      />
      <View
        style={[
          styles.floatingBar,
          {
            backgroundColor: theme.surface,
            borderColor: theme.isDark ? theme.border : 'rgba(0, 0, 0, 0.06)',
            shadowColor: theme.isDark ? '#000' : theme.shadow,
            shadowOpacity: theme.isDark ? 0.35 : 0.08,
          },
        ]}
      >
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
    height: 18,
  },
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 28,
    borderWidth: 1,
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
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

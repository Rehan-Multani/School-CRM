import { Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';

// One glass surface for the whole app. On iOS 26+ it is the system Liquid Glass
// (real refraction of whatever is behind it). Everywhere else — Android, older iOS,
// web — the native view does not exist, so it draws a frosted stand-in: translucent
// fill + specular sheen + light rim. Callers never branch on the platform.

export const LIQUID_GLASS =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

const SHEEN_LIGHT = ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.24)'];
const SHEEN_DARK = ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.07)'];
const SHEEN_STOPS = [0, 0.55, 1];

export default function GlassSurface({
  style,
  radius = 24,
  isDark = false,
  // Fallback fill only; the native glass takes its colour from what is behind it.
  fill,
  // Optional tint for the native glass.
  tintColor,
  interactive = false,
  shadow = true,
  children,
}) {
  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={isDark ? 'dark' : 'light'}
        tintColor={tintColor}
        isInteractive={interactive}
        style={[{ borderRadius: radius }, style]}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.frost,
        {
          borderRadius: radius,
          backgroundColor: fill ?? (isDark ? 'rgba(20,28,47,0.78)' : 'rgba(255,255,255,0.78)'),
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)',
        },
        // boxShadow, not elevation: elevation paints its shadow through a translucent fill.
        shadow && { boxShadow: isDark ? SHADOW_DARK : SHADOW_LIGHT },
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={isDark ? SHEEN_DARK : SHEEN_LIGHT}
        locations={SHEEN_STOPS}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      {children}
    </View>
  );
}

const SHADOW_LIGHT = [{ offsetX: 0, offsetY: 6, blurRadius: 18, spreadDistance: 0, color: 'rgba(15,23,42,0.12)' }];
const SHADOW_DARK = [{ offsetX: 0, offsetY: 6, blurRadius: 18, spreadDistance: 0, color: 'rgba(0,0,0,0.4)' }];

const styles = StyleSheet.create({
  frost: { borderWidth: 1 },
});

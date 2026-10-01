import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { BRAND_PRIMARY } from '../theme';

export const SPLASH_MIN_MS = 2600;
const MIN_VISIBLE_MS = SPLASH_MIN_MS;

// In-app splash drawn over the app while the session restores. It starts as
// an exact copy of the native splash (white + centered logo), so the hand-off
// is seamless, then animates and fades out once `ready` is true.
// (Expo Go never shows the native splash, so this is what you see there.)
export default function AnimatedSplash({ ready, children }) {
  const [visible, setVisible] = useState(true);
  const [minElapsed, setMinElapsed] = useState(false);
  const scale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(16)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const onLayout = () => {
    SplashScreen.hideAsync().catch(() => {});
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(250),
        Animated.parallel([
          Animated.timing(textY, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(textOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  };

  useEffect(() => {
    // Failsafe 1: Ensure native splash hides even if onLayout was delayed
    const nativeTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 500);

    // Minimum visible timer for smooth animation
    const t = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);

    // Failsafe 2: Under no circumstance stay stuck on splash for more than 3.5 seconds
    const maxTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setVisible(false));
    }, 3500);

    return () => {
      clearTimeout(nativeTimer);
      clearTimeout(t);
      clearTimeout(maxTimer);
    };
  }, [overlayOpacity]);

  useEffect(() => {
    if (!ready || !minElapsed) return;
    Animated.timing(overlayOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => setVisible(false));
  }, [ready, minElapsed, overlayOpacity]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {visible ? (
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]} onLayout={onLayout}>
          <Animated.Image
            source={require('../../assets/logo.png')}
            style={[styles.logo, { opacity: logoOpacity, transform: [{ scale }] }]}
            resizeMode="contain"
          />
          <Animated.View style={{ alignItems: 'center', opacity: textOpacity, transform: [{ translateY: textY }] }}>
            <Text style={styles.title}>School CRM</Text>
            <Text style={styles.tagline}>Smart school, connected families</Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 200, height: 200 },
  title: { fontSize: 30, fontWeight: '800', color: BRAND_PRIMARY, marginTop: 12, letterSpacing: 0.5 },
  tagline: { fontSize: 14, color: '#64748B', marginTop: 6 },
});

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// For header-less screens with a colored top: paints the status-bar area so
// scrolled content never slides underneath the clock/battery icons, and sets
// the status-bar icon color to stay readable on that color.
export default function TopInsetBackdrop({ color, light = true }) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBar style={light ? 'light' : 'dark'} />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: color, zIndex: 10 }}
      />
    </>
  );
}

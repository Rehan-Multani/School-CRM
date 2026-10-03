import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

// Header back arrow for every pushed screen. A screen opened straight from a
// push notification has nothing under it in the stack, so the native arrow
// would be missing — fall back to the role's home tab instead.
export default function HeaderBack({ home }) {
  const theme = useTheme();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(home);
  };
  return (
    <Pressable
      onPress={goBack}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [{ paddingRight: 12, paddingVertical: 4, opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name="arrow-back" size={24} color={theme.onPrimary} />
    </Pressable>
  );
}

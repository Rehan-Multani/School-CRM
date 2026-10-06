import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

// App-bar bell (principal tabs) → Notifications.
export default function Bell({ color }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.navigate('/principal/notifications')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      style={{ paddingHorizontal: 12 }}
    >
      <Ionicons name="notifications-outline" size={24} color={color || theme.onPrimary} />
    </Pressable>
  );
}

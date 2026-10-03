import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useStudent } from '../../context/StudentContext';

// App-bar bell (student tabs): unread badge → Notifications tab.
export default function Bell({ color }) {
  const theme = useTheme();
  const { unread } = useStudent();
  const c = color || theme.onPrimary;
  return (
    <Pressable onPress={() => router.navigate('/student/notifications')} hitSlop={10} accessibilityRole="button" accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'} style={{ paddingHorizontal: 12 }}>
      <Ionicons name={unread ? 'notifications' : 'notifications-outline'} size={24} color={c} />
      {unread ? (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: 6,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: theme.danger,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: theme.primary,
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useParent } from '../../context/ParentContext';

// App-bar bell (parent tabs): unread badge → the Alerts segment of the Notices tab.
export default function Bell({ color }) {
  const theme = useTheme();
  const { unread } = useParent();
  const c = color || theme.onPrimary;
  return (
    <Pressable
      onPress={() => router.navigate({ pathname: '/parent/notices', params: { tab: 'notifications' } })}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      style={{ paddingHorizontal: 12 }}
    >
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
          <Text style={{ color: theme.white, fontSize: 10, fontWeight: '800' }}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

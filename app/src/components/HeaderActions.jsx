import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fileUrl } from '../lib/links';

// Top-right header cluster shared by role tab bars: the role's notification bell,
// then signed-in user's avatar/icon (photo or crisp person icon) → their Profile tab.
export function ProfileAvatar({ size = 32, style }) {
  const { user, role } = useAuth();
  const theme = useTheme();
  const photo = fileUrl(user?.profilePhoto || user?.photo);
  const [failedUrl, setFailedUrl] = useState(null);

  const hasPhoto = Boolean(photo && failedUrl !== photo);

  return (
    <Pressable
      onPress={() => role && router.navigate(`/${role.toLowerCase()}/profile`)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }, style]}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: theme.onPrimary,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.22)',
        }}
      >
        {hasPhoto ? (
          <Image
            source={{ uri: photo }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={() => setFailedUrl(photo)}
          />
        ) : (
          <Ionicons name="person" size={Math.round(size * 0.55)} color={theme.onPrimary} />
        )}
      </View>
    </Pressable>
  );
}

export default function HeaderActions({ bell = null, showProfile = true }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {bell}
      {showProfile ? <ProfileAvatar /> : null}
    </View>
  );
}

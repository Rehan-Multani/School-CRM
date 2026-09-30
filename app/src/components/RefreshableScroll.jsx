import { useCallback, useState } from 'react';
import { Platform, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// ScrollView with pull-to-refresh. Every pull re-syncs the session (profile +
// school theme/logo); pass `onRefresh` to also reload the screen's own data.
// `underStatusBar`: the screen has no nav header and its content starts behind
// the status bar — pushes the Android spinner below it and whitens the iOS one
// (which sits over the colored hero).
export default function RefreshableScroll({ onRefresh, underStatusBar, children, style, contentContainerStyle, ...props }) {
  const { refreshSession } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshSession(), onRefresh ? onRefresh() : null]);
    } catch {
      // screens show their own errors; never leave the spinner stuck
    } finally {
      setRefreshing(false);
    }
  }, [refreshSession, onRefresh]);

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: theme.bg }, style]}
      contentContainerStyle={contentContainerStyle}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[theme.primary]}
          tintColor={underStatusBar && Platform.OS === 'ios' ? '#FFFFFF' : theme.primary}
          progressBackgroundColor={theme.surface}
          progressViewOffset={underStatusBar ? insets.top + 8 : 0}
        />
      }
      {...props}
    >
      {children}
    </ScrollView>
  );
}

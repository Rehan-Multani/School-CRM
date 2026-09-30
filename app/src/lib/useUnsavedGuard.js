import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from 'expo-router';

// Ask before leaving a screen with unsaved edits (back button, swipe, header
// back). `dirty` false → navigation is never blocked.
export function useUnsavedGuard(dirty, message = 'You have unsaved changes. Leave without saving?') {
  const navigation = useNavigation();
  useEffect(() => {
    if (!dirty) return undefined;
    return navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      Alert.alert('Discard changes?', message, [
        { text: 'Stay', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
  }, [navigation, dirty, message]);
}

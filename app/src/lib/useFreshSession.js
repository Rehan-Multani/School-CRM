import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

// The saved session (user flags such as classTeacherSections / isClassTeacher,
// school features) can be older than the server: an admin changes them on the
// web while the app is open. Screens that decide what to show from those flags
// call this to re-read `me` whenever they come into focus — at most once per
// `maxAgeMs`, so hopping between tabs does not hit the server each time.
export function useFreshSession(maxAgeMs = 60000) {
  const { refreshSession } = useAuth();
  useFocusEffect(
    useCallback(() => {
      refreshSession({ maxAgeMs }).catch(() => {});
    }, [refreshSession, maxAgeMs]),
  );
}

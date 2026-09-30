import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { studentApi } from '../api/student';
import { useAuth } from './AuthContext';
import { onPushReceived } from '../lib/pushRouting';

// Student-wide state: the bell / Notifications-tab unread count, refreshed on
// app resume and every minute (doc §6.9).
const StudentContext = createContext(null);
const UNREAD_POLL_MS = 60000;

export function StudentProvider({ children }) {
  const { session } = useAuth();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await studentApi.unreadCount();
      setUnread(res?.unread || 0);
    } catch {
      // keep last value
    }
  }, []);

  useEffect(() => {
    if (!session?.token) return undefined;
    // setState only runs after the awaited fetch, never synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUnread();
    const timer = setInterval(refreshUnread, UNREAD_POLL_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshUnread());
    const offPush = onPushReceived(() => refreshUnread()); // a push just landed
    return () => {
      clearInterval(timer);
      sub.remove();
      offPush();
    };
  }, [session?.token, refreshUnread]);

  const value = useMemo(() => ({ unread, setUnread, refreshUnread }), [unread, refreshUnread]);
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudent() {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error('useStudent must be used inside StudentProvider');
  return ctx;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { parentApi } from '../api/parent';
import { useAuth } from './AuthContext';
import { onPushReceived } from '../lib/pushRouting';
import { onAppForeground, pollWhileActive } from '../lib/foreground';

// Parent-wide state (doc 03 §1): the linked children, the SELECTED child every
// child screen shows, and the bell's unread count.
//
// Child ids only ever come from the server's `children[]` — the backend also
// re-checks the parent↔child link on every call (CHILD_ACCESS_DENIED).
const ParentContext = createContext(null);
// Push + app-resume already refresh the badge; this slow poll only covers a
// phone with notifications switched off.
const UNREAD_POLL_MS = 120000;
const LAST_CHILD_KEY = 'schoolcrm.parent.lastChild'; // not secret; just remembers the last pick

export function ParentProvider({ children: content }) {
  const { session } = useAuth();
  // Login returns `children[]`; it is kept on the session so a cold start can
  // paint before /children answers.
  const [kids, setKids] = useState(() => session?.extra?.children || null);
  const [selectedId, setSelectedId] = useState(null);
  const [childrenError, setChildrenError] = useState(null);
  const [unread, setUnread] = useState(0);

  const reloadChildren = useCallback(async () => {
    try {
      const rows = (await parentApi.children()) || [];
      setKids(rows);
      setChildrenError(null);
      return rows;
    } catch (e) {
      // NO_LINKED_CHILDREN is a state, not a failure.
      if (e.code === 'NO_LINKED_CHILDREN') {
        setKids([]);
        setChildrenError(null);
        return [];
      }
      setChildrenError(e);
      return null;
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await parentApi.unreadCount();
      setUnread(res?.unread || 0);
    } catch {
      // keep last value
    }
  }, []);

  // Restore the last selected child once, then confirm the list with the server.
  useEffect(() => {
    if (!session?.token) return undefined;
    let cancelled = false;
    (async () => {
      const last = await SecureStore.getItemAsync(LAST_CHILD_KEY).catch(() => null);
      if (!cancelled && last) setSelectedId((cur) => cur || last);
      await reloadChildren();
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.token, reloadChildren]);

  useEffect(() => {
    if (!session?.token) return undefined;
    // setState only runs after the awaited fetch, never synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUnread();
    const stopPoll = pollWhileActive(refreshUnread, UNREAD_POLL_MS);
    const offForeground = onAppForeground(refreshUnread);
    const offPush = onPushReceived(() => refreshUnread());
    return () => {
      stopPoll();
      offForeground();
      offPush();
    };
  }, [session?.token, refreshUnread]);

  // The selected child is always one from the list: the remembered one if it
  // is still linked, otherwise the first.
  const child = useMemo(() => {
    if (!kids?.length) return null;
    return kids.find((k) => k.childId === selectedId) || kids[0];
  }, [kids, selectedId]);

  const selectChild = useCallback((childId) => {
    setSelectedId(childId);
    SecureStore.setItemAsync(LAST_CHILD_KEY, String(childId)).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      children: kids || [],
      childrenLoaded: kids !== null,
      childrenError,
      child,
      selectChild,
      reloadChildren,
      unread,
      setUnread,
      refreshUnread,
    }),
    [kids, childrenError, child, selectChild, reloadChildren, unread, refreshUnread],
  );
  return <ParentContext.Provider value={value}>{content}</ParentContext.Provider>;
}

export function useParent() {
  const ctx = useContext(ParentContext);
  if (!ctx) throw new Error('useParent must be used inside ParentProvider');
  return ctx;
}

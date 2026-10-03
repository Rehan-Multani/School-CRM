import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { teacherApi } from '../api/teacher';
import { useAuth } from './AuthContext';
import { onPushReceived } from '../lib/pushRouting';
import { onAppForeground, pollWhileActive } from '../lib/foreground';

// Teacher-wide state: the bell's unread count (refreshed on app resume and
// every two minutes) and the teacher's teaching slots — the (class, section,
// subject) combos the backend accepts, cached once per session for pickers.
const TeacherContext = createContext(null);
// Push + app-resume already refresh the badge; this slow poll only covers a
// phone with notifications switched off.
const UNREAD_POLL_MS = 120000;

export function TeacherProvider({ children }) {
  const { session } = useAuth();
  const [unread, setUnread] = useState(0);
  const [slots, setSlots] = useState(null);
  const slotsPromise = useRef(null);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await teacherApi.unreadCount();
      setUnread(res?.unread || 0);
    } catch {
      // keep last value
    }
  }, []);

  useEffect(() => {
    if (!session?.token) return undefined;
    refreshUnread();
    const stopPoll = pollWhileActive(refreshUnread, UNREAD_POLL_MS);
    const offForeground = onAppForeground(refreshUnread);
    const offPush = onPushReceived(() => refreshUnread()); // a push just landed
    return () => {
      stopPoll();
      offForeground();
      offPush();
    };
  }, [session?.token, refreshUnread]);

  const loadSlots = useCallback(async (force = false) => {
    if (!force && slots) return slots;
    if (!force && slotsPromise.current) return slotsPromise.current;
    slotsPromise.current = teacherApi
      .teachingSlots()
      .then((rows) => {
        setSlots(rows || []);
        return rows || [];
      })
      .finally(() => {
        slotsPromise.current = null;
      });
    return slotsPromise.current;
  }, [slots]);

  const value = useMemo(() => ({ unread, setUnread, refreshUnread, slots, loadSlots }), [unread, refreshUnread, slots, loadSlots]);
  return <TeacherContext.Provider value={value}>{children}</TeacherContext.Provider>;
}

export function useTeacher() {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error('useTeacher must be used inside TeacherProvider');
  return ctx;
}

/** Unique sections from slots → [{ value: sectionId, label: "Class 7 - A", classId }]. */
export function sectionOptions(slots) {
  const seen = new Map();
  for (const s of slots || []) {
    if (!seen.has(s.sectionId)) {
      seen.set(s.sectionId, { value: s.sectionId, label: `${s.className} - ${s.sectionName}`, classId: s.classId });
    }
  }
  return [...seen.values()];
}

/** Subjects this teacher teaches in one section. */
export function subjectOptions(slots, sectionId) {
  return (slots || []).filter((s) => s.sectionId === sectionId).map((s) => ({ value: s.subjectId, label: s.subjectName }));
}

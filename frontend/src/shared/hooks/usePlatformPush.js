import { useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { platformNotificationApi } from '../api/client';
import { listenForegroundMessages, registerFcmToken } from '../firebase/messaging';

function relativeTime(value) {
  if (!value) return 'Just now';
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return 'Just now';
  }
}

function toInboxItem(notification) {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.body,
    time: relativeTime(notification.createdAt),
  };
}

export function usePlatformPush({ enabled, role, user, mergeInbox, onPush }) {
  useEffect(() => {
    if (!enabled || !user || !role) {
      return undefined;
    }

    let cancelled = false;
    let unsubscribe = () => {};

    // Scope (role / schoolId / userId) is derived server-side from the caller's
    // token — sending it from here would be both ignored and misleading, since
    // the client cannot be the authority on which school's inbox it may read.
    const loadInbox = async () => {
      const result = await platformNotificationApi.inbox(role);
      if (!cancelled && Array.isArray(result.data)) {
        mergeInbox?.(result.data.map(toInboxItem));
      }
    };

    const boot = async () => {
      try {
        const token = await registerFcmToken();
        if (token && !cancelled) {
          await platformNotificationApi.registerDevice({ token }, role);
        }
      } catch (error) {
        console.warn('Firebase token registration skipped:', error.message);
      }

      try {
        await loadInbox();
      } catch (error) {
        console.warn('Platform inbox load skipped:', error.message);
      }

      try {
        unsubscribe = await listenForegroundMessages((payload) => {
          const title = payload.notification?.title || payload.data?.title || 'Notification';
          const message = payload.notification?.body || payload.data?.body || '';
          onPush?.({ title, message });
        });
      } catch (error) {
        console.warn('Firebase foreground listener skipped:', error.message);
      }
    };

    boot();
    const poll = window.setInterval(() => {
      loadInbox().catch(() => {});
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      unsubscribe();
    };
  }, [enabled, role, user?.id, user?.schoolId]);
}

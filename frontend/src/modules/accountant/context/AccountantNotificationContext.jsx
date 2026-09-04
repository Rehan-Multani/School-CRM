import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { accountantApi } from '../../../shared/api/client';
import { useAccountantAuth } from './AccountantAuthContext';

const AccountantNotificationContext = createContext();

const READ_STORAGE = 'accountant_notifications_read';

function loadReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_STORAGE) || '[]'));
  } catch {
    return new Set();
  }
}

function persistReadIds(set) {
  try {
    localStorage.setItem(READ_STORAGE, JSON.stringify([...set]));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

function shape(raw, readIds) {
  const id = raw.id || raw._id || `${raw.title}-${raw.createdAt || raw.time || ''}`;
  return {
    id,
    title: raw.title || 'Notification',
    message: raw.message || raw.body || '',
    type: raw.type || raw.category || 'System',
    time: raw.time || raw.createdAt || '',
    read: readIds.has(id) || Boolean(raw.read),
  };
}

export const AccountantNotificationProvider = ({ children }) => {
  const { user } = useAccountantAuth();
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(loadReadIds);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accountantApi.notifications();
      const list = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
      const current = loadReadIds();
      setReadIds(current);
      setNotifications(list.map((n) => shape(n, current)));
    } catch {
      /* keep whatever is already shown */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else setNotifications([]);
  }, [user, refresh]);

  const markAsRead = (id) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      persistReadIds(next);
      return next;
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const next = new Set(readIds);
      prev.forEach((n) => next.add(n.id));
      persistReadIds(next);
      setReadIds(next);
      return prev.map((n) => ({ ...n, read: true }));
    });
  };

  const addNotification = (n) => {
    setNotifications((prev) => {
      const shaped = shape({ ...n, id: n.id || Date.now().toString() }, readIds);
      if (prev.some((p) => p.id === shaped.id)) return prev;
      return [{ ...shaped, read: false }, ...prev];
    });
  };

  const mergeInbox = (items) => {
    setNotifications((prev) => {
      const ids = new Set(prev.map((item) => item.id));
      const incoming = (items || [])
        .map((item) => shape(item, readIds))
        .filter((item) => item.id && !ids.has(item.id));
      return incoming.length ? [...incoming, ...prev] : prev;
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AccountantNotificationContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markAllAsRead, markAsRead, addNotification, mergeInbox }}
    >
      {children}
    </AccountantNotificationContext.Provider>
  );
};

export const useAccountantNotifications = () => useContext(AccountantNotificationContext);
export default AccountantNotificationContext;

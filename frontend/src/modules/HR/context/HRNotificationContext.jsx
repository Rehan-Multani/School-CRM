import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { hrApi } from '../../../shared/api/client';
import { useHRAuth } from './HRAuthContext';

const HRNotificationContext = createContext();

export const HRNotificationProvider = ({ children }) => {
  const { user } = useHRAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const getReadSet = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem('hr_read_notifications') || '[]'));
    } catch {
      return new Set();
    }
  };

  const saveReadSet = (set) => {
    localStorage.setItem('hr_read_notifications', JSON.stringify([...set]));
  };

  const fetchNotifications = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('hr_token') : null;
    if (!token) return;

    setLoading(true);
    try {
      const res = await hrApi.notifications();
      if (res?.success && Array.isArray(res.data)) {
        const readSet = getReadSet();
        const mapped = res.data.map((n) => ({
          id: n.id || n._id,
          title: n.title,
          message: n.body,
          type: (n.audiences && n.audiences[0]) || 'General Alert',
          read: readSet.has(n.id || n._id),
          createdAt: n.createdAt,
          time: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Recent',
        }));
        setNotifications(mapped);
      }
    } catch {
      // Graceful fallback if backend unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('hr_token') : null;
    if (user && token) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [user, fetchNotifications]);

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const readSet = getReadSet();
    allIds.forEach((id) => readSet.add(id));
    saveReadSet(readSet);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id) => {
    const readSet = getReadSet();
    readSet.add(id);
    saveReadSet(readSet);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const addNotification = (n) => {
    setNotifications((prev) => [
      { id: Date.now().toString(), read: false, time: 'Just now', ...n },
      ...prev,
    ]);
  };

  const mergeInbox = (items) => {
    setNotifications((prev) => {
      const ids = new Set(prev.map((item) => item.id));
      const readSet = getReadSet();
      const incoming = (items || [])
        .filter((item) => item?.id && !ids.has(item.id))
        .map((item) => ({
          read: readSet.has(item.id),
          time: item.time || 'Just now',
          ...item,
        }));
      return incoming.length ? [...incoming, ...prev] : prev;
    });
  };

  const clearAll = () => {
    const readSet = getReadSet();
    notifications.forEach((n) => readSet.add(n.id));
    saveReadSet(readSet);
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <HRNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAllAsRead,
        markAsRead,
        addNotification,
        mergeInbox,
        clearAll,
      }}
    >
      {children}
    </HRNotificationContext.Provider>
  );
};

export const useHRNotifications = () => useContext(HRNotificationContext);
export default HRNotificationContext;

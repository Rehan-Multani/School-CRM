import React, { createContext, useState, useContext, useEffect } from 'react';
import { useParentAuth } from './ParentAuthContext';

const ParentNotificationContext = createContext();

export const ParentNotificationProvider = ({ children }) => {
  const { selectedChildId } = useParentAuth();
  const [dbConversations, setDbConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Sync data from localStorage
  const syncFromStorage = () => {
    const db = localStorage.getItem('school_conversations_db');
    if (db) setDbConversations(JSON.parse(db));
    const notifs = localStorage.getItem('school_notifications');
    if (notifs) setNotifications(JSON.parse(notifs));
  };

  useEffect(() => {
    syncFromStorage();
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  // Filter messages based on currently selected child ID
  const messages = dbConversations
    .filter(c => c.studentId === selectedChildId)
    .map(c => ({
      id: c.teacherId,
      name: c.teacherName,
      subtitle: c.teacherRole,
      photo: c.teacherAvatar,
      type: 'teacher',
      unread: 0,
      chats: c.chats.map(chat => ({
        // From parent perspective: 'me' refers to parent, 'them' refers to teacher
        sender: chat.sender === 'parent' ? 'me' : 'them',
        text: chat.text,
        time: chat.time
      }))
    }));

  const addMessage = (teacherId, text) => {
    if (!selectedChildId) return;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const updatedDb = dbConversations.map(c => {
      if (c.studentId === selectedChildId && c.teacherId === teacherId) {
        return {
          ...c,
          chats: [
            ...c.chats,
            { sender: "parent", text, time: timeStr }
          ]
        };
      }
      return c;
    });

    setDbConversations(updatedDb);
    localStorage.setItem('school_conversations_db', JSON.stringify(updatedDb));
    window.dispatchEvent(new Event('storage'));
  };

  const markNotificationAsRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    localStorage.setItem('school_notifications', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const markAllNotificationsAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('school_notifications', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.setItem('school_notifications', JSON.stringify([]));
    window.dispatchEvent(new Event('storage'));
  };

  const addNotification = ({ title, message, type = 'announcement' }) => {
    const next = [
      {
        id: Date.now().toString(),
        type,
        title,
        message,
        date: new Date().toISOString(),
        read: false,
      },
      ...notifications,
    ];
    setNotifications(next);
    localStorage.setItem('school_notifications', JSON.stringify(next));
    window.dispatchEvent(new Event('storage'));
  };

  const mergeInbox = (items) => {
    const ids = new Set(notifications.map((item) => String(item.id)));
    const incoming = (items || [])
      .filter((item) => item?.id && !ids.has(String(item.id)))
      .map((item) => ({
        id: item.id,
        type: 'announcement',
        title: item.title,
        message: item.message,
        date: new Date().toISOString(),
        read: false,
      }));
    if (!incoming.length) return;
    const next = [...incoming, ...notifications];
    setNotifications(next);
    localStorage.setItem('school_notifications', JSON.stringify(next));
    window.dispatchEvent(new Event('storage'));
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;
  const unreadMsgCount = messages.reduce((sum, m) => sum + (m.unread || 0), 0);

  return (
    <ParentNotificationContext.Provider value={{
      notifications,
      messages,
      unreadNotifCount,
      unreadMsgCount,
      addNotification,
      mergeInbox,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      clearNotifications,
      addMessage
    }}>
      {children}
    </ParentNotificationContext.Provider>
  );
};

export const useParentNotifications = () => useContext(ParentNotificationContext);

import React, { createContext, useState, useContext } from 'react';

const LibrarianNotificationContext = createContext();

export const LibrarianNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Overdue Book Alert',
      message: 'Karan Malhotra (Class IX-C) has book "Wings of Fire" overdue by 8 days.',
      time: '2 hours ago',
      read: false,
      type: 'overdue'
    },
    {
      id: '2',
      title: 'New Reservation',
      message: 'Arjun Sharma reserved "A Brief History of Time" today.',
      time: '5 hours ago',
      read: false,
      type: 'reservation'
    },
    {
      id: '3',
      title: 'Fine Collected',
      message: 'Received INR 8 from Sneha Roy for late return of "Discovery of India".',
      time: '1 day ago',
      read: true,
      type: 'fine'
    },
    {
      id: '4',
      title: 'Inventory Alert',
      message: '"Wings of Fire" is currently out of stock (0 copies available).',
      time: '2 days ago',
      read: true,
      type: 'inventory'
    }
  ]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const addNotification = (title, message, type = 'info') => {
    setNotifications(prev => [
      {
        id: Date.now().toString(),
        title,
        message,
        time: 'Just now',
        read: false,
        type
      },
      ...prev
    ]);
  };

  const mergeInbox = (items) => {
    setNotifications((prev) => {
      const ids = new Set(prev.map((item) => item.id));
      const incoming = (items || [])
        .filter((item) => item?.id && !ids.has(item.id))
        .map((item) => ({
          read: false,
          type: 'info',
          time: item.time || 'Just now',
          ...item,
        }));
      return incoming.length ? [...incoming, ...prev] : prev;
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <LibrarianNotificationContext.Provider value={{ notifications, unreadCount, markAllAsRead, markAsRead, addNotification, mergeInbox }}>
      {children}
    </LibrarianNotificationContext.Provider>
  );
};

export const useLibrarianNotifications = () => {
  const context = useContext(LibrarianNotificationContext);
  if (!context) {
    throw new Error('useLibrarianNotifications must be used within a LibrarianNotificationProvider');
  }
  return context;
};

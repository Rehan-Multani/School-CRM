import React, { createContext, useState, useContext } from 'react';

const TransportNotificationContext = createContext();

export const TransportNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Insurance Expiring Soon',
      message: 'Vehicle GJ-01-GH-3456 insurance expires in 25 days (2026-08-12).',
      time: '3 hours ago',
      read: false,
      type: 'expiry'
    },
    {
      id: '2',
      title: 'Driver License Expiry Alert',
      message: 'Driver Dilip Kumar (EMP-D-002) license expires on 2026-08-20.',
      time: '6 hours ago',
      read: false,
      type: 'expiry'
    },
    {
      id: '3',
      title: 'Maintenance Due',
      message: 'Vehicle GJ-01-AB-1234 scheduled for Oil Change on 2026-07-20.',
      time: '1 day ago',
      read: true,
      type: 'maintenance'
    },
    {
      id: '4',
      title: 'Pollution Certificate Warning',
      message: 'Vehicle GJ-01-CD-5678 PUC certificate expires in 28 days.',
      time: '2 days ago',
      read: true,
      type: 'expiry'
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
    <TransportNotificationContext.Provider value={{ notifications, unreadCount, markAllAsRead, markAsRead, addNotification, mergeInbox }}>
      {children}
    </TransportNotificationContext.Provider>
  );
};

export const useTransportNotifications = () => {
  const context = useContext(TransportNotificationContext);
  if (!context) {
    throw new Error('useTransportNotifications must be used within a TransportNotificationProvider');
  }
  return context;
};

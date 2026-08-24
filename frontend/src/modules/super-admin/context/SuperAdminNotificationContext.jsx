import React, { createContext, useContext, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const SuperAdminNotificationContext = createContext(null);

export const SuperAdminNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'alert', message: 'Database backup failed for Greenwood High', time: '1h ago', read: false },
    { id: 2, type: 'registration', message: 'New School: Little Angels Academy registered', time: '3h ago', read: false },
    { id: 3, type: 'payment', message: 'Invoice #INV-2026-102 paid by St. Xavier\'s', time: '5h ago', read: true },
  ]);

  const addNotification = (type, message) => {
    const newNotif = {
      id: Date.now(),
      type,
      message,
      time: 'Just now',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Trigger visual toast
    if (type === 'error' || type === 'alert') {
      toast.error(message, { style: { background: '#111118', color: '#f1f5f9', border: '1px solid #ef4444' } });
    } else {
      toast.success(message, { style: { background: '#111118', color: '#f1f5f9', border: '1px solid #6366f1' } });
    }
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SuperAdminNotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead }}>
      {children}
      <Toaster position="top-right" />
    </SuperAdminNotificationContext.Provider>
  );
};

export const useSuperAdminNotifications = () => {
  const context = useContext(SuperAdminNotificationContext);
  if (!context) {
    throw new Error('useSuperAdminNotifications must be used within a SuperAdminNotificationProvider');
  }
  return context;
};

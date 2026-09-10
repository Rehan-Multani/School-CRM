import React, { createContext, useContext, useState } from 'react';
import { AppToaster, showToast } from '../../../shared/ui/Toast';

const SuperAdminNotificationContext = createContext(null);

// The notification feed uses richer types than the toast palette, so map them down.
const TOAST_VARIANT_BY_TYPE = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  alert: 'warning',
  info: 'info',
};

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
    showToast(TOAST_VARIANT_BY_TYPE[type] || 'info', message);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SuperAdminNotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead }}>
      {children}
      <AppToaster />
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

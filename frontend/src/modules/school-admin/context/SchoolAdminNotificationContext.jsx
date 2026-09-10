import React, { createContext, useState, useContext } from 'react';

const SchoolAdminNotificationContext = createContext();

const INITIAL_NOTIFICATIONS = [
  { id: '1', title: 'New Leave Request', message: 'Teacher Sunita Rao submitted a leave request for 20th July.', time: '10 mins ago', type: 'info', read: false },
  { id: '2', title: 'Admission Document Uploaded', message: 'Pranav Mishra uploaded marksheet for verification.', time: '1 hour ago', type: 'success', read: false },
  { id: '3', title: 'Inventory Alert', message: 'Science Lab beaker stock is below safety limit.', time: '2 hours ago', type: 'warning', read: false },
  { id: '4', title: 'Fee Payment Received', message: 'Student Aarav Sharma paid Rs. 15,000 via UPI.', time: '3 hours ago', type: 'success', read: true }
];

export const SchoolAdminNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const addNotification = (title, message, type = 'info') => {
    const newNotif = {
      id: Date.now().toString(),
      title,
      message,
      time: 'Just now',
      type,
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const mergeInbox = (items) => {
    setNotifications((prev) => {
      const ids = new Set(prev.map((item) => item.id));
      const incoming = items
        .filter((item) => item?.id && !ids.has(item.id))
        .map((item) => ({
          type: 'info',
          read: false,
          ...item,
        }));
      return incoming.length ? [...incoming, ...prev] : prev;
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SchoolAdminNotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markRead,
      markAllRead,
      deleteNotification,
      mergeInbox
    }}>
      {children}
    </SchoolAdminNotificationContext.Provider>
  );
};

export const useSchoolAdminNotifications = () => useContext(SchoolAdminNotificationContext);

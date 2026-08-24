import React, { createContext, useState, useContext } from 'react';

const AccountantNotificationContext = createContext();

export const AccountantNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'Payment Success', message: 'Tuition fee payment of ₹10,500 received for Aarav Sharma (RCT-2026-0001).', type: 'Payment Success', read: false, time: '5 mins ago' },
    { id: '2', title: 'Refund Requested', message: 'New refund request of ₹1,500 pending approval for Diya Patel (REF-002).', type: 'Refund Requested', read: false, time: '20 mins ago' },
    { id: '3', title: 'Fee Due Reminder', message: 'Late fee warning broadcast scheduled for class 12 overdue accounts.', type: 'Due Fee Reminder', read: true, time: '1 day ago' },
    { id: '4', title: 'Scholarship Approved', message: 'Sibling concession waiver approved for Ishita Reddy by administration representative.', type: 'Refund Approved', read: true, time: '2 days ago' }
  ]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const addNotification = (n) => {
    setNotifications(prev => [
      { id: Date.now().toString(), read: false, time: 'Just now', ...n },
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
          time: item.time || 'Just now',
          ...item,
        }));
      return incoming.length ? [...incoming, ...prev] : prev;
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AccountantNotificationContext.Provider value={{ notifications, unreadCount, markAllAsRead, markAsRead, addNotification, mergeInbox }}>
      {children}
    </AccountantNotificationContext.Provider>
  );
};

export const useAccountantNotifications = () => useContext(AccountantNotificationContext);
export default AccountantNotificationContext;

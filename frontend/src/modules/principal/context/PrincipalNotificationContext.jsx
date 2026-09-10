import React, { createContext, useState, useContext } from 'react';

const PrincipalNotificationContext = createContext();

export const PrincipalNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'New Leave Request', message: 'Dr. Ramesh Kumar submitted medical leave request LEV-101.', type: 'Leave Alerts', read: false, time: '10 mins ago' },
    { id: '2', title: 'Admissions Milestone', message: 'Greenfield Public School has reached 8 admissions applications today.', type: 'Announcements', read: false, time: '2 hours ago' },
    { id: '3', title: 'Fee Reminder Sent', message: 'Automated pending fee notices broadcasted to parents of class 10 & 12.', type: 'Fee Alerts', read: true, time: '1 day ago' },
    { id: '4', title: 'Syllabus Deadline', message: 'Class 12 CS course curriculum is reported delayed (currently at 45%).', type: 'Exam Alerts', read: true, time: '2 days ago' }
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
      const incoming = items
        .filter((item) => item?.id && !ids.has(item.id))
        .map((item) => ({
          type: 'Announcements',
          read: false,
          ...item,
        }));
      return incoming.length ? [...incoming, ...prev] : prev;
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <PrincipalNotificationContext.Provider value={{ notifications, unreadCount, markAllAsRead, markAsRead, addNotification, mergeInbox }}>
      {children}
    </PrincipalNotificationContext.Provider>
  );
};

export const usePrincipalNotifications = () => useContext(PrincipalNotificationContext);
export default PrincipalNotificationContext;

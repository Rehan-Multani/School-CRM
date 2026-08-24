import React, { createContext, useState, useContext, useEffect } from 'react';
import { mockNotifications } from '../data/mockData';

const TeacherNotificationContext = createContext();

const STATIC_ADMIN_CONTACTS = [
  {
    id: 'msg-admin-001',
    name: 'School Administration',
    subtitle: 'Office Administration',
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=100&q=80',
    type: 'admin',
    unread: 0,
    chats: [
      { sender: 'them', text: 'Please submit your syllabus completion report for Q1 by Friday.', time: 'Yesterday' },
      { sender: 'me', text: 'Noted. I will submit by Thursday evening.', time: 'Yesterday' },
    ],
  },
  {
    id: 'msg-principal-001',
    name: 'Dr. Meera Patel',
    subtitle: 'Principal',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
    type: 'principal',
    unread: 1,
    chats: [
      { sender: 'them', text: 'Mr. Kumar, please prepare a detailed report on Class 10A performance for the board meeting.', time: '2 days ago' },
    ],
  },
];

export const TeacherNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    const stored = localStorage.getItem('teacher_notifications');
    if (stored) return JSON.parse(stored);
    localStorage.setItem('teacher_notifications', JSON.stringify(mockNotifications));
    return mockNotifications;
  });

  const [dbConversations, setDbConversations] = useState(() => {
    const stored = localStorage.getItem('school_conversations_db');
    if (stored) return JSON.parse(stored);
    return [];
  });

  // Load from localStorage or react to changes
  useEffect(() => {
    const handleStorageChange = () => {
      const db = localStorage.getItem('school_conversations_db');
      if (db) setDbConversations(JSON.parse(db));
      const notifs = localStorage.getItem('teacher_notifications');
      if (notifs) setNotifications(JSON.parse(notifs));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const markNotificationAsRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    localStorage.setItem('teacher_notifications', JSON.stringify(updated));
  };

  const markAllNotificationsAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('teacher_notifications', JSON.stringify(updated));
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.setItem('teacher_notifications', JSON.stringify([]));
  };

  const addNotification = ({ title, message, type = 'announcement' }) => {
    const next = [
      { id: Date.now().toString(), title, message, type, time: 'Just now', read: false },
      ...notifications,
    ];
    setNotifications(next);
    localStorage.setItem('teacher_notifications', JSON.stringify(next));
  };

  const mergeInbox = (items) => {
    const ids = new Set(notifications.map((item) => item.id));
    const incoming = (items || [])
      .filter((item) => item?.id && !ids.has(item.id))
      .map((item) => ({
        type: 'announcement',
        read: false,
        time: item.time || 'Just now',
        ...item,
      }));
    if (!incoming.length) return;
    const next = [...incoming, ...notifications];
    setNotifications(next);
    localStorage.setItem('teacher_notifications', JSON.stringify(next));
  };

  const addMessage = (contactId, text) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Check if it's one of the dynamic student-parent conversations
    const dynamicExists = dbConversations.some(c => c.studentId === contactId && c.teacherId === "EMP-2019-045");

    let updatedDb;
    if (dynamicExists) {
      updatedDb = dbConversations.map(c => {
        if (c.studentId === contactId && c.teacherId === "EMP-2019-045") {
          return {
            ...c,
            chats: [
              ...c.chats,
              { sender: 'teacher', text, time: timeStr }
            ]
          };
        }
        return c;
      });
    } else {
      // Build a new dynamic conversation
      const newConv = {
        conversationId: `${contactId}_EMP-2019-045`,
        studentId: contactId,
        studentName: contactId === 'STU108902' ? 'Aarav Sharma' : 'Neha Reddy',
        parentName: contactId === 'STU108902' ? 'Rajesh Sharma' : 'Parent of Neha',
        teacherId: 'EMP-2019-045',
        teacherName: 'Mr. Rajesh Kumar',
        teacherRole: 'Mathematics Teacher',
        teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
        chats: [
          { sender: 'teacher', text, time: timeStr }
        ]
      };
      updatedDb = [...dbConversations, newConv];
    }

    setDbConversations(updatedDb);
    localStorage.setItem('school_conversations_db', JSON.stringify(updatedDb));
    window.dispatchEvent(new Event('storage'));
  };

  const markMessagesAsRead = (contactId) => {
    // Read state logic
  };

  // Construct dynamic list of teacher's messages
  const mappedMessages = dbConversations
    .filter(c => c.teacherId === "EMP-2019-045")
    .map(c => ({
      id: c.studentId,
      name: c.parentName,
      subtitle: `Parent of ${c.studentName} (${c.studentId})`,
      photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80',
      type: 'parent',
      unread: 0,
      chats: c.chats.map(chat => ({
        sender: chat.sender === 'teacher' ? 'me' : 'them',
        text: chat.text,
        time: chat.time
      }))
    }));

  const messages = [...mappedMessages, ...STATIC_ADMIN_CONTACTS];

  const unreadNotifCount = notifications.filter(n => !n.read).length;
  const unreadMsgCount = messages.reduce((sum, m) => sum + (m.unread || 0), 0);

  return (
    <TeacherNotificationContext.Provider value={{
      notifications,
      messages,
      unreadNotifCount,
      unreadMsgCount,
      addNotification,
      mergeInbox,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      clearNotifications,
      addMessage,
      markMessagesAsRead,
    }}>
      {children}
    </TeacherNotificationContext.Provider>
  );
};

export const useTeacherNotifications = () => useContext(TeacherNotificationContext);

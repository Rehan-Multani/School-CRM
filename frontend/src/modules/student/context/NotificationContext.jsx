import React, { createContext, useState, useContext, useEffect } from 'react';

const NotificationContext = createContext();

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: 'attendance', title: 'Attendance Marked', message: 'You have been marked Present for today.', date: new Date().toISOString(), read: false },
  { id: 2, type: 'homework', title: 'New Assignment', message: 'Maths homework Chapter 5: Trigonometry has been posted.', date: new Date(Date.now() - 3600000).toISOString(), read: false },
  { id: 3, type: 'results', title: 'Science Exam Results', message: 'Marks for Mid-Term Science Exam have been declared.', date: new Date(Date.now() - 86400000).toISOString(), read: true },
  { id: 4, type: 'fees', title: 'Fee Due Reminder', message: 'Quarter 2 Tuition Fee is pending. Last date is 30th Jul.', date: new Date(Date.now() - 172800000).toISOString(), read: false },
  { id: 5, type: 'announcements', title: 'Rainy Day Holiday', message: 'School will remain closed tomorrow due to heavy rains.', date: new Date(Date.now() - 259200000).toISOString(), read: true },
];

const INITIAL_CONVERSATIONS = [
  {
    conversationId: "STU108902_EMP-2019-045",
    studentId: "STU108902",
    studentName: "Aarav Sharma",
    parentName: "Rajesh Sharma",
    teacherId: "EMP-2019-045",
    teacherName: "Mr. Rajesh Kumar",
    teacherRole: "Mathematics Teacher",
    teacherAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
    chats: [
      { sender: "parent", text: "Good morning Sir, I wanted to discuss Aarav's performance in Mathematics.", time: "09:15 AM" },
      { sender: "parent", text: "He seems to be struggling with Quadratic Equations. Could you please guide?", time: "09:16 AM" },
      { sender: "teacher", text: "Good morning Mr. Sharma! Yes, I noticed Aarav needs some extra practice. I will schedule additional help sessions.", time: "10:30 AM" }
    ]
  },
  {
    conversationId: "STU108902_teacher-2",
    studentId: "STU108902",
    studentName: "Aarav Sharma",
    parentName: "Rajesh Sharma",
    teacherId: "teacher-2",
    teacherName: "Mrs. Sen",
    teacherRole: "Science Teacher",
    teacherAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
    chats: [
      { sender: "teacher", text: "Hi Aarav, please make sure to submit your Science lab notebook by Friday.", time: "10:30 AM" }
    ]
  }
];

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    const stored = localStorage.getItem('school_notifications');
    if (stored) return JSON.parse(stored);
    localStorage.setItem('school_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    return INITIAL_NOTIFICATIONS;
  });

  const [dbConversations, setDbConversations] = useState(() => {
    const stored = localStorage.getItem('school_conversations_db');
    if (stored) return JSON.parse(stored);
    localStorage.setItem('school_conversations_db', JSON.stringify(INITIAL_CONVERSATIONS));
    return INITIAL_CONVERSATIONS;
  });

  // Map database conversations into the layout expected by the student module's components
  const messages = dbConversations
    .filter(c => c.studentId === "STU108902")
    .map(c => ({
      id: c.teacherId,
      name: `${c.teacherName} (${c.teacherRole.split(' ')[0]})`,
      avatar: c.teacherAvatar,
      role: c.teacherRole,
      unread: 0,
      chats: c.chats.map(chat => ({
        // In student module, 'them' refers to the teacher, 'me' refers to the student/parent
        sender: chat.sender === 'teacher' ? 'them' : 'me',
        text: chat.text,
        time: chat.time
      }))
    }));

  const markNotificationAsRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    localStorage.setItem('school_notifications', JSON.stringify(updated));
  };

  const markAllNotificationsAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('school_notifications', JSON.stringify(updated));
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.setItem('school_notifications', JSON.stringify([]));
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
  };

  const addMessage = (teacherId, text) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const updatedDb = dbConversations.map(c => {
      if (c.studentId === "STU108902" && c.teacherId === teacherId) {
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

  const markMessagesAsRead = (contactId) => {
    // Unread count is handled inside mapped view or stored in localStorage
  };

  // Sync when changed in another tab/action
  useEffect(() => {
    const handleStorageChange = () => {
      const db = localStorage.getItem('school_conversations_db');
      if (db) setDbConversations(JSON.parse(db));
      const notifs = localStorage.getItem('school_notifications');
      if (notifs) setNotifications(JSON.parse(notifs));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      messages,
      addNotification,
      mergeInbox,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      clearNotifications,
      addMessage,
      markMessagesAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useStudentNotifications = () => useContext(NotificationContext);

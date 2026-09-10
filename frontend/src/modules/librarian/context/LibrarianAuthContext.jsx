import React, { createContext, useState, useContext, useEffect } from 'react';
import { librarianAuthApi } from '../../../shared/api/client';

const LibrarianAuthContext = createContext();

export const LibrarianAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('librarian_user');
    const storedToken = localStorage.getItem('librarian_token');
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('librarian_user');
        localStorage.removeItem('librarian_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await librarianAuthApi.login({ username, password });
    if (!res?.token) {
      throw new Error(res?.message || 'Authentication failed');
    }

    const userData = {
      id: res.user?.id,
      username: username,
      name: res.user?.name || res.user?.firstName || 'Librarian',
      email: res.user?.email,
      role: res.user?.designation || res.user?.role || 'Librarian',
      schoolId: res.user?.schoolId,
      schoolName: res.user?.schoolName || 'Greenfield Public School',
      academicSession: res.user?.academicSession || '2024-2025',
      photoUrl: res.user?.photo || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    };

    localStorage.setItem('librarian_token', res.token);
    localStorage.setItem('librarian_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('librarian_token');
    localStorage.removeItem('librarian_user');
    setUser(null);
  };

  const updateUser = (partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem('librarian_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <LibrarianAuthContext.Provider value={{ user, loading, login, logout, updateUser, isAuthenticated: Boolean(user) }}>
      {!loading && children}
    </LibrarianAuthContext.Provider>
  );
};

export const useLibrarianAuth = () => {
  const context = useContext(LibrarianAuthContext);
  if (!context) {
    throw new Error('useLibrarianAuth must be used within a LibrarianAuthProvider');
  }
  return context;
};

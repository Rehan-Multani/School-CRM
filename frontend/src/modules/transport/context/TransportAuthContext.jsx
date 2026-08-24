import React, { createContext, useState, useContext, useEffect } from 'react';
import { SCHOOL } from '../../../shared/data/school';
import { findStaffByName } from '../../../shared/data/staff';

const TransportAuthContext = createContext();

export const TransportAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('transport_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const lowerUser = username.toLowerCase();
        if ((lowerUser === 'transport' || lowerUser === 'transport@greenfield.edu') && password === 'transport123') {
          const identity = findStaffByName('Manish Dave');
          const mockUser = {
            id: identity.id,
            username: 'transport',
            name: identity.name,
            email: identity.email,
            role: identity.designation,
            schoolId: SCHOOL.id,
            schoolName: SCHOOL.name,
            academicSession: SCHOOL.academicSession,
            photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face'
          };
          localStorage.setItem('transport_user', JSON.stringify(mockUser));
          setUser(mockUser);
          resolve(mockUser);
        } else {
          reject(new Error('Invalid username or password.'));
        }
      }, 500);
    });
  };

  const logout = () => {
    localStorage.removeItem('transport_user');
    setUser(null);
  };

  return (
    <TransportAuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </TransportAuthContext.Provider>
  );
};

export const useTransportAuth = () => {
  const context = useContext(TransportAuthContext);
  if (!context) {
    throw new Error('useTransportAuth must be used within a TransportAuthProvider');
  }
  return context;
};

import React, { createContext, useState, useContext, useEffect } from 'react';
import { hrAuthApi } from '../../../shared/api/client';

const HRAuthContext = createContext();

export const HRAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('hr_user');
    const storedToken = localStorage.getItem('hr_token');
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('hr_user');
        localStorage.removeItem('hr_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await hrAuthApi.login({ username, password });
    if (!res?.token) {
      throw new Error(res?.message || 'Authentication failed');
    }

    const userData = {
      id: res.user?.id,
      username: username,
      name: res.user?.name || res.user?.firstName || 'HR Manager',
      email: res.user?.email,
      role: res.user?.designation || res.user?.role || 'HR & Operations Lead',
      department: res.user?.department || 'Human Resources',
      employeeId: res.user?.employeeId || 'HR-201',
      schoolId: res.user?.schoolId,
      schoolName: res.user?.schoolName || 'Greenfield Public School',
      academicSession: res.user?.academicSession || '2024-2025',
      photo: res.user?.photo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    };

    localStorage.setItem('hr_token', res.token);
    localStorage.setItem('hr_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('hr_token');
    localStorage.removeItem('hr_user');
    setUser(null);
  };

  const updateProfile = (updatedFields) => {
    const newUser = { ...user, ...updatedFields };
    setUser(newUser);
    localStorage.setItem('hr_user', JSON.stringify(newUser));
  };

  return (
    <HRAuthContext.Provider value={{ user, loading, login, logout, updateProfile, isAuthenticated: Boolean(user) }}>
      {!loading && children}
    </HRAuthContext.Provider>
  );
};

export const useHRAuth = () => {
  const context = useContext(HRAuthContext);
  if (!context) {
    throw new Error('useHRAuth must be used within an HRAuthProvider');
  }
  return context;
};

export default HRAuthContext;

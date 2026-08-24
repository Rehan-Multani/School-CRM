import React, { createContext, useState, useContext, useEffect } from 'react';
import { mockTeacher } from '../data/mockData';
import { SCHOOL } from '../../../shared/data/school';

const TeacherAuthContext = createContext();

export const TeacherAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('teacher-user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('teacher-user');
      }
    }
    setLoading(false);
  }, []);

  const login = (employeeId, password) => {
    if (employeeId && password) {
      const userData = {
        ...mockTeacher,
        schoolId: SCHOOL.id,
        schoolName: SCHOOL.name,
        academicSession: SCHOOL.academicSession,
        token: 'mock-jwt-teacher-token-' + Date.now(),
      };
      setUser(userData);
      localStorage.setItem('teacher-user', JSON.stringify(userData));
      return { success: true };
    }
    return { success: false, message: 'Invalid Employee ID or Password' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('teacher-user');
  };

  const updateProfile = (updatedFields) => {
    const newUser = { ...user, ...updatedFields };
    setUser(newUser);
    localStorage.setItem('teacher-user', JSON.stringify(newUser));
  };

  return (
    <TeacherAuthContext.Provider value={{ user, login, logout, updateProfile, loading }}>
      {children}
    </TeacherAuthContext.Provider>
  );
};

export const useTeacherAuth = () => useContext(TeacherAuthContext);

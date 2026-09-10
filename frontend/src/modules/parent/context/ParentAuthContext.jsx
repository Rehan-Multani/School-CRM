import React, { createContext, useState, useContext, useEffect } from 'react';
import { MOCK_PARENT } from '../data/mockData';
import { SCHOOL } from '../../../shared/data/school';

const ParentAuthContext = createContext();

export const ParentAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('parent-user');
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);
        
        // Load stored active child or fallback to first child
        const savedChildId = localStorage.getItem('parent-selected-child');
        if (savedChildId) {
          setSelectedChildId(savedChildId);
        } else if (parsedUser.linkedChildren && parsedUser.linkedChildren.length > 0) {
          const firstChildId = parsedUser.linkedChildren[0].id;
          setSelectedChildId(firstChildId);
          localStorage.setItem('parent-selected-child', firstChildId);
        }
      } catch (e) {
        localStorage.removeItem('parent-user');
      }
    }
    setLoading(false);
  }, []);

  const login = (emailOrPhone, password) => {
    if (emailOrPhone && password) {
      const userData = {
        ...MOCK_PARENT,
        schoolId: SCHOOL.id,
        schoolName: SCHOOL.name,
        academicSession: SCHOOL.academicSession,
        token: 'mock-parent-token-' + Date.now(),
      };
      setUser(userData);
      localStorage.setItem('parent-user', JSON.stringify(userData));
      
      const firstChildId = userData.linkedChildren[0].id;
      setSelectedChildId(firstChildId);
      localStorage.setItem('parent-selected-child', firstChildId);
      
      return { success: true };
    }
    return { success: false, message: 'Invalid Credentials' };
  };

  const logout = () => {
    setUser(null);
    setSelectedChildId('');
    localStorage.removeItem('parent-user');
    localStorage.removeItem('parent-selected-child');
  };

  const changeSelectedChild = (childId) => {
    setSelectedChildId(childId);
    localStorage.setItem('parent-selected-child', childId);
    window.dispatchEvent(new Event('storage')); // Notify other modules or contexts
  };

  const activeChildInfo = user?.linkedChildren?.find(c => c.id === selectedChildId);

  return (
    <ParentAuthContext.Provider value={{
      user,
      login,
      logout,
      selectedChildId,
      changeSelectedChild,
      activeChildInfo,
      loading
    }}>
      {children}
    </ParentAuthContext.Provider>
  );
};

export const useParentAuth = () => useContext(ParentAuthContext);

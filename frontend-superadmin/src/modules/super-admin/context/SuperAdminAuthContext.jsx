import React, { createContext, useContext, useState, useEffect } from 'react';
import { platformAuthApi } from '../../../shared/api/client';

const SuperAdminAuthContext = createContext(null);

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=60';

function persistUser(user) {
  const next = {
    ...user,
    avatar: user?.avatar || DEFAULT_AVATAR,
  };
  localStorage.setItem('super_admin_user', JSON.stringify(next));
  return next;
}

export const SuperAdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('super_admin_token');
    const storedAdmin = localStorage.getItem('super_admin_user');

    if (!token) {
      setLoading(false);
      return;
    }

    if (storedAdmin) {
      setAdmin(JSON.parse(storedAdmin));
    }

    platformAuthApi
      .me()
      .then((result) => {
        if (result.user) {
          setAdmin(persistUser(result.user));
        }
      })
      .catch(() => {
        localStorage.removeItem('super_admin_user');
        localStorage.removeItem('super_admin_token');
        localStorage.removeItem('super_admin_refresh_token');
        setAdmin(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const result = await platformAuthApi.login(email, password);

    if (!result.success) {
      throw new Error(result.message || 'Invalid email or password');
    }

    localStorage.setItem('super_admin_token', result.token);
    if (result.refreshToken) {
      localStorage.setItem('super_admin_refresh_token', result.refreshToken);
    }

    const user = persistUser(result.user);
    setAdmin(user);
    return { success: true, ...user, user };
  };

  const logout = () => {
    localStorage.removeItem('super_admin_user');
    localStorage.removeItem('super_admin_token');
    localStorage.removeItem('super_admin_refresh_token');
    setAdmin(null);
  };

  const updateProfile = async (updates) => {
    const result = await platformAuthApi.updateProfile(updates);
    if (!result.success) {
      throw new Error(result.message || 'Unable to update profile');
    }
    const user = persistUser(result.user);
    setAdmin(user);
    return user;
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    const result = await platformAuthApi.changePassword({ currentPassword, newPassword });
    if (!result.success) {
      throw new Error(result.message || 'Unable to update password');
    }
    return result;
  };

  const value = {
    admin,
    loading,
    login,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: !!admin,
  };

  return (
    <SuperAdminAuthContext.Provider value={value}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
};

export const useSuperAdminAuth = () => {
  const context = useContext(SuperAdminAuthContext);
  if (!context) {
    throw new Error('useSuperAdminAuth must be used within a SuperAdminAuthProvider');
  }
  return context;
};

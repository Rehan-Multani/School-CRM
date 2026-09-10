import React, { createContext, useState, useContext, useEffect } from 'react';
import { schoolAdminAuthApi, schoolPortalApi } from '../../../shared/api/client';
import { useSchoolAdminTheme } from './SchoolAdminThemeContext';

const SchoolAdminAuthContext = createContext();

function persistUser(user) {
  localStorage.setItem('school-admin-user', JSON.stringify(user));
  localStorage.setItem(
    'school-admin-branding',
    JSON.stringify({
      logo: user?.brandingLogo || '',
      favicon: user?.brandingFavicon || '',
      schoolName: user?.schoolName || '',
    })
  );
  return user;
}

export const SchoolAdminAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setTheme, setAccentColor } = useSchoolAdminTheme();

  useEffect(() => {
    const token = localStorage.getItem('school_admin_token');
    const storedUser = localStorage.getItem('school-admin-user');

    if (!token) {
      setLoading(false);
      return;
    }

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    schoolPortalApi
      .me()
      .then((result) => {
        if (result.user) {
          setUser(persistUser(result.user));
          if (result.user.theme) setTheme(result.user.theme);
          if (result.user.primaryColor) setAccentColor(result.user.primaryColor);
        }
      })
      .catch(() => {
        localStorage.removeItem('school-admin-user');
        localStorage.removeItem('school_admin_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const result = await schoolAdminAuthApi.login(email, password);
    if (!result.success) {
      throw new Error(result.message || 'Invalid email or password');
    }

    if (result.token) {
      localStorage.setItem('school_admin_token', result.token);
    }
    const next = persistUser(result.user);
    setUser(next);
    if (next.theme) setTheme(next.theme);
    if (next.primaryColor) setAccentColor(next.primaryColor);
    return next;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('school-admin-user');
    localStorage.removeItem('school_admin_token');
    localStorage.removeItem('school-admin-branding');
  };

  const updateProfile = (updatedFields) => {
    const newUser = persistUser({ ...user, ...updatedFields });
    setUser(newUser);
  };

  const applyUser = (nextUser) => {
    const next = persistUser(nextUser);
    setUser(next);
    return next;
  };

  const refreshUser = async () => {
    try {
      const result = await schoolPortalApi.me();
      if (result?.user) {
        const next = persistUser(result.user);
        setUser(next);
        if (next.theme) setTheme(next.theme);
        if (next.primaryColor) setAccentColor(next.primaryColor);
        return next;
      }
    } catch {
      // transient or unauthenticated
    }
    return null;
  };

  const hasPlan = Boolean(user?.hasPlan || user?.subscriptionPlan);

  return (
    <SchoolAdminAuthContext.Provider
      value={{ user, login, logout, updateProfile, applyUser, refreshUser, loading, hasPlan }}
    >
      {children}
    </SchoolAdminAuthContext.Provider>
  );
};

export const useSchoolAdminAuth = () => useContext(SchoolAdminAuthContext);

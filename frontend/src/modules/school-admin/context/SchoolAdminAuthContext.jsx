import React, { createContext, useState, useContext, useEffect } from 'react';
import { schoolAdminAuthApi, schoolPortalApi } from '../../../shared/api/client';
import { useSchoolAdminTheme } from './SchoolAdminThemeContext';

const SchoolAdminAuthContext = createContext();

// Set while a Super Admin is visiting this school's panel ("Login as school").
const IMPERSONATION_KEY = 'school-admin-impersonation';

function readImpersonation() {
  try {
    const saved = JSON.parse(localStorage.getItem(IMPERSONATION_KEY) || 'null');
    if (!saved || !saved.until || saved.until < Date.now()) return null;
    return saved;
  } catch {
    return null;
  }
}

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
  const [impersonation, setImpersonation] = useState(readImpersonation);
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
        localStorage.removeItem(IMPERSONATION_KEY);
        setImpersonation(null);
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
    // A normal login is never a Super Admin visit.
    localStorage.removeItem(IMPERSONATION_KEY);
    setImpersonation(null);
    const next = persistUser(result.user);
    setUser(next);
    if (next.theme) setTheme(next.theme);
    if (next.primaryColor) setAccentColor(next.primaryColor);
    return next;
  };

  // Super Admin → "Login as school": swap the one-time code for a session.
  const loginWithCode = async (code) => {
    const result = await schoolAdminAuthApi.loginAs(code);
    if (!result?.success || !result.token) {
      throw new Error(result?.message || 'This login link is not valid.');
    }
    localStorage.setItem('school_admin_token', result.token);
    const visit = {
      by: result.impersonation?.by || 'Super Admin',
      until: Date.now() + (result.impersonation?.expiresInSeconds || 7200) * 1000,
    };
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(visit));
    setImpersonation(visit);
    const next = persistUser(result.user);
    setUser(next);
    if (next.theme) setTheme(next.theme);
    if (next.primaryColor) setAccentColor(next.primaryColor);
    return next;
  };

  const logout = () => {
    setUser(null);
    setImpersonation(null);
    localStorage.removeItem('school-admin-user');
    localStorage.removeItem('school_admin_token');
    localStorage.removeItem('school-admin-branding');
    localStorage.removeItem(IMPERSONATION_KEY);
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
      value={{ user, login, loginWithCode, impersonation, logout, updateProfile, applyUser, refreshUser, loading, hasPlan }}
    >
      {children}
    </SchoolAdminAuthContext.Provider>
  );
};

export const useSchoolAdminAuth = () => useContext(SchoolAdminAuthContext);

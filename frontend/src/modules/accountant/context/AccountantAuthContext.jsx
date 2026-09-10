import React, { createContext, useState, useContext, useEffect } from 'react';
import { accountantAuthApi } from '../../../shared/api/client';

const AccountantAuthContext = createContext();

const STORAGE_USER = 'accountant-user';
const STORAGE_TOKEN = 'accountant_token';

function normalizeUser(raw, fallbackUsername) {
  return {
    id: raw?.id || raw?._id || '',
    name: raw?.name || raw?.firstName || 'Accountant',
    username: fallbackUsername || raw?.email || '',
    email: raw?.email || '',
    phone: raw?.phone || '',
    photo: raw?.photo || '',
    role: raw?.designation || raw?.role || 'School Accountant',
    employeeId: raw?.employeeId || '',
    department: raw?.department || 'Finance Department',
    schoolId: raw?.schoolId || '',
    schoolName: raw?.schoolName || 'School CRM',
    academicSession: raw?.academicSession || '',
  };
}

export const AccountantAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_USER);
    const storedToken = localStorage.getItem(STORAGE_TOKEN);
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(STORAGE_USER);
        localStorage.removeItem(STORAGE_TOKEN);
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const res = await accountantAuthApi.login({ username, password });
      if (!res?.token) {
        return { success: false, message: res?.message || 'Authentication failed' };
      }
      const userData = normalizeUser(res.user, username);
      localStorage.setItem(STORAGE_TOKEN, res.token);
      localStorage.setItem(STORAGE_USER, JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err?.response?.data?.message || err?.message || 'Invalid accountant credentials',
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_TOKEN);
  };

  const updateProfile = (updatedFields) => {
    setUser((prev) => {
      const newUser = { ...prev, ...updatedFields };
      localStorage.setItem(STORAGE_USER, JSON.stringify(newUser));
      return newUser;
    });
  };

  return (
    <AccountantAuthContext.Provider
      value={{ user, login, logout, updateProfile, loading, isAuthenticated: Boolean(user) }}
    >
      {children}
    </AccountantAuthContext.Provider>
  );
};

export const useAccountantAuth = () => useContext(AccountantAuthContext);
export default AccountantAuthContext;

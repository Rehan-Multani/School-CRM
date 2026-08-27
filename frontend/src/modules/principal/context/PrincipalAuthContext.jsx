import React, { createContext, useState, useContext, useEffect } from 'react';
import { principalAuthApi } from '../../../shared/api/client';

const PrincipalAuthContext = createContext();

function persistUser(user) {
  localStorage.setItem('principal-user', JSON.stringify(user));
  return user;
}

export const PrincipalAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('principal_token');
    const storedUser = localStorage.getItem('principal-user');

    if (!token) {
      setLoading(false);
      return;
    }

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    principalAuthApi
      .me()
      .then((result) => {
        if (result.user) {
          setUser(persistUser(result.user));
        }
      })
      .catch(() => {
        localStorage.removeItem('principal-user');
        localStorage.removeItem('principal_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const result = await principalAuthApi.login({ username, password });
    if (!result.success) {
      throw new Error(result.message || 'Invalid Principal credentials');
    }

    if (result.token) {
      localStorage.setItem('principal_token', result.token);
    }
    const next = persistUser(result.user);
    setUser(next);
    return next;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('principal-user');
    localStorage.removeItem('principal_token');
  };

  const updateProfile = (updatedFields) => {
    const newUser = persistUser({ ...user, ...updatedFields });
    setUser(newUser);
  };

  return (
    <PrincipalAuthContext.Provider value={{ user, login, logout, updateProfile, loading }}>
      {children}
    </PrincipalAuthContext.Provider>
  );
};

export const usePrincipalAuth = () => useContext(PrincipalAuthContext);
export default PrincipalAuthContext;

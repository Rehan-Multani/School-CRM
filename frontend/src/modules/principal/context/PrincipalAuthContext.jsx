import React, { createContext, useState, useContext, useEffect } from 'react';

const PrincipalAuthContext = createContext();

export const PrincipalAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('principal-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    const lowerUser = username.toLowerCase();
    if ((lowerUser === 'principal' || lowerUser === 'principal@greenfield.edu') && password === 'principal123') {
      const mockUser = {
        id: 'PRN-001',
        name: 'Dr. S. Chatterjee',
        photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        role: 'School Principal',
        schoolId: 'SCH-2026-09',
        schoolName: 'Greenfield Public School',
        academicSession: '2026-2027',
        email: 'principal@greenfield.edu',
        phone: '+91 99999 77777'
      };
      setUser(mockUser);
      localStorage.setItem('principal-user', JSON.stringify(mockUser));
      return { success: true };
    }
    return { success: false, message: 'Invalid Principal Credentials (Use principal / principal123)' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('principal-user');
  };

  const updateProfile = (updatedFields) => {
    const newUser = { ...user, ...updatedFields };
    setUser(newUser);
    localStorage.setItem('principal-user', JSON.stringify(newUser));
  };

  return (
    <PrincipalAuthContext.Provider value={{ user, login, logout, updateProfile, loading }}>
      {children}
    </PrincipalAuthContext.Provider>
  );
};

export const usePrincipalAuth = () => useContext(PrincipalAuthContext);
export default PrincipalAuthContext;

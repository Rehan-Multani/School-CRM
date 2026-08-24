import React, { createContext, useState, useContext, useEffect } from 'react';

const AccountantAuthContext = createContext();

export const AccountantAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('accountant-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    const lowerUser = username.toLowerCase();
    if ((lowerUser === 'accountant' || lowerUser === 'accountant@greenfield.edu') && password === 'accountant123') {
      const mockUser = {
        id: 'ACC-001',
        name: 'Mr. Suresh Mehta',
        photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        role: 'School Accountant',
        employeeId: 'ACC-001',
        department: 'Finance Department',
        schoolId: 'SCH-2026-09',
        schoolName: 'Greenfield Public School',
        academicSession: '2026-2027',
        email: 'suresh.mehta@greenfield.edu',
        phone: '+91 99999 55555'
      };
      setUser(mockUser);
      localStorage.setItem('accountant-user', JSON.stringify(mockUser));
      return { success: true };
    }
    return { success: false, message: 'Invalid Accountant Credentials (Use accountant / accountant123)' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('accountant-user');
  };

  const updateProfile = (updatedFields) => {
    const newUser = { ...user, ...updatedFields };
    setUser(newUser);
    localStorage.setItem('accountant-user', JSON.stringify(newUser));
  };

  return (
    <AccountantAuthContext.Provider value={{ user, login, logout, updateProfile, loading }}>
      {children}
    </AccountantAuthContext.Provider>
  );
};

export const useAccountantAuth = () => useContext(AccountantAuthContext);
export default AccountantAuthContext;

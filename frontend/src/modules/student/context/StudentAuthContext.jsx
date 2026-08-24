import React, { createContext, useState, useContext, useEffect } from 'react';
import { findStudent } from '../../../shared/data/students';
import { SCHOOL } from '../../../shared/data/school';

const StudentAuthContext = createContext();

export const StudentAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('student-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (studentId, password) => {
    if (studentId && password) {
      const identity = findStudent('STU108902');
      const mockUser = {
        id: identity.id,
        name: identity.name,
        photo: identity.photo,
        schoolId: SCHOOL.id,
        schoolName: SCHOOL.name,
        admissionNo: identity.admissionNo,
        class: identity.class,
        section: identity.section,
        rollNo: identity.rollNo,
        academicSession: SCHOOL.academicSession,
        email: identity.email,
        phone: identity.phone,
        dob: identity.dob,
        bloodGroup: identity.bloodGroup,
        gender: identity.gender,
        category: "General",
        religion: "Hinduism",
        admissionDate: "2024-04-10",
        guardian: {
          name: identity.parentName,
          relation: "Father",
          phone: identity.parentPhone,
          email: "rajesh.sharma@gmail.com",
          occupation: "Software Engineer",
          address: identity.address
        },
        medical: {
          allergies: "Dust, Pollen",
          conditions: "None",
          medications: "None",
          emergencyContact: `${identity.parentName} (${identity.parentPhone})`
        }
      };
      setUser(mockUser);
      localStorage.setItem('student-user', JSON.stringify(mockUser));
      return { success: true };
    }
    return { success: false, message: 'Invalid Credentials' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('student-user');
  };

  const updateProfile = (updatedFields) => {
    const newUser = { ...user, ...updatedFields };
    setUser(newUser);
    localStorage.setItem('student-user', JSON.stringify(newUser));
  };

  return (
    <StudentAuthContext.Provider value={{ user, login, logout, updateProfile, loading }}>
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => useContext(StudentAuthContext);

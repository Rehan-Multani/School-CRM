export const MOCK_STUDENTS = [];

export const findStudent = (id) => MOCK_STUDENTS.find((s) => s.id === id);
export const findStudentByName = (name) => MOCK_STUDENTS.find((s) => s.name === name);
export const studentsInClass = (className, section) =>
  MOCK_STUDENTS.filter((s) => s.class === className && (!section || s.section === section));

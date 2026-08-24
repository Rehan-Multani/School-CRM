export const MOCK_STAFF = [
  {
    id: 'EMP501',
    name: 'Manish Dave',
    email: 'transport@greenfield.edu',
    designation: 'Transport Manager'
  },
  {
    id: 'EMP401',
    name: 'Sanjay Kumar',
    email: 'librarian@greenfield.edu',
    designation: 'Librarian'
  }
];

export const findStaff = (id) => MOCK_STAFF.find((s) => s.id === id);
export const findStaffByName = (name) => MOCK_STAFF.find((s) => s.name === name);

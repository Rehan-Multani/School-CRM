// ============================================================
// SHARED SCHOOL PROFILE
// Canonical identity picked from the AuthContext mock users that already
// agreed across principal, school-admin, HR and accountant modules
// ('Greenfield Public School', schoolId 'SCH-2026-09', academicSession
// '2026-2027'). transport and librarian previously hardcoded a different
// name ('Greenwood Future School') — that conflict is resolved here in
// favor of the majority name and updated in those two modules.
// ============================================================

export const SCHOOL = {
  id: 'SCH-2026-09',
  name: 'Greenfield Public School',
  shortName: 'GFS',
  tagline: 'Nurturing Minds, Building Futures',
  address: '221, Sector 15, Dwarka, New Delhi - 110075',
  city: 'New Delhi',
  state: 'Delhi',
  pincode: '110075',
  country: 'India',
  phone: '+91 11 4567 8901',
  email: 'info@greenfield.edu',
  website: 'www.greenfieldpublicschool.edu.in',
  established: 1998,
  affiliation: 'CBSE',
  affiliationNo: 'CBSE/AFF/2026/09312',
  academicSession: '2026-2027',
  principalName: 'Dr. S. Chatterjee',
};

export const INITIAL_DATA = {
  // 1. TENANT & SCHOOL METADATA
  tenant: {
    activeSchoolId: 'SCH-2026-09',
    schools: [
      {
        id: 'SCH-2026-09',
        schoolId: 'greenfield-delhi',
        name: 'Greenfield Public School',
        shortName: 'GFS',
        address: '221, Sector 15, Dwarka, New Delhi - 110075',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        phone: '+91 11 4567 8901',
        email: 'info@greenfield.edu',
        website: 'www.greenfieldpublicschool.edu.in',
        principal: 'Dr. S. Chatterjee',
        schoolAdmin: 'admin@greenfield.edu',
        status: 'Active',
        plan: 'Enterprise',
        academicSession: '2026-2027',
        maxStudents: 2500,
        maxStaff: 150,
        maxStorage: 200,
        storageUsed: 0,
        modules: {
          student: true,
          teacher: true,
          parent: true,
          academics: true,
          attendance: true,
          examination: true,
          fees: true,
          library: true,
          transport: true,
          hostel: true,
          payroll: true,
          inventory: true,
          events: true,
          communication: true,
          reports: true
        }
      }
    ]
  },

  // 2. USER CREDENTIALS & SESSIONS
  auth: {
    users: [
      { id: 'usr-admin-01', username: 'admin', email: 'admin@greenfield.edu', phone: '+91 98000 11111', role: 'school-admin', name: 'School Administrator', password: 'admin123', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', status: 'Active' },
      { id: 'usr-principal-01', username: 'principal', email: 'principal@greenfield.edu', phone: '+91 98000 22222', role: 'principal', name: 'Principal', password: 'principal123', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', status: 'Active' },
      { id: 'usr-teacher-01', username: 'teacher', email: 'teacher@greenfield.edu', phone: '+91 98111 22334', role: 'teacher', name: 'Faculty Member', employeeId: 'EMP101', password: 'password123', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', status: 'Active', department: 'Academics' },
      { id: 'usr-student-01', username: 'student', email: 'student@greenfield.edu', phone: '+91 98765 43210', role: 'student', name: 'Student Portal User', studentId: 'STU001', password: 'password123', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', status: 'Active' },
      { id: 'usr-parent-01', username: 'parent', email: 'parent@greenfield.edu', phone: '+91 98765 43210', role: 'parent', name: 'Parent Guardian', password: 'password123', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', children: [], status: 'Active' },
      { id: 'usr-accountant-01', username: 'accountant', email: 'accountant@greenfield.edu', phone: '+91 98000 33333', role: 'accountant', name: 'Accountant', employeeId: 'EMP201', password: 'accountant123', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', status: 'Active' },
      { id: 'usr-hr-01', username: 'hr', email: 'hr@greenfield.edu', phone: '+91 98000 44444', role: 'hr', name: 'HR Manager', employeeId: 'EMP301', password: 'hr123', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', status: 'Active' },
      { id: 'usr-librarian-01', username: 'librarian', email: 'librarian@greenfield.edu', phone: '+91 98000 55555', role: 'librarian', name: 'Librarian', employeeId: 'EMP401', password: 'lib123', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', status: 'Active' },
      { id: 'usr-transport-01', username: 'transport', email: 'transport@greenfield.edu', phone: '+91 98000 66666', role: 'transport', name: 'Transport Manager', employeeId: 'EMP501', password: 'transport123', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', status: 'Active' },
      { id: 'usr-superadmin-01', username: 'superadmin@gmail.com', email: 'superadmin@gmail.com', phone: '+91 99999 00000', role: 'super-admin', name: 'Super Admin', password: '123', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', status: 'Active' }
    ],
    loginLogs: []
  },

  // 3. STUDENT ROSTER & ADMISSIONS
  students: [],
  admissions: [],

  // 4. STAFF & EMPLOYEES
  staff: [],

  // 5. ACADEMICS & TIMETABLE
  academicSessions: [],
  classes: [],
  subjects: [],
  timetable: {},
  curriculum: [],

  // 6. ATTENDANCE & LEAVES
  attendance: {
    students: {},
    staff: {}
  },
  leaves: [],

  // 7. EXAMINATIONS & RESULTS
  exams: [],
  results: {},

  // 8. FEES, TRANSACTIONS & RECEIPTS
  feeStructures: [],
  receipts: [],

  // 9. LIBRARY & CIRCULATION
  books: [],
  bookLoans: [],

  // 10. TRANSPORT FLEET & ROUTES
  transport: {
    vehicles: [],
    routes: []
  },

  // 11. HOSTEL
  hostel: {
    buildings: [],
    rooms: []
  },

  // 12. HOMEWORK
  homework: [],

  // 13. COMMUNICATION & ANNOUNCEMENTS
  announcements: [],

  // 14. CAMPUS EVENTS
  events: [],

  // 15. INVENTORY & ASSETS
  inventory: [],

  // 16. SYSTEM AUDIT LOG
  auditLogs: []
};

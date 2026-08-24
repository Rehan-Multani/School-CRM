export const MOCK_STUDENT = {
  id: '',
  name: 'Student',
  photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
  admissionNo: '---',
  class: 'Class',
  section: 'A',
  rollNo: '--',
  academicSession: '2026-2027',
  dob: '',
  email: '',
  phone: '',
  bloodGroup: '',
  emergencyContact: '',
  address: '',
  guardian: {
    name: '',
    relation: 'Guardian',
    phone: '',
    email: '',
    occupation: '',
  },
  medical: {
    allergies: 'None',
    conditions: 'None',
    medications: 'None'
  }
};

export const MOCK_ATTENDANCE = {
  overallPercentage: 0,
  present: 0,
  absent: 0,
  late: 0,
  halfDay: 0,
  leave: 0,
  analytics: [],
  history: []
};

export const MOCK_HOMEWORK = [];

export const MOCK_EXAMS = {
  seatNumber: '---',
  examHall: '---',
  countdownToNext: null,
  instructions: [],
  schedule: []
};

export const MOCK_RESULTS = {
  gpa: '0.0',
  rank: '---',
  overallPercentage: '0%',
  currentExam: '---',
  previousExamCompare: [],
  subjects: []
};

export const MOCK_ACADEMICS = {
  subjects: [],
  materials: []
};

export const MOCK_TIMETABLE = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: []
};

export const MOCK_FEES = {
  totalFees: 0,
  paidFees: 0,
  pendingFees: 0,
  installments: [],
  discounts: [],
  lateFine: 0,
  history: []
};

export const MOCK_TRANSPORT = {
  vehicleNo: '---',
  driverName: '---',
  driverPhone: '---',
  pickupPoint: '---',
  dropPoint: '---',
  pickupTime: '---',
  dropTime: '---',
  routeMapUrl: '#'
};

export const MOCK_HOSTEL = {
  building: '---',
  floor: '---',
  roomNumber: '---',
  roomType: '---',
  roommates: [],
  feeStatus: '---',
  attendance: {
    present: 0,
    absent: 0
  }
};

export const MOCK_LIBRARY = {
  booksIssued: [],
  searchCatalog: [],
  history: []
};

export const MOCK_LEAVE = [];

export const MOCK_ANNOUNCEMENTS = [];

export const MOCK_EVENTS = {
  upcoming: [],
  calendar: []
};

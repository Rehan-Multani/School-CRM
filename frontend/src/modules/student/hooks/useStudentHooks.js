import { useAppStore } from '../../../shared/store/useAppStore';

export const useStudentData = () => {
  const { store } = useAppStore();
  const student = store.students.find(s => s.id === 'STU108902') || store.students[0];
  return { data: student, updateStudentData: () => {} };
};

export const useAttendance = () => {
  const { store } = useAppStore();
  const student = store.students.find(s => s.id === 'STU108902') || store.students[0];
  
  // Calculate attendance metrics from store
  const studentHistory = [
    { date: '2026-08-14', status: store.attendance.students['2026-08-14']?.[student?.id] || 'Present', remark: 'Regular session' },
    { date: '2026-08-13', status: store.attendance.students['2026-08-13']?.[student?.id] || 'Present', remark: 'Regular session' },
    { date: '2026-08-12', status: 'Present', remark: 'Regular session' },
    { date: '2026-08-11', status: 'Late', remark: 'Arrived 10 mins late' },
    { date: '2026-08-10', status: 'Present', remark: 'Regular session' }
  ];

  const presentCount = studentHistory.filter(h => h.status === 'Present').length;
  const lateCount = studentHistory.filter(h => h.status === 'Late').length;
  const absentCount = studentHistory.filter(h => h.status === 'Absent').length;

  const data = {
    overallPercentage: parseFloat((((presentCount + lateCount * 0.8) / studentHistory.length) * 100).toFixed(1)),
    present: presentCount + 80,
    absent: absentCount + 2,
    late: lateCount + 3,
    halfDay: 1,
    leave: 2,
    workingDays: 90,
    history: studentHistory
  };

  return { data };
};

export const useHomework = () => {
  const { store, submitHomework } = useAppStore();
  const homeworkList = store.homework || [];

  const handleStudentSubmit = (hwId, submissionData) => {
    submitHomework(hwId, 'STU108902', submissionData);
  };

  return { homeworkList, submitHomework: handleStudentSubmit };
};

export const useExams = () => {
  const { store } = useAppStore();
  const examList = store.exams || [];
  const activeExam = examList.find(e => e.status === 'Upcoming') || examList[0] || {};
  
  const schedule = (activeExam.schedule && activeExam.schedule.length > 0)
    ? activeExam.schedule.map((s, idx) => ({
        id: s.id || `ex-${idx + 1}`,
        subject: s.subject,
        date: s.date,
        time: s.time,
        hall: s.hall || 'Room 302',
        seat: s.seat || 'A-12-10',
        maxMarks: s.maxMarks || 100
      }))
    : [
        { id: 'ex-1', subject: 'Mathematics', date: '2026-09-10', time: '09:00 AM - 12:00 PM', hall: 'Room 302', seat: 'A-12-10', maxMarks: 100 },
        { id: 'ex-2', subject: 'Science', date: '2026-09-12', time: '09:00 AM - 12:00 PM', hall: 'Room 302', seat: 'A-12-10', maxMarks: 100 },
        { id: 'ex-3', subject: 'English', date: '2026-09-15', time: '09:00 AM - 12:00 PM', hall: 'Room 302', seat: 'A-12-10', maxMarks: 100 },
        { id: 'ex-4', subject: 'Social Studies', date: '2026-09-18', time: '09:00 AM - 12:00 PM', hall: 'Room 302', seat: 'A-12-10', maxMarks: 100 }
      ];

  const examsObj = {
    ...activeExam,
    list: examList,
    seatNumber: activeExam.seatNumber || 'A-12-10',
    examHall: activeExam.examHall || 'Room 302, 3rd Floor',
    countdownToNext: activeExam.startDate ? `${activeExam.startDate}T09:00:00` : '2026-09-10T09:00:00',
    instructions: activeExam.instructions || [
      'Report to the examination hall 30 minutes before the start time.',
      'Carry your physical Student ID card and Hall Ticket.',
      'Calculators are allowed only for designated science and math papers.',
      'No mobile phones or unauthorized electronic gadgets are permitted.'
    ],
    schedule
  };

  return { exams: examsObj };
};

export const useResults = () => {
  const { store } = useAppStore();
  const student = store.students.find(s => s.id === 'STU108902') || store.students[0];
  const examResults = store.results['EXAM-2026-UT1']?.[student?.id] || {
    percentage: 94.5,
    gpa: 9.6,
    rank: 1,
    subjects: [
      { subject: 'Mathematics', score: 96, grade: 'A1', remarks: 'Outstanding analytical clarity' },
      { subject: 'Science', score: 94, grade: 'A1', remarks: 'Exceptional laboratory insight' },
      { subject: 'English', score: 92, grade: 'A1', remarks: 'Strong essay structuring' },
      { subject: 'Social Studies', score: 95, grade: 'A1', remarks: 'Very thorough historical timeline' },
      { subject: 'Computer Science', score: 98, grade: 'A1', remarks: 'Clean and optimal code submission' }
    ]
  };

  const results = {
    overallPercentage: `${examResults.percentage}%`,
    gpa: examResults.gpa || '9.6',
    rank: examResults.rank || '1st',
    grade: examResults.grade || 'A1',
    currentExam: examResults.currentExam || 'Unit Test 1 (2026-2027)',
    previousExamCompare: examResults.previousExamCompare || [
      { subject: 'Maths', midTerm: 92, halfYearly: 96 },
      { subject: 'Science', midTerm: 88, halfYearly: 94 },
      { subject: 'English', midTerm: 90, halfYearly: 92 },
      { subject: 'Social Studies', midTerm: 91, halfYearly: 95 },
      { subject: 'Computer Sci', midTerm: 95, halfYearly: 98 }
    ],
    subjects: examResults.subjects || []
  };

  return { results };
};

export const useAcademics = () => {
  const { store } = useAppStore();
  const subjects = store.subjects || [];
  
  const subjectsList = subjects.length > 0 
    ? subjects.map((s, idx) => ({
        name: s.name,
        code: s.code || `SUB${100 + idx}`,
        teacher: s.teacher || s.subjectTeacher || 'Senior Faculty',
        credits: s.credits || 4,
        syllabusProgress: s.syllabusProgress || 75,
        rooms: s.room || s.rooms || `Room ${300 + idx}`
      }))
    : [
        { name: 'Mathematics', teacher: 'Mr. Rajesh Kumar', syllabusProgress: 75, rooms: 'Room 302' },
        { name: 'Science', teacher: 'Dr. Anita Desai', syllabusProgress: 68, rooms: 'Science Lab' },
        { name: 'English', teacher: 'Ms. Priya Menon', syllabusProgress: 80, rooms: 'Room 105' },
        { name: 'Social Studies', teacher: 'Mr. Vikram Singh', syllabusProgress: 60, rooms: 'Room 201' }
      ];

  const materials = [
    { id: 'mat-1', title: 'Quadratic Equations Notes & Worksheets', type: 'PDF', size: '1.8 MB', subject: 'Mathematics', downloadUrl: '#' },
    { id: 'mat-2', title: 'Carbon & Its Compounds Presentation', type: 'Notes', size: '4.5 MB', subject: 'Science', downloadUrl: '#' },
    { id: 'mat-3', title: 'Recorded Lecture: Shakespearean Drama', type: 'Video', duration: '45 mins', subject: 'English', downloadUrl: '#' },
    { id: 'mat-4', title: 'Indian Independence Movement Map Guide', type: 'PDF', size: '2.1 MB', subject: 'Social Studies', downloadUrl: '#' }
  ];

  return {
    academics: {
      subjects: subjectsList,
      materials
    }
  };
};

export const useTimetable = () => {
  const { store } = useAppStore();
  const timetable10A = store.timetable?.['10-A'] || [];
  return { timetable: timetable10A };
};

export const useFees = () => {
  const { store, collectFee } = useAppStore();
  const student = store.students.find(s => s.id === 'STU108902') || store.students[0];
  const receipts = store.receipts.filter(r => r.studentId === student?.id || r.admissionNo === student?.admissionNo);

  const totalFees = student?.totalFees || 85000;
  const paidFees = student?.paidFees || 55000;
  const pendingFees = student?.pendingFees || (totalFees - paidFees);

  const installments = [
    { name: 'Term 1 Tuition Fee', amount: 35000, dueDate: '2026-05-15', status: 'Paid', receiptNo: receipts[0]?.receiptNo || 'RCT-2026-0891' },
    { name: 'Term 2 Tuition Fee', amount: 20000, dueDate: '2026-08-30', status: paidFees >= 55000 ? 'Paid' : 'Unpaid', receiptNo: paidFees >= 55000 ? 'RCT-2026-0892' : null },
    { name: 'Term 3 Final Tuition Fee', amount: 30000, dueDate: '2026-11-30', status: paidFees >= 85000 ? 'Paid' : 'Unpaid', receiptNo: paidFees >= 85000 ? 'RCT-2026-0893' : null }
  ];

  const payFeeOnline = (installmentName) => {
    const inst = installments.find(i => i.name === installmentName) || { amount: 30000 };
    collectFee({
      studentId: student?.id || 'STU108902',
      studentName: student?.name || 'Aarav Sharma',
      admissionNo: student?.admissionNo || 'ADM-2024-8902',
      class: student?.class || 'Class 10',
      paidAmount: inst.amount,
      paymentMethod: 'UPI / Online Portal',
      remarks: `Online Portal settlement for ${installmentName}`,
      collector: 'Student Self (Online)'
    });
  };

  return {
    fees: {
      totalFees,
      paidFees,
      pendingFees,
      installments,
      discounts: [{ name: 'Merit Scholarship', amount: 5000 }],
      history: receipts.map(r => ({
        paymentId: r.receiptNo,
        date: r.paymentDate,
        amount: r.paidAmount,
        mode: r.paymentMethod,
        receiptNo: r.receiptNo
      }))
    },
    payFeeOnline
  };
};

export const useTransport = () => {
  const { store } = useAppStore();
  const route = store.transport?.routes?.find(r => r.id === 'RT-002') || store.transport?.routes?.[0];

  return {
    transport: {
      routeNo: route?.id || 'RT-002',
      busNo: route?.vehicleNo || 'DL-01-CD-5678',
      driverName: route?.driverName || 'Jaspreet Singh',
      driverPhone: route?.driverPhone || '+91 98765 43210',
      pickupPoint: 'Dwarka Mor Metro Station (Gate 2)',
      pickupTime: '07:35 AM',
      dropTime: '03:45 PM',
      stops: route?.stops || ['Dwarka Mor', 'Uttam Nagar East', 'Janakpuri West', 'Greenfield Public School']
    }
  };
};

export const useHostel = () => {
  const { store } = useAppStore();
  const room = store.hostel?.rooms?.[0];
  return {
    hostel: {
      isHosteller: true,
      building: room?.buildingName || 'Nilgiri Boys Hostel',
      roomNo: room?.roomNumber || '204-B',
      bedType: room?.type || 'Double Occupancy',
      wardenName: 'Mr. Surender Nath',
      wardenPhone: '+91 98111 22334',
      mealsIncluded: 'Breakfast, Lunch, Snacks, Dinner'
    }
  };
};

export const useLibrary = () => {
  const { store, issueBook, returnBook } = useAppStore();
  const activeStudentLoans = store.bookLoans.filter(l => l.studentId === 'STU108902' && l.status === 'Issued');

  const library = {
    libraryCardNo: 'LIB-STU-108902',
    maxBooksAllowed: 4,
    booksIssuedCount: activeStudentLoans.length,
    booksIssued: activeStudentLoans.map(l => ({
      title: l.bookTitle,
      author: 'Academic Faculty / NCERT',
      issueDate: l.issueDate,
      returnDate: l.dueDate,
      status: l.status,
      loanId: l.id
    }))
  };

  const renewBook = (title) => {
    // Renew loan
  };

  return { library, renewBook };
};

export const useLeave = () => {
  const { store, applyLeave } = useAppStore();
  const studentLeaves = store.leaves.filter(l => l.applicantId === 'STU108902' || l.applicantName?.includes('Aarav'));

  const handleApplyLeave = (data) => {
    applyLeave({
      applicantType: 'Student',
      applicantId: 'STU108902',
      applicantName: 'Aarav Sharma',
      class: 'Class 10',
      section: 'A',
      leaveType: 'Medical / Personal Leave',
      startDate: data.startDate,
      endDate: data.endDate,
      days: 1,
      reason: data.reason
    });
  };

  return { leaveHistory: studentLeaves, applyLeave: handleApplyLeave };
};

export const useAnnouncements = () => {
  const { store } = useAppStore();
  return { announcements: store.announcements || [] };
};

export const useEvents = () => {
  const { store, rsvpEvent } = useAppStore();
  return {
    events: {
      upcoming: store.events || []
    },
    registerForEvent: (id) => rsvpEvent(id, 'STU108902')
  };
};

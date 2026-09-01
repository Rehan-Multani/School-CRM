import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMasterStore, saveMasterStore, logAudit, resetMasterStore } from './index';

const AppStoreContext = createContext(null);

export const AppStoreProvider = ({ children }) => {
  const [store, setStore] = useState(getMasterStore);

  // Sync state on custom event or localStorage change
  useEffect(() => {
    const handleUpdate = () => {
      setStore(getMasterStore());
    };

    window.addEventListener('school_store_update', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('school_store_update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Update store helper
  const updateStore = useCallback((updaterFn, actionType = 'STATE_UPDATE', actionDetails = {}) => {
    setStore(prev => {
      const current = getMasterStore();
      const next = typeof updaterFn === 'function' ? updaterFn(current) : { ...current, ...updaterFn };
      saveMasterStore(next, actionType, actionDetails);
      return next;
    });
  }, []);

  // ==========================================
  // ACTION DISPATCHERS FOR ALL MODULES (FRD)
  // ==========================================

  // 1. AUTH & USERS (FRD §6, §27)
  const authenticateUser = useCallback((identifier, password) => {
    const s = getMasterStore();
    const cleanId = (identifier || '').trim().toLowerCase();
    const user = s.auth.users.find(u => 
      (u.username.toLowerCase() === cleanId ||
       u.email.toLowerCase() === cleanId ||
       (u.studentId && u.studentId.toLowerCase() === cleanId) ||
       (u.employeeId && u.employeeId.toLowerCase() === cleanId) ||
       u.phone.replace(/[\s-]/g, '') === cleanId.replace(/[\s-]/g, '')) &&
      u.password === password
    );

    if (user) {
      // Log login activity (FRD §6.5)
      const newLog = {
        id: `log-${Date.now().toString().slice(-5)}`,
        username: user.username,
        role: user.role,
        timestamp: new Date().toISOString(),
        ip: '192.168.1.' + Math.floor(10 + Math.random() * 80),
        device: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Chrome',
        status: 'Success'
      };
      updateStore(prev => ({
        ...prev,
        auth: {
          ...prev.auth,
          loginLogs: [newLog, ...(prev.auth.loginLogs || [])].slice(0, 100)
        }
      }), 'USER_LOGIN', { user: user.username, role: user.role });
      return { success: true, user };
    }
    return { success: false, message: 'Invalid credentials. Please verify your ID/Email and password.' };
  }, [updateStore]);

  const registerUser = useCallback((userData, actor = 'admin') => {
    const newUser = {
      id: `usr-${Date.now().toString().slice(-5)}`,
      username: userData.username || userData.email || userData.studentId || userData.employeeId,
      email: userData.email,
      phone: userData.phone || '+91 98000 00000',
      role: userData.role,
      name: userData.name,
      studentId: userData.studentId,
      employeeId: userData.employeeId,
      password: userData.password || 'password123',
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      status: 'Active'
    };

    updateStore(prev => ({
      ...prev,
      auth: {
        ...prev.auth,
        users: [newUser, ...prev.auth.users]
      }
    }), 'USER_CREATED', { name: newUser.name, role: newUser.role });

    logAudit(actor, 'School Admin', 'USER_CREATED', `Account provisioned for ${newUser.name} (${newUser.role})`);
    return newUser;
  }, [updateStore]);

  const resetPasswordByOTP = useCallback((identifier, newPassword) => {
    const cleanId = (identifier || '').trim().toLowerCase();
    let found = false;
    updateStore(prev => {
      const updatedUsers = prev.auth.users.map(u => {
        if (u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId || u.phone === cleanId) {
          found = true;
          return { ...u, password: newPassword };
        }
        return u;
      });
      return { ...prev, auth: { ...prev.auth, users: updatedUsers } };
    }, 'PASSWORD_RESET', { identifier });

    return found;
  }, [updateStore]);

  // 2. ADMISSIONS & STUDENT LIFECYCLE (FRD §7)
  const approveAdmission = useCallback((admissionId, targetClass = '10', targetSection = 'A', actor = 'admin') => {
    let approvedStudent = null;
    updateStore(prev => {
      const adm = prev.admissions.find(a => a.id === admissionId);
      if (!adm) return prev;

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const studentId = `STU${randomSuffix}`;
      const admissionNo = `ADM-2026-${randomSuffix}`;

      approvedStudent = {
        id: studentId,
        admissionNo: admissionNo,
        name: adm.name,
        class: `Class ${targetClass || adm.class}`,
        section: targetSection || adm.section || 'A',
        rollNo: `${targetClass || adm.class}${randomSuffix.toString().slice(-2)}`,
        gender: adm.gender || 'Male',
        dob: adm.dob || '2012-01-01',
        parentName: adm.parentName || 'Guardian',
        parentPhone: adm.phone || '+91 98000 00000',
        email: adm.email || `${adm.name.toLowerCase().replace(/\s+/g, '.')}@greenfield.edu`,
        address: adm.address || 'New Delhi',
        bloodGroup: 'O+',
        status: 'Active',
        feeStatus: 'Due',
        totalFees: 48000,
        paidFees: 0,
        pendingFees: 48000,
        transportRouteId: 'RT-002',
        pickupPoint: 'Dwarka Mor Metro Station',
        hostelRoomId: null,
        documents: [
          { id: 'doc-1', name: 'Birth Certificate', verified: true, uploadDate: new Date().toISOString().split('T')[0] },
          { id: 'doc-2', name: 'Transfer Certificate', verified: true, uploadDate: new Date().toISOString().split('T')[0] }
        ]
      };

      // Create login account automatically
      const newStudentUser = {
        id: `usr-${studentId}`,
        username: studentId,
        email: approvedStudent.email,
        phone: approvedStudent.parentPhone,
        role: 'student',
        name: approvedStudent.name,
        studentId: studentId,
        password: 'password123',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
        status: 'Active'
      };

      // Update admissions status
      const updatedAdmissions = prev.admissions.map(a => a.id === admissionId ? {
        ...a,
        status: 'Approved',
        admissionNo,
        documentsStatus: 'Verified'
      } : a);

      return {
        ...prev,
        admissions: updatedAdmissions,
        students: [approvedStudent, ...prev.students],
        auth: {
          ...prev.auth,
          users: [newStudentUser, ...prev.auth.users]
        }
      };
    }, 'ADMISSION_APPROVED', { admissionId });

    if (approvedStudent) {
      logAudit(actor, 'School Admin', 'ADMISSION_APPROVED', `Approved admission for ${approvedStudent.name} (${approvedStudent.admissionNo}) in Class ${targetClass}-${targetSection}`);
    }
    return approvedStudent;
  }, [updateStore]);

  const updateStudentStatus = useCallback((studentId, newStatus, actor = 'admin') => {
    updateStore(prev => ({
      ...prev,
      students: prev.students.map(s => s.id === studentId ? { ...s, status: newStatus } : s)
    }), 'STUDENT_STATUS_UPDATED', { studentId, newStatus });

    logAudit(actor, 'School Admin', 'STUDENT_STATUS_UPDATED', `Updated student ${studentId} status to ${newStatus}`);
  }, [updateStore]);

  const promoteStudents = useCallback((sourceClass, targetClass, targetSession = '2026-2027', actor = 'admin') => {
    updateStore(prev => {
      const updatedStudents = prev.students.map(s => {
        if (s.class === `Class ${sourceClass}` || s.class === sourceClass) {
          return {
            ...s,
            class: `Class ${targetClass}`,
            academicSession: targetSession
          };
        }
        return s;
      });
      return { ...prev, students: updatedStudents };
    }, 'STUDENTS_PROMOTED', { sourceClass, targetClass });

    logAudit(actor, 'School Admin', 'STUDENTS_PROMOTED', `Promoted all students from Class ${sourceClass} to Class ${targetClass}`);
  }, [updateStore]);

  // 3. ATTENDANCE & LEAVES (FRD §9, §16.2)
  const markStudentAttendance = useCallback((date, classId, records, actor = 'teacher') => {
    updateStore(prev => {
      const currentDay = prev.attendance.students[date] || {};
      const nextDay = { ...currentDay, ...records };
      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          students: {
            ...prev.attendance.students,
            [date]: nextDay
          }
        }
      };
    }, 'STUDENT_ATTENDANCE_MARKED', { date, classId });

    logAudit(actor, 'Teacher', 'ATTENDANCE_MARKED', `Marked attendance for Class ${classId} on ${date}`);
  }, [updateStore]);

  const markStaffAttendance = useCallback((date, records, actor = 'hr') => {
    updateStore(prev => {
      const currentDay = prev.attendance.staff[date] || {};
      const nextDay = { ...currentDay, ...records };
      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          staff: {
            ...prev.attendance.staff,
            [date]: nextDay
          }
        }
      };
    }, 'STAFF_ATTENDANCE_MARKED', { date });

    logAudit(actor, 'HR', 'STAFF_ATTENDANCE_MARKED', `Staff attendance recorded for ${date}`);
  }, [updateStore]);

  const applyLeave = useCallback((leaveData) => {
    const newLeave = {
      id: `LVE-${Date.now().toString().slice(-4)}`,
      applicantType: leaveData.applicantType || 'Student',
      applicantId: leaveData.applicantId,
      applicantName: leaveData.applicantName,
      class: leaveData.class || null,
      department: leaveData.department || null,
      leaveType: leaveData.leaveType,
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      days: leaveData.days || 1,
      reason: leaveData.reason,
      status: 'Pending',
      approverRole: leaveData.applicantType === 'Student' ? 'Teacher' : 'Principal',
      appliedAt: new Date().toISOString().split('T')[0]
    };

    updateStore(prev => ({
      ...prev,
      leaves: [newLeave, ...prev.leaves]
    }), 'LEAVE_APPLIED', { leaveId: newLeave.id });

    logAudit(leaveData.applicantName, leaveData.applicantType, 'LEAVE_APPLIED', `${leaveData.applicantType} leave requested: ${leaveData.reason}`);
    return newLeave;
  }, [updateStore]);

  const approveLeave = useCallback((leaveId, isApproved, comments = '', actor = 'Principal') => {
    updateStore(prev => {
      const updatedLeaves = prev.leaves.map(l => {
        if (l.id === leaveId) {
          return {
            ...l,
            status: isApproved ? 'Approved' : 'Rejected',
            comments: comments || (isApproved ? 'Approved by authority.' : 'Application rejected.'),
            approverName: actor
          };
        }
        return l;
      });

      // If approved staff leave, deduct from staff leave balance
      let updatedStaff = prev.staff;
      const targetLeave = prev.leaves.find(l => l.id === leaveId);
      if (targetLeave && targetLeave.applicantType === 'Staff' && isApproved) {
        updatedStaff = prev.staff.map(s => {
          if (s.id === targetLeave.applicantId || s.name === targetLeave.applicantName) {
            const currentBal = s.leaveBalance || { casual: 8, sick: 10, earned: 15 };
            const typeKey = (targetLeave.leaveType.toLowerCase().includes('sick') ? 'sick' : 'casual');
            return {
              ...s,
              leaveBalance: {
                ...currentBal,
                [typeKey]: Math.max(0, (currentBal[typeKey] || 10) - (targetLeave.days || 1))
              }
            };
          }
          return s;
        });
      }

      return {
        ...prev,
        leaves: updatedLeaves,
        staff: updatedStaff
      };
    }, 'LEAVE_DECISION', { leaveId, isApproved });

    logAudit(actor, 'Authority', 'LEAVE_DECISION', `Leave ${leaveId} ${isApproved ? 'Approved' : 'Rejected'}`);
  }, [updateStore]);

  // 4. EXAMINATIONS, MARKS & RESULTS (FRD §10)
  const submitMarks = useCallback((examId, marksEntries, actor = 'Mr. Rajesh Kumar') => {
    updateStore(prev => {
      const currentExamResults = prev.results[examId] || {};
      const updatedExamResults = { ...currentExamResults };

      Object.keys(marksEntries).forEach(studentId => {
        const studentInfo = prev.students.find(s => s.id === studentId);
        const existingStudentRecord = updatedExamResults[studentId] || {
          studentId,
          studentName: studentInfo?.name || 'Student',
          class: studentInfo?.class?.replace(/^Class\s*/, '') || '10',
          section: studentInfo?.section || 'A',
          rollNo: studentInfo?.rollNo || '101',
          rank: 1,
          totalMarks: 0,
          obtainedMarks: 0,
          percentage: 0,
          gpa: 0,
          status: 'Passed',
          subjects: []
        };

        const newSubjects = [...existingStudentRecord.subjects];
        const studentMarks = marksEntries[studentId];

        studentMarks.forEach(sm => {
          const idx = newSubjects.findIndex(s => s.subject === sm.subject);
          const percent = Math.round((sm.marksObtained / sm.maxMarks) * 100);
          const grade = percent >= 90 ? 'A1' : (percent >= 80 ? 'A2' : (percent >= 70 ? 'B1' : (percent >= 60 ? 'B2' : (percent >= 50 ? 'C1' : 'D'))));
          const subObj = {
            subject: sm.subject,
            maxMarks: sm.maxMarks,
            marksObtained: sm.marksObtained,
            grade,
            remarks: `Scored ${sm.marksObtained}/${sm.maxMarks}. Graded by ${actor}.`
          };

          if (idx >= 0) newSubjects[idx] = subObj;
          else newSubjects.push(subObj);
        });

        const totalMax = newSubjects.reduce((sum, s) => sum + s.maxMarks, 0);
        const totalObtained = newSubjects.reduce((sum, s) => sum + s.marksObtained, 0);
        const overallPercent = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(1)) : 0;
        const gpa = parseFloat((overallPercent / 10).toFixed(1));

        updatedExamResults[studentId] = {
          ...existingStudentRecord,
          subjects: newSubjects,
          totalMarks: totalMax,
          obtainedMarks: totalObtained,
          percentage: overallPercent,
          gpa,
          status: overallPercent >= 40 ? (overallPercent >= 75 ? 'Passed (Distinction)' : 'Passed') : 'Needs Improvement'
        };
      });

      return {
        ...prev,
        results: {
          ...prev.results,
          [examId]: updatedExamResults
        }
      };
    }, 'MARKS_SUBMITTED', { examId });

    logAudit(actor, 'Teacher', 'MARKS_SUBMITTED', `Marks submitted for Exam ${examId}`);
  }, [updateStore]);

  const publishExamResults = useCallback((examId, actor = 'admin') => {
    updateStore(prev => ({
      ...prev,
      exams: prev.exams.map(e => e.id === examId ? { ...e, status: 'Published' } : e),
      announcements: [
        {
          id: `ANN-${Date.now().toString().slice(-4)}`,
          title: `Examination Results Published: ${prev.exams.find(e => e.id === examId)?.name || 'Term Exam'}`,
          targetAudience: 'All',
          category: 'Examination',
          publishDate: new Date().toISOString().split('T')[0],
          publisherName: 'Dr. S. Chatterjee (Principal)',
          content: `Official report cards for ${prev.exams.find(e => e.id === examId)?.name || 'Examinations'} have been verified and published. Students and parents can now view and print report cards from their portal.`,
          isUrgent: true
        },
        ...prev.announcements
      ]
    }), 'RESULTS_PUBLISHED', { examId });

    logAudit(actor, 'School Admin', 'RESULTS_PUBLISHED', `Published report cards for Exam ${examId}`);
  }, [updateStore]);

  // 5. FEES & RECEIPTS (FRD §11)
  const collectFee = useCallback((collectionData, actor = 'Virender Mehta (Accountant)') => {
    const randomReceiptNum = `RCT-2026-00${Math.floor(100 + Math.random() * 900)}`;
    const newReceipt = {
      id: randomReceiptNum,
      receiptNo: randomReceiptNum,
      studentId: collectionData.studentId,
      studentName: collectionData.studentName,
      class: collectionData.class,
      section: collectionData.section,
      admissionNo: collectionData.admissionNo,
      schoolId: 'SCH-2026-09',
      academicSession: '2026-2027',
      paymentDate: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalAmount: collectionData.paidAmount || collectionData.amountPaid,
      paidAmount: collectionData.paidAmount || collectionData.amountPaid,
      discountAmount: collectionData.discountAmount || 0,
      scholarshipAmount: collectionData.scholarshipAmount || 0,
      lateFine: collectionData.lateFine || 0,
      remainingBalance: Math.max(0, (collectionData.pendingFees || 0) - (collectionData.paidAmount || collectionData.amountPaid)),
      paymentMethod: collectionData.paymentMethod || 'UPI',
      transactionRef: collectionData.transactionRef || `REF${Date.now().toString().slice(-8)}`,
      status: 'Paid',
      feeHeads: collectionData.feeHeads || [{ name: 'Academic Fee Installment', amount: collectionData.paidAmount || collectionData.amountPaid, paid: collectionData.paidAmount || collectionData.amountPaid }],
      createdBy: actor
    };

    updateStore(prev => {
      const amount = collectionData.paidAmount || collectionData.amountPaid || 0;
      const updatedStudents = prev.students.map(s => {
        if (s.id === collectionData.studentId || s.admissionNo === collectionData.admissionNo) {
          const nextPaid = (s.paidFees || 0) + amount;
          const nextPending = Math.max(0, (s.pendingFees || 0) - amount);
          return {
            ...s,
            paidFees: nextPaid,
            pendingFees: nextPending,
            feeStatus: nextPending === 0 ? 'Paid' : 'Partial'
          };
        }
        return s;
      });

      return {
        ...prev,
        students: updatedStudents,
        receipts: [newReceipt, ...prev.receipts]
      };
    }, 'FEE_COLLECTED', { receiptNo: newReceipt.receiptNo });

    logAudit(actor, 'Finance', 'FEE_COLLECTED', `Receipt #${newReceipt.receiptNo} of INR ${newReceipt.paidAmount} issued to ${collectionData.studentName}`);
    return newReceipt;
  }, [updateStore]);

  const addExpense = useCallback((expenseData, actor = 'Virender Mehta (Accountant)') => {
    const randomVoucherNum = `VCH-${Math.floor(1000 + Math.random() * 9000)}`;
    const newExpense = {
      id: `EXP-2026-${Date.now().toString().slice(-4)}`,
      voucherNo: expenseData.voucherNo || randomVoucherNum,
      title: expenseData.title,
      category: expenseData.category || 'Utilities & Bills',
      payee: expenseData.payee,
      amount: Number(expenseData.amount) || 0,
      paymentMethod: expenseData.paymentMethod || 'Bank Transfer',
      date: expenseData.date || new Date().toISOString().split('T')[0],
      status: 'Paid',
      notes: expenseData.notes || 'School operational expense',
      createdBy: actor
    };

    updateStore(prev => ({
      ...prev,
      expenses: [newExpense, ...(prev.expenses || [])]
    }), 'EXPENSE_ADDED', { voucherNo: newExpense.voucherNo, amount: newExpense.amount });

    logAudit(actor, 'Finance', 'EXPENSE_ADDED', `Voucher #${newExpense.voucherNo} for ${newExpense.title} (INR ${newExpense.amount}) recorded`);
    return newExpense;
  }, [updateStore]);

  const deleteExpense = useCallback((expenseId, actor = 'Virender Mehta (Accountant)') => {
    updateStore(prev => ({
      ...prev,
      expenses: (prev.expenses || []).filter(e => e.id !== expenseId && e.voucherNo !== expenseId)
    }), 'EXPENSE_DELETED', { expenseId });

    logAudit(actor, 'Finance', 'EXPENSE_DELETED', `Expense ${expenseId} removed from ledger`);
  }, [updateStore]);

  // 6. LIBRARY CIRCULATION (FRD §12)
  const issueBook = useCallback((bookId, memberId, memberName = 'Student', dueDate = null, actor = 'Sanjay Kumar (Librarian)') => {
    let createdLoan = null;
    updateStore(prev => {
      const book = prev.books.find(b => b.id === bookId);
      if (!book || book.availableCopies <= 0) return prev;

      const member = prev.students.find(s => s.id === memberId || s.admissionNo === memberId) ||
                     prev.staff.find(s => s.id === memberId || s.employeeId === memberId);

      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 14);

      createdLoan = {
        id: `ISS-${Date.now().toString().slice(-5)}`,
        bookId: book.id,
        bookTitle: book.title,
        bookCode: book.bookCode,
        studentId: member?.id || memberId,
        studentName: member?.name || memberName,
        memberType: member?.role ? 'Staff' : 'Student',
        memberClass: member?.class || '10-A',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: dueDate || defaultDueDate.toISOString().split('T')[0],
        returnDate: null,
        status: 'Issued',
        fineAmount: 0
      };

      const updatedBooks = prev.books.map(b => b.id === bookId ? {
        ...b,
        availableCopies: Math.max(0, b.availableCopies - 1)
      } : b);

      return {
        ...prev,
        books: updatedBooks,
        bookLoans: [createdLoan, ...prev.bookLoans]
      };
    }, 'BOOK_ISSUED', { bookId, memberId });

    if (createdLoan) {
      logAudit(actor, 'Librarian', 'BOOK_ISSUED', `Issued "${createdLoan.bookTitle}" to ${createdLoan.studentName}`);
    }
    return createdLoan;
  }, [updateStore]);

  const returnBook = useCallback((loanId, fineCollected = 0, condition = 'Good', actor = 'Sanjay Kumar (Librarian)') => {
    updateStore(prev => {
      const loan = prev.bookLoans.find(l => l.id === loanId);
      if (!loan) return prev;

      const updatedLoans = prev.bookLoans.map(l => l.id === loanId ? {
        ...l,
        status: 'Returned',
        returnDate: new Date().toISOString().split('T')[0],
        fineAmount: fineCollected,
        condition
      } : l);

      const updatedBooks = prev.books.map(b => b.id === loan.bookId ? {
        ...b,
        availableCopies: b.availableCopies + 1
      } : b);

      return {
        ...prev,
        books: updatedBooks,
        bookLoans: updatedLoans
      };
    }, 'BOOK_RETURNED', { loanId });

    logAudit(actor, 'Librarian', 'BOOK_RETURNED', `Returned loan #${loanId}`);
  }, [updateStore]);

  // 7. TRANSPORT ASSIGNMENTS (FRD §13)
  const assignStudentTransport = useCallback((studentId, routeId, pickupPoint, actor = 'Manish Dave (Transport Manager)') => {
    updateStore(prev => {
      const updatedStudents = prev.students.map(s => s.id === studentId ? {
        ...s,
        transportRouteId: routeId,
        pickupPoint
      } : s);

      return { ...prev, students: updatedStudents };
    }, 'TRANSPORT_ASSIGNED', { studentId, routeId });

    logAudit(actor, 'Transport', 'TRANSPORT_ASSIGNED', `Assigned Student ${studentId} to Route ${routeId} (${pickupPoint})`);
  }, [updateStore]);

  // 8. HOMEWORK ASSIGNMENTS & SUBMISSION (FRD §17)
  const createHomework = useCallback((hwData, actor = 'Mr. Rajesh Kumar') => {
    const newHw = {
      id: `HW-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: hwData.title,
      subject: hwData.subject,
      class: hwData.class,
      section: hwData.section || 'A',
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: hwData.dueDate,
      assignedBy: actor,
      description: hwData.description,
      totalPoints: hwData.totalPoints || 20,
      attachments: hwData.attachments || [{ name: 'Assignment_Brief.pdf', size: '1.5 MB' }],
      submissions: {}
    };

    updateStore(prev => ({
      ...prev,
      homework: [newHw, ...prev.homework]
    }), 'HOMEWORK_CREATED', { homeworkId: newHw.id });

    logAudit(actor, 'Teacher', 'HOMEWORK_CREATED', `Created homework: "${hwData.title}" for Class ${hwData.class}`);
    return newHw;
  }, [updateStore]);

  const submitHomework = useCallback((homeworkId, studentId, submissionFile = 'Student_Homework.pdf') => {
    updateStore(prev => {
      const updatedHomework = prev.homework.map(hw => {
        if (hw.id === homeworkId) {
          return {
            ...hw,
            submissions: {
              ...hw.submissions,
              [studentId]: {
                submittedAt: new Date().toISOString().split('T')[0],
                fileName: submissionFile,
                status: 'Submitted',
                marks: null,
                feedback: null
              }
            }
          };
        }
        return hw;
      });
      return { ...prev, homework: updatedHomework };
    }, 'HOMEWORK_SUBMITTED', { homeworkId, studentId });
  }, [updateStore]);

  const gradeHomework = useCallback((homeworkId, studentId, marks, feedback, actor = 'Mr. Rajesh Kumar') => {
    updateStore(prev => {
      const updatedHomework = prev.homework.map(hw => {
        if (hw.id === homeworkId && hw.submissions && hw.submissions[studentId]) {
          return {
            ...hw,
            submissions: {
              ...hw.submissions,
              [studentId]: {
                ...hw.submissions[studentId],
                marks,
                feedback
              }
            }
          };
        }
        return hw;
      });
      return { ...prev, homework: updatedHomework };
    }, 'HOMEWORK_GRADED', { homeworkId, studentId });

    logAudit(actor, 'Teacher', 'HOMEWORK_GRADED', `Graded homework #${homeworkId} for Student ${studentId}`);
  }, [updateStore]);

  // 9. COMMUNICATION & ANNOUNCEMENTS (FRD §18)
  const publishAnnouncement = useCallback((annData, actor = 'Principal') => {
    const newAnn = {
      id: `ANN-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: annData.title,
      targetAudience: annData.targetAudience || 'All',
      category: annData.category || 'General',
      publishDate: new Date().toISOString().split('T')[0],
      publisherName: actor,
      content: annData.content,
      isUrgent: !!annData.isUrgent
    };

    updateStore(prev => ({
      ...prev,
      announcements: [newAnn, ...prev.announcements]
    }), 'ANNOUNCEMENT_PUBLISHED', { annId: newAnn.id });

    logAudit(actor, 'Communication', 'ANNOUNCEMENT_PUBLISHED', `Published announcement: "${annData.title}" (${annData.targetAudience})`);
    return newAnn;
  }, [updateStore]);

  // 10. CAMPUS EVENTS & RSVPS (FRD §19)
  const createCampusEvent = useCallback((eventData, actor = 'School Admin') => {
    const newEvent = {
      id: `EVT-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: eventData.title,
      category: eventData.category || 'School Event',
      date: eventData.date,
      time: eventData.time || '09:00 AM - 01:00 PM',
      location: eventData.location || 'School Campus',
      organizer: eventData.organizer || actor,
      description: eventData.description,
      rsvps: []
    };

    updateStore(prev => ({
      ...prev,
      events: [newEvent, ...prev.events]
    }), 'EVENT_CREATED', { eventId: newEvent.id });

    logAudit(actor, 'Events', 'EVENT_CREATED', `Event scheduled: "${eventData.title}" on ${eventData.date}`);
    return newEvent;
  }, [updateStore]);

  const rsvpEvent = useCallback((eventId, userId) => {
    updateStore(prev => {
      const updatedEvents = prev.events.map(ev => {
        if (ev.id === eventId) {
          const currentRsvps = ev.rsvps || [];
          const hasRsvpd = currentRsvps.includes(userId);
          return {
            ...ev,
            rsvps: hasRsvpd ? currentRsvps.filter(id => id !== userId) : [...currentRsvps, userId]
          };
        }
        return ev;
      });
      return { ...prev, events: updatedEvents };
    }, 'EVENT_RSVP_TOGGLED', { eventId, userId });
  }, [updateStore]);

  // 11. SUPER ADMIN SAAS MODULE MATRIX TOGGLE (FRD §23.4)
  const toggleSchoolModule = useCallback((schoolId, moduleKey, actor = 'Super Admin') => {
    let nextVal = true;
    updateStore(prev => {
      const updatedSchools = prev.tenant.schools.map(s => {
        if (s.id === schoolId) {
          nextVal = !s.modules[moduleKey];
          return {
            ...s,
            modules: {
              ...s.modules,
              [moduleKey]: nextVal
            }
          };
        }
        return s;
      });

      return {
        ...prev,
        tenant: {
          ...prev.tenant,
          schools: updatedSchools
        }
      };
    }, 'SAAS_MODULE_TOGGLED', { schoolId, moduleKey });

    logAudit(actor, 'Super Admin', 'MODULE_TOGGLED', `Module [${moduleKey}] set to ${nextVal ? 'ON' : 'OFF'} for school ${schoolId}`);
    return nextVal;
  }, [updateStore]);

  const value = {
    store,
    updateStore,
    resetStore: resetMasterStore,
    // Actions
    authenticateUser,
    registerUser,
    resetPasswordByOTP,
    approveAdmission,
    updateStudentStatus,
    promoteStudents,
    markStudentAttendance,
    markStaffAttendance,
    applyLeave,
    approveLeave,
    submitMarks,
    publishExamResults,
    collectFee,
    addExpense,
    deleteExpense,
    issueBook,
    returnBook,
    assignStudentTransport,
    createHomework,
    submitHomework,
    gradeHomework,
    publishAnnouncement,
    createCampusEvent,
    rsvpEvent,
    toggleSchoolModule
  };

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
};

export const useAppStore = () => {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error('useAppStore must be used within an AppStoreProvider');
  }
  return ctx;
};

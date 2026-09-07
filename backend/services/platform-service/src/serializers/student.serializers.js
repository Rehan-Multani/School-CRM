/**
 * Compact DTOs for the Student APK. Mobile-first: only the fields a screen
 * actually renders, stable names, ISO dates. Never returns a Mongoose doc,
 * never leaks another student / staff-internal data.
 *
 * Sibling of src/serializers/teacher.serializers.js.
 */

const idStr = (v) => (v === null || v === undefined ? null : String(v.$oid || v._id || v));

export function studentSelf(student = {}, ctx = {}) {
  const s = typeof student.toPublicJSON === 'function' ? student.toPublicJSON() : student;
  const fullName =
    s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || s.name || '';
  return {
    id: String(s.id || s._id),
    name: fullName,
    firstName: s.firstName || '',
    lastName: s.lastName || '',
    admissionNumber: s.admissionNumber || '',
    rollNumber: ctx.rollNumber || '',
    photo: s.photo || '',
    gender: s.gender || 'OTHER',
    dateOfBirth: s.dateOfBirth || null,
    email: s.email || s.account?.loginEmail || '',
    phone: s.phone || '',
    address: s.address || '',
    status: s.status || 'ACTIVE',
    classId: ctx.classId || null,
    className: ctx.className || '',
    sectionId: ctx.sectionId || null,
    sectionName: ctx.sectionName || '',
    academicYear: ctx.academicYearName || '',
    mustResetPassword: Boolean(s.mustResetPassword),
  };
}

export function guardianInfo(student = {}) {
  const s = typeof student.toPublicJSON === 'function' ? student.toPublicJSON() : student;
  return {
    parentName: s.parentName || '',
    parentPhone: s.parentPhone || '',
  };
}

export function classLite(cls = {}) {
  const c = typeof cls.toPublicJSON === 'function' ? cls.toPublicJSON() : cls;
  return {
    id: String(c.id || c._id),
    name: c.name || '',
    code: c.code || '',
    numericOrder: c.numericOrder ?? 0,
  };
}

export function periodLite(entry = {}) {
  const e = typeof entry.toPublicJSON === 'function' ? entry.toPublicJSON() : entry;
  return {
    id: String(e.id || e._id),
    day: e.dayOfWeek,
    periodNumber: e.periodNumber,
    startTime: e.startTime,
    endTime: e.endTime,
    room: e.room || '',
    subjectId: idStr(e.subjectId),
    subjectName: e.subjectName || '',
    teacherId: idStr(e.teacherId),
    teacherName: e.teacherName || '',
    className: e.className || '',
    sectionName: e.sectionName || '',
  };
}

export function homeworkLite(hw = {}, submission = null) {
  const h = typeof hw.toPublicJSON === 'function' ? hw.toPublicJSON() : hw;
  return {
    id: String(h.id || h._id),
    title: h.title,
    subjectId: idStr(h.subjectId),
    subjectName: h.subjectName || '',
    teacherName: h.teacherName || '',
    assignedDate: h.assignedDate,
    dueDate: h.dueDate,
    status: h.status,
    attachmentCount: Array.isArray(h.attachments) ? h.attachments.length : 0,
    overdue: Boolean(h.overdue),
    submissionStatus: submission?.status || 'PENDING',
    submittedAt: submission?.submittedAt || null,
    marksObtained: submission?.marksObtained ?? null,
  };
}

export function homeworkDetail(hw = {}, submission = null) {
  const h = typeof hw.toPublicJSON === 'function' ? hw.toPublicJSON() : hw;
  return {
    ...homeworkLite(h, submission),
    description: h.description || '',
    attachments: Array.isArray(h.attachments) ? h.attachments : [],
    submission: submission
      ? {
          id: String(submission._id || submission.id),
          status: submission.status,
          submittedAt: submission.submittedAt || null,
          remarks: submission.remarks || '',
          attachments: submission.attachments || [],
          marksObtained: submission.marksObtained ?? null,
          gradedAt: submission.gradedAt || null,
        }
      : null,
  };
}

export function classworkLite(a = {}) {
  const x = typeof a.toPublicJSON === 'function' ? a.toPublicJSON() : a;
  return {
    id: String(x.id || x._id),
    title: x.title,
    subjectId: idStr(x.subjectId),
    subjectName: x.subjectName || '',
    teacherName: x.teacherName || '',
    assignedDate: x.assignedDate,
    dueDate: x.dueDate,
    status: x.status,
    maxMarks: x.maxMarks ?? null,
    attachmentCount: Array.isArray(x.attachments) ? x.attachments.length : 0,
  };
}

export function materialLite(m = {}) {
  const x = typeof m.toPublicJSON === 'function' ? m.toPublicJSON() : m;
  return {
    id: String(x.id || x._id),
    title: x.title,
    description: x.description || '',
    subjectId: idStr(x.subjectId),
    subjectName: x.subjectName || '',
    teacherName: x.teacherName || '',
    fileName: x.fileName || '',
    fileType: x.fileType || '',
    fileSize: x.fileSize ?? 0,
    createdAt: x.createdAt,
  };
}

export function examLite(e = {}, myStatus = undefined) {
  const x = typeof e.toPublicJSON === 'function' ? e.toPublicJSON() : e;
  return {
    id: String(x.id || x._id),
    name: x.name,
    examType: x.examType,
    startDate: x.startDate,
    endDate: x.endDate,
    status: x.status,
    gradingType: x.gradingType,
    resultPublished: x.status === 'PUBLISHED',
    ...(myStatus ? { phase: myStatus } : {}),
  };
}

export function examScheduleLite(s = {}) {
  const x = typeof s.toPublicJSON === 'function' ? s.toPublicJSON() : s;
  return {
    id: String(x.id || x._id),
    subjectId: idStr(x.subjectId),
    subjectName: x.subjectName || '',
    examDate: x.examDate,
    startTime: x.startTime,
    endTime: x.endTime,
    room: x.room || '',
    maxMarks: x.maxMarks ?? 100,
  };
}

export function resultLite(r = {}, examName = '') {
  const x = typeof r.toPublicJSON === 'function' ? r.toPublicJSON() : r;
  return {
    id: String(x.id || x._id),
    examId: idStr(x.examId),
    examName: examName || x.examName || '',
    totalMarks: x.totalMarks ?? 0,
    maxTotalMarks: x.maxTotalMarks ?? 0,
    percentage: x.percentage ?? 0,
    grade: x.grade || '',
    gpa: x.gpa ?? 0,
    resultStatus: x.result || x.resultStatus || '',
    rank: x.rank ?? 0,
  };
}

export function resultDetail(r = {}, exam = {}) {
  const x = typeof r.toPublicJSON === 'function' ? r.toPublicJSON() : r;
  return {
    ...resultLite(x, exam?.name),
    examType: exam?.examType || '',
    startDate: exam?.startDate || null,
    endDate: exam?.endDate || null,
    remarks: x.remarks || '',
    subjects: (x.subjectResults || x.subjects || []).map((s) => ({
      subjectId: idStr(s.subjectId),
      subjectName: s.subjectName || '',
      subjectCode: s.subjectCode || '',
      marksObtained: s.marksObtained ?? null,
      maxMarks: s.maxMarks ?? 100,
      passingMarks: s.passingMarks ?? 33,
      grade: s.grade || '',
      isPassed: Boolean(s.isPassed),
      attendanceStatus: s.attendanceStatus || 'PRESENT',
    })),
  };
}

export function feeInvoiceLite(inv = {}) {
  const x = typeof inv.toPublicJSON === 'function' ? inv.toPublicJSON() : inv;
  return {
    id: String(x.id || x._id),
    invoiceNumber: x.invoiceNumber || '',
    periodLabel: x.periodLabel || '',
    dueDate: x.dueDate,
    totalAmount: x.totalAmount ?? 0,
    paidAmount: x.paidAmount ?? 0,
    balanceAmount: x.balanceAmount ?? 0,
    status: x.status,
  };
}

export function feeInvoiceDetail(inv = {}) {
  const x = typeof inv.toPublicJSON === 'function' ? inv.toPublicJSON() : inv;
  return {
    ...feeInvoiceLite(x),
    periodStart: x.periodStart || null,
    periodEnd: x.periodEnd || null,
    items: (x.items || []).map((it) => ({
      feeHeadName: it.feeHeadName || '',
      originalAmount: it.originalAmount ?? 0,
      discountAmount: it.discountAmount ?? 0,
      finalAmount: it.finalAmount ?? 0,
    })),
    notes: x.notes || '',
  };
}

export function leaveLite(l = {}) {
  const x = typeof l.toPublicJSON === 'function' ? l.toPublicJSON() : l;
  return {
    id: String(x.id || x._id),
    leaveType: x.leaveType,
    startDate: x.startDate,
    endDate: x.endDate,
    totalDays: x.totalDays,
    reason: x.reason,
    status: x.status,
    rejectionReason: x.rejectionReason || '',
    documentUrl: x.documentUrl || '',
    createdAt: x.createdAt,
  };
}

export function noticeLite(a = {}, isRead = false) {
  const x = typeof a.toPublicJSON === 'function' ? a.toPublicJSON() : a;
  return {
    id: String(x.id || x._id),
    title: x.title,
    body: x.body,
    category: (x.audiences && x.audiences[0]) || 'GENERAL',
    audiences: x.audiences || [],
    pinned: Boolean(x.pinned),
    publishedByName: x.publishedByName || '',
    publishAt: x.publishAt || x.createdAt,
    isRead: Boolean(isRead),
    createdAt: x.createdAt,
  };
}

export function eventLite(e = {}) {
  const x = typeof e.toPublicJSON === 'function' ? e.toPublicJSON() : e;
  return {
    id: String(x.id || x._id),
    title: x.title,
    description: x.description || '',
    category: x.category || '',
    startAt: x.startAt,
    endAt: x.endAt || null,
    allDay: Boolean(x.allDay),
    location: x.venue || '',
    status: x.status || '',
    bannerUrl: (Array.isArray(x.attachments) && x.attachments[0]?.url) || '',
    attachments: Array.isArray(x.attachments) ? x.attachments : [],
    cancelled: Boolean(x.cancelled),
  };
}

export function notificationLite(n = {}, isRead = false) {
  const x = typeof n.toPublicJSON === 'function' ? n.toPublicJSON() : n;
  return {
    id: String(x.id || x._id),
    title: x.title,
    body: x.body,
    type: (x.audiences && x.audiences[0]) || x.type || 'GENERAL',
    isRead: Boolean(isRead),
    createdAt: x.createdAt,
  };
}

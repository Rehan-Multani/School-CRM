/**
 * Compact DTOs for the Teacher APK. Mobile-first: only the fields a screen
 * actually renders, stable names, ISO dates. Never returns a Mongoose doc.
 */

export function studentLite(student = {}, enrollment = {}) {
  const s = typeof student.toPublicJSON === 'function' ? student.toPublicJSON() : student;
  const fullName =
    s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || s.name || '';
  return {
    id: String(s.id || s._id),
    name: fullName,
    rollNumber: enrollment.rollNumber || s.rollNumber || '',
    admissionNumber: s.admissionNumber || enrollment.admissionNumber || '',
    photo: s.photo || '',
    status: s.status || 'ACTIVE',
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

export function sectionLite(section = {}, extra = {}) {
  const s = typeof section.toPublicJSON === 'function' ? section.toPublicJSON() : section;
  return {
    id: String(s.id || s._id),
    name: s.name || '',
    classId: s.classId ? String(s.classId) : null,
    className: extra.className || '',
    roomNumber: s.roomNumber || '',
    isClassTeacher: Boolean(extra.isClassTeacher),
    studentCount: extra.studentCount ?? undefined,
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
    classId: e.classId ? String(e.classId) : null,
    className: e.className || '',
    sectionId: e.sectionId ? String(e.sectionId) : null,
    sectionName: e.sectionName || '',
    subjectId: e.subjectId ? String(e.subjectId) : null,
    subjectName: e.subjectName || '',
  };
}

export function homeworkLite(hw = {}) {
  const h = typeof hw.toPublicJSON === 'function' ? hw.toPublicJSON() : hw;
  return {
    id: String(h.id || h._id),
    title: h.title,
    subjectId: h.subjectId ? String(h.subjectId) : null,
    subjectName: h.subjectName || '',
    classId: h.classId ? String(h.classId) : null,
    className: h.className || '',
    sectionId: h.sectionId ? String(h.sectionId) : null,
    sectionName: h.sectionName || '',
    assignedDate: h.assignedDate,
    dueDate: h.dueDate,
    status: h.status,
    attachmentCount: Array.isArray(h.attachments) ? h.attachments.length : 0,
    submittedCount: h.submittedCount ?? 0,
    totalStudents: h.totalStudents ?? 0,
    overdue: Boolean(h.overdue),
  };
}

export function assignmentLite(a = {}) {
  const x = typeof a.toPublicJSON === 'function' ? a.toPublicJSON() : a;
  return {
    id: String(x.id || x._id),
    title: x.title,
    subjectId: x.subjectId ? String(x.subjectId) : null,
    subjectName: x.subjectName || '',
    classId: x.classId ? String(x.classId) : null,
    className: x.className || '',
    sectionId: x.sectionId ? String(x.sectionId) : null,
    sectionName: x.sectionName || '',
    maxMarks: x.maxMarks ?? null,
    assignedDate: x.assignedDate,
    dueDate: x.dueDate,
    status: x.status,
    submissionCount: x.submissionCount ?? 0,
    gradedCount: x.gradedCount ?? 0,
  };
}

export function materialLite(m = {}) {
  const x = typeof m.toPublicJSON === 'function' ? m.toPublicJSON() : m;
  return {
    id: String(x.id || x._id),
    title: x.title,
    description: x.description || '',
    subjectId: x.subjectId ? String(x.subjectId) : null,
    subjectName: x.subjectName || '',
    sectionId: x.sectionId ? String(x.sectionId) : null,
    sectionName: x.sectionName || '',
    fileName: x.fileName || '',
    fileType: x.fileType || '',
    fileSize: x.fileSize ?? 0,
    url: x.url || '',
    createdAt: x.createdAt,
  };
}

export function examLite(e = {}) {
  const x = typeof e.toPublicJSON === 'function' ? e.toPublicJSON() : e;
  return {
    id: String(x.id || x._id),
    name: x.name,
    examType: x.examType,
    startDate: x.startDate,
    endDate: x.endDate,
    status: x.status,
    gradingType: x.gradingType,
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

export function announcementLite(a = {}, isRead = false) {
  const x = typeof a.toPublicJSON === 'function' ? a.toPublicJSON() : a;
  return {
    id: String(x.id || x._id),
    title: x.title,
    body: x.body,
    audiences: x.audiences || [],
    pinned: Boolean(x.pinned),
    publishedByName: x.publishedByName || '',
    publishAt: x.publishAt || x.createdAt,
    isRead: Boolean(isRead),
    createdAt: x.createdAt,
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
    createdAt: x.createdAt,
  };
}

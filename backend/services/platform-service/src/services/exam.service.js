import { AppError } from '../../../shared/AppError.js';
import { examRepository } from '../repositories/exam.repository.js';
import { pushEvents } from './pushEvents.service.js';

// Fields a request body must never be able to overwrite.
const PROTECTED_FIELDS = ['schoolId', 'examId', '_id', 'id', 'createdAt', 'updatedAt'];
function editable(payload = {}) {
  const clean = { ...payload };
  PROTECTED_FIELDS.forEach((key) => delete clean[key]);
  return clean;
}

function assertDateOrder(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError('Start and end dates must be valid dates', 400);
  }
  if (end < start) throw new AppError('End date cannot be before the start date', 400);
}

function assertMarksConfig(maxMarks, passingMarks) {
  const max = Number(maxMarks);
  const passing = Number(passingMarks);
  if (!Number.isFinite(max) || max < 1) throw new AppError('Maximum marks must be at least 1', 400);
  if (!Number.isFinite(passing) || passing < 0) throw new AppError('Passing marks must be zero or more', 400);
  if (passing > max) throw new AppError('Passing marks cannot be more than maximum marks', 400);
}

// "09:00", "9:00 AM" or "02:30 pm" -> minutes since midnight (null if unreadable).
function toMinutes(value) {
  const match = /^\s*(\d{1,2}):(\d{2})\s*([ap]m)?\s*$/i.exec(String(value || ''));
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = (match[3] || '').toLowerCase();
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

const dayOf = (value) => new Date(value).toISOString().slice(0, 10);

// A paper must sit inside the exam's own dates and end after it starts.
function assertScheduleSlot(exam, { examDate, startTime, endTime }) {
  if (!examDate || Number.isNaN(new Date(examDate).getTime())) throw new AppError('Exam date is required', 400);
  if (dayOf(examDate) < dayOf(exam.startDate) || dayOf(examDate) > dayOf(exam.endDate)) {
    throw new AppError('Exam date must fall within the exam\'s start and end dates', 400);
  }
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) throw new AppError('Start and end time are required (HH:MM)', 400);
  if (end <= start) throw new AppError('End time must be after the start time', 400);
}

class ExamService {
  async getStats(schoolId) {
    return examRepository.getStats(schoolId);
  }

  async listExams(schoolId, query) {
    const result = await examRepository.listExams(schoolId, query);
    return {
      data: result.items.map((ex) => ({
        id: ex._id.toString(),
        name: ex.name,
        academicYearId: ex.academicYearId?._id?.toString() || ex.academicYearId?.toString(),
        session: ex.academicYearId?.name || 'Academic Session',
        sessionCode: ex.academicYearId?.code || '',
        examType: ex.examType,
        startDate: ex.startDate,
        endDate: ex.endDate,
        classIds: (ex.classIds || []).map((c) => c._id?.toString() || c.toString()),
        classes: (ex.classIds || []).map((c) => ({
          id: c._id?.toString() || c.toString(),
          name: c.name || 'Class',
          code: c.code || '',
        })),
        gradingType: ex.gradingType,
        description: ex.description,
        status: ex.status,
        createdAt: ex.createdAt,
      })),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit) || 1,
      },
    };
  }

  async getExam(schoolId, id) {
    const exam = await examRepository.findExamById(schoolId, id);
    if (!exam) throw new AppError('Exam not found', 404);
    return {
      id: exam._id.toString(),
      name: exam.name,
      academicYearId: exam.academicYearId?._id?.toString() || exam.academicYearId?.toString(),
      session: exam.academicYearId?.name || 'Academic Session',
      sessionCode: exam.academicYearId?.code || '',
      examType: exam.examType,
      startDate: exam.startDate,
      endDate: exam.endDate,
      classIds: (exam.classIds || []).map((c) => c._id?.toString() || c.toString()),
      classes: (exam.classIds || []).map((c) => ({
        id: c._id?.toString() || c.toString(),
        name: c.name || 'Class',
        code: c.code || '',
      })),
      gradingType: exam.gradingType,
      description: exam.description,
      status: exam.status,
      createdAt: exam.createdAt,
    };
  }

  async createExam(schoolId, payload) {
    if (typeof payload.name !== 'string' || !payload.name.trim()) throw new AppError('Exam name is required', 400);
    if (!payload.academicYearId) throw new AppError('Academic year is required', 400);
    if (!payload.startDate || !payload.endDate) throw new AppError('Start and end dates are required', 400);
    assertDateOrder(payload.startDate, payload.endDate);

    const created = await examRepository.createExam({
      ...payload,
      schoolId,
    });

    // Auto-seed subjects for the exam from academic setup
    try {
      await examRepository.seedExamSubjectsFromAcademic(schoolId, created._id);
    } catch {
      // Ignored if classes not configured yet
    }

    return created.toPublicJSON();
  }

  async updateExam(schoolId, id, payload) {
    const before = await examRepository.findExamById(schoolId, id).catch(() => null);
    if (!before) throw new AppError('Exam not found', 404);
    payload = editable(payload);
    if (payload.name !== undefined && !String(payload.name).trim()) throw new AppError('Exam name is required', 400);
    if (payload.startDate !== undefined || payload.endDate !== undefined) {
      assertDateOrder(payload.startDate ?? before.startDate, payload.endDate ?? before.endDate);
    }
    if (payload.status === 'PUBLISHED' && before.status !== 'PUBLISHED') {
      const hasResults = await examRepository.hasCalculatedResults(schoolId, id);
      if (!hasResults) {
        throw new AppError('Results have not been calculated for this exam yet. Calculate results before publishing.', 400);
      }
    }
    const updated = await examRepository.updateExam(schoolId, id, payload);
    if (!updated) throw new AppError('Exam not found', 404);
    const json = updated.toPublicJSON();
    if (json.status === 'PUBLISHED' && before?.status !== 'PUBLISHED') {
      pushEvents.resultPublished(schoolId, { ...json, classIds: updated.classIds || json.classIds }).catch(() => {});
    }
    return json;
  }

  async deleteExam(schoolId, id) {
    const deleted = await examRepository.deleteExam(schoolId, id);
    if (!deleted) throw new AppError('Exam not found', 404);
    return { message: 'Exam and all associated schedules, marks, and results removed successfully' };
  }

  // ===================== EXAM SUBJECTS =====================
  async listExamSubjects(schoolId, examId, query) {
    const subjects = await examRepository.listExamSubjects(schoolId, examId, query);
    return subjects.map((s) => ({
      id: s._id.toString(),
      examId: s.examId.toString(),
      classId: s.classId?._id?.toString() || s.classId?.toString(),
      className: s.classId?.name || 'Class',
      subjectId: s.subjectId?._id?.toString() || s.subjectId?.toString(),
      subjectName: s.subjectName || s.subjectId?.name || 'Subject',
      subjectCode: s.subjectCode || s.subjectId?.code || '',
      subjectType: s.subjectId?.subjectType || 'THEORY',
      maxMarks: s.maxMarks,
      passingMarks: s.passingMarks,
    }));
  }

  async seedExamSubjects(schoolId, examId) {
    return examRepository.seedExamSubjectsFromAcademic(schoolId, examId);
  }

  async addExamSubject(schoolId, examId, payload) {
    if (!payload.classId || !payload.subjectId) throw new AppError('Class and Subject are required', 400);
    assertMarksConfig(payload.maxMarks ?? 100, payload.passingMarks ?? 33);
    const created = await examRepository.addExamSubject({
      ...payload,
      schoolId,
      examId,
    });
    return created.toPublicJSON();
  }

  async updateExamSubject(schoolId, examId, id, payload) {
    const existing = await examRepository.findExamSubjectById(schoolId, examId, id);
    if (!existing) throw new AppError('Exam subject not found', 404);
    payload = editable(payload);
    assertMarksConfig(payload.maxMarks ?? existing.maxMarks, payload.passingMarks ?? existing.passingMarks);
    const updated = await examRepository.updateExamSubject(schoolId, examId, id, payload);
    if (!updated) throw new AppError('Exam subject not found', 404);
    return updated.toPublicJSON();
  }

  async deleteExamSubject(schoolId, examId, id) {
    const deleted = await examRepository.deleteExamSubject(schoolId, examId, id);
    if (!deleted) throw new AppError('Exam subject not found', 404);
    return { message: 'Subject removed from exam successfully' };
  }

  // ===================== EXAM SCHEDULE =====================
  async listSchedule(schoolId, examId, query) {
    const schedule = await examRepository.listSchedule(schoolId, examId, query);
    return schedule.map((s) => ({
      id: s._id.toString(),
      examId: s.examId.toString(),
      classId: s.classId?._id?.toString() || s.classId?.toString(),
      className: s.classId?.name || 'Class',
      sectionId: s.sectionId?._id?.toString() || s.sectionId?.toString() || null,
      sectionName: s.sectionId?.name || 'All Sections',
      subjectId: s.subjectId?._id?.toString() || s.subjectId?.toString(),
      subjectName: s.subjectId?.name || 'Subject',
      examDate: s.examDate,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
      invigilatorId: s.invigilatorId?._id?.toString() || s.invigilatorId?.toString() || null,
      invigilatorName: s.invigilatorName || '—',
      maxMarks: s.maxMarks,
    }));
  }

  async createScheduleEntry(schoolId, examId, payload) {
    const exam = await examRepository.findExamById(schoolId, examId);
    if (!exam) throw new AppError('Exam not found', 404);
    if (!payload.classId || !payload.subjectId) throw new AppError('Class and Subject are required', 400);
    assertScheduleSlot(exam, payload);
    const created = await examRepository.createScheduleEntry({
      ...payload,
      schoolId,
      examId,
    });
    return created.toPublicJSON();
  }

  async updateScheduleEntry(schoolId, examId, id, payload) {
    const [exam, existing] = await Promise.all([
      examRepository.findExamById(schoolId, examId),
      examRepository.findScheduleEntryById(schoolId, examId, id),
    ]);
    if (!exam || !existing) throw new AppError('Schedule entry not found', 404);
    payload = editable(payload);
    assertScheduleSlot(exam, {
      examDate: payload.examDate ?? existing.examDate,
      startTime: payload.startTime ?? existing.startTime,
      endTime: payload.endTime ?? existing.endTime,
    });
    const updated = await examRepository.updateScheduleEntry(schoolId, examId, id, payload);
    if (!updated) throw new AppError('Schedule entry not found', 404);
    return updated.toPublicJSON();
  }

  async deleteScheduleEntry(schoolId, examId, id) {
    const deleted = await examRepository.deleteScheduleEntry(schoolId, examId, id);
    if (!deleted) throw new AppError('Schedule entry not found', 404);
    return { message: 'Schedule timetable slot deleted successfully' };
  }

  // ===================== MARKS ENTRY =====================
  async listMarksSheet(schoolId, examId, query) {
    if (!query.classId || !query.sectionId || !query.subjectId) {
      throw new AppError('Class, Section, and Subject are required to fetch marks roster', 400);
    }
    return examRepository.listMarksSheet(schoolId, examId, query);
  }

  async saveMarks(schoolId, examId, payload) {
    if (!payload.classId || !payload.sectionId || !payload.subjectId) {
      throw new AppError('Class, Section, and Subject are required', 400);
    }
    if (!Array.isArray(payload.marksList)) {
      throw new AppError('marksList array is required', 400);
    }

    // Maximum and passing marks come from the exam's own subject setup, never
    // from the request, and every row must be a student of this section.
    const [examSubject, enrolled] = await Promise.all([
      examRepository.findExamSubjectFor(schoolId, examId, payload.classId, payload.subjectId),
      examRepository.activeStudentIdsInSection(schoolId, payload.classId, payload.sectionId),
    ]);
    if (!examSubject) throw new AppError('This subject is not part of the exam for the selected class', 400);
    const { maxMarks, passingMarks } = examSubject;
    const STATUSES = ['PRESENT', 'ABSENT', 'MEDICAL', 'EXEMPTED'];

    const marksList = payload.marksList.map((item) => {
      if (!item?.studentId || !enrolled.has(String(item.studentId))) {
        throw new AppError('Marks can only be entered for students enrolled in this section', 400);
      }
      const attendanceStatus = item.attendanceStatus || 'PRESENT';
      if (!STATUSES.includes(attendanceStatus)) throw new AppError('Attendance status is invalid', 400);
      const blank = item.marksObtained === '' || item.marksObtained === null || item.marksObtained === undefined;
      if (attendanceStatus === 'PRESENT' && !blank) {
        const marks = Number(item.marksObtained);
        if (!Number.isFinite(marks) || marks < 0) throw new AppError('Marks must be zero or more', 400);
        if (marks > maxMarks) throw new AppError(`Marks cannot be more than the maximum (${maxMarks})`, 400);
      }
      return { ...item, attendanceStatus, maxMarks, passingMarks };
    });
    return examRepository.saveMarks(schoolId, examId, { ...payload, marksList });
  }

  // ===================== RESULTS & REPORT CARDS =====================
  async calculateResults(schoolId, examId, payload) {
    if (!payload.classId || !payload.sectionId) {
      throw new AppError('Class and Section are required for result calculation', 400);
    }
    return examRepository.calculateResults(schoolId, examId, payload);
  }

  async listResults(schoolId, examId, query) {
    const results = await examRepository.listResults(schoolId, examId, query);
    return results.map((r) => ({
      id: r._id.toString(),
      studentId: r.studentId?._id?.toString() || r.studentId?.toString(),
      studentName: r.studentId
        ? `${r.studentId.firstName || ''} ${r.studentId.lastName || ''}`.trim() || 'Student'
        : 'Student',
      admissionNumber: r.studentId?.admissionNumber || '—',
      rollNumber: r.rollNumber || '—',
      className: r.classId?.name || 'Class',
      sectionName: r.sectionId?.name || 'Section',
      totalMarks: r.totalMarks,
      maxTotalMarks: r.maxTotalMarks,
      percentage: r.percentage,
      grade: r.grade,
      gpa: r.gpa,
      result: r.result,
      rank: r.rank,
      subjectResults: r.subjectResults || [],
      createdAt: r.createdAt,
    }));
  }

  async getStudentReportCard(schoolId, examId, studentId) {
    const reportCard = await examRepository.getStudentReportCard(schoolId, examId, studentId);
    if (!reportCard) throw new AppError('Report card data not found for student', 404);
    return reportCard;
  }
}

export const examService = new ExamService();

import { examRepository } from '../repositories/exam.repository.js';

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
    if (!exam) throw new Error('Exam not found');
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
    if (!payload.name?.trim()) throw new Error('Exam name is required');
    if (!payload.academicYearId) throw new Error('Academic year is required');
    if (!payload.startDate || !payload.endDate) throw new Error('Start and end dates are required');

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
    const updated = await examRepository.updateExam(schoolId, id, payload);
    if (!updated) throw new Error('Exam not found');
    return updated.toPublicJSON();
  }

  async deleteExam(schoolId, id) {
    const deleted = await examRepository.deleteExam(schoolId, id);
    if (!deleted) throw new Error('Exam not found');
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
    const created = await examRepository.addExamSubject({
      ...payload,
      schoolId,
      examId,
    });
    return created.toPublicJSON();
  }

  async updateExamSubject(schoolId, examId, id, payload) {
    const updated = await examRepository.updateExamSubject(schoolId, examId, id, payload);
    if (!updated) throw new Error('Exam subject not found');
    return updated.toPublicJSON();
  }

  async deleteExamSubject(schoolId, examId, id) {
    const deleted = await examRepository.deleteExamSubject(schoolId, examId, id);
    if (!deleted) throw new Error('Exam subject not found');
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
    const created = await examRepository.createScheduleEntry({
      ...payload,
      schoolId,
      examId,
    });
    return created.toPublicJSON();
  }

  async updateScheduleEntry(schoolId, examId, id, payload) {
    const updated = await examRepository.updateScheduleEntry(schoolId, examId, id, payload);
    if (!updated) throw new Error('Schedule entry not found');
    return updated.toPublicJSON();
  }

  async deleteScheduleEntry(schoolId, examId, id) {
    const deleted = await examRepository.deleteScheduleEntry(schoolId, examId, id);
    if (!deleted) throw new Error('Schedule entry not found');
    return { message: 'Schedule timetable slot deleted successfully' };
  }

  // ===================== MARKS ENTRY =====================
  async listMarksSheet(schoolId, examId, query) {
    if (!query.classId || !query.sectionId || !query.subjectId) {
      throw new Error('Class, Section, and Subject are required to fetch marks roster');
    }
    return examRepository.listMarksSheet(schoolId, examId, query);
  }

  async saveMarks(schoolId, examId, payload) {
    if (!payload.classId || !payload.sectionId || !payload.subjectId) {
      throw new Error('Class, Section, and Subject are required');
    }
    if (!Array.isArray(payload.marksList)) {
      throw new Error('marksList array is required');
    }
    return examRepository.saveMarks(schoolId, examId, payload);
  }

  // ===================== RESULTS & REPORT CARDS =====================
  async calculateResults(schoolId, examId, payload) {
    if (!payload.classId || !payload.sectionId) {
      throw new Error('Class and Section are required for result calculation');
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
    if (!reportCard) throw new Error('Report card data not found for student');
    return reportCard;
  }
}

export const examService = new ExamService();

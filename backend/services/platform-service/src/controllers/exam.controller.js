import { examService } from '../services/exam.service.js';

function schoolId(req) {
  return req.user?.sub || req.schoolAdmin?.schoolId || req.user?.schoolId;
}

// ===================== EXAMS =====================
export async function getExamStats(req, res, next) {
  try {
    const data = await examService.getStats(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function listExams(req, res, next) {
  try {
    const result = await examService.listExams(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getExam(req, res, next) {
  try {
    const data = await examService.getExam(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createExam(req, res, next) {
  try {
    const data = await examService.createExam(schoolId(req), req.body);
    res.status(201).json({
      success: true,
      message: 'Exam term created successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateExam(req, res, next) {
  try {
    const data = await examService.updateExam(schoolId(req), req.params.id, req.body);
    res.json({
      success: true,
      message: 'Exam updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteExam(req, res, next) {
  try {
    const result = await examService.deleteExam(schoolId(req), req.params.id);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

// ===================== EXAM SUBJECTS =====================
export async function listExamSubjects(req, res, next) {
  try {
    const data = await examService.listExamSubjects(schoolId(req), req.params.examId, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function seedExamSubjects(req, res, next) {
  try {
    const result = await examService.seedExamSubjects(schoolId(req), req.params.examId);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function addExamSubject(req, res, next) {
  try {
    const data = await examService.addExamSubject(schoolId(req), req.params.examId, req.body);
    res.status(201).json({
      success: true,
      message: 'Subject added to exam',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateExamSubject(req, res, next) {
  try {
    const data = await examService.updateExamSubject(
      schoolId(req),
      req.params.examId,
      req.params.id,
      req.body
    );
    res.json({
      success: true,
      message: 'Exam subject updated',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteExamSubject(req, res, next) {
  try {
    const result = await examService.deleteExamSubject(
      schoolId(req),
      req.params.examId,
      req.params.id
    );
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

// ===================== EXAM SCHEDULE =====================
export async function listSchedule(req, res, next) {
  try {
    const data = await examService.listSchedule(schoolId(req), req.params.examId, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createScheduleEntry(req, res, next) {
  try {
    const data = await examService.createScheduleEntry(schoolId(req), req.params.examId, req.body);
    res.status(201).json({
      success: true,
      message: 'Exam timetable slot created',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateScheduleEntry(req, res, next) {
  try {
    const data = await examService.updateScheduleEntry(
      schoolId(req),
      req.params.examId,
      req.params.id,
      req.body
    );
    res.json({
      success: true,
      message: 'Schedule slot updated',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteScheduleEntry(req, res, next) {
  try {
    const result = await examService.deleteScheduleEntry(
      schoolId(req),
      req.params.examId,
      req.params.id
    );
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

// ===================== MARKS ENTRY =====================
export async function listMarksSheet(req, res, next) {
  try {
    const data = await examService.listMarksSheet(schoolId(req), req.params.examId, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function saveMarks(req, res, next) {
  try {
    const result = await examService.saveMarks(schoolId(req), req.params.examId, {
      ...req.body,
      gradedBy: req.user?.sub,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ===================== RESULTS & REPORT CARDS =====================
export async function calculateResults(req, res, next) {
  try {
    const result = await examService.calculateResults(schoolId(req), req.params.examId, req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listResults(req, res, next) {
  try {
    const data = await examService.listResults(schoolId(req), req.params.examId, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getStudentReportCard(req, res, next) {
  try {
    const data = await examService.getStudentReportCard(
      schoolId(req),
      req.params.examId,
      req.params.studentId
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

import { studentAccessService } from '../../services/studentAccess.service.js';
import { studentExamService } from '../../services/studentExam.service.js';

async function ctxWithEnrollment(req) {
  const ctx = await studentAccessService.loadContext(req);
  studentAccessService.requireEnrollment(ctx);
  return ctx;
}

export async function listExams(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    const { data, pagination } = await studentExamService.listExams(ctx, req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}

export async function listUpcomingExams(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentExamService.upcomingExams(ctx) });
  } catch (error) {
    next(error);
  }
}

export async function getExam(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentExamService.getExam(ctx, req.params.examId) });
  } catch (error) {
    next(error);
  }
}

export async function getExamSchedule(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentExamService.examSchedule(ctx, req.params.examId) });
  } catch (error) {
    next(error);
  }
}

export async function listResults(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    const { data, pagination } = await studentExamService.listResults(ctx, req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}

export async function getResult(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentExamService.getResult(ctx, req.params.examId) });
  } catch (error) {
    next(error);
  }
}

export async function getSubjectResults(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentExamService.subjectResults(ctx, req.params.examId) });
  } catch (error) {
    next(error);
  }
}

export async function getReportCard(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentExamService.reportCard(ctx, req.query) });
  } catch (error) {
    next(error);
  }
}

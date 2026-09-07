import { teacherAccessService } from '../../services/teacherAccess.service.js';
import { teacherExamService } from '../../services/teacherExam.service.js';
import { auditLogService } from '../../services/auditLog.service.js';

const ctxOf = (req) => teacherAccessService.loadContext(req);

export async function listExams(req, res, next) {
  try {
    res.json({ success: true, ...(await teacherExamService.list(await ctxOf(req), req.query)) });
  } catch (e) { next(e); }
}
export async function getExam(req, res, next) {
  try {
    res.json({ success: true, data: await teacherExamService.get(await ctxOf(req), req.params.examId) });
  } catch (e) { next(e); }
}
export async function getExamSchedule(req, res, next) {
  try {
    res.json({ success: true, data: await teacherExamService.schedule(await ctxOf(req), req.params.examId) });
  } catch (e) { next(e); }
}
export async function getExamSubjects(req, res, next) {
  try {
    res.json({ success: true, data: await teacherExamService.subjects(await ctxOf(req), req.params.examId) });
  } catch (e) { next(e); }
}
export async function getExamMarks(req, res, next) {
  try {
    res.json({ success: true, data: await teacherExamService.marksSheet(await ctxOf(req), req.params.examId, req.query) });
  } catch (e) { next(e); }
}
export async function saveExamMarks(req, res, next) {
  try {
    const data = await teacherExamService.saveMarks(await ctxOf(req), req.params.examId, req.body || {});
    auditLogService.record(req, {
      module: 'EXAM_MARKS',
      action: 'SUBMIT',
      entityType: 'ExamMarks',
      entityId: req.params.examId,
      summary: `Saved ${data.saved} marks for exam ${req.params.examId}`,
    });
    res.json({ success: true, data, message: 'Marks saved' });
  } catch (e) { next(e); }
}
export async function patchExamMark(req, res, next) {
  try {
    const data = await teacherExamService.patchMark(await ctxOf(req), req.params.examId, req.params.markId, req.body || {});
    auditLogService.record(req, {
      module: 'EXAM_MARKS',
      action: 'MODIFY',
      entityType: 'ExamMarks',
      entityId: data.id,
      summary: `Edited mark ${data.id}`,
    });
    res.json({ success: true, data, message: 'Mark updated' });
  } catch (e) { next(e); }
}

import { parentAccessService } from '../../services/parentAccess.service.js';
import { studentHomeworkService } from '../../services/studentHomework.service.js';
import { studentClassworkService } from '../../services/studentClasswork.service.js';
import { studentMaterialService } from '../../services/studentMaterial.service.js';
import { studentTimetableService } from '../../services/studentTimetable.service.js';
import { studentExamService } from '../../services/studentExam.service.js';

/** Resolve the child, enforce the parent↔child link, require an active enrollment. */
async function childCtx(req) {
  const ctx = await parentAccessService.resolveChild(req, req.params.childId);
  parentAccessService.requireEnrollment(ctx);
  return ctx;
}
const ok = (res, data, pagination) => res.json(pagination ? { success: true, data, pagination } : { success: true, data });

/* ------------------------------ HOMEWORK ------------------------------ */
export async function listHomework(req, res, next) {
  try {
    const { data, pagination } = await studentHomeworkService.list(await childCtx(req), req.query);
    ok(res, data, pagination);
  } catch (e) { next(e); }
}
export async function getHomework(req, res, next) {
  try { ok(res, await studentHomeworkService.get(await childCtx(req), req.params.id)); } catch (e) { next(e); }
}

/* ------------------------------ CLASSWORK ----------------------------- */
export async function listClasswork(req, res, next) {
  try {
    const { data, pagination } = await studentClassworkService.list(await childCtx(req), req.query);
    ok(res, data, pagination);
  } catch (e) { next(e); }
}
export async function getClasswork(req, res, next) {
  try { ok(res, await studentClassworkService.get(await childCtx(req), req.params.id)); } catch (e) { next(e); }
}

/* --------------------------- STUDY MATERIAL --------------------------- */
export async function listMaterials(req, res, next) {
  try {
    const { data, pagination } = await studentMaterialService.list(await childCtx(req), req.query);
    ok(res, data, pagination);
  } catch (e) { next(e); }
}
export async function getMaterial(req, res, next) {
  try { ok(res, await studentMaterialService.get(await childCtx(req), req.params.id)); } catch (e) { next(e); }
}
export async function getMaterialDownloadUrl(req, res, next) {
  try { ok(res, await studentMaterialService.downloadUrl(await childCtx(req), req.params.id)); } catch (e) { next(e); }
}

/* ------------------------------ TIMETABLE ---------------------------- */
export async function getTimetableWeek(req, res, next) {
  try { ok(res, await studentTimetableService.week(await childCtx(req))); } catch (e) { next(e); }
}
export async function getTimetableToday(req, res, next) {
  try { ok(res, await studentTimetableService.today(await childCtx(req))); } catch (e) { next(e); }
}
export async function getTimetableDay(req, res, next) {
  try { ok(res, await studentTimetableService.day(await childCtx(req), req.params.day)); } catch (e) { next(e); }
}

/* -------------------------------- EXAMS ------------------------------ */
export async function listExams(req, res, next) {
  try {
    const { data, pagination } = await studentExamService.listExams(await childCtx(req), req.query);
    ok(res, data, pagination);
  } catch (e) { next(e); }
}
export async function listUpcomingExams(req, res, next) {
  try { ok(res, await studentExamService.upcomingExams(await childCtx(req))); } catch (e) { next(e); }
}
export async function getExam(req, res, next) {
  try { ok(res, await studentExamService.getExam(await childCtx(req), req.params.examId)); } catch (e) { next(e); }
}
export async function getExamSchedule(req, res, next) {
  try { ok(res, await studentExamService.examSchedule(await childCtx(req), req.params.examId)); } catch (e) { next(e); }
}

/* ------------------------------- RESULTS ---------------------------- */
export async function listResults(req, res, next) {
  try {
    const { data, pagination } = await studentExamService.listResults(await childCtx(req), req.query);
    ok(res, data, pagination);
  } catch (e) { next(e); }
}
export async function getResult(req, res, next) {
  try { ok(res, await studentExamService.getResult(await childCtx(req), req.params.examId)); } catch (e) { next(e); }
}
export async function getSubjectResults(req, res, next) {
  try { ok(res, await studentExamService.subjectResults(await childCtx(req), req.params.examId)); } catch (e) { next(e); }
}
export async function getReportCard(req, res, next) {
  try { ok(res, await studentExamService.reportCard(await childCtx(req), req.query)); } catch (e) { next(e); }
}

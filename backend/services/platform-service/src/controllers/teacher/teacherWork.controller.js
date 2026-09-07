import { teacherAccessService } from '../../services/teacherAccess.service.js';
import { teacherHomeworkService } from '../../services/teacherHomework.service.js';
import { teacherAssignmentService } from '../../services/teacherAssignment.service.js';
import { teacherMaterialService } from '../../services/teacherMaterial.service.js';
import { performedBy } from '../../utils/tenant.js';
import { auditLogService } from '../../services/auditLog.service.js';
import { deleteMulterFiles } from '../../utils/upload.utils.js';

const ctxOf = (req) => teacherAccessService.loadContext(req);
const audit = (req, action, entityType, entityId, summary) =>
  auditLogService.record(req, { module: 'TEACHER_WORK', action, entityType, entityId, summary });

/* ------------------------------ HOMEWORK ------------------------------ */
export async function listHomework(req, res, next) {
  try {
    res.json({ success: true, ...(await teacherHomeworkService.list(await ctxOf(req), req.query)) });
  } catch (e) { next(e); }
}
export async function getHomework(req, res, next) {
  try {
    res.json({ success: true, data: await teacherHomeworkService.get(await ctxOf(req), req.params.id) });
  } catch (e) { next(e); }
}
export async function createHomework(req, res, next) {
  try {
    const data = await teacherHomeworkService.create(await ctxOf(req), req.body || {}, performedBy(req));
    audit(req, 'CREATE', 'Homework', data.id, `Created homework "${data.title}"`);
    res.status(201).json({ success: true, data, message: 'Homework created' });
  } catch (e) { next(e); }
}
export async function updateHomework(req, res, next) {
  try {
    const data = await teacherHomeworkService.update(await ctxOf(req), req.params.id, req.body || {});
    audit(req, 'UPDATE', 'Homework', data.id, `Updated homework "${data.title}"`);
    res.json({ success: true, data, message: 'Homework updated' });
  } catch (e) { next(e); }
}
export async function deleteHomework(req, res, next) {
  try {
    const r = await teacherHomeworkService.remove(await ctxOf(req), req.params.id);
    audit(req, 'DELETE', 'Homework', req.params.id, 'Deleted homework');
    res.json({ success: true, ...r });
  } catch (e) { next(e); }
}
export async function getHomeworkSubmissions(req, res, next) {
  try {
    res.json({ success: true, data: await teacherHomeworkService.submissions(await ctxOf(req), req.params.id) });
  } catch (e) { next(e); }
}

/* ------------------------------ ASSIGNMENTS ------------------------------ */
export async function listAssignments(req, res, next) {
  try {
    res.json({ success: true, ...(await teacherAssignmentService.list(await ctxOf(req), req.query)) });
  } catch (e) { next(e); }
}
export async function getAssignment(req, res, next) {
  try {
    res.json({ success: true, data: await teacherAssignmentService.get(await ctxOf(req), req.params.id) });
  } catch (e) { next(e); }
}
export async function createAssignment(req, res, next) {
  try {
    const data = await teacherAssignmentService.create(await ctxOf(req), req.body || {}, performedBy(req));
    audit(req, 'CREATE', 'Assignment', data.id, `Created assignment "${data.title}"`);
    res.status(201).json({ success: true, data, message: 'Assignment created' });
  } catch (e) { next(e); }
}
export async function updateAssignment(req, res, next) {
  try {
    const data = await teacherAssignmentService.update(await ctxOf(req), req.params.id, req.body || {});
    audit(req, 'UPDATE', 'Assignment', data.id, `Updated assignment "${data.title}"`);
    res.json({ success: true, data, message: 'Assignment updated' });
  } catch (e) { next(e); }
}
export async function deleteAssignment(req, res, next) {
  try {
    const r = await teacherAssignmentService.remove(await ctxOf(req), req.params.id);
    audit(req, 'DELETE', 'Assignment', req.params.id, 'Deleted assignment');
    res.json({ success: true, ...r });
  } catch (e) { next(e); }
}
export async function getAssignmentSubmissions(req, res, next) {
  try {
    res.json({ success: true, data: await teacherAssignmentService.submissions(await ctxOf(req), req.params.id) });
  } catch (e) { next(e); }
}
export async function gradeAssignmentSubmission(req, res, next) {
  try {
    const data = await teacherAssignmentService.grade(await ctxOf(req), req.params.id, req.params.submissionId, req.body || {});
    audit(req, 'GRADE', 'AssignmentSubmission', data.id, `Graded submission ${data.id}`);
    res.json({ success: true, data, message: 'Submission graded' });
  } catch (e) { next(e); }
}

/* ------------------------------ STUDY MATERIAL ------------------------------ */
export async function listMaterials(req, res, next) {
  try {
    res.json({ success: true, ...(await teacherMaterialService.list(await ctxOf(req), req.query)) });
  } catch (e) { next(e); }
}
export async function getMaterial(req, res, next) {
  try {
    res.json({ success: true, data: await teacherMaterialService.get(await ctxOf(req), req.params.id) });
  } catch (e) { next(e); }
}
export async function createMaterial(req, res, next) {
  try {
    const data = await teacherMaterialService.create(await ctxOf(req), req.body || {}, req.file || null, performedBy(req));
    audit(req, 'CREATE', 'StudyMaterial', data.id, `Uploaded material "${data.title}"`);
    res.status(201).json({ success: true, data, message: 'Material uploaded' });
  } catch (e) {
    deleteMulterFiles(req.file);
    next(e);
  }
}
export async function updateMaterial(req, res, next) {
  try {
    const data = await teacherMaterialService.update(await ctxOf(req), req.params.id, req.body || {}, req.file || null);
    audit(req, 'UPDATE', 'StudyMaterial', data.id, `Updated material "${data.title}"`);
    res.json({ success: true, data, message: 'Material updated' });
  } catch (e) {
    deleteMulterFiles(req.file);
    next(e);
  }
}
export async function deleteMaterial(req, res, next) {
  try {
    const r = await teacherMaterialService.remove(await ctxOf(req), req.params.id);
    audit(req, 'DELETE', 'StudyMaterial', req.params.id, 'Deleted material');
    res.json({ success: true, ...r });
  } catch (e) { next(e); }
}

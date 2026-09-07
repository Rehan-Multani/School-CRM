import { studentAccessService } from '../../services/studentAccess.service.js';
import { studentHomeworkService } from '../../services/studentHomework.service.js';
import { studentMaterialService } from '../../services/studentMaterial.service.js';
import { auditLogService } from '../../services/auditLog.service.js';
import { deleteMulterFiles } from '../../utils/upload.utils.js';

async function ctxWithEnrollment(req) {
  const ctx = await studentAccessService.loadContext(req);
  studentAccessService.requireEnrollment(ctx);
  return ctx;
}

/* ------------------------------ HOMEWORK ------------------------------ */
export async function listHomework(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    const { data, pagination } = await studentHomeworkService.list(ctx, req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}

export async function listPendingHomework(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    const { data, pagination } = await studentHomeworkService.pending(ctx, req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}

export async function listCompletedHomework(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    const { data, pagination } = await studentHomeworkService.completed(ctx, req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}

export async function getHomework(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentHomeworkService.get(ctx, req.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function submitHomework(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    const data = await studentHomeworkService.submit(ctx, req.params.id, req.body || {}, req.file || null);
    auditLogService.record(req, {
      module: 'HOMEWORK',
      action: 'SUBMIT',
      entityType: 'HomeworkSubmission',
      entityId: req.params.id,
      summary: 'Student submitted homework',
    });
    res.json({ success: true, data, message: 'Homework submitted' });
  } catch (error) {
    deleteMulterFiles(req.file);
    next(error);
  }
}

/* --------------------------- STUDY MATERIAL --------------------------- */
export async function listMaterials(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    const { data, pagination } = await studentMaterialService.list(ctx, req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}

export async function getMaterial(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentMaterialService.get(ctx, req.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function getMaterialDownloadUrl(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentMaterialService.downloadUrl(ctx, req.params.id) });
  } catch (error) {
    next(error);
  }
}

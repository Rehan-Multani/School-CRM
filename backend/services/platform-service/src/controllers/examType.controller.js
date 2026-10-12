import { examTypeService } from '../services/examType.service.js';
import { auditLogService } from '../services/auditLog.service.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') return req.user?.sub;
  return req.user?.schoolId || req.schoolAdmin?.schoolId || req.user?.sub;
}

export async function listExamTypes(req, res, next) {
  try {
    const includeInactive = ['1', 'true', 'yes'].includes(String(req.query?.includeInactive || '').toLowerCase());
    const data = await examTypeService.list(schoolId(req), { includeInactive });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createExamType(req, res, next) {
  try {
    const data = await examTypeService.create(schoolId(req), req.body);
    auditLogService.record(req, {
      module: 'EXAMS',
      action: 'CREATE',
      entityType: 'ExamType',
      entityId: data.id,
      summary: `Created exam type "${data.name}"`,
    });
    res.status(201).json({ success: true, message: 'Exam type created', data });
  } catch (error) {
    next(error);
  }
}

export async function updateExamType(req, res, next) {
  try {
    const data = await examTypeService.update(schoolId(req), req.params.id, req.body);
    auditLogService.record(req, {
      module: 'EXAMS',
      action: 'UPDATE',
      entityType: 'ExamType',
      entityId: data.id,
      summary: `Updated exam type "${data.name}"`,
    });
    res.json({ success: true, message: 'Exam type updated', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteExamType(req, res, next) {
  try {
    const data = await examTypeService.remove(schoolId(req), req.params.id);
    auditLogService.record(req, {
      module: 'EXAMS',
      action: 'DELETE',
      entityType: 'ExamType',
      entityId: req.params.id,
      summary: 'Deleted an exam type',
    });
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

import { homeworkService } from '../services/homework.service.js';
import { auditLogService } from '../services/auditLog.service.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.user?.sub || req.schoolAdmin?.schoolId;
}

function performedBy(req) {
  return req.user?.name || req.user?.email || 'School Admin';
}

export async function listHomework(req, res, next) {
  try {
    const result = await homeworkService.list(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getHomeworkStats(req, res, next) {
  try {
    const data = await homeworkService.stats(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getHomeworkMonitor(req, res, next) {
  try {
    const data = await homeworkService.monitor(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getHomework(req, res, next) {
  try {
    const data = await homeworkService.get(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createHomework(req, res, next) {
  try {
    const data = await homeworkService.create(schoolId(req), req.body, performedBy(req));
    auditLogService.record(req, { module: 'HOMEWORK', action: 'CREATE', entityType: 'Homework', entityId: data.id, summary: `Created homework "${data.title}"` });
    res.status(201).json({ success: true, data, message: `Homework "${data.title}" created` });
  } catch (error) {
    next(error);
  }
}

export async function updateHomework(req, res, next) {
  try {
    const data = await homeworkService.update(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Homework updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteHomework(req, res, next) {
  try {
    const result = await homeworkService.remove(schoolId(req), req.params.id);
    auditLogService.record(req, { module: 'HOMEWORK', action: 'DELETE', entityType: 'Homework', entityId: req.params.id, summary: 'Deleted a homework assignment' });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

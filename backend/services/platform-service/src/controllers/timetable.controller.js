import { timetableService } from '../services/timetable.service.js';
import { schoolId, performedBy } from '../utils/tenant.js';
import { auditLogService } from '../services/auditLog.service.js';

export async function listTimetable(req, res, next) {
  try {
    const data = await timetableService.list(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createTimetable(req, res, next) {
  try {
    const data = await timetableService.create(schoolId(req), req.body || {});
    auditLogService.record(req, { module: 'TIMETABLE', action: 'CREATE', entityType: 'TimetableEntry', entityId: data.id, summary: `Added ${data.subjectName} to ${data.className} ${data.sectionName} (${data.dayOfWeek} P${data.periodNumber})` });
    res.status(201).json({ success: true, data, message: 'Timetable entry created' });
  } catch (error) {
    next(error);
  }
}

export async function updateTimetable(req, res, next) {
  try {
    const data = await timetableService.update(schoolId(req), req.params.id, req.body || {});
    auditLogService.record(req, { module: 'TIMETABLE', action: 'UPDATE', entityType: 'TimetableEntry', entityId: data.id, summary: `Updated timetable entry ${data.id}` });
    res.json({ success: true, data, message: 'Timetable entry updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteTimetable(req, res, next) {
  try {
    const result = await timetableService.remove(schoolId(req), req.params.id);
    auditLogService.record(req, { module: 'TIMETABLE', action: 'DELETE', entityType: 'TimetableEntry', entityId: req.params.id, summary: `Removed timetable entry ${req.params.id}` });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function saveSectionTimetable(req, res, next) {
  try {
    const data = await timetableService.saveSectionGrid(schoolId(req), req.params.sectionId, req.body || {});
    auditLogService.record(req, { module: 'TIMETABLE', action: 'UPDATE', entityType: 'Section', entityId: req.params.sectionId, summary: `Saved timetable grid for section ${req.params.sectionId} (${data.length} periods)` });
    res.json({ success: true, data, message: 'Timetable saved' });
  } catch (error) {
    next(error);
  }
}

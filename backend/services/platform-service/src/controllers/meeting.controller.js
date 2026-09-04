import { meetingService } from '../services/meeting.service.js';
import { schoolId, performedBy } from '../utils/tenant.js';
import { auditLogService } from '../services/auditLog.service.js';

export async function listMeetings(req, res, next) {
  try {
    const result = await meetingService.list(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getMeeting(req, res, next) {
  try {
    const data = await meetingService.get(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createMeeting(req, res, next) {
  try {
    const data = await meetingService.create(schoolId(req), req.body, performedBy(req));
    auditLogService.record(req, { module: 'MEETINGS', action: 'CREATE', entityType: 'Meeting', entityId: data.id, summary: `Scheduled meeting "${data.title}"` });
    res.status(201).json({ success: true, data, message: `Meeting "${data.title}" scheduled` });
  } catch (error) {
    next(error);
  }
}

export async function updateMeeting(req, res, next) {
  try {
    const data = await meetingService.update(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Meeting updated' });
  } catch (error) {
    next(error);
  }
}

export async function updateMeetingStatus(req, res, next) {
  try {
    const data = await meetingService.setStatus(
      schoolId(req),
      req.params.id,
      req.body?.status,
      req.body?.minutes
    );
    res.json({ success: true, data, message: `Meeting marked ${data.status.toLowerCase()}` });
  } catch (error) {
    next(error);
  }
}

export async function deleteMeeting(req, res, next) {
  try {
    const result = await meetingService.remove(schoolId(req), req.params.id);
    auditLogService.record(req, { module: 'MEETINGS', action: 'DELETE', entityType: 'Meeting', entityId: req.params.id, summary: 'Deleted a meeting' });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

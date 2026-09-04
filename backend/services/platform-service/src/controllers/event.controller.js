import { eventService } from '../services/event.service.js';
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

export async function listEvents(req, res, next) {
  try {
    const result = await eventService.list(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getEventStats(req, res, next) {
  try {
    const data = await eventService.stats(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getEvent(req, res, next) {
  try {
    const data = await eventService.get(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req, res, next) {
  try {
    const data = await eventService.create(schoolId(req), req.body, performedBy(req));
    auditLogService.record(req, { module: 'EVENTS', action: 'CREATE', entityType: 'Event', entityId: data.id, summary: `Scheduled event "${data.title}"` });
    res.status(201).json({ success: true, data, message: `Event "${data.title}" scheduled` });
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(req, res, next) {
  try {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'cancelled')) {
      const data = await eventService.setCancelled(schoolId(req), req.params.id, Boolean(req.body.cancelled));
      auditLogService.record(req, { module: 'EVENTS', action: data.cancelled ? 'CANCEL' : 'REINSTATE', entityType: 'Event', entityId: data.id, summary: `${data.cancelled ? 'Cancelled' : 'Reinstated'} event "${data.title}"` });
      res.json({
        success: true,
        data,
        message: data.cancelled ? 'Event cancelled' : 'Event reinstated',
      });
      return;
    }
    const data = await eventService.update(schoolId(req), req.params.id, req.body);
    auditLogService.record(req, { module: 'EVENTS', action: 'UPDATE', entityType: 'Event', entityId: data.id, summary: `Updated event "${data.title}"` });
    res.json({ success: true, data, message: 'Event updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const result = await eventService.remove(schoolId(req), req.params.id);
    auditLogService.record(req, { module: 'EVENTS', action: 'DELETE', entityType: 'Event', entityId: req.params.id, summary: 'Deleted an event' });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

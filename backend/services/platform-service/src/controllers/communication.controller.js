import { communicationService } from '../services/communication.service.js';

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

// announcements
export async function listAnnouncements(req, res, next) {
  try {
    const result = await communicationService.listAnnouncements(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
export async function createAnnouncement(req, res, next) {
  try {
    const data = await communicationService.createAnnouncement(
      schoolId(req),
      req.body,
      performedBy(req),
      schoolId(req)
    );
    res.status(201).json({ success: true, data, message: `Announcement "${data.title}" ${data.status === 'PUBLISHED' ? 'published' : 'saved'}` });
  } catch (error) {
    next(error);
  }
}
export async function updateAnnouncement(req, res, next) {
  try {
    const data = await communicationService.updateAnnouncement(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Announcement updated' });
  } catch (error) {
    next(error);
  }
}
export async function publishAnnouncement(req, res, next) {
  try {
    const data = await communicationService.publishAnnouncement(schoolId(req), req.params.id, schoolId(req));
    res.json({ success: true, data, message: 'Announcement published' });
  } catch (error) {
    next(error);
  }
}
export async function deleteAnnouncement(req, res, next) {
  try {
    const result = await communicationService.deleteAnnouncement(schoolId(req), req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// broadcasts
export async function listBroadcasts(req, res, next) {
  try {
    const result = await communicationService.listBroadcasts(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
export async function createBroadcast(req, res, next) {
  try {
    const data = await communicationService.createBroadcast(
      schoolId(req),
      req.body,
      performedBy(req),
      schoolId(req)
    );
    res.status(201).json({ success: true, data, message: `${data.channel} broadcast recorded` });
  } catch (error) {
    next(error);
  }
}

// messages
export async function listThreads(req, res, next) {
  try {
    const result = await communicationService.listThreads(schoolId(req));
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
export async function getThread(req, res, next) {
  try {
    const result = await communicationService.getThread(schoolId(req), req.params.key);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
export async function replyThread(req, res, next) {
  try {
    const data = await communicationService.reply(schoolId(req), req.params.key, req.body, performedBy(req));
    res.status(201).json({ success: true, data, message: 'Reply sent' });
  } catch (error) {
    next(error);
  }
}
export async function inboundMessage(req, res, next) {
  try {
    const data = await communicationService.inbound(schoolId(req), req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

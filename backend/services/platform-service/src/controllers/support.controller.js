import { supportService } from '../services/support.service.js';

function schoolActor(req) {
  return {
    createdByRole: 'SchoolAdmin',
    createdByName: req.body?.createdByName || req.query?.createdByName || 'School Admin',
    createdByEmail: req.body?.createdByEmail || '',
  };
}

export async function listTickets(req, res, next) {
  try {
    const result = await supportService.listTickets({
      search: req.query?.search,
      status: req.query?.status,
      priority: req.query?.priority,
      schoolId: req.query?.schoolId,
      page: req.query?.page,
      limit: req.query?.limit,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getTicket(req, res, next) {
  try {
    const data = await supportService.getTicket(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createTicket(req, res, next) {
  try {
    const data = await supportService.createTicket({
      schoolId: req.body?.schoolId,
      subject: req.body?.subject,
      description: req.body?.description,
      category: req.body?.category,
      priority: req.body?.priority,
      createdByRole: 'SuperAdmin',
      createdByName: req.body?.createdByName || 'Super Admin',
      createdByEmail: req.body?.createdByEmail || req.user?.email || '',
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket created',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function replyTicket(req, res, next) {
  try {
    const data = await supportService.addReply(req.params.id, {
      body: req.body?.body,
      authorRole: 'SuperAdmin',
      authorName: req.body?.authorName || 'Super Admin',
    });

    res.json({
      success: true,
      message: 'Reply added',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTicketStatus(req, res, next) {
  try {
    const data = await supportService.updateStatus(
      req.params.id,
      req.body?.status,
      req.body?.resolvedBy || 'Super Admin'
    );

    res.json({
      success: true,
      message: `Ticket marked as ${data.status}`,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function listSchoolTickets(req, res, next) {
  try {
    const result = await supportService.listTickets({
      search: req.query?.search,
      status: req.query?.status,
      priority: req.query?.priority,
      schoolId: req.params.schoolId,
      page: req.query?.page,
      limit: req.query?.limit,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getSchoolTicket(req, res, next) {
  try {
    const data = await supportService.getTicket(req.params.id, req.params.schoolId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createSchoolTicket(req, res, next) {
  try {
    const actor = schoolActor(req);
    const data = await supportService.createTicket({
      schoolId: req.params.schoolId,
      subject: req.body?.subject,
      description: req.body?.description,
      category: req.body?.category,
      priority: req.body?.priority,
      ...actor,
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket raised',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function replySchoolTicket(req, res, next) {
  try {
    const actor = schoolActor(req);
    const data = await supportService.addReply(
      req.params.id,
      {
        body: req.body?.body,
        authorRole: 'SchoolAdmin',
        authorName: actor.createdByName,
      },
      req.params.schoolId
    );

    res.json({
      success: true,
      message: 'Reply added',
      data,
    });
  } catch (error) {
    next(error);
  }
}

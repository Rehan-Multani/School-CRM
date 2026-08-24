import { AppError } from '../../../shared/AppError.js';
import { supportRepository } from '../repositories/support.repository.js';
import { School } from '../models/School.js';

const CATEGORIES = ['Billing', 'Technical', 'Account', 'Academic', 'Feature Request', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

function trimRequired(value, label, max = 2000) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(`${label} is required`, 400);
  if (text.length > max) throw new AppError(`${label} must be ${max} characters or fewer`, 400);
  return text;
}

function pick(value, allowed, label, fallback) {
  if (value == null || value === '') return fallback;
  if (!allowed.includes(value)) throw new AppError(`Invalid ${label}`, 400);
  return value;
}

async function findSchool(schoolKey) {
  const key = typeof schoolKey === 'string' ? schoolKey.trim() : '';
  if (!key) throw new AppError('School is required', 400);

  let school = await School.findOne({ schoolId: key.toLowerCase() });
  if (!school && /^[a-f\d]{24}$/i.test(key)) {
    school = await School.findById(key);
  }
  if (!school) throw new AppError('School not found', 404);
  return school;
}

function assertSchoolTicket(ticket, schoolId) {
  if (ticket.schoolId !== String(schoolId).toLowerCase()) {
    throw new AppError('Ticket not found', 404);
  }
}

export class SupportService {
  async listTickets(filters) {
    const result = await supportRepository.list(filters);
    return {
      data: result.items.map((item) => item.toPublicJSON()),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
      stats: await supportRepository.stats(filters.schoolId),
    };
  }

  async getTicket(id, schoolId) {
    const ticket = await supportRepository.findById(id);
    if (!ticket) throw new AppError('Ticket not found', 404);
    if (schoolId) assertSchoolTicket(ticket, schoolId);
    return ticket.toPublicJSON();
  }

  async createTicket({
    schoolId,
    subject,
    description,
    category,
    priority,
    createdByRole,
    createdByName,
    createdByEmail,
  }) {
    const school = await findSchool(schoolId);
    const ticketNo = await supportRepository.nextTicketNo();
    const cleanSubject = trimRequired(subject, 'Subject', 180);
    const cleanDescription = trimRequired(description, 'Description', 8000);
    const authorName = trimRequired(createdByName, 'Author name', 80);

    const ticket = await supportRepository.create({
      ticketNo,
      school: school._id,
      schoolId: school.schoolId,
      schoolName: school.name,
      subject: cleanSubject,
      description: cleanDescription,
      category: pick(category, CATEGORIES, 'category', 'Other'),
      priority: pick(priority, PRIORITIES, 'priority', 'Medium'),
      status: 'Open',
      createdByRole,
      createdByName: authorName,
      createdByEmail: (createdByEmail || '').trim().toLowerCase(),
      assignedTo: 'Support Desk',
      messages: [
        {
          authorRole: createdByRole,
          authorName,
          body: cleanDescription,
        },
      ],
    });

    return ticket.toPublicJSON();
  }

  async addReply(id, { body, authorRole, authorName }, schoolId) {
    const ticket = await supportRepository.findById(id);
    if (!ticket) throw new AppError('Ticket not found', 404);
    if (schoolId) assertSchoolTicket(ticket, schoolId);
    if (ticket.status === 'Closed') {
      throw new AppError('Closed tickets cannot receive replies', 400);
    }

    ticket.messages.push({
      authorRole,
      authorName: trimRequired(authorName, 'Author name', 80),
      body: trimRequired(body, 'Reply', 4000),
    });

    if (authorRole === 'SchoolAdmin' && (ticket.status === 'Resolved' || ticket.status === 'Closed')) {
      ticket.status = 'Open';
      ticket.resolvedAt = null;
      ticket.resolvedBy = null;
    }

    if (authorRole === 'SuperAdmin' && ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    await supportRepository.save(ticket);
    return ticket.toPublicJSON();
  }

  async updateStatus(id, status, resolvedBy) {
    const ticket = await supportRepository.findById(id);
    if (!ticket) throw new AppError('Ticket not found', 404);

    const nextStatus = pick(status, STATUSES, 'status');
    ticket.status = nextStatus;

    if (nextStatus === 'Resolved' || nextStatus === 'Closed') {
      ticket.resolvedAt = new Date();
      ticket.resolvedBy = resolvedBy || 'Super Admin';
    } else {
      ticket.resolvedAt = null;
      ticket.resolvedBy = null;
    }

    await supportRepository.save(ticket);
    return ticket.toPublicJSON();
  }
}

export const supportService = new SupportService();

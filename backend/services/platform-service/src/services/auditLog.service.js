import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';
import { School } from '../models/School.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { Teacher } from '../models/Teacher.js';

// Who an actor is (email / mobile) is looked up once and kept briefly, so a
// burst of writes by one person costs one query.
const CONTACT_TTL_MS = 60_000;
const contactCache = new Map();

async function lookupContact(user, schoolId) {
  const role = (user?.role || '').toUpperCase();
  const fallback = { name: user?.name || '', email: user?.email || '', mobile: '' };
  try {
    if (role === 'SCHOOLADMIN') {
      const school = await School.findById(schoolId).select('admin.name admin.email admin.mobile').lean();
      return {
        name: school?.admin?.name || fallback.name,
        email: school?.admin?.email || fallback.email,
        mobile: school?.admin?.mobile || '',
      };
    }
    const id = String(user?.userId || user?.sub || '');
    if (!mongoose.isValidObjectId(id)) return fallback;
    const staff = await SchoolUser.findById(id).select('name email phone').lean();
    if (staff) return { name: staff.name || fallback.name, email: staff.email || fallback.email, mobile: staff.phone || '' };
    const teacher = await Teacher.findById(id).select('name firstName lastName email phone mobileNumber').lean();
    if (teacher) {
      return {
        name: teacher.name || [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || fallback.name,
        email: teacher.email || fallback.email,
        mobile: teacher.mobileNumber || teacher.phone || '',
      };
    }
  } catch {
    /* fall through to token data */
  }
  return fallback;
}

async function resolveContact(user, schoolId) {
  const key = `${schoolId}:${user?.userId || user?.sub || ''}`;
  const hit = contactCache.get(key);
  if (hit && Date.now() - hit.at < CONTACT_TTL_MS) return hit.value;
  const value = await lookupContact(user, schoolId);
  contactCache.set(key, { at: Date.now(), value });
  if (contactCache.size > 500) contactCache.delete(contactCache.keys().next().value);
  return value;
}

function resolveSchoolId(req) {
  const role = req?.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') return req?.user?.sub;
  return req?.user?.schoolId || req?.user?.sub || req?.schoolAdmin?.schoolId || '';
}

class AuditLogService {
  /**
   * Fire-and-forget audit write. Never throws.
   * @param {object} req Express request (for actor + ip)
   * @param {object} entry { module, action, entityType, entityId, summary, before, after }
   */
  record(req, entry = {}) {
    try {
      const schoolId = resolveSchoolId(req);
      if (!schoolId || !mongoose.isValidObjectId(schoolId)) return;
      // The request logger skips requests a handler already recorded itself.
      if (req) req._auditRecorded = true;
      resolveContact(req?.user, schoolId)
        .then((contact) =>
          AuditLog.create({
            schoolId,
            module: entry.module || 'GENERAL',
            action: entry.action || 'UPDATE',
            entityType: entry.entityType || '',
            entityId: entry.entityId ? String(entry.entityId) : '',
            actorId: req?.user?.userId || req?.user?.sub || '',
            actorRole: req?.user?.role || '',
            actorName: contact.name || req?.user?.name || req?.user?.email || 'System',
            actorEmail: contact.email,
            actorMobile: contact.mobile,
            method: entry.method || req?.method || '',
            path: entry.path || '',
            summary: entry.summary || '',
            before: entry.before ?? null,
            after: entry.after ?? null,
            ip: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '',
            userAgent: req?.headers?.['user-agent'] || '',
          })
        )
        .catch(() => {});
    } catch {
      /* audit must never break a request */
    }
  }

  async list(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.module && query.module !== 'ALL') filter.module = String(query.module).toUpperCase();
    if (query.action && query.action !== 'ALL') {
      filter.action = new RegExp(escapeRegex(String(query.action).trim()), 'i');
    }
    if (query.actor) {
      const term = new RegExp(escapeRegex(String(query.actor).trim()), 'i');
      filter.$or = [{ actorName: term }, { actorEmail: term }, { actorMobile: term }, { summary: term }];
    }
    if (query.role && query.role !== 'ALL') {
      filter.actorRole = new RegExp(`^${escapeRegex(String(query.role).trim())}$`, 'i');
    }
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(query.from);
      if (query.to) {
        const to = new Date(query.to);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 25,
      maxLimit: 100,
    });

    const [items, total, modulesAgg, rolesAgg] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
      AuditLog.distinct('module', { schoolId }),
      AuditLog.distinct('actorRole', { schoolId }),
    ]);

    return {
      data: items.map((i) => i.toPublicJSON()),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      modules: modulesAgg.sort(),
      roles: rolesAgg.filter(Boolean).sort(),
    };
  }
}

export const auditLogService = new AuditLogService();

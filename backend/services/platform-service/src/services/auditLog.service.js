import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

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
      AuditLog.create({
        schoolId,
        module: entry.module || 'GENERAL',
        action: entry.action || 'UPDATE',
        entityType: entry.entityType || '',
        entityId: entry.entityId ? String(entry.entityId) : '',
        actorId: req?.user?.userId || req?.user?.sub || '',
        actorRole: req?.user?.role || '',
        actorName: req?.user?.name || req?.user?.email || 'System',
        summary: entry.summary || '',
        before: entry.before ?? null,
        after: entry.after ?? null,
        ip: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '',
        userAgent: req?.headers?.['user-agent'] || '',
      }).catch(() => {});
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
      filter.actorName = new RegExp(escapeRegex(String(query.actor).trim()), 'i');
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

    const [items, total, modulesAgg] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
      AuditLog.distinct('module', { schoolId }),
    ]);

    return {
      data: items.map((i) => i.toPublicJSON()),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      modules: modulesAgg.sort(),
    };
  }
}

export const auditLogService = new AuditLogService();

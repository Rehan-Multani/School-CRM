import { auditLogService } from '../services/auditLog.service.js';

// School staff whose writes show up in the school admin's Activity Logs.
const STAFF_ROLES = new Set([
  'SCHOOLADMIN',
  'PRINCIPAL',
  'HR',
  'ACCOUNTANT',
  'LIBRARIAN',
  'TEACHER',
  'TRANSPORT',
  'TRANSPORT_MANAGER',
]);

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SKIP_PATH = /(login|logout|otp|refresh|device-token|heartbeat|audit-logs|password|session)/i;
const SECRET_KEY = /(pass|token|secret|otp|pin|authorization|hash)/i;
const ROLE_PREFIXES = new Set(['school-portal', 'principal', 'hr', 'accountant', 'librarian', 'teacher', 'transport-manager']);
const VERBS = { POST: 'Created', PUT: 'Updated', PATCH: 'Updated', DELETE: 'Deleted' };
const ACTIONS = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };

const isId = (segment) => /^[0-9a-f]{24}$/i.test(segment) || /^\d+$/.test(segment);
const words = (segment) => segment.replace(/[-_]+/g, ' ');
const upperKey = (segment) => segment.replace(/[^a-z0-9]+/gi, '_').toUpperCase();

// Request body kept as the entry's details: secrets dropped, long values cut.
function sanitizeBody(value, depth = 0) {
  if (value == null || depth > 3) return undefined;
  if (typeof value === 'string') return value.length > 200 ? `${value.slice(0, 200)}...` : value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 10).map((item) => sanitizeBody(item, depth + 1));
  const out = {};
  for (const [key, val] of Object.entries(value).slice(0, 30)) {
    if (SECRET_KEY.test(key)) continue;
    // Inline images / files would bloat the log.
    if (typeof val === 'string' && val.startsWith('data:')) continue;
    out[key] = sanitizeBody(val, depth + 1);
  }
  return out;
}

function describe(method, urlPath) {
  const segments = urlPath.split('/').filter(Boolean);
  while (segments.length && ROLE_PREFIXES.has(segments[0])) segments.shift();
  const literal = segments.filter((segment) => !isId(segment));
  const entityId = [...segments].reverse().find(isId) || '';
  const moduleName = upperKey(literal[0] || 'general');
  const resource = literal.map(words).join(' / ') || 'record';

  // e.g. POST /fees/:id/collect -> action COLLECT; otherwise the plain verb.
  const tail = literal.length > 1 ? literal[literal.length - 1] : '';
  const isCustomAction = Boolean(tail) && method !== 'DELETE' && !isId(segments[segments.length - 1]);
  if (isCustomAction) {
    return {
      module: moduleName,
      action: upperKey(tail),
      summary: `${words(tail)} - ${literal.slice(0, -1).map(words).join(' / ')}`,
      entityId,
    };
  }
  return { module: moduleName, action: ACTIONS[method], summary: `${VERBS[method]} ${resource}`, entityId };
}

// Records every successful write by school staff, so the Activity Logs cover
// all operations, not just the ones whose handlers audit themselves.
export function activityLogger(req, res, next) {
  if (!WRITE_METHODS.has(req.method)) return next();

  res.on('finish', () => {
    try {
      if (res.statusCode >= 400 || req._auditRecorded) return;
      const role = String(req.user?.role || '').toUpperCase();
      if (!STAFF_ROLES.has(role)) return;
      const urlPath = (req.originalUrl || req.url || '').split('?')[0].replace(/^\/api\/v\d+\/platform/, '');
      if (SKIP_PATH.test(urlPath)) return;

      const info = describe(req.method, urlPath);
      auditLogService.record(req, {
        module: info.module,
        action: info.action,
        entityType: info.module,
        entityId: info.entityId,
        summary: info.summary,
        after: sanitizeBody(req.body) ?? null,
        method: req.method,
        path: urlPath,
      });
    } catch {
      /* logging must never affect the response */
    }
  });
  return next();
}

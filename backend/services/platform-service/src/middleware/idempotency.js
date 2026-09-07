import { AppError } from '../../../shared/AppError.js';
import { IdempotencyKey } from '../models/IdempotencyKey.js';
import { schoolId as tenantSchoolId, teacherId as tenantTeacherId } from '../utils/tenant.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

/**
 * Optional idempotency for retry-sensitive POSTs. If the request carries an
 * `Idempotency-Key` header, the first call runs normally and its JSON response
 * is cached (keyed by teacher + scope + key); any retry replays that exact
 * response without re-running the handler. No header → passthrough.
 *
 * Must be mounted AFTER requireTeacher (needs req.user).
 */
export function withIdempotency(scope) {
  return async function idempotencyMw(req, res, next) {
    const rawKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    const key = typeof rawKey === 'string' ? rawKey.trim() : '';
    if (!key) return next();
    if (key.length > 200) {
      return next(new AppError('Idempotency-Key must be 200 characters or fewer', 400, TEACHER_ERR.VALIDATION_ERROR));
    }

    let teacherId;
    let schoolId;
    try {
      teacherId = tenantTeacherId(req);
      schoolId = tenantSchoolId(req);
    } catch (err) {
      return next(err);
    }

    try {
      const existing = await IdempotencyKey.findOne({ teacherId, scope, key }).lean();
      if (existing) {
        res.setHeader('Idempotency-Replayed', 'true');
        return res.status(existing.statusCode || 200).json(existing.responseBody ?? { success: true });
      }
    } catch {
      // cache lookup failure must not block the write
      return next();
    }

    // Capture the response body, persist on a successful (2xx) send.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const statusCode = res.statusCode || 200;
      if (statusCode >= 200 && statusCode < 300) {
        IdempotencyKey.create({ key, scope, teacherId, schoolId, statusCode, responseBody: body }).catch((e) => {
          // 11000 => a concurrent request already stored it; safe to ignore.
          if (e?.code !== 11000) {
            /* swallow — the write itself already succeeded */
          }
        });
      }
      return originalJson(body);
    };

    next();
  };
}

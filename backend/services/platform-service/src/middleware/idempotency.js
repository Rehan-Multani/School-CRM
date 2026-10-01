import { AppError } from '../../../shared/AppError.js';
import { IdempotencyKey } from '../models/IdempotencyKey.js';
import { schoolId as tenantSchoolId, teacherId as tenantTeacherId } from '../utils/tenant.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

// A reservation that never got a response (process died mid-request) is taken
// over after this long, so one crash cannot block a key for its whole 24h TTL.
const STALE_MS = 60_000;
// How long a duplicate waits for the original request to finish before giving up.
const WAIT_MS = 15_000;
const POLL_MS = 200;
const IN_PROGRESS = 0; // statusCode of a reserved-but-unanswered key
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The unique {teacherId, scope, key} index must exist before the first
// reservation (autoIndex builds it in the background after connect). Awaited
// once per process; a failure here is not fatal — see the catch in the middleware.
let indexPromise = null;
const indexReady = () => {
  indexPromise = indexPromise || IdempotencyKey.init().catch(() => {});
  return indexPromise;
};

/**
 * Optional idempotency for retry-sensitive POSTs. If the request carries an
 * `Idempotency-Key` header, exactly ONE request per (actor, scope, key) runs
 * the handler; its 2xx JSON response is stored and every other request with
 * that key — a later retry OR a concurrent double tap — gets that same
 * response replayed. No header → passthrough.
 *
 * The key is RESERVED before the handler runs (the unique index on
 * {teacherId, scope, key} makes the reservation atomic). Checking for a stored
 * response first and saving it afterwards is not enough: two simultaneous
 * requests both pass the check and both run — which, for a handler with an
 * external side effect (e.g. creating a Razorpay order), means two of them.
 *
 * A non-2xx outcome releases the key, so the same key can be retried.
 *
 * Must be mounted AFTER the role guard (needs req.user). `teacherId` here is
 * the acting user's id for any role (tenant.teacherId falls back to `sub`).
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
    const where = { teacherId, scope, key };

    try {
      const deadline = Date.now() + WAIT_MS;
      for (;;) {
        // 1. Try to reserve the key. An upsert that returns the PREVIOUS doc:
        //    null = we just inserted it (ours); a doc = someone already holds it.
        //    Sequential retries are correct even without the index; the unique
        //    index (awaited once below) is what makes simultaneous ones atomic.
        await indexReady();
        let existing;
        try {
          existing = await IdempotencyKey.findOneAndUpdate(
            where,
            { $setOnInsert: { ...where, schoolId, statusCode: IN_PROGRESS, responseBody: null, createdAt: new Date() } },
            { upsert: true, new: false, lean: true }
          );
        } catch (e) {
          if (e?.code !== 11000) throw e;
          continue; // lost a simultaneous insert race → read the winner on the next pass
        }
        if (!existing) break; // ours — run the handler

        // 2. Someone else holds it.
        if (existing.statusCode !== IN_PROGRESS) {
          res.setHeader('Idempotency-Replayed', 'true');
          return res.status(existing.statusCode || 200).json(existing.responseBody ?? { success: true });
        }
        // Still running. Take over a reservation whose request evidently died.
        if (Date.now() - new Date(existing.createdAt).getTime() > STALE_MS) {
          const taken = await IdempotencyKey.findOneAndUpdate(
            { _id: existing._id, statusCode: IN_PROGRESS, createdAt: existing.createdAt },
            { $set: { createdAt: new Date() } }
          );
          if (taken) break;
          continue;
        }
        if (Date.now() > deadline) {
          return next(new AppError('This request is already being processed. Please wait a moment.', 409, 'DUPLICATE_REQUEST'));
        }
        await sleep(POLL_MS);
      }
    } catch {
      // The idempotency store being unavailable must not block the write.
      return next();
    }

    // We hold the reservation: store the response on success, release on failure.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const statusCode = res.statusCode || 200;
      const settle =
        statusCode >= 200 && statusCode < 300
          ? IdempotencyKey.updateOne(where, { $set: { statusCode, responseBody: body } })
          : IdempotencyKey.deleteOne({ ...where, statusCode: IN_PROGRESS });
      // Settle BEFORE answering, so a waiting duplicate (or an instant retry)
      // can never observe the key as free/in-progress after this response.
      Promise.resolve(settle)
        .catch(() => {
          /* the write itself already succeeded */
        })
        .finally(() => originalJson(body));
      return res;
    };

    next();
  };
}

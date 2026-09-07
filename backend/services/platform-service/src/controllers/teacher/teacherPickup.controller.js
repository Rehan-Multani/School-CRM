import { teacherAccessService } from '../../services/teacherAccess.service.js';
import { safePickupService } from '../../services/safePickup.service.js';

const ctxOf = (req) => teacherAccessService.loadContext(req);
const idemKey = (req) => (req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || '').toString().trim();

export async function listEligibleStudents(req, res, next) {
  try {
    const ctx = await ctxOf(req);
    const result = await safePickupService.eligibleStudents(ctx, req.query);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
}

export async function initiatePickup(req, res, next) {
  try {
    const ctx = await ctxOf(req);
    const data = await safePickupService.initiate(
      ctx,
      { studentId: req.body?.studentId, idempotencyKey: idemKey(req) || null },
      req
    );
    res.status(201).json({
      success: true,
      message: 'Pickup verification started. OTP sent to the registered guardian.',
      data,
    });
  } catch (e) {
    next(e);
  }
}

export async function getPickupSession(req, res, next) {
  try {
    const ctx = await ctxOf(req);
    const data = await safePickupService.getSession(ctx, req.params.pickupSessionId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function verifyPickupOtp(req, res, next) {
  try {
    const ctx = await ctxOf(req);
    const data = await safePickupService.verify(ctx, req.params.pickupSessionId, req.body?.otp, req);
    res.json({ success: true, message: 'Parent authorization verified', data });
  } catch (e) {
    next(e);
  }
}

export async function resendPickupOtp(req, res, next) {
  try {
    const ctx = await ctxOf(req);
    const data = await safePickupService.resend(ctx, req.params.pickupSessionId, req);
    res.json({ success: true, message: 'A new OTP has been sent', data });
  } catch (e) {
    next(e);
  }
}

export async function completePickup(req, res, next) {
  try {
    const ctx = await ctxOf(req);
    const data = await safePickupService.complete(ctx, req.params.pickupSessionId, req.body || {}, req);
    res.json({ success: true, message: 'Student pickup completed', data });
  } catch (e) {
    next(e);
  }
}

export async function cancelPickup(req, res, next) {
  try {
    const ctx = await ctxOf(req);
    const data = await safePickupService.cancel(ctx, req.params.pickupSessionId, req);
    res.json({ success: true, message: 'Pickup verification cancelled', data });
  } catch (e) {
    next(e);
  }
}

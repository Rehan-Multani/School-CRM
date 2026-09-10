import { driverAuthService } from '../services/driverAuth.service.js';
import { driverTransportService } from '../services/driverTransport.service.js';
import { schoolId, driverId } from '../utils/tenant.js';

/**
 * Driver API controllers. Identity always comes from the verified JWT, so no
 * handler here reads a schoolId or driverId out of the request.
 */

/* ----------------------------------- AUTH ------------------------------------- */

export async function driverLogin(req, res, next) {
  try {
    const data = await driverAuthService.login(req.body);
    res.json({ success: true, message: 'Logged in', data });
  } catch (error) {
    next(error);
  }
}

export async function driverMe(req, res, next) {
  try {
    const data = await driverAuthService.me(schoolId(req), driverId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function driverChangePassword(req, res, next) {
  try {
    const data = await driverAuthService.changePassword(schoolId(req), driverId(req), req.body);
    res.json({ success: true, message: 'Password changed', data });
  } catch (error) {
    next(error);
  }
}

/* ------------------------------ ROUTE + STUDENTS ------------------------------ */

export async function getMyRoute(req, res, next) {
  try {
    const data = await driverTransportService.myRoute(schoolId(req), driverId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getMyStudents(req, res, next) {
  try {
    const data = await driverTransportService.myStudents(schoolId(req), driverId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/* --------------------------- STEP 6 · DAILY STATUS ---------------------------- */

export async function markPickup(req, res, next) {
  try {
    const { data, idempotent } = await driverTransportService.markPickup(
      schoolId(req),
      driverId(req),
      req.params.studentId,
      req.body
    );
    res.json({
      success: true,
      message: idempotent ? 'Already marked as picked up' : 'Marked as picked up',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function markDrop(req, res, next) {
  try {
    const { data, idempotent } = await driverTransportService.markDrop(
      schoolId(req),
      driverId(req),
      req.params.studentId,
      req.body
    );
    res.json({
      success: true,
      message: idempotent ? 'Already marked as dropped' : 'Marked as dropped',
      data,
    });
  } catch (error) {
    next(error);
  }
}

import { transportManagerAuthService } from '../services/transportManagerAuth.service.js';
import { transportManagerService } from '../services/transportManager.service.js';
import { deleteAppAccount } from '../services/appAccount.service.js';
import { auditLogService } from '../services/auditLog.service.js';
import { schoolId, transportManagerId } from '../utils/tenant.js';

/**
 * Transport Manager app controllers. Identity always comes from the verified
 * JWT, so no handler here reads a schoolId or user id out of the request.
 */

/* ----------------------------------- AUTH ------------------------------------- */

export async function transportManagerLogin(req, res, next) {
  try {
    const data = await transportManagerAuthService.login(req.body || {});
    auditLogService.record(
      {
        user: { sub: data.manager.id, userId: data.manager.id, schoolId: data.school.id, name: data.manager.name, role: 'TRANSPORT' },
        headers: req.headers,
        socket: req.socket,
      },
      { module: 'AUTH', action: 'LOGIN', entityType: 'SchoolUser', entityId: data.manager.id, summary: `Transport manager ${data.manager.name} logged in` }
    );
    res.json({ success: true, message: 'Login successful', ...data });
  } catch (error) {
    next(error);
  }
}

export async function transportManagerLogout(req, res, next) {
  try {
    await transportManagerAuthService.logout(schoolId(req), transportManagerId(req));
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    next(error);
  }
}

export async function transportManagerMe(req, res, next) {
  try {
    const data = await transportManagerAuthService.me(schoolId(req), transportManagerId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function transportManagerChangePassword(req, res, next) {
  try {
    const data = await transportManagerAuthService.changePassword(schoolId(req), transportManagerId(req), req.body || {});
    res.json({ success: true, message: 'Password changed', data });
  } catch (error) {
    next(error);
  }
}

export async function transportManagerDeleteAccount(req, res, next) {
  try {
    const id = transportManagerId(req);
    const data = await deleteAppAccount('TRANSPORT', schoolId(req), id, req.body || {});
    auditLogService.record(req, { module: 'AUTH', action: 'ACCOUNT_DELETE', entityType: 'SchoolUser', entityId: id, summary: 'Transport manager deleted their app account' });
    res.json({ success: true, message: data.message });
  } catch (error) {
    next(error);
  }
}

/* ------------------------------ ROUTES + FLEET -------------------------------- */

/** Also serves the school admin's read-only "Daily Status" tab. */
export async function getTransportOverview(req, res, next) {
  try {
    const data = await transportManagerService.overview(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/** Also serves the school admin's read-only "Daily Status" tab. */
export async function getTransportRouteRun(req, res, next) {
  try {
    const data = await transportManagerService.routeRun(schoolId(req), req.params.routeId, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTransportFleet(req, res, next) {
  try {
    const data = await transportManagerService.fleet(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/* --------------------------- STEP 6 · DAILY STATUS ---------------------------- */

const MARKS = {
  markPickup: ['Marked as picked up', 'Already marked as picked up'],
  markDrop: ['Marked as dropped', 'Already marked as dropped'],
  undoPickup: ['Pickup undone', 'Pickup was not marked'],
  undoDrop: ['Drop undone', 'Drop was not marked'],
};

function markHandler(method) {
  const [done, already] = MARKS[method];
  return async function mark(req, res, next) {
    try {
      const { data, idempotent } = await transportManagerService[method](
        schoolId(req),
        transportManagerId(req),
        req.params.studentId,
        // DELETE carries the date in the query string, POST in the body.
        { ...req.query, ...req.body }
      );
      res.json({ success: true, message: idempotent ? already : done, data });
    } catch (error) {
      next(error);
    }
  };
}

export const managerMarkPickup = markHandler('markPickup');
export const managerMarkDrop = markHandler('markDrop');
export const managerUndoPickup = markHandler('undoPickup');
export const managerUndoDrop = markHandler('undoDrop');

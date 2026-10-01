/**
 * Transport Manager app surface — the fourth role of the mobile app.
 *
 * Mounted from platformRoutes.js (`router.use(transportManagerRoutes)`), so
 * every path here is reached at `/api/v1/platform/...` through the api-gateway,
 * exactly like the other role portals. Sibling of driver.routes.js — same
 * conventions (one Express Router, static paths before `:param`,
 * `requireTransportManager` on every authenticated route, with
 * `enforceSubscriptionAccess` folded into that guard).
 *
 * The school-admin transport surface lives at `/school-portal/transport/*`;
 * this one uses `/school-portal/transport-manager/*` so the two can never
 * shadow-route.
 *
 * The manager is a staff account (SchoolUser, role TRANSPORT) signing in with
 * email + password. They can READ every route, its students and the fleet, and
 * WRITE nothing but pickup / drop status. Vehicles, drivers, routes, stops and
 * student assignments are managed by the school admin on the web.
 */
import { Router } from 'express';
import { loginRateLimiter, changePasswordRateLimiter } from '../middleware/loginRateLimiter.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { requireTransportManager } from '../middleware/requireTransportManager.js';

import {
  transportManagerLogin,
  transportManagerLogout,
  transportManagerMe,
  transportManagerChangePassword,
  transportManagerDeleteAccount,
  getTransportOverview,
  getTransportRouteRun,
  getTransportFleet,
  managerMarkPickup,
  managerMarkDrop,
  managerUndoPickup,
  managerUndoDrop,
} from '../controllers/transportManager.controller.js';

const router = Router();
const M = '/school-portal/transport-manager';

// ============================ 01 · AUTH ============================
router.post('/school-portal/auth/transport-login', loginRateLimiter, transportManagerLogin);
router.post('/school-auth/transport-login', loginRateLimiter, transportManagerLogin);
router.get(`${M}/me`, requireTransportManager, transportManagerMe);
router.post(`${M}/auth/logout`, requireTransportManager, transportManagerLogout);
router.patch(`${M}/change-password`, requireTransportManager, changePasswordRateLimiter, transportManagerChangePassword);
router.post(`${M}/account/delete`, requireTransportManager, changePasswordRateLimiter, transportManagerDeleteAccount);

// ======================= 02 · ROUTES + FLEET =======================
router.get(`${M}/overview`, requireTransportManager, getTransportOverview);
router.get(`${M}/fleet`, requireTransportManager, getTransportFleet);
router.get(`${M}/routes/:routeId`, requireTransportManager, validateObjectId('routeId'), getTransportRouteRun);

// ==================== 03 · DAILY PICKUP / DROP =====================
const student = [requireTransportManager, validateObjectId('studentId')];
router.post(`${M}/students/:studentId/pickup`, ...student, managerMarkPickup);
router.delete(`${M}/students/:studentId/pickup`, ...student, managerUndoPickup);
router.post(`${M}/students/:studentId/drop`, ...student, managerMarkDrop);
router.delete(`${M}/students/:studentId/drop`, ...student, managerUndoDrop);

export default router;

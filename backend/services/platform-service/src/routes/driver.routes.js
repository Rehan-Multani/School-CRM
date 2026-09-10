/**
 * Driver API surface — step 6 of the transport flow.
 *
 * Mounted from platformRoutes.js (`router.use(driverRoutes)`), so every path
 * here is reached at `/api/v1/platform/...` through the api-gateway, exactly
 * like the other role portals. Sibling of student.routes.js — same conventions
 * (one Express Router, static paths before `:param`, `requireDriver` on every
 * authenticated route, `enforceSubscriptionAccess` folded into that guard).
 *
 * The school-admin transport surface lives at `/school-portal/transport/*`;
 * this one uses `/school-portal/driver/*` so the two can never shadow-route.
 *
 * A driver can READ their route and student list, and WRITE nothing but today's
 * pickup / drop status. There is deliberately no other verb here.
 */
import { Router } from 'express';
import { loginRateLimiter } from '../middleware/loginRateLimiter.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { requireDriver } from '../middleware/requireDriver.js';

import {
  driverLogin,
  driverMe,
  driverChangePassword,
  getMyRoute,
  getMyStudents,
  markPickup,
  markDrop,
} from '../controllers/driverTransport.controller.js';

const router = Router();
const D = '/school-portal/driver';

// ============================ 01 · AUTH ============================
router.post('/school-portal/auth/driver-login', loginRateLimiter, driverLogin);
router.get(`${D}/me`, requireDriver, driverMe);
router.patch(`${D}/change-password`, requireDriver, driverChangePassword);

// ====================== 02 · ROUTE + STUDENTS ======================
router.get(`${D}/route`, requireDriver, getMyRoute);
router.get(`${D}/students`, requireDriver, getMyStudents);

// ==================== 03 · DAILY PICKUP / DROP =====================
router.post(
  `${D}/students/:studentId/pickup`,
  requireDriver,
  validateObjectId('studentId'),
  markPickup
);
router.post(
  `${D}/students/:studentId/drop`,
  requireDriver,
  validateObjectId('studentId'),
  markDrop
);

export default router;

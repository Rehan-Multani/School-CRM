/**
 * Transport APK API surface — driver / conductor / transport-manager operational
 * app. Mounted from platformRoutes.js (`router.use(transportApkRoutes)`).
 *
 * NOTE: the existing school-admin transport management lives at
 * `/school-portal/transport/*` (requireSchoolAdmin). To avoid shadow-routing,
 * this APK uses `/school-portal/transport-app/*`. Login is at
 * `/school-portal/auth/transport-login`.
 *
 * Bottom nav: HOME · TRIPS · STUDENTS · ALERTS · PROFILE  (+ 🔔 top-right).
 */
import { Router } from 'express';
import { loginRateLimiter } from '../middleware/loginRateLimiter.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { requireTransport } from '../middleware/requireTransport.js';
import { requireTransportRole } from '../middleware/requireTransportRole.js';
import { withIdempotency } from '../middleware/idempotency.js';
import { gpsRateLimiter, sosRateLimiter } from '../middleware/transportRateLimiter.js';
import { uploadSchoolUserFiles, convertSchoolUserImages } from '../middleware/uploadSchoolUser.js';

import {
  transportLogin,
  transportLogout,
  transportMe,
  transportChangePassword,
  getTransportProfile,
  updateTransportProfile,
  getTransportVehicle,
  getTransportVehicleDocuments,
  getTransportInspectionHistory,
  getTransportRoute,
  getTransportSettings,
  updateTransportSettings,
} from '../controllers/transport-app/transportAuth.controller.js';
import { getDashboard, getDashboardSummary } from '../controllers/transport-app/transportHome.controller.js';
import {
  listTrips,
  tripHistory,
  getTrip,
  createTrip,
  submitInspection,
  getInspection,
  startTrip,
  completeTrip,
  cancelTrip,
  abortTrip,
  listTripStops,
  arriveStop,
  departStop,
  postLocation,
  getLocation,
  getLocationHistory,
} from '../controllers/transport-app/transportTrips.controller.js';
import {
  listTripStudents,
  getTripStudentStatus,
  boardStudent,
  dropStudent,
  markStudentAbsent,
  reportStudentException,
  listRouteStudents,
} from '../controllers/transport-app/transportStudents.controller.js';
import {
  listAlerts,
  getAlert,
  markAlertRead,
  resolveAlert,
  reportIssue,
  listTripIssues,
  raiseSOS,
  listSOS,
  getSOS,
  updateSOS,
} from '../controllers/transport-app/transportAlerts.controller.js';
import {
  listNotifications,
  getNotificationsUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  registerDevice,
} from '../controllers/transport-app/transportInbox.controller.js';

const router = Router();
const oid = (p) => validateObjectId(p);
const T = '/school-portal/transport-app';
const MANAGER = requireTransportRole(['TRANSPORT_MANAGER', 'TRANSPORT_ADMIN']);

// ============================ 01 · AUTH ============================
router.post('/school-portal/auth/transport-login', loginRateLimiter, transportLogin);
router.post('/school-auth/transport-login', loginRateLimiter, transportLogin);
router.post(`${T}/auth/logout`, requireTransport, transportLogout);
router.get(`${T}/me`, requireTransport, transportMe);
router.patch(`${T}/change-password`, requireTransport, transportChangePassword);

// ============================ 02 · HOME ============================
router.get(`${T}/dashboard`, requireTransport, getDashboard);
router.get(`${T}/dashboard/summary`, requireTransport, getDashboardSummary);

// ============================ 03 · TRIPS ============================
router.get(`${T}/trips`, requireTransport, listTrips);
router.get(`${T}/trips/history`, requireTransport, tripHistory);
router.post(`${T}/trips`, requireTransport, MANAGER, withIdempotency('transport.trip.create'), createTrip);
router.get(`${T}/trips/:id`, requireTransport, oid('id'), getTrip);
router.post(`${T}/trips/:id/inspection`, requireTransport, oid('id'), submitInspection);
router.get(`${T}/trips/:id/inspection`, requireTransport, oid('id'), getInspection);
router.post(`${T}/trips/:id/start`, requireTransport, oid('id'), withIdempotency('transport.trip.start'), startTrip);
router.post(`${T}/trips/:id/complete`, requireTransport, oid('id'), completeTrip);
router.post(`${T}/trips/:id/cancel`, requireTransport, oid('id'), MANAGER, cancelTrip);
router.post(`${T}/trips/:id/abort`, requireTransport, oid('id'), abortTrip);
router.get(`${T}/trips/:id/stops`, requireTransport, oid('id'), listTripStops);
router.post(`${T}/trips/:id/stops/:stopId/arrive`, requireTransport, oid('id'), oid('stopId'), arriveStop);
router.post(`${T}/trips/:id/stops/:stopId/depart`, requireTransport, oid('id'), oid('stopId'), departStop);
router.post(`${T}/trips/:id/location`, requireTransport, oid('id'), gpsRateLimiter, postLocation);
router.get(`${T}/trips/:id/location`, requireTransport, oid('id'), getLocation);
router.get(`${T}/trips/:id/location/history`, requireTransport, oid('id'), getLocationHistory);

// ============================ 04 · STUDENTS ============================
router.get(`${T}/trips/:tripId/students`, requireTransport, oid('tripId'), listTripStudents);
router.get(`${T}/trips/:tripId/students/:studentId/status`, requireTransport, oid('tripId'), oid('studentId'), getTripStudentStatus);
router.post(`${T}/trips/:tripId/students/:studentId/board`, requireTransport, oid('tripId'), oid('studentId'), withIdempotency('transport.board'), boardStudent);
router.post(`${T}/trips/:tripId/students/:studentId/drop`, requireTransport, oid('tripId'), oid('studentId'), withIdempotency('transport.drop'), dropStudent);
router.post(`${T}/trips/:tripId/students/:studentId/absent`, requireTransport, oid('tripId'), oid('studentId'), markStudentAbsent);
router.post(`${T}/trips/:tripId/students/:studentId/exception`, requireTransport, oid('tripId'), oid('studentId'), reportStudentException);
router.get(`${T}/routes/:routeId/students`, requireTransport, oid('routeId'), listRouteStudents);

// ============================ 05 · ALERTS · ISSUES · SOS ============================
router.get(`${T}/alerts`, requireTransport, listAlerts);
router.get(`${T}/alerts/:id`, requireTransport, oid('id'), getAlert);
router.patch(`${T}/alerts/:id/read`, requireTransport, oid('id'), markAlertRead);
router.patch(`${T}/alerts/:id/resolve`, requireTransport, oid('id'), resolveAlert);
router.post(`${T}/trips/:tripId/issues`, requireTransport, oid('tripId'), reportIssue);
router.get(`${T}/trips/:tripId/issues`, requireTransport, oid('tripId'), listTripIssues);
router.post(`${T}/sos`, requireTransport, sosRateLimiter, withIdempotency('transport.sos'), raiseSOS);
router.get(`${T}/sos`, requireTransport, listSOS);
router.get(`${T}/sos/:id`, requireTransport, oid('id'), getSOS);
router.patch(`${T}/sos/:id`, requireTransport, oid('id'), updateSOS);

// ============================ 06 · NOTIFICATIONS ============================
router.get(`${T}/notifications`, requireTransport, listNotifications);
router.get(`${T}/notifications/unread-count`, requireTransport, getNotificationsUnreadCount);
router.patch(`${T}/notifications/read-all`, requireTransport, markAllNotificationsRead);
router.patch(`${T}/notifications/:id/read`, requireTransport, oid('id'), markNotificationRead);
router.post(`${T}/device-tokens`, requireTransport, registerDevice);

// ============================ 07 · PROFILE · VEHICLE · ROUTE · SETTINGS ============================
router.get(`${T}/profile`, requireTransport, getTransportProfile);
router.patch(`${T}/profile`, requireTransport, uploadSchoolUserFiles, convertSchoolUserImages, updateTransportProfile);
router.get(`${T}/vehicle`, requireTransport, getTransportVehicle);
router.get(`${T}/vehicle/documents`, requireTransport, getTransportVehicleDocuments);
router.get(`${T}/vehicle/inspection-history`, requireTransport, getTransportInspectionHistory);
router.get(`${T}/route`, requireTransport, getTransportRoute);
router.get(`${T}/settings`, requireTransport, getTransportSettings);
router.patch(`${T}/settings`, requireTransport, MANAGER, updateTransportSettings);

export default router;

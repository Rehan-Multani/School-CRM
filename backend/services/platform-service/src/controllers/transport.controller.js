import { transportService } from '../services/transport.service.js';

function schoolId(req) {
  return req.user?.sub || req.schoolAdmin?.schoolId || req.user?.schoolId;
}

function userContext(req) {
  return {
    userId: req.user?.sub || req.schoolAdmin?.schoolAdminId || req.user?.id,
    role: req.user?.role || req.schoolAdmin?.role,
  };
}

// --- DASHBOARD & SEED ---
export async function getTransportDashboard(req, res, next) {
  try {
    const data = await transportService.getDashboardStats(schoolId(req));
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function seedDemoTransportData(req, res, next) {
  try {
    const result = await transportService.seedDemoData(schoolId(req), userContext(req));
    res.json({ success: true, message: result.message });
  } catch (error) { next(error); }
}

export async function getEligibleTransportEntities(req, res, next) {
  try {
    const data = await transportService.getEligibleEntities(schoolId(req));
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

// --- VEHICLES ---
export async function listVehicles(req, res, next) {
  try {
    const data = await transportService.listVehicles(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function getVehicle(req, res, next) {
  try {
    const data = await transportService.getVehicle(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function createVehicle(req, res, next) {
  try {
    const data = await transportService.createVehicle(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Vehicle registered to fleet', data });
  } catch (error) { next(error); }
}

export async function updateVehicle(req, res, next) {
  try {
    const data = await transportService.updateVehicle(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Vehicle updated', data });
  } catch (error) { next(error); }
}

export async function deleteVehicle(req, res, next) {
  try {
    const result = await transportService.deleteVehicle(schoolId(req), req.params.id);
    res.json({ success: true, message: result.message });
  } catch (error) { next(error); }
}

// --- ROUTES ---
export async function listRoutes(req, res, next) {
  try {
    const data = await transportService.listRoutes(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function getRoute(req, res, next) {
  try {
    const data = await transportService.getRoute(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function createRoute(req, res, next) {
  try {
    const data = await transportService.createRoute(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Transport route created', data });
  } catch (error) { next(error); }
}

export async function updateRoute(req, res, next) {
  try {
    const data = await transportService.updateRoute(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Route updated', data });
  } catch (error) { next(error); }
}

export async function deleteRoute(req, res, next) {
  try {
    const result = await transportService.deleteRoute(schoolId(req), req.params.id);
    res.json({ success: true, message: result.message });
  } catch (error) { next(error); }
}

// --- ROUTE STOPS ---
export async function listStops(req, res, next) {
  try {
    const data = await transportService.listStops(schoolId(req), req.params.routeId);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function createStop(req, res, next) {
  try {
    const data = await transportService.createStop(schoolId(req), { ...req.body, routeId: req.params.routeId });
    res.status(201).json({ success: true, message: 'Stop added to route', data });
  } catch (error) { next(error); }
}

export async function updateStop(req, res, next) {
  try {
    const data = await transportService.updateStop(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Stop updated', data });
  } catch (error) { next(error); }
}

export async function deleteStop(req, res, next) {
  try {
    const result = await transportService.deleteStop(schoolId(req), req.params.id);
    res.json({ success: true, message: result.message });
  } catch (error) { next(error); }
}

// --- STUDENT ASSIGNMENTS ---
export async function listTransportAssignments(req, res, next) {
  try {
    const data = await transportService.listAssignments(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function assignTransportStudent(req, res, next) {
  try {
    const data = await transportService.assignStudent(schoolId(req), req.body, userContext(req));
    res.status(201).json({ success: true, message: 'Student assigned to transport route', data });
  } catch (error) { next(error); }
}

export async function discontinueTransportAssignment(req, res, next) {
  try {
    const data = await transportService.discontinueAssignment(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Transport assignment discontinued', data });
  } catch (error) { next(error); }
}

// --- TRANSPORT ATTENDANCE ---
export async function getTransportAttendance(req, res, next) {
  try {
    const data = await transportService.getAttendance(schoolId(req), req.params.routeId, req.query.date, req.query.tripType);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function saveTransportAttendance(req, res, next) {
  try {
    const data = await transportService.saveAttendance(schoolId(req), req.params.routeId, req.body, userContext(req));
    res.json({ success: true, message: 'Trip attendance saved', data });
  } catch (error) { next(error); }
}

// --- VEHICLE MAINTENANCE ---
export async function listMaintenance(req, res, next) {
  try {
    const data = await transportService.listMaintenance(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function createMaintenance(req, res, next) {
  try {
    const data = await transportService.createMaintenance(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Service record logged', data });
  } catch (error) { next(error); }
}

// --- TRANSPORT INCIDENTS ---
export async function listTransportIncidents(req, res, next) {
  try {
    const data = await transportService.listIncidents(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

export async function createTransportIncident(req, res, next) {
  try {
    const data = await transportService.createIncident(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Incident reported', data });
  } catch (error) { next(error); }
}

export async function updateTransportIncident(req, res, next) {
  try {
    const data = await transportService.updateIncidentStatus(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Incident updated', data });
  } catch (error) { next(error); }
}

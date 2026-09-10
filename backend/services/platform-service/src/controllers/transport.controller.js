import { transportService } from '../services/transport.service.js';
import { schoolId } from '../utils/tenant.js';
import { collectDriverUploadFiles } from '../middleware/uploadDriverFiles.js';

/**
 * School-admin Transport controllers. Every handler resolves the tenant from the
 * verified JWT via `schoolId(req)` — never from the body, query or params.
 */

/* ------------------------------ STEP 1 · VEHICLES ----------------------------- */

export async function listVehicles(req, res, next) {
  try {
    const data = await transportService.listVehicles(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getVehicle(req, res, next) {
  try {
    const data = await transportService.getVehicle(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createVehicle(req, res, next) {
  try {
    const data = await transportService.createVehicle(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Vehicle added', data });
  } catch (error) {
    next(error);
  }
}

export async function updateVehicle(req, res, next) {
  try {
    const data = await transportService.updateVehicle(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Vehicle updated', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteVehicle(req, res, next) {
  try {
    const data = await transportService.deleteVehicle(schoolId(req), req.params.id);
    res.json({ success: true, message: 'Vehicle deleted', data });
  } catch (error) {
    next(error);
  }
}

/* ------------------------------ STEP 2 · DRIVERS ------------------------------ */

export async function listDrivers(req, res, next) {
  try {
    const data = await transportService.listDrivers(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getDriver(req, res, next) {
  try {
    const data = await transportService.getDriver(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createDriver(req, res, next) {
  try {
    const uploaded = collectDriverUploadFiles(req);
    const payload = {
      ...req.body,
      ...(uploaded.photo ? { photo: uploaded.photo } : {}),
      ...(uploaded.licenseImage ? { licenseImage: uploaded.licenseImage } : {}),
    };
    const data = await transportService.createDriver(schoolId(req), payload);
    res.status(201).json({ success: true, message: 'Driver added', data });
  } catch (error) {
    next(error);
  }
}

export async function updateDriver(req, res, next) {
  try {
    const uploaded = collectDriverUploadFiles(req);
    const payload = {
      ...req.body,
      ...(uploaded.photo ? { photo: uploaded.photo } : {}),
      ...(uploaded.licenseImage ? { licenseImage: uploaded.licenseImage } : {}),
    };
    const data = await transportService.updateDriver(schoolId(req), req.params.id, payload);
    res.json({ success: true, message: 'Driver updated', data });
  } catch (error) {
    next(error);
  }
}

export async function assignVehicleToDriver(req, res, next) {
  try {
    const data = await transportService.assignVehicleToDriver(
      schoolId(req),
      req.params.id,
      req.body?.vehicleId
    );
    res.json({ success: true, message: 'Vehicle assigned to driver', data });
  } catch (error) {
    next(error);
  }
}

export async function unassignVehicleFromDriver(req, res, next) {
  try {
    const data = await transportService.unassignVehicleFromDriver(schoolId(req), req.params.id);
    res.json({ success: true, message: 'Vehicle removed from driver', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteDriver(req, res, next) {
  try {
    const data = await transportService.deleteDriver(schoolId(req), req.params.id);
    res.json({ success: true, message: 'Driver deleted', data });
  } catch (error) {
    next(error);
  }
}

/* --------------------------- STEPS 3 + 4 · ROUTES ----------------------------- */

export async function listRoutes(req, res, next) {
  try {
    const data = await transportService.listRoutes(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getRoute(req, res, next) {
  try {
    const data = await transportService.getRoute(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createRoute(req, res, next) {
  try {
    const data = await transportService.createRoute(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Route created', data });
  } catch (error) {
    next(error);
  }
}

export async function updateRoute(req, res, next) {
  try {
    const data = await transportService.updateRoute(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Route updated', data });
  } catch (error) {
    next(error);
  }
}

export async function assignRouteResources(req, res, next) {
  try {
    const data = await transportService.assignRouteResources(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Vehicle and driver assigned to route', data });
  } catch (error) {
    next(error);
  }
}

export async function unassignRouteResources(req, res, next) {
  try {
    const data = await transportService.unassignRouteResources(schoolId(req), req.params.id);
    res.json({ success: true, message: 'Vehicle and driver removed from route', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteRoute(req, res, next) {
  try {
    const data = await transportService.deleteRoute(schoolId(req), req.params.id);
    res.json({ success: true, message: 'Route deleted', data });
  } catch (error) {
    next(error);
  }
}

/* --------------------------- STEP 3 · ROUTE STOPS ----------------------------- */

export async function listStops(req, res, next) {
  try {
    const data = await transportService.listStops(schoolId(req), req.params.routeId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createStop(req, res, next) {
  try {
    const data = await transportService.createStop(schoolId(req), req.params.routeId, req.body);
    res.status(201).json({ success: true, message: 'Stop added', data });
  } catch (error) {
    next(error);
  }
}

export async function updateStop(req, res, next) {
  try {
    const data = await transportService.updateStop(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Stop updated', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteStop(req, res, next) {
  try {
    const data = await transportService.deleteStop(schoolId(req), req.params.id);
    res.json({ success: true, message: 'Stop deleted', data });
  } catch (error) {
    next(error);
  }
}

export async function reorderStops(req, res, next) {
  try {
    const data = await transportService.reorderStops(schoolId(req), req.params.routeId, req.body);
    res.json({ success: true, message: 'Stop order updated', data });
  } catch (error) {
    next(error);
  }
}

/* ----------------------- STEP 5 · STUDENT ASSIGNMENTS ------------------------- */

export async function listAssignments(req, res, next) {
  try {
    const data = await transportService.listAssignments(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function assignStudent(req, res, next) {
  try {
    const data = await transportService.assignStudent(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Student assigned to transport', data });
  } catch (error) {
    next(error);
  }
}

export async function updateAssignment(req, res, next) {
  try {
    const data = await transportService.updateAssignment(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Transport assignment updated', data });
  } catch (error) {
    next(error);
  }
}

export async function removeAssignment(req, res, next) {
  try {
    const data = await transportService.removeAssignment(schoolId(req), req.params.id);
    res.json({ success: true, message: 'Transport assignment removed', data });
  } catch (error) {
    next(error);
  }
}

/* --------------------------------- LOOKUPS ------------------------------------ */

export async function getTransportLookups(req, res, next) {
  try {
    const data = await transportService.getLookups(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/* ---------------------- STEP 6 · YEARLY TRANSPORT FEE ------------------------- */

export async function listTransportFees(req, res, next) {
  try {
    const data = await transportService.listFees(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function setTransportFee(req, res, next) {
  try {
    const data = await transportService.setFee(schoolId(req), req.params.academicYearId, req.body);
    res.json({ success: true, message: 'Yearly transport fee saved', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteTransportFee(req, res, next) {
  try {
    const data = await transportService.deleteFee(schoolId(req), req.params.academicYearId);
    res.json({ success: true, message: 'Yearly transport fee cleared', data });
  } catch (error) {
    next(error);
  }
}

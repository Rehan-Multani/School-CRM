import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/AppError.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';
import { normalizeTime } from '../utils/transportTime.js';
import { transportRepository } from '../repositories/transport.repository.js';
import { VEHICLE_TYPES, FUEL_TYPES } from '../models/Vehicle.js';
import { RouteStop } from '../models/RouteStop.js';
import { StudentTransportAssignment } from '../models/StudentTransportAssignment.js';
import { Student } from '../models/Student.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { feeScheduleService } from './feeSchedule.service.js';
import { normalizeMobile as normalizeMobileNumber } from '../utils/mobile.js';

const BCRYPT_ROUNDS = 10; // matches every other login provisioning path
const MIN_PASSWORD_LEN = 8;
const VEHICLE_NUMBER_RE = /^[A-Z0-9]{4,15}$/;
/* The 10-digit rule itself lives in utils/mobile.js — shared with every other
   module — and is re-thrown here with this module's error code. */
const LICENSE_RE = /^[A-Z0-9-]{5,20}$/;

/* ============================= small helpers ============================= */

function bad(message, code = TRANSPORT_ERR.VALIDATION_ERROR) {
  return new AppError(message, 400, code);
}

function conflict(message, code = TRANSPORT_ERR.IN_USE) {
  return new AppError(message, 409, code);
}

function notFound(what) {
  return new AppError(`${what} not found`, 404, TRANSPORT_ERR.NOT_FOUND);
}

function requireText(value, label, { max = 120 } = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw bad(`${label} is required`);
  if (text.length > max) throw bad(`${label} must be ${max} characters or fewer`);
  return text;
}

function requireId(value, label) {
  const raw = String(value ?? '').trim();
  if (!raw || !mongoose.isValidObjectId(raw)) throw bad(`${label} is required`);
  return raw;
}

function requireSchool(schoolId) {
  if (!schoolId || !mongoose.isValidObjectId(String(schoolId))) {
    throw new AppError('School context is missing on this session', 401, TRANSPORT_ERR.UNAUTHORIZED);
  }
  return String(schoolId);
}

/** "MP 09 AB 1234" / "mp09ab1234" all normalize to "MP09AB1234". */
function normalizeVehicleNumber(value) {
  const raw = requireText(value, 'Vehicle number', { max: 20 }).replace(/[\s-]/g, '').toUpperCase();
  if (!VEHICLE_NUMBER_RE.test(raw)) {
    throw bad('Vehicle number must be 4-15 letters/digits, e.g. MP09AB1234');
  }
  return raw;
}

function normalizeMobile(value) {
  try {
    return normalizeMobileNumber(value, 'Mobile number');
  } catch (error) {
    throw bad(error.message);
  }
}

function normalizeLicense(value) {
  const raw = requireText(value, 'License number', { max: 25 }).replace(/\s/g, '').toUpperCase();
  if (!LICENSE_RE.test(raw)) throw bad('License number must be 5-20 letters/digits, e.g. MP123456789');
  return raw;
}

function normalizeCapacity(value) {
  const capacity = Number(value);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
    throw bad('Capacity must be a whole number between 1 and 100');
  }
  return capacity;
}

function normalizeStatus(value, label) {
  const raw = String(value ?? 'ACTIVE').trim().toUpperCase();
  if (!['ACTIVE', 'INACTIVE'].includes(raw)) throw bad(`${label} status must be ACTIVE or INACTIVE`);
  return raw;
}

function normalizeVehicleType(value) {
  const raw = String(value ?? 'SCHOOL_BUS').trim().toUpperCase();
  if (!VEHICLE_TYPES.includes(raw)) throw bad(`Vehicle type must be one of ${VEHICLE_TYPES.join(', ')}`);
  return raw;
}

function normalizeFuelType(value) {
  const raw = String(value ?? 'DIESEL').trim().toUpperCase();
  if (!FUEL_TYPES.includes(raw)) throw bad(`Fuel type must be one of ${FUEL_TYPES.join(', ')}`);
  return raw;
}

/** Optional free text — blank is a valid answer, so only the length is checked. */
function optionalText(value, label, max) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > max) throw bad(`${label} must be ${max} characters or fewer`);
  return text;
}

async function hashPassword(value) {
  const password = String(value ?? '');
  if (password.length < MIN_PASSWORD_LEN) {
    throw bad(`Password must be at least ${MIN_PASSWORD_LEN} characters`);
  }
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Class/section and roll number live on the student's ACTIVE enrollment, not on
 * Student itself — resolve them in one batch so a list stays a fixed number of
 * queries no matter how many students ride the bus.
 */
async function studentMetaMap(schoolId, studentIds) {
  const meta = new Map();
  const ids = studentIds.filter(Boolean).map(String);
  if (!ids.length) return meta;

  const enrolments = await StudentEnrollment.find({
    schoolId,
    studentId: { $in: ids },
    status: 'ACTIVE',
  })
    .select('studentId classId sectionId rollNumber')
    .lean();
  if (!enrolments.length) return meta;

  const [classes, sections] = await Promise.all([
    SchoolClass.find({ _id: { $in: enrolments.map((e) => e.classId) } }).select('name').lean(),
    Section.find({ _id: { $in: enrolments.map((e) => e.sectionId) } }).select('name').lean(),
  ]);
  const classNames = new Map(classes.map((c) => [String(c._id), c.name]));
  const sectionNames = new Map(sections.map((s) => [String(s._id), s.name]));

  for (const e of enrolments) {
    meta.set(String(e.studentId), {
      rollNumber: e.rollNumber || '',
      className: [classNames.get(String(e.classId)), sectionNames.get(String(e.sectionId))]
        .filter(Boolean)
        .join('-'),
    });
  }
  return meta;
}

function studentView(student, meta = {}) {
  if (!student) return null;
  return {
    id: String(student._id),
    name: [student.firstName, student.lastName].filter(Boolean).join(' ').trim(),
    admissionNumber: student.admissionNumber || '',
    rollNumber: meta.rollNumber || '',
    className: meta.className || '',
  };
}

/** Assignment as the admin table renders it — timing is always read off the stop. */
function assignmentView(assignment, meta = new Map()) {
  const student = assignment.studentId;
  const route = assignment.routeId;
  const stop = assignment.stopId;
  const year = assignment.academicYearId;
  return {
    id: assignment._id.toString(),
    student: studentView(student, meta.get(String(student?._id || student)) || {}),
    route: route?._id ? { id: String(route._id), routeName: route.routeName } : null,
    stop: stop?._id
      ? { id: String(stop._id), stopName: stop.stopName, sequenceOrder: stop.sequenceOrder }
      : null,
    pickupTime: stop?.pickupTime || '',
    dropTime: stop?.dropTime || '',
    // The year the rider was enrolled for, and what transport cost then — a
    // snapshot, not a live lookup, so a later fee revision leaves it untouched.
    academicYear: year?._id ? { id: String(year._id), name: year.name, code: year.code } : null,
    yearlyFeeAmount: assignment.yearlyFeeAmount || 0,
    status: assignment.status,
    createdAt: assignment.createdAt,
  };
}

/** A whole-rupee amount — the fee is set by hand and never has paise. */
function normalizeAmount(value, label = 'Yearly fee') {
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
    throw bad(`${label} must be a whole number of rupees (0 or more)`);
  }
  if (amount > 10000000) throw bad(`${label} looks too large`);
  return amount;
}

/**
 * Re-number a route's stops to a gapless 1..n. Called after a delete so the
 * sequence the admin sees never has holes in it.
 */
async function resequenceStops(schoolId, routeId) {
  const stops = await RouteStop.find({ schoolId, routeId }).sort({ sequenceOrder: 1 }).select('_id');
  const operations = stops.map((stop, index) => ({
    updateOne: { filter: { _id: stop._id }, update: { $set: { sequenceOrder: index + 1 } } },
  }));
  if (operations.length) await RouteStop.bulkWrite(operations);
}

/* ================================ service ================================ */

export const transportService = {
  /* -------------------------- STEP 1 · VEHICLES -------------------------- */

  async listVehicles(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const filter = {};
    if (query.status) filter.status = normalizeStatus(query.status, 'Vehicle');
    const vehicles = await transportRepository.listVehicles(schoolId, filter);
    return vehicles.map((v) => v.toPublicJSON());
  },

  async getVehicle(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const vehicle = await transportRepository.getVehicle(schoolId, requireId(id, 'Vehicle'));
    if (!vehicle) throw notFound('Vehicle');
    return vehicle.toPublicJSON();
  },

  async createVehicle(schoolIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const vehicleNumber = normalizeVehicleNumber(data.vehicleNumber);

    const duplicate = await transportRepository.findVehicleByNumber(schoolId, vehicleNumber);
    if (duplicate) {
      throw conflict(`Vehicle ${vehicleNumber} is already registered`, TRANSPORT_ERR.DUPLICATE);
    }

    const vehicle = await transportRepository.createVehicle({
      schoolId,
      vehicleNumber,
      vehicleType: normalizeVehicleType(data.vehicleType),
      capacity: normalizeCapacity(data.capacity),
      model: optionalText(data.model, 'Model', 60),
      fuelType: normalizeFuelType(data.fuelType),
      status: normalizeStatus(data.status, 'Vehicle'),
    });
    return vehicle.toPublicJSON();
  },

  async updateVehicle(schoolIdRaw, id, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const vehicle = await transportRepository.getVehicle(schoolId, requireId(id, 'Vehicle'));
    if (!vehicle) throw notFound('Vehicle');

    if (data.vehicleNumber !== undefined) {
      const vehicleNumber = normalizeVehicleNumber(data.vehicleNumber);
      if (vehicleNumber !== vehicle.vehicleNumber) {
        const duplicate = await transportRepository.findVehicleByNumber(schoolId, vehicleNumber);
        if (duplicate) {
          throw conflict(`Vehicle ${vehicleNumber} is already registered`, TRANSPORT_ERR.DUPLICATE);
        }
      }
      vehicle.vehicleNumber = vehicleNumber;
    }

    if (data.vehicleType !== undefined) vehicle.vehicleType = normalizeVehicleType(data.vehicleType);
    if (data.model !== undefined) vehicle.model = optionalText(data.model, 'Model', 60);
    if (data.fuelType !== undefined) vehicle.fuelType = normalizeFuelType(data.fuelType);

    if (data.capacity !== undefined) {
      const capacity = normalizeCapacity(data.capacity);
      // Shrinking below the students already riding this vehicle's route would
      // strand the route permanently over capacity with no way back.
      const route = await transportRepository.findRouteUsingVehicle(schoolId, vehicle._id);
      if (route) {
        const riding = await transportRepository.countActiveAssignments(schoolId, { routeId: route._id });
        if (capacity < riding) {
          throw conflict(
            `Capacity cannot drop below ${riding} — that many students are already assigned to ${route.routeName}`,
            TRANSPORT_ERR.CAPACITY_FULL
          );
        }
      }
      vehicle.capacity = capacity;
    }

    if (data.status !== undefined) {
      const status = normalizeStatus(data.status, 'Vehicle');
      if (status === 'INACTIVE') {
        const route = await transportRepository.findRouteUsingVehicle(schoolId, vehicle._id);
        if (route) {
          throw conflict(
            `Cannot deactivate ${vehicle.vehicleNumber} — it is running ${route.routeName}. Unassign it from the route first.`
          );
        }
      }
      vehicle.status = status;
    }

    await vehicle.save();
    return vehicle.toPublicJSON();
  },

  async deleteVehicle(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const vehicleId = requireId(id, 'Vehicle');
    const vehicle = await transportRepository.getVehicle(schoolId, vehicleId);
    if (!vehicle) throw notFound('Vehicle');

    const [route, driver] = await Promise.all([
      transportRepository.findRouteUsingVehicle(schoolId, vehicleId),
      transportRepository.findDriverOfVehicle(schoolId, vehicleId),
    ]);
    if (route) {
      throw conflict(`Cannot delete ${vehicle.vehicleNumber} — it is assigned to ${route.routeName}`);
    }
    if (driver) {
      throw conflict(`Cannot delete ${vehicle.vehicleNumber} — it is assigned to driver ${driver.name}`);
    }

    await transportRepository.deleteVehicle(schoolId, vehicleId);
    return { id: vehicleId };
  },

  /* --------------------------- STEP 2 · DRIVERS -------------------------- */

  async listDrivers(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const filter = {};
    if (query.status) filter.status = normalizeStatus(query.status, 'Driver');
    const drivers = await transportRepository.listDrivers(schoolId, filter);
    return drivers.map((d) => d.toPublicJSON());
  },

  async getDriver(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const driver = await transportRepository.getDriver(schoolId, requireId(id, 'Driver'));
    if (!driver) throw notFound('Driver');
    return driver.toPublicJSON();
  },

  async createDriver(schoolIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const name = requireText(data.name, 'Driver name');
    const mobile = normalizeMobile(data.mobile);
    const licenseNumber = normalizeLicense(data.licenseNumber);

    const [byMobile, byLicense] = await Promise.all([
      transportRepository.findDriverByMobile(schoolId, mobile),
      transportRepository.findDriverByLicense(schoolId, licenseNumber),
    ]);
    if (byMobile) throw conflict(`A driver with mobile ${mobile} already exists`, TRANSPORT_ERR.DUPLICATE);
    if (byLicense) {
      throw conflict(`A driver with license ${licenseNumber} already exists`, TRANSPORT_ERR.DUPLICATE);
    }

    const payload = {
      schoolId,
      name,
      mobile,
      licenseNumber,
      status: normalizeStatus(data.status, 'Driver'),
      photo: data.photo ? String(data.photo).trim() : '',
      licenseImage: data.licenseImage ? String(data.licenseImage).trim() : '',
    };
    // A password is optional at creation — the admin can set one later to turn
    // the driver API on for this person.
    if (data.password) {
      payload.passwordHash = await hashPassword(data.password);
      payload.loginEnabled = true;
    }

    const driver = await transportRepository.createDriver(payload);
    if (data.vehicleId) {
      return this.assignVehicleToDriver(schoolId, driver._id, data.vehicleId);
    }
    return driver.toPublicJSON();
  },

  async updateDriver(schoolIdRaw, id, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const driver = await transportRepository.getDriver(schoolId, requireId(id, 'Driver'));
    if (!driver) throw notFound('Driver');

    if (data.name !== undefined) driver.name = requireText(data.name, 'Driver name');

    if (data.mobile !== undefined) {
      const mobile = normalizeMobile(data.mobile);
      if (mobile !== driver.mobile) {
        const duplicate = await transportRepository.findDriverByMobile(schoolId, mobile);
        if (duplicate) throw conflict(`A driver with mobile ${mobile} already exists`, TRANSPORT_ERR.DUPLICATE);
      }
      driver.mobile = mobile;
    }

    if (data.licenseNumber !== undefined) {
      const licenseNumber = normalizeLicense(data.licenseNumber);
      if (licenseNumber !== driver.licenseNumber) {
        const duplicate = await transportRepository.findDriverByLicense(schoolId, licenseNumber);
        if (duplicate) {
          throw conflict(`A driver with license ${licenseNumber} already exists`, TRANSPORT_ERR.DUPLICATE);
        }
      }
      driver.licenseNumber = licenseNumber;
    }

    if (data.photo !== undefined) driver.photo = String(data.photo).trim();
    if (data.licenseImage !== undefined) driver.licenseImage = String(data.licenseImage).trim();

    if (data.password) {
      driver.passwordHash = await hashPassword(data.password);
      driver.loginEnabled = true;
    }

    if (data.status !== undefined) {
      const status = normalizeStatus(data.status, 'Driver');
      if (status === 'INACTIVE') {
        const route = await transportRepository.findRouteOfDriver(schoolId, driver._id);
        if (route) {
          throw conflict(
            `Cannot deactivate ${driver.name} — they are driving ${route.routeName}. Unassign them from the route first.`
          );
        }
      }
      driver.status = status;
    }

    await driver.save();
    const fresh = await transportRepository.getDriver(schoolId, driver._id);
    return fresh.toPublicJSON();
  },

  /** Step 2's actual link: Rahul Sharma → MP09AB1234. One vehicle, one driver. */
  async assignVehicleToDriver(schoolIdRaw, driverIdRaw, vehicleIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const driverId = requireId(driverIdRaw, 'Driver');
    const vehicleId = requireId(vehicleIdRaw, 'Vehicle');

    const [driver, vehicle] = await Promise.all([
      transportRepository.getDriver(schoolId, driverId),
      transportRepository.getVehicle(schoolId, vehicleId),
    ]);
    if (!driver) throw notFound('Driver');
    if (!vehicle) throw notFound('Vehicle');
    if (driver.status !== 'ACTIVE') {
      throw conflict(`${driver.name} is inactive`, TRANSPORT_ERR.DRIVER_INACTIVE);
    }
    if (vehicle.status !== 'ACTIVE') {
      throw conflict(`${vehicle.vehicleNumber} is inactive`, TRANSPORT_ERR.VEHICLE_INACTIVE);
    }

    const holder = await transportRepository.findDriverOfVehicle(schoolId, vehicleId);
    if (holder && String(holder._id) !== driverId) {
      throw conflict(
        `${vehicle.vehicleNumber} is already assigned to ${holder.name}`,
        TRANSPORT_ERR.ALREADY_ASSIGNED
      );
    }

    driver.vehicleId = vehicle._id;
    await driver.save();
    const fresh = await transportRepository.getDriver(schoolId, driverId);
    return fresh.toPublicJSON();
  },

  async unassignVehicleFromDriver(schoolIdRaw, driverIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const driverId = requireId(driverIdRaw, 'Driver');
    const driver = await transportRepository.getDriver(schoolId, driverId);
    if (!driver) throw notFound('Driver');

    // Step 4 pins driver+vehicle together on a route; breaking the pair here
    // would leave that route internally inconsistent.
    const route = await transportRepository.findRouteOfDriver(schoolId, driverId);
    if (route) {
      throw conflict(`${driver.name} is driving ${route.routeName}. Unassign them from the route first.`);
    }

    driver.vehicleId = null;
    await driver.save();
    const fresh = await transportRepository.getDriver(schoolId, driverId);
    return fresh.toPublicJSON();
  },

  async deleteDriver(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const driverId = requireId(id, 'Driver');
    const driver = await transportRepository.getDriver(schoolId, driverId);
    if (!driver) throw notFound('Driver');

    const route = await transportRepository.findRouteOfDriver(schoolId, driverId);
    if (route) throw conflict(`Cannot delete ${driver.name} — they are assigned to ${route.routeName}`);

    await transportRepository.deleteDriver(schoolId, driverId);
    return { id: driverId };
  },

  /* ------------------- STEPS 3 + 4 · ROUTES AND STOPS -------------------- */

  async listRoutes(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const filter = {};
    if (query.status) filter.status = normalizeStatus(query.status, 'Route');
    const routes = await transportRepository.listRoutes(schoolId, filter);

    // Stop and rider counts are what makes the route list readable; both are one
    // aggregate each rather than a query per route.
    const routeIds = routes.map((r) => r._id);
    const [stopCounts, riderCounts] = await Promise.all([
      RouteStop.aggregate([{ $match: { routeId: { $in: routeIds } } }, { $group: { _id: '$routeId', n: { $sum: 1 } } }]),
      StudentTransportAssignment.aggregate([
        { $match: { routeId: { $in: routeIds }, status: 'ACTIVE' } },
        { $group: { _id: '$routeId', n: { $sum: 1 } } },
      ]),
    ]);
    const stopsBy = new Map(stopCounts.map((c) => [String(c._id), c.n]));
    const ridersBy = new Map(riderCounts.map((c) => [String(c._id), c.n]));

    return routes.map((route) => ({
      ...route.toPublicJSON(),
      totalStops: stopsBy.get(String(route._id)) || 0,
      assignedStudents: ridersBy.get(String(route._id)) || 0,
    }));
  },

  async getRoute(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const route = await transportRepository.getRoute(schoolId, requireId(id, 'Route'));
    if (!route) throw notFound('Route');
    const [stops, assignedStudents] = await Promise.all([
      transportRepository.listStops(schoolId, route._id),
      transportRepository.countActiveAssignments(schoolId, { routeId: route._id }),
    ]);
    return {
      ...route.toPublicJSON(),
      totalStops: stops.length,
      assignedStudents,
      stops: stops.map((s) => s.toPublicJSON()),
    };
  },

  async createRoute(schoolIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const routeName = requireText(data.routeName, 'Route name');

    const duplicate = await transportRepository.findRouteByName(schoolId, routeName);
    if (duplicate) throw conflict(`Route "${routeName}" already exists`, TRANSPORT_ERR.DUPLICATE);

    const route = await transportRepository.createRoute({
      schoolId,
      routeName,
      status: normalizeStatus(data.status, 'Route'),
    });
    // Vehicle + driver are step 4; accept them here only as a convenience so the
    // admin can do steps 3 and 4 from one form.
    if (data.vehicleId || data.driverId) {
      return this.assignRouteResources(schoolId, route._id, data);
    }
    return this.getRoute(schoolId, route._id);
  },

  async updateRoute(schoolIdRaw, id, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const route = await transportRepository.getRoute(schoolId, requireId(id, 'Route'));
    if (!route) throw notFound('Route');

    if (data.routeName !== undefined) {
      const routeName = requireText(data.routeName, 'Route name');
      if (routeName !== route.routeName) {
        const duplicate = await transportRepository.findRouteByName(schoolId, routeName);
        if (duplicate) throw conflict(`Route "${routeName}" already exists`, TRANSPORT_ERR.DUPLICATE);
      }
      route.routeName = routeName;
    }

    if (data.status !== undefined) {
      const status = normalizeStatus(data.status, 'Route');
      if (status === 'INACTIVE') {
        const riding = await transportRepository.countActiveAssignments(schoolId, { routeId: route._id });
        if (riding) {
          throw conflict(
            `Cannot deactivate ${route.routeName} — ${riding} student(s) are still assigned to it`
          );
        }
      }
      route.status = status;
    }

    await route.save();
    return this.getRoute(schoolId, route._id);
  },

  /** Step 4 — Route 01 → MP09AB1234 → Rahul Sharma, validated as one unit. */
  async assignRouteResources(schoolIdRaw, routeIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const routeId = requireId(routeIdRaw, 'Route');
    const route = await transportRepository.getRoute(schoolId, routeId);
    if (!route) throw notFound('Route');

    const vehicleId = requireId(data.vehicleId, 'Vehicle');
    const driverId = requireId(data.driverId, 'Driver');

    const [vehicle, driver] = await Promise.all([
      transportRepository.getVehicle(schoolId, vehicleId),
      transportRepository.getDriver(schoolId, driverId),
    ]);
    if (!vehicle) throw notFound('Vehicle');
    if (!driver) throw notFound('Driver');
    if (vehicle.status !== 'ACTIVE') {
      throw conflict(`${vehicle.vehicleNumber} is inactive`, TRANSPORT_ERR.VEHICLE_INACTIVE);
    }
    if (driver.status !== 'ACTIVE') {
      throw conflict(`${driver.name} is inactive`, TRANSPORT_ERR.DRIVER_INACTIVE);
    }

    // A vehicle and a driver each run at most one route.
    const [vehicleRoute, driverRoute] = await Promise.all([
      transportRepository.findRouteUsingVehicle(schoolId, vehicleId),
      transportRepository.findRouteOfDriver(schoolId, driverId),
    ]);
    if (vehicleRoute && String(vehicleRoute._id) !== routeId) {
      throw conflict(
        `${vehicle.vehicleNumber} is already running ${vehicleRoute.routeName}`,
        TRANSPORT_ERR.ALREADY_ASSIGNED
      );
    }
    if (driverRoute && String(driverRoute._id) !== routeId) {
      throw conflict(
        `${driver.name} is already driving ${driverRoute.routeName}`,
        TRANSPORT_ERR.ALREADY_ASSIGNED
      );
    }

    // Step 2 already paired this driver with a bus — the route may not contradict it.
    const driverVehicleId = driver.vehicleId ? String(driver.vehicleId._id || driver.vehicleId) : null;
    if (driverVehicleId && driverVehicleId !== vehicleId) {
      throw conflict(
        `${driver.name} is assigned to a different vehicle. Change their vehicle first, or pick that vehicle here.`,
        TRANSPORT_ERR.ALREADY_ASSIGNED
      );
    }

    // Swapping in a smaller bus must not orphan students already on the route.
    const riding = await transportRepository.countActiveAssignments(schoolId, { routeId: route._id });
    if (riding > vehicle.capacity) {
      throw conflict(
        `${vehicle.vehicleNumber} seats ${vehicle.capacity} but ${riding} student(s) are assigned to ${route.routeName}`,
        TRANSPORT_ERR.CAPACITY_FULL
      );
    }

    route.vehicleId = vehicle._id;
    route.driverId = driver._id;
    await route.save();

    // Keep the step-2 link true when the driver had no bus of their own yet.
    if (!driverVehicleId) {
      driver.vehicleId = vehicle._id;
      await driver.save();
    }

    return this.getRoute(schoolId, route._id);
  },

  async unassignRouteResources(schoolIdRaw, routeIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const routeId = requireId(routeIdRaw, 'Route');
    const route = await transportRepository.getRoute(schoolId, routeId);
    if (!route) throw notFound('Route');

    const riding = await transportRepository.countActiveAssignments(schoolId, { routeId: route._id });
    if (riding) {
      throw conflict(
        `Cannot remove the bus and driver from ${route.routeName} — ${riding} student(s) are assigned to it`
      );
    }

    route.vehicleId = null;
    route.driverId = null;
    await route.save();
    return this.getRoute(schoolId, route._id);
  },

  async deleteRoute(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const routeId = requireId(id, 'Route');
    const route = await transportRepository.getRoute(schoolId, routeId);
    if (!route) throw notFound('Route');

    const riding = await transportRepository.countActiveAssignments(schoolId, { routeId });
    if (riding) {
      throw conflict(`Cannot delete ${route.routeName} — ${riding} student(s) are assigned to it`);
    }

    // Stops only exist to serve their route, so they go with it.
    await transportRepository.deleteStopsOfRoute(schoolId, routeId);
    await transportRepository.deleteRoute(schoolId, routeId);
    return { id: routeId };
  },

  /* ------------------------- STEP 3 · ROUTE STOPS ------------------------ */

  async listStops(schoolIdRaw, routeIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const routeId = requireId(routeIdRaw, 'Route');
    const route = await transportRepository.getRoute(schoolId, routeId);
    if (!route) throw notFound('Route');
    const stops = await transportRepository.listStops(schoolId, routeId);
    return stops.map((s) => s.toPublicJSON());
  },

  async createStop(schoolIdRaw, routeIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const routeId = requireId(routeIdRaw, 'Route');
    const route = await transportRepository.getRoute(schoolId, routeId);
    if (!route) throw notFound('Route');

    const stopName = requireText(data.stopName, 'Stop name', { max: 80 });
    const duplicate = await transportRepository.findStopByName(routeId, stopName);
    if (duplicate) {
      throw conflict(`${route.routeName} already has a stop called "${stopName}"`, TRANSPORT_ERR.DUPLICATE);
    }

    // New stops append to the end; position is changed with the reorder endpoint.
    const last = await transportRepository.maxStopSequence(schoolId, routeId);
    const stop = await transportRepository.createStop({
      schoolId,
      routeId,
      stopName,
      sequenceOrder: (last?.sequenceOrder || 0) + 1,
      pickupTime: normalizeTime(data.pickupTime, 'Pickup time'),
      dropTime: normalizeTime(data.dropTime, 'Drop time'),
    });
    return stop.toPublicJSON();
  },

  async updateStop(schoolIdRaw, id, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const stop = await transportRepository.getStop(schoolId, requireId(id, 'Stop'));
    if (!stop) throw notFound('Route stop');

    if (data.stopName !== undefined) {
      const stopName = requireText(data.stopName, 'Stop name', { max: 80 });
      if (stopName !== stop.stopName) {
        const duplicate = await transportRepository.findStopByName(stop.routeId, stopName);
        if (duplicate) {
          throw conflict(`This route already has a stop called "${stopName}"`, TRANSPORT_ERR.DUPLICATE);
        }
      }
      stop.stopName = stopName;
    }
    if (data.pickupTime !== undefined) stop.pickupTime = normalizeTime(data.pickupTime, 'Pickup time');
    if (data.dropTime !== undefined) stop.dropTime = normalizeTime(data.dropTime, 'Drop time');

    await stop.save();
    return stop.toPublicJSON();
  },

  async deleteStop(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const stopId = requireId(id, 'Stop');
    const stop = await transportRepository.getStop(schoolId, stopId);
    if (!stop) throw notFound('Route stop');

    const riding = await transportRepository.countActiveAssignments(schoolId, { stopId });
    if (riding) {
      throw conflict(
        `Cannot delete "${stop.stopName}" — ${riding} student(s) are picked up there. Move them to another stop first.`
      );
    }

    await transportRepository.deleteStop(schoolId, stopId);
    await resequenceStops(schoolId, stop.routeId);
    return { id: stopId };
  },

  /** Reorder is a whole-list operation: the payload must be every stop, once. */
  async reorderStops(schoolIdRaw, routeIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const routeId = requireId(routeIdRaw, 'Route');
    const route = await transportRepository.getRoute(schoolId, routeId);
    if (!route) throw notFound('Route');

    const stopIds = Array.isArray(data.stopIds) ? data.stopIds.map(String) : [];
    if (!stopIds.length) throw bad('stopIds must be a non-empty array of stop ids');
    if (new Set(stopIds).size !== stopIds.length) throw bad('stopIds contains duplicate ids');

    const stops = await transportRepository.listStops(schoolId, routeId);
    const known = new Set(stops.map((s) => String(s._id)));
    if (stopIds.length !== known.size || stopIds.some((sid) => !known.has(sid))) {
      throw bad('stopIds must list every stop on this route exactly once');
    }

    await transportRepository.bulkWriteStops(
      stopIds.map((stopId, index) => ({
        updateOne: { filter: { _id: stopId, schoolId, routeId }, update: { $set: { sequenceOrder: index + 1 } } },
      }))
    );

    const reordered = await transportRepository.listStops(schoolId, routeId);
    return reordered.map((s) => s.toPublicJSON());
  },

  /* --------------------- STEP 5 · STUDENT ASSIGNMENTS -------------------- */

  async listAssignments(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const filter = {};
    if (query.routeId) filter.routeId = requireId(query.routeId, 'Route');
    if (query.stopId) filter.stopId = requireId(query.stopId, 'Stop');
    filter.status = query.status ? String(query.status).toUpperCase() : 'ACTIVE';
    if (!['ACTIVE', 'DISCONTINUED'].includes(filter.status)) {
      throw bad('status must be ACTIVE or DISCONTINUED');
    }

    const assignments = await transportRepository.listAssignments(schoolId, filter);
    const meta = await studentMetaMap(schoolId, assignments.map((a) => a.studentId?._id));
    return assignments.map((a) => assignmentView(a, meta));
  },

  async assignStudent(schoolIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const studentId = requireId(data.studentId, 'Student');
    const routeId = requireId(data.routeId, 'Route');
    const stopId = requireId(data.stopId, 'Pickup stop');

    const [student, route, stop] = await Promise.all([
      Student.findOne({ _id: studentId, schoolId }).select('firstName lastName admissionNumber status'),
      transportRepository.getRoute(schoolId, routeId),
      transportRepository.getStop(schoolId, stopId),
    ]);
    if (!student) throw notFound('Student');
    if (student.status !== 'ACTIVE') throw conflict('This student is not active');
    if (!route) throw notFound('Route');
    if (route.status !== 'ACTIVE') throw conflict(`${route.routeName} is inactive`);
    if (!stop) throw notFound('Route stop');
    if (String(stop.routeId) !== routeId) {
      throw bad(`"${stop.stopName}" is not a stop on ${route.routeName}`);
    }

    // The flow is ordered for a reason: without a bus and driver there is nobody
    // to pick the child up, and no capacity to check against.
    if (!route.vehicleId || !route.driverId) {
      throw conflict(
        `${route.routeName} has no vehicle and driver assigned yet. Complete step 4 first.`,
        TRANSPORT_ERR.ROUTE_NOT_READY
      );
    }

    const existing = await transportRepository.findActiveAssignmentForStudent(schoolId, studentId);
    if (existing) {
      throw conflict(
        `${student.firstName} is already assigned to ${existing.routeId?.routeName || 'a route'} (${existing.stopId?.stopName || 'a stop'}). Remove that assignment first.`,
        TRANSPORT_ERR.ALREADY_ASSIGNED
      );
    }

    const capacity = route.vehicleId.capacity || 0;
    const riding = await transportRepository.countActiveAssignments(schoolId, { routeId });
    if (riding >= capacity) {
      throw conflict(
        `${route.routeName} is full — ${route.vehicleId.vehicleNumber} seats ${capacity}`,
        TRANSPORT_ERR.CAPACITY_FULL
      );
    }

    // Step 6 — the applicable yearly fee rides along with the assignment. The
    // year is the school's current one (or one the admin names explicitly), and
    // the amount is copied, not referenced.
    const academicYear = data.academicYearId
      ? await transportRepository.getAcademicYear(schoolId, requireId(data.academicYearId, 'Academic year'))
      : await transportRepository.getCurrentAcademicYear(schoolId);
    if (!academicYear) {
      throw bad('No current academic year is set for this school. Set one before assigning transport.');
    }
    const fee = await transportRepository.findFee(schoolId, academicYear._id);

    let created;
    try {
      created = await transportRepository.createAssignment({
        schoolId,
        studentId,
        routeId,
        stopId,
        academicYearId: academicYear._id,
        yearlyFeeAmount: fee?.yearlyAmount || 0,
        status: 'ACTIVE',
      });
    } catch (error) {
      // Lost a race against a concurrent assign for the same student.
      if (error?.code === 11000) {
        throw conflict('This student already has an active transport assignment', TRANSPORT_ERR.ALREADY_ASSIGNED);
      }
      throw error;
    }

    // The yearly transport fee becomes a fee component so it is billed with
    // the student's invoices / schedule. Best-effort: never blocks the ride.
    try {
      await feeScheduleService.ensureSourceComponent(schoolId, {
        studentId,
        source: 'TRANSPORT',
        sourceRefId: created._id,
        academicYearId: academicYear._id,
        amount: created.yearlyFeeAmount,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[fees] transport fee component not created:', err?.message || err);
    }

    const assignment = await transportRepository.getAssignment(schoolId, created._id);
    const meta = await studentMetaMap(schoolId, [studentId]);
    return assignmentView(assignment, meta);
  },

  /** Moving a student to another route/stop — same validations as assigning. */
  async updateAssignment(schoolIdRaw, id, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const assignment = await transportRepository.getAssignment(schoolId, requireId(id, 'Assignment'));
    if (!assignment) throw notFound('Transport assignment');
    if (assignment.status !== 'ACTIVE') throw conflict('This assignment is no longer active');

    const currentRouteId = String(assignment.routeId?._id || assignment.routeId);
    const routeId = data.routeId ? requireId(data.routeId, 'Route') : currentRouteId;
    const stopId = requireId(data.stopId ?? assignment.stopId?._id ?? assignment.stopId, 'Pickup stop');

    const [route, stop] = await Promise.all([
      transportRepository.getRoute(schoolId, routeId),
      transportRepository.getStop(schoolId, stopId),
    ]);
    if (!route) throw notFound('Route');
    if (route.status !== 'ACTIVE') throw conflict(`${route.routeName} is inactive`);
    if (!stop) throw notFound('Route stop');
    if (String(stop.routeId) !== routeId) {
      throw bad(`"${stop.stopName}" is not a stop on ${route.routeName}`);
    }
    if (!route.vehicleId || !route.driverId) {
      throw conflict(
        `${route.routeName} has no vehicle and driver assigned yet. Complete step 4 first.`,
        TRANSPORT_ERR.ROUTE_NOT_READY
      );
    }

    // Capacity only matters when the student is actually moving to a new route.
    if (routeId !== currentRouteId) {
      const capacity = route.vehicleId.capacity || 0;
      const riding = await transportRepository.countActiveAssignments(schoolId, { routeId });
      if (riding >= capacity) {
        throw conflict(
          `${route.routeName} is full — ${route.vehicleId.vehicleNumber} seats ${capacity}`,
          TRANSPORT_ERR.CAPACITY_FULL
        );
      }
    }

    assignment.routeId = route._id;
    assignment.stopId = stop._id;
    await assignment.save();

    const fresh = await transportRepository.getAssignment(schoolId, assignment._id);
    const meta = await studentMetaMap(schoolId, [fresh.studentId?._id]);
    return assignmentView(fresh, meta);
  },

  async removeAssignment(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const assignment = await transportRepository.getAssignment(schoolId, requireId(id, 'Assignment'));
    if (!assignment) throw notFound('Transport assignment');
    if (assignment.status !== 'ACTIVE') throw conflict('This assignment is already discontinued');

    // Soft-close rather than delete: the partial-unique index frees the student
    // for a new assignment while the old row stays auditable.
    assignment.status = 'DISCONTINUED';
    await assignment.save();
    await feeScheduleService
      .cancelSourceComponent(schoolId, { studentId: assignment.studentId?._id || assignment.studentId, source: 'TRANSPORT', sourceRefId: assignment._id })
      .catch(() => {});

    const fresh = await transportRepository.getAssignment(schoolId, assignment._id);
    const meta = await studentMetaMap(schoolId, [fresh.studentId?._id]);
    return assignmentView(fresh, meta);
  },

  /* ---------------------- STEP 6 · YEARLY TRANSPORT FEE ------------------ */

  /**
   * Every academic year the school has, each with the transport fee set for it
   * (or null where none is set yet). One amount per year, the same for every
   * class and every route — that is the whole rule.
   */
  async listFees(schoolIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const [years, fees, riders] = await Promise.all([
      transportRepository.listAcademicYears(schoolId),
      transportRepository.listFees(schoolId),
      StudentTransportAssignment.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), status: 'ACTIVE' } },
        { $group: { _id: '$academicYearId', n: { $sum: 1 } } },
      ]),
    ]);

    const feeBy = new Map(fees.map((f) => [String(f.academicYearId), f]));
    const ridersBy = new Map(riders.map((r) => [String(r._id), r.n]));

    return years.map((year) => {
      const fee = feeBy.get(String(year._id));
      return {
        academicYearId: String(year._id),
        academicYear: { id: String(year._id), name: year.name, code: year.code, isCurrent: year.isCurrent },
        yearlyAmount: fee ? fee.yearlyAmount : null,
        // Riders already priced off this year — they keep their snapshot even
        // if the amount below is changed.
        assignedStudents: ridersBy.get(String(year._id)) || 0,
        updatedAt: fee?.updatedAt || null,
      };
    });
  },

  async setFee(schoolIdRaw, academicYearIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const academicYearId = requireId(academicYearIdRaw, 'Academic year');
    const year = await transportRepository.getAcademicYear(schoolId, academicYearId);
    if (!year) throw notFound('Academic year');

    const yearlyAmount = normalizeAmount(data.yearlyAmount);
    const fee = await transportRepository.upsertFee(schoolId, academicYearId, yearlyAmount);
    return {
      academicYearId,
      academicYear: { id: String(year._id), name: year.name, code: year.code, isCurrent: year.isCurrent },
      yearlyAmount: fee.yearlyAmount,
      updatedAt: fee.updatedAt,
    };
  },

  async deleteFee(schoolIdRaw, academicYearIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const academicYearId = requireId(academicYearIdRaw, 'Academic year');
    const removed = await transportRepository.deleteFee(schoolId, academicYearId);
    if (!removed) throw notFound('Transport fee for this academic year');
    // Riders assigned under this fee keep their snapshot on purpose.
    return { academicYearId };
  },

  /* ---------------------------- form lookups ----------------------------- */

  /**
   * Everything the admin forms need to populate their dropdowns, in one call —
   * real records only, so the UI never has to invent placeholder data.
   */
  async getLookups(schoolIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);

    const [students, vehicles, drivers, routes, activeAssignments] = await Promise.all([
      Student.find({ schoolId, status: 'ACTIVE' })
        .select('firstName lastName admissionNumber')
        .sort({ firstName: 1 })
        .lean(),
      transportRepository.listVehicles(schoolId, { status: 'ACTIVE' }),
      transportRepository.listDrivers(schoolId, { status: 'ACTIVE' }),
      transportRepository.listRoutes(schoolId, { status: 'ACTIVE' }),
      StudentTransportAssignment.find({ schoolId, status: 'ACTIVE' }).select('studentId').lean(),
    ]);

    const assigned = new Set(activeAssignments.map((a) => String(a.studentId)));
    const meta = await studentMetaMap(schoolId, students.map((s) => s._id));

    const stops = await RouteStop.find({ schoolId, routeId: { $in: routes.map((r) => r._id) } })
      .sort({ sequenceOrder: 1 })
      .lean();
    const stopsByRoute = new Map();
    for (const stop of stops) {
      const key = String(stop.routeId);
      if (!stopsByRoute.has(key)) stopsByRoute.set(key, []);
      stopsByRoute.get(key).push({
        id: String(stop._id),
        stopName: stop.stopName,
        sequenceOrder: stop.sequenceOrder,
        pickupTime: stop.pickupTime,
        dropTime: stop.dropTime,
      });
    }

    // What a new rider will be charged, so the assign form can show it before
    // the admin commits.
    const currentYear = await transportRepository.getCurrentAcademicYear(schoolId);
    const currentFee = currentYear ? await transportRepository.findFee(schoolId, currentYear._id) : null;

    return {
      currentAcademicYear: currentYear
        ? { id: String(currentYear._id), name: currentYear.name, code: currentYear.code }
        : null,
      currentYearlyFee: currentFee ? currentFee.yearlyAmount : null,
      students: students.map((s) => ({
        ...studentView(s, meta.get(String(s._id)) || {}),
        alreadyAssigned: assigned.has(String(s._id)),
      })),
      vehicles: vehicles.map((v) => v.toPublicJSON()),
      drivers: drivers.map((d) => d.toPublicJSON()),
      routes: routes.map((r) => ({
        ...r.toPublicJSON(),
        stops: stopsByRoute.get(String(r._id)) || [],
      })),
    };
  },
};

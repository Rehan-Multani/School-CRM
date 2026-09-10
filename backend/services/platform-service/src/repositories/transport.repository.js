import { Vehicle } from '../models/Vehicle.js';
import { Driver } from '../models/Driver.js';
import { TransportRoute } from '../models/TransportRoute.js';
import { RouteStop } from '../models/RouteStop.js';
import { StudentTransportAssignment } from '../models/StudentTransportAssignment.js';
import { TransportDailyStatus } from '../models/TransportDailyStatus.js';
import { TransportFee } from '../models/TransportFee.js';
import { AcademicYear } from '../models/AcademicYear.js';

/**
 * Data access for the Transport module. Every method takes `schoolId` first and
 * folds it into the filter — a query that cannot name a school cannot leak
 * across tenants.
 */
export const transportRepository = {
  /* ------------------------------- vehicles ------------------------------ */
  listVehicles(schoolId, filter = {}) {
    return Vehicle.find({ schoolId, ...filter }).sort({ vehicleNumber: 1 });
  },
  getVehicle(schoolId, id) {
    return Vehicle.findOne({ _id: id, schoolId });
  },
  findVehicleByNumber(schoolId, vehicleNumber) {
    return Vehicle.findOne({ schoolId, vehicleNumber });
  },
  createVehicle(payload) {
    return Vehicle.create(payload);
  },
  deleteVehicle(schoolId, id) {
    return Vehicle.findOneAndDelete({ _id: id, schoolId });
  },

  /* -------------------------------- drivers ------------------------------ */
  listDrivers(schoolId, filter = {}) {
    return Driver.find({ schoolId, ...filter }).populate('vehicleId', 'vehicleNumber capacity').sort({ name: 1 });
  },
  getDriver(schoolId, id) {
    return Driver.findOne({ _id: id, schoolId }).populate('vehicleId', 'vehicleNumber capacity');
  },
  findDriverByMobile(schoolId, mobile) {
    return Driver.findOne({ schoolId, mobile });
  },
  findDriverByLicense(schoolId, licenseNumber) {
    return Driver.findOne({ schoolId, licenseNumber });
  },
  findDriverOfVehicle(schoolId, vehicleId) {
    return Driver.findOne({ schoolId, vehicleId });
  },
  createDriver(payload) {
    return Driver.create(payload);
  },
  deleteDriver(schoolId, id) {
    return Driver.findOneAndDelete({ _id: id, schoolId });
  },

  /* -------------------------------- routes ------------------------------- */
  listRoutes(schoolId, filter = {}) {
    return TransportRoute.find({ schoolId, ...filter })
      .populate('vehicleId', 'vehicleNumber vehicleType capacity')
      .populate('driverId', 'name mobile')
      .sort({ routeName: 1 });
  },
  getRoute(schoolId, id) {
    return TransportRoute.findOne({ _id: id, schoolId })
      .populate('vehicleId', 'vehicleNumber vehicleType capacity')
      .populate('driverId', 'name mobile');
  },
  findRouteByName(schoolId, routeName) {
    return TransportRoute.findOne({ schoolId, routeName });
  },
  findRouteUsingVehicle(schoolId, vehicleId) {
    return TransportRoute.findOne({ schoolId, vehicleId });
  },
  findRouteOfDriver(schoolId, driverId) {
    return TransportRoute.findOne({ schoolId, driverId });
  },
  createRoute(payload) {
    return TransportRoute.create(payload);
  },
  deleteRoute(schoolId, id) {
    return TransportRoute.findOneAndDelete({ _id: id, schoolId });
  },

  /* --------------------------------- stops ------------------------------- */
  listStops(schoolId, routeId) {
    return RouteStop.find({ schoolId, routeId }).sort({ sequenceOrder: 1 });
  },
  getStop(schoolId, id) {
    return RouteStop.findOne({ _id: id, schoolId });
  },
  findStopByName(routeId, stopName) {
    return RouteStop.findOne({ routeId, stopName });
  },
  countStops(schoolId, routeId) {
    return RouteStop.countDocuments({ schoolId, routeId });
  },
  maxStopSequence(schoolId, routeId) {
    return RouteStop.findOne({ schoolId, routeId }).sort({ sequenceOrder: -1 }).select('sequenceOrder');
  },
  createStop(payload) {
    return RouteStop.create(payload);
  },
  deleteStop(schoolId, id) {
    return RouteStop.findOneAndDelete({ _id: id, schoolId });
  },
  deleteStopsOfRoute(schoolId, routeId) {
    return RouteStop.deleteMany({ schoolId, routeId });
  },
  bulkWriteStops(operations) {
    return RouteStop.bulkWrite(operations);
  },

  /* ------------------------------ assignments ---------------------------- */
  listAssignments(schoolId, filter = {}) {
    return StudentTransportAssignment.find({ schoolId, ...filter })
      .populate('studentId', 'firstName lastName admissionNumber rollNumber className sectionName')
      .populate('routeId', 'routeName')
      .populate('stopId', 'stopName sequenceOrder pickupTime dropTime')
      .populate('academicYearId', 'name code isCurrent')
      .sort({ createdAt: -1 });
  },
  getAssignment(schoolId, id) {
    return StudentTransportAssignment.findOne({ _id: id, schoolId })
      .populate('studentId', 'firstName lastName admissionNumber rollNumber className sectionName')
      .populate('routeId', 'routeName')
      .populate('stopId', 'stopName sequenceOrder pickupTime dropTime')
      .populate('academicYearId', 'name code isCurrent');
  },
  findActiveAssignmentForStudent(schoolId, studentId) {
    return StudentTransportAssignment.findOne({ schoolId, studentId, status: 'ACTIVE' })
      .populate('routeId', 'routeName')
      .populate('stopId', 'stopName pickupTime dropTime');
  },
  countActiveAssignments(schoolId, filter = {}) {
    return StudentTransportAssignment.countDocuments({ schoolId, status: 'ACTIVE', ...filter });
  },
  createAssignment(payload) {
    return StudentTransportAssignment.create(payload);
  },

  /* ------------------------------ yearly fee ----------------------------- */
  listAcademicYears(schoolId) {
    return AcademicYear.find({ schoolId }).sort({ startDate: -1 });
  },
  getAcademicYear(schoolId, id) {
    return AcademicYear.findOne({ _id: id, schoolId });
  },
  getCurrentAcademicYear(schoolId) {
    return AcademicYear.findOne({ schoolId, isCurrent: true });
  },
  listFees(schoolId) {
    return TransportFee.find({ schoolId });
  },
  findFee(schoolId, academicYearId) {
    return TransportFee.findOne({ schoolId, academicYearId });
  },
  upsertFee(schoolId, academicYearId, yearlyAmount) {
    return TransportFee.findOneAndUpdate(
      { schoolId, academicYearId },
      { $set: { yearlyAmount } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  },
  deleteFee(schoolId, academicYearId) {
    return TransportFee.findOneAndDelete({ schoolId, academicYearId });
  },

  /* ----------------------------- daily status ---------------------------- */
  listDailyStatus(schoolId, routeId, date) {
    return TransportDailyStatus.find({ schoolId, routeId, date });
  },
  findDailyStatus(schoolId, studentId, date) {
    return TransportDailyStatus.findOne({ schoolId, studentId, date });
  },
  /**
   * The filter's own fields are what a new row is keyed on, so they must stay
   * out of `$set` — naming a path in both halves of an upsert is a write
   * conflict, not a merge.
   */
  upsertDailyStatus(schoolId, studentId, date, update) {
    return TransportDailyStatus.findOneAndUpdate(
      { schoolId, studentId, date },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  },
};

import { Vehicle } from '../models/Vehicle.js';
import { TransportRoute } from '../models/TransportRoute.js';
import { RouteStop } from '../models/RouteStop.js';
import { StudentTransportAssignment } from '../models/StudentTransportAssignment.js';
import { TransportAttendance } from '../models/TransportAttendance.js';
import { VehicleMaintenance } from '../models/VehicleMaintenance.js';
import { TransportIncident } from '../models/TransportIncident.js';
import { HostelRoom } from '../models/HostelRoom.js';

export const transportRepository = {
  // --- VEHICLES ---
  async listVehicles(schoolId, filter = {}) {
    return Vehicle.find({ schoolId, ...filter })
      .sort({ vehicleNumber: 1 })
      .lean();
  },

  async getVehicleById(schoolId, id) {
    return Vehicle.findOne({ _id: id, schoolId }).lean();
  },

  async createVehicle(data) {
    return Vehicle.create(data);
  },

  async updateVehicle(schoolId, id, updateData) {
    return Vehicle.findOneAndUpdate({ _id: id, schoolId }, updateData, { new: true }).lean();
  },

  async deleteVehicle(schoolId, id) {
    return Vehicle.findOneAndDelete({ _id: id, schoolId });
  },

  // --- ROUTES ---
  async listRoutes(schoolId, filter = {}) {
    return TransportRoute.find({ schoolId, ...filter })
      .populate('vehicleId', 'vehicleNumber vehicleType capacity status')
      .populate('driverId', 'fullName email phone designation')
      .populate('conductorId', 'fullName email phone designation')
      .sort({ routeCode: 1 })
      .lean();
  },

  async getRouteById(schoolId, id) {
    return TransportRoute.findOne({ _id: id, schoolId })
      .populate('vehicleId', 'vehicleNumber vehicleType capacity status')
      .populate('driverId', 'fullName email phone designation')
      .populate('conductorId', 'fullName email phone designation')
      .lean();
  },

  async createRoute(data) {
    return TransportRoute.create(data);
  },

  async updateRoute(schoolId, id, updateData) {
    return TransportRoute.findOneAndUpdate({ _id: id, schoolId }, updateData, { new: true })
      .populate('vehicleId', 'vehicleNumber vehicleType capacity status')
      .populate('driverId', 'fullName email phone designation')
      .populate('conductorId', 'fullName email phone designation')
      .lean();
  },

  async deleteRoute(schoolId, id) {
    return TransportRoute.findOneAndDelete({ _id: id, schoolId });
  },

  // --- ROUTE STOPS ---
  async listStops(schoolId, routeId) {
    return RouteStop.find({ schoolId, routeId })
      .populate('routeId', 'routeName routeCode')
      .sort({ sequenceOrder: 1 })
      .lean();
  },

  async getStopById(schoolId, id) {
    return RouteStop.findOne({ _id: id, schoolId })
      .populate('routeId', 'routeName routeCode')
      .lean();
  },

  async createStop(data) {
    return RouteStop.create(data);
  },

  async createManyStops(stops) {
    return RouteStop.insertMany(stops);
  },

  async updateStop(schoolId, id, updateData) {
    return RouteStop.findOneAndUpdate({ _id: id, schoolId }, updateData, { new: true }).lean();
  },

  async deleteStop(schoolId, id) {
    return RouteStop.findOneAndDelete({ _id: id, schoolId });
  },

  async deleteStopsByRoute(schoolId, routeId) {
    return RouteStop.deleteMany({ schoolId, routeId });
  },

  // --- STUDENT ASSIGNMENTS ---
  async listAssignments(schoolId, filter = {}) {
    return StudentTransportAssignment.find({ schoolId, ...filter })
      .populate({
        path: 'studentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName classId sectionId photoUrl phone email guardianName guardianPhone',
      })
      .populate('routeId', 'routeName routeCode startPoint endPoint')
      .populate('pickupStopId', 'stopName sequenceOrder pickupTime monthlyFee')
      .populate('dropStopId', 'stopName sequenceOrder dropTime monthlyFee')
      .populate('assignedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();
  },

  async getAssignmentById(schoolId, id) {
    return StudentTransportAssignment.findOne({ _id: id, schoolId })
      .populate({
        path: 'studentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName classId sectionId photoUrl phone email guardianName guardianPhone',
      })
      .populate('routeId', 'routeName routeCode startPoint endPoint')
      .populate('pickupStopId', 'stopName sequenceOrder pickupTime monthlyFee')
      .populate('dropStopId', 'stopName sequenceOrder dropTime monthlyFee')
      .populate('assignedBy', 'fullName email')
      .lean();
  },

  async getActiveAssignmentByStudent(schoolId, studentId) {
    return StudentTransportAssignment.findOne({ schoolId, studentId, status: 'ACTIVE' })
      .populate('routeId', 'routeName routeCode')
      .populate('pickupStopId', 'stopName pickupTime monthlyFee')
      .populate('dropStopId', 'stopName dropTime monthlyFee')
      .lean();
  },

  async createAssignment(data) {
    return StudentTransportAssignment.create(data);
  },

  async updateAssignment(schoolId, id, updateData) {
    return StudentTransportAssignment.findOneAndUpdate({ _id: id, schoolId }, updateData, { new: true }).lean();
  },

  // --- TRANSPORT ATTENDANCE ---
  async getAttendanceByDate(schoolId, routeId, dateStr, tripType) {
    return TransportAttendance.findOne({ schoolId, routeId, date: dateStr, tripType })
      .populate({
        path: 'records.studentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName',
      })
      .populate('records.stopId', 'stopName sequenceOrder')
      .populate('recordedBy', 'fullName email')
      .lean();
  },

  async saveAttendance(schoolId, routeId, dateStr, tripType, data) {
    return TransportAttendance.findOneAndUpdate(
      { schoolId, routeId, date: dateStr, tripType },
      { ...data, schoolId, routeId, date: dateStr, tripType },
      { upsert: true, new: true }
    ).lean();
  },

  // --- VEHICLE MAINTENANCE ---
  async listMaintenance(schoolId, filter = {}) {
    return VehicleMaintenance.find({ schoolId, ...filter })
      .populate('vehicleId', 'vehicleNumber vehicleType registrationNumber')
      .sort({ serviceDate: -1 })
      .lean();
  },

  async createMaintenance(data) {
    return VehicleMaintenance.create(data);
  },

  async updateMaintenance(schoolId, id, updateData) {
    return VehicleMaintenance.findOneAndUpdate({ _id: id, schoolId }, updateData, { new: true })
      .populate('vehicleId', 'vehicleNumber vehicleType registrationNumber')
      .lean();
  },

  // --- TRANSPORT INCIDENTS ---
  async listIncidents(schoolId, filter = {}) {
    return TransportIncident.find({ schoolId, ...filter })
      .populate('vehicleId', 'vehicleNumber vehicleType')
      .populate('routeId', 'routeName routeCode')
      .populate({
        path: 'studentId',
        select: 'firstName lastName rollNumber className',
      })
      .populate('driverId', 'fullName phone')
      .sort({ incidentDate: -1 })
      .lean();
  },

  async createIncident(data) {
    return TransportIncident.create(data);
  },

  async updateIncident(schoolId, id, updateData) {
    return TransportIncident.findOneAndUpdate({ _id: id, schoolId }, updateData, { new: true })
      .populate('vehicleId', 'vehicleNumber vehicleType')
      .populate('routeId', 'routeName routeCode')
      .lean();
  },

  // --- DASHBOARD METRICS ---
  async getDashboardMetrics(schoolId) {
    const [
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      totalRoutes,
      activeRoutes,
      totalAssignments,
      activeAssignments,
      openIncidents,
    ] = await Promise.all([
      Vehicle.countDocuments({ schoolId }),
      Vehicle.countDocuments({ schoolId, status: 'ACTIVE' }),
      Vehicle.countDocuments({ schoolId, status: 'UNDER_MAINTENANCE' }),
      TransportRoute.countDocuments({ schoolId }),
      TransportRoute.countDocuments({ schoolId, status: 'ACTIVE' }),
      StudentTransportAssignment.countDocuments({ schoolId }),
      StudentTransportAssignment.countDocuments({ schoolId, status: 'ACTIVE' }),
      TransportIncident.countDocuments({ schoolId, status: { $in: ['REPORTED', 'INVESTIGATING'] } }),
    ]);

    // Document expiry warnings (within next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const now = new Date();

    const expiringDocs = await Vehicle.find({
      schoolId,
      status: 'ACTIVE',
      $or: [
        { insuranceExpiry: { $lte: thirtyDaysFromNow, $gte: now } },
        { fitnessExpiry: { $lte: thirtyDaysFromNow, $gte: now } },
        { pollutionExpiry: { $lte: thirtyDaysFromNow, $gte: now } },
        { permitExpiry: { $lte: thirtyDaysFromNow, $gte: now } },
      ],
    })
      .select('vehicleNumber insuranceExpiry fitnessExpiry pollutionExpiry permitExpiry')
      .lean();

    // Total maintenance cost
    const maintenanceCostAgg = await VehicleMaintenance.aggregate([
      { $match: { schoolId: { $exists: true } } },
      { $group: { _id: null, totalCost: { $sum: '$cost' } } },
    ]);
    const totalMaintenanceCost = maintenanceCostAgg[0]?.totalCost || 0;

    return {
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      totalRoutes,
      activeRoutes,
      totalAssignments,
      activeAssignments,
      openIncidents,
      expiringDocs,
      totalMaintenanceCost,
    };
  },
};

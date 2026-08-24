import { AppError } from '../../../shared/AppError.js';
import { transportRepository } from '../repositories/transport.repository.js';
import { Student } from '../models/Student.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { Vehicle } from '../models/Vehicle.js';
import { TransportRoute } from '../models/TransportRoute.js';
import { RouteStop } from '../models/RouteStop.js';
import { StudentTransportAssignment } from '../models/StudentTransportAssignment.js';

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(`${label} is required`, 400);
  return text;
}

export const transportService = {
  // --- DASHBOARD ---
  async getDashboardStats(schoolId) {
    if (!schoolId) throw new AppError('School ID is required', 400);

    const metrics = await transportRepository.getDashboardMetrics(schoolId);
    const vehicles = await transportRepository.listVehicles(schoolId);
    const routes = await transportRepository.listRoutes(schoolId);

    // Per-route student counts
    const routeSummaries = await Promise.all(
      routes.map(async (route) => {
        const assignmentCount = await StudentTransportAssignment.countDocuments({
          schoolId,
          routeId: route._id,
          status: 'ACTIVE',
        });
        const stops = await transportRepository.listStops(schoolId, route._id);
        return {
          id: route._id.toString(),
          routeName: route.routeName,
          routeCode: route.routeCode,
          vehicle: route.vehicleId?.vehicleNumber || 'Unassigned',
          vehicleType: route.vehicleId?.vehicleType || 'N/A',
          vehicleCapacity: route.vehicleId?.capacity || 0,
          driver: route.driverId?.fullName || 'Not Assigned',
          conductor: route.conductorId?.fullName || 'Not Assigned',
          startPoint: route.startPoint,
          endPoint: route.endPoint,
          totalStops: stops.length,
          assignedStudents: assignmentCount,
          distanceKm: route.estimatedDistanceKm,
          durationMin: route.estimatedDurationMin,
        };
      })
    );

    return {
      metrics,
      vehicles,
      routeSummaries,
    };
  },

  // --- SEED DEMO DATA ---
  async seedDemoData(schoolId, user) {
    if (!schoolId) throw new AppError('School ID is required', 400);

    const existing = await transportRepository.listVehicles(schoolId);
    if (existing && existing.length > 0) {
      return { message: 'Transport data already exists for this school' };
    }

    const staff = await SchoolUser.findOne({ schoolId, status: 'ACTIVE' }).lean();
    const driverId = staff?._id || null;

    // 1. Create Vehicles
    const bus1 = await transportRepository.createVehicle({
      schoolId,
      vehicleNumber: 'BUS-01',
      registrationNumber: 'MP09AB1234',
      vehicleType: 'BUS',
      model: 'Tata Starbus LP 910/52',
      capacity: 52,
      fuelType: 'DIESEL',
      insuranceExpiry: new Date(Date.now() + 180 * 86400000),
      fitnessExpiry: new Date(Date.now() + 200 * 86400000),
      pollutionExpiry: new Date(Date.now() + 120 * 86400000),
      permitExpiry: new Date(Date.now() + 365 * 86400000),
      description: 'Main school bus for Route 01 (East Zone)',
      status: 'ACTIVE',
    });

    const bus2 = await transportRepository.createVehicle({
      schoolId,
      vehicleNumber: 'BUS-02',
      registrationNumber: 'MP09CD5678',
      vehicleType: 'MINIBUS',
      model: 'Force Traveller 3350 (32 Seater)',
      capacity: 32,
      fuelType: 'DIESEL',
      insuranceExpiry: new Date(Date.now() + 25 * 86400000), // Expiring soon!
      fitnessExpiry: new Date(Date.now() + 90 * 86400000),
      pollutionExpiry: new Date(Date.now() + 60 * 86400000),
      permitExpiry: new Date(Date.now() + 200 * 86400000),
      description: 'Mini bus for Route 02 (West Zone)',
      status: 'ACTIVE',
    });

    const van = await transportRepository.createVehicle({
      schoolId,
      vehicleNumber: 'VAN-01',
      registrationNumber: 'MP09EF9012',
      vehicleType: 'VAN',
      model: 'Maruti Eeco 7-Seater',
      capacity: 7,
      fuelType: 'CNG',
      insuranceExpiry: new Date(Date.now() + 300 * 86400000),
      fitnessExpiry: new Date(Date.now() + 350 * 86400000),
      pollutionExpiry: new Date(Date.now() + 150 * 86400000),
      permitExpiry: new Date(Date.now() + 365 * 86400000),
      description: 'Staff & special transport van',
      status: 'ACTIVE',
    });

    // 2. Create Routes
    const route1 = await transportRepository.createRoute({
      schoolId,
      routeName: 'Route 01 — Azad Nagar to School (East Zone)',
      routeCode: 'RT-01',
      vehicleId: bus1._id,
      driverId,
      startPoint: 'Azad Nagar Colony',
      endPoint: 'ABC Public School',
      estimatedDistanceKm: 12,
      estimatedDurationMin: 45,
      description: 'Covers major east zone residential areas via Bengali Square & Palasia.',
      status: 'ACTIVE',
    });

    const route2 = await transportRepository.createRoute({
      schoolId,
      routeName: 'Route 02 — Vijay Nagar to School (West Zone)',
      routeCode: 'RT-02',
      vehicleId: bus2._id,
      driverId,
      startPoint: 'Vijay Nagar Square',
      endPoint: 'ABC Public School',
      estimatedDistanceKm: 8,
      estimatedDurationMin: 30,
      description: 'West zone feeder through Scheme 54 & MR-10.',
      status: 'ACTIVE',
    });

    // 3. Create Stops for Route 1
    await transportRepository.createManyStops([
      { schoolId, routeId: route1._id, stopName: 'Azad Nagar Colony', sequenceOrder: 1, pickupTime: '07:15 AM', dropTime: '04:00 PM', monthlyFee: 1500, landmark: 'Near Post Office' },
      { schoolId, routeId: route1._id, stopName: 'Teen Imli Square', sequenceOrder: 2, pickupTime: '07:25 AM', dropTime: '03:50 PM', monthlyFee: 1400, landmark: 'Opposite SBI Branch' },
      { schoolId, routeId: route1._id, stopName: 'Bengali Square', sequenceOrder: 3, pickupTime: '07:35 AM', dropTime: '03:40 PM', monthlyFee: 1300, landmark: 'Near Petrol Pump' },
      { schoolId, routeId: route1._id, stopName: 'Palasia Chowk', sequenceOrder: 4, pickupTime: '07:45 AM', dropTime: '03:30 PM', monthlyFee: 1200, landmark: 'C21 Mall Side' },
      { schoolId, routeId: route1._id, stopName: 'ABC Public School', sequenceOrder: 5, pickupTime: '08:00 AM', dropTime: '03:15 PM', monthlyFee: 0, landmark: 'Main Gate' },
    ]);

    // 4. Create Stops for Route 2
    await transportRepository.createManyStops([
      { schoolId, routeId: route2._id, stopName: 'Vijay Nagar Square', sequenceOrder: 1, pickupTime: '07:20 AM', dropTime: '03:50 PM', monthlyFee: 1300, landmark: 'Main Road' },
      { schoolId, routeId: route2._id, stopName: 'Scheme 54 Gate', sequenceOrder: 2, pickupTime: '07:30 AM', dropTime: '03:40 PM', monthlyFee: 1200, landmark: 'Near D-Mart' },
      { schoolId, routeId: route2._id, stopName: 'MR-10 Flyover', sequenceOrder: 3, pickupTime: '07:40 AM', dropTime: '03:30 PM', monthlyFee: 1100, landmark: 'Ring Road Junction' },
      { schoolId, routeId: route2._id, stopName: 'ABC Public School', sequenceOrder: 4, pickupTime: '07:55 AM', dropTime: '03:15 PM', monthlyFee: 0, landmark: 'Main Gate' },
    ]);

    // 5. Auto-assign first few students if available
    const students = await Student.find({ schoolId, status: 'ACTIVE' }).limit(3).lean();
    const route1Stops = await transportRepository.listStops(schoolId, route1._id);
    if (students.length > 0 && route1Stops.length > 1) {
      for (let i = 0; i < Math.min(students.length, 2); i++) {
        const stop = route1Stops[i]; // Assign to sequential stops
        await this.assignStudent(
          schoolId,
          {
            studentId: students[i]._id.toString(),
            routeId: route1._id.toString(),
            pickupStopId: stop._id.toString(),
            dropStopId: stop._id.toString(),
            monthlyFee: stop.monthlyFee,
            remarks: 'Demo assignment',
          },
          user
        );
      }
    }

    return { message: 'Demo transport infrastructure created successfully' };
  },

  // --- VEHICLES CRUD ---
  async listVehicles(schoolId, query = {}) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.vehicleType) filter.vehicleType = query.vehicleType;
    return transportRepository.listVehicles(schoolId, filter);
  },

  async getVehicle(schoolId, id) {
    const vehicle = await transportRepository.getVehicleById(schoolId, id);
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    return vehicle;
  },

  async createVehicle(schoolId, data) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const vehicleNumber = requireText(data.vehicleNumber, 'Vehicle Number');
    const registrationNumber = requireText(data.registrationNumber, 'Registration Number');

    const existing = await Vehicle.findOne({ schoolId, vehicleNumber });
    if (existing) throw new AppError(`Vehicle ${vehicleNumber} already registered`, 400);

    const vehicle = await transportRepository.createVehicle({
      schoolId,
      vehicleNumber,
      registrationNumber,
      vehicleType: data.vehicleType || 'BUS',
      model: data.model || '',
      capacity: Number(data.capacity) || 40,
      fuelType: data.fuelType || 'DIESEL',
      insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
      fitnessExpiry: data.fitnessExpiry ? new Date(data.fitnessExpiry) : null,
      pollutionExpiry: data.pollutionExpiry ? new Date(data.pollutionExpiry) : null,
      permitExpiry: data.permitExpiry ? new Date(data.permitExpiry) : null,
      gpsDeviceImei: data.gpsDeviceImei || '',
      description: data.description || '',
      status: data.status || 'ACTIVE',
    });
    return vehicle;
  },

  async updateVehicle(schoolId, id, data) {
    const vehicle = await transportRepository.updateVehicle(schoolId, id, data);
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    return vehicle;
  },

  async deleteVehicle(schoolId, id) {
    const routeCount = await TransportRoute.countDocuments({ schoolId, vehicleId: id });
    if (routeCount > 0) {
      throw new AppError(`Cannot delete vehicle. It is assigned to ${routeCount} active route(s). Remove route assignments first.`, 400);
    }
    const result = await transportRepository.deleteVehicle(schoolId, id);
    if (!result) throw new AppError('Vehicle not found', 404);
    return { message: 'Vehicle removed from fleet' };
  },

  // --- ROUTES CRUD ---
  async listRoutes(schoolId, query = {}) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const filter = {};
    if (query.status) filter.status = query.status;
    return transportRepository.listRoutes(schoolId, filter);
  },

  async getRoute(schoolId, id) {
    const route = await transportRepository.getRouteById(schoolId, id);
    if (!route) throw new AppError('Route not found', 404);
    const stops = await transportRepository.listStops(schoolId, id);
    return { ...route, stops };
  },

  async createRoute(schoolId, data) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const routeName = requireText(data.routeName, 'Route Name');
    const routeCode = requireText(data.routeCode, 'Route Code');
    const startPoint = requireText(data.startPoint, 'Start Point');
    const endPoint = requireText(data.endPoint, 'End Point');

    const existing = await TransportRoute.findOne({ schoolId, routeCode });
    if (existing) throw new AppError(`Route code ${routeCode} already exists`, 400);

    const route = await transportRepository.createRoute({
      schoolId,
      routeName,
      routeCode,
      vehicleId: data.vehicleId || null,
      driverId: data.driverId || null,
      conductorId: data.conductorId || null,
      startPoint,
      endPoint,
      estimatedDistanceKm: Number(data.estimatedDistanceKm) || 0,
      estimatedDurationMin: Number(data.estimatedDurationMin) || 0,
      description: data.description || '',
      status: data.status || 'ACTIVE',
    });

    return transportRepository.getRouteById(schoolId, route._id);
  },

  async updateRoute(schoolId, id, data) {
    const route = await transportRepository.updateRoute(schoolId, id, data);
    if (!route) throw new AppError('Route not found', 404);
    return route;
  },

  async deleteRoute(schoolId, id) {
    const assignmentCount = await StudentTransportAssignment.countDocuments({ schoolId, routeId: id, status: 'ACTIVE' });
    if (assignmentCount > 0) {
      throw new AppError(`Cannot delete route. ${assignmentCount} students are actively assigned to this route.`, 400);
    }
    await transportRepository.deleteStopsByRoute(schoolId, id);
    const result = await transportRepository.deleteRoute(schoolId, id);
    if (!result) throw new AppError('Route not found', 404);
    return { message: 'Route and its stops deleted successfully' };
  },

  // --- ROUTE STOPS ---
  async listStops(schoolId, routeId) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    return transportRepository.listStops(schoolId, routeId);
  },

  async createStop(schoolId, data) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const routeId = requireText(data.routeId, 'Route');
    const stopName = requireText(data.stopName, 'Stop Name');

    const stop = await transportRepository.createStop({
      schoolId,
      routeId,
      stopName,
      sequenceOrder: Number(data.sequenceOrder) || 1,
      pickupTime: data.pickupTime || '07:30 AM',
      dropTime: data.dropTime || '03:30 PM',
      monthlyFee: Number(data.monthlyFee) || 1500,
      landmark: data.landmark || '',
      latitude: data.latitude || null,
      longitude: data.longitude || null,
    });

    return transportRepository.getStopById(schoolId, stop._id);
  },

  async updateStop(schoolId, id, data) {
    const stop = await transportRepository.updateStop(schoolId, id, data);
    if (!stop) throw new AppError('Route stop not found', 404);
    return stop;
  },

  async deleteStop(schoolId, id) {
    const result = await transportRepository.deleteStop(schoolId, id);
    if (!result) throw new AppError('Route stop not found', 404);
    return { message: 'Stop removed from route' };
  },

  // --- STUDENT ASSIGNMENT ---
  async listAssignments(schoolId, query = {}) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const filter = {};
    if (query.routeId) filter.routeId = query.routeId;
    if (query.status) filter.status = query.status;
    if (query.studentId) filter.studentId = query.studentId;
    return transportRepository.listAssignments(schoolId, filter);
  },

  async assignStudent(schoolId, data, user) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const studentId = requireText(data.studentId, 'Student');
    const routeId = requireText(data.routeId, 'Route');
    const pickupStopId = requireText(data.pickupStopId, 'Pickup Stop');
    const dropStopId = requireText(data.dropStopId, 'Drop Stop');

    // Check duplicate active assignment
    const existingAssignment = await transportRepository.getActiveAssignmentByStudent(schoolId, studentId);
    if (existingAssignment) {
      throw new AppError(
        `Student already has an active transport assignment on ${existingAssignment.routeId?.routeName || 'a route'} (Pickup: ${existingAssignment.pickupStopId?.stopName || 'N/A'}). Discontinue it first.`,
        400
      );
    }

    // Check vehicle capacity
    const route = await transportRepository.getRouteById(schoolId, routeId);
    if (route?.vehicleId) {
      const currentCount = await StudentTransportAssignment.countDocuments({ schoolId, routeId, status: 'ACTIVE' });
      if (currentCount >= route.vehicleId.capacity) {
        // Warn but don't block
      }
    }

    const assignment = await transportRepository.createAssignment({
      schoolId,
      studentId,
      academicYearId: data.academicYearId || null,
      routeId,
      pickupStopId,
      dropStopId,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      monthlyFee: Number(data.monthlyFee) || 0,
      status: 'ACTIVE',
      remarks: data.remarks || '',
      assignedBy: user?.userId || null,
    });

    return transportRepository.getAssignmentById(schoolId, assignment._id);
  },

  async discontinueAssignment(schoolId, id, data) {
    if (!schoolId) throw new AppError('School ID is required', 400);

    const assignment = await transportRepository.getAssignmentById(schoolId, id);
    if (!assignment || assignment.status !== 'ACTIVE') {
      throw new AppError('Active transport assignment not found', 404);
    }

    const updated = await transportRepository.updateAssignment(schoolId, id, {
      status: 'DISCONTINUED',
      endDate: data.endDate ? new Date(data.endDate) : new Date(),
      discontinueReason: data.discontinueReason || 'Student opted out of transport',
    });

    return transportRepository.getAssignmentById(schoolId, updated._id);
  },

  // --- TRANSPORT ATTENDANCE ---
  async getAttendance(schoolId, routeId, dateStr, tripType) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const trip = tripType || 'MORNING_PICKUP';

    let attendance = await transportRepository.getAttendanceByDate(schoolId, routeId, targetDate, trip);

    if (!attendance) {
      // Build a fresh sheet from active assignments on this route
      const assignments = await transportRepository.listAssignments(schoolId, { routeId, status: 'ACTIVE' });
      const records = assignments.map((a) => ({
        studentId: a.studentId,
        stopId: trip === 'MORNING_PICKUP' ? a.pickupStopId : a.dropStopId,
        status: 'PRESENT',
        boardedTime: '',
        remarks: '',
      }));

      return {
        routeId,
        date: targetDate,
        tripType: trip,
        isRecorded: false,
        totalStudents: records.length,
        presentCount: records.length,
        absentCount: 0,
        records,
      };
    }

    return { ...attendance, isRecorded: true };
  },

  async saveAttendance(schoolId, routeId, data, user) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const dateStr = data.date || new Date().toISOString().split('T')[0];
    const tripType = data.tripType || 'MORNING_PICKUP';
    const records = Array.isArray(data.records) ? data.records : [];

    const presentCount = records.filter((r) => r.status === 'PRESENT').length;
    const absentCount = records.filter((r) => r.status !== 'PRESENT').length;

    return transportRepository.saveAttendance(schoolId, routeId, dateStr, tripType, {
      totalStudents: records.length,
      presentCount,
      absentCount,
      recordedBy: user?.userId || null,
      records,
    });
  },

  // --- VEHICLE MAINTENANCE ---
  async listMaintenance(schoolId, query = {}) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const filter = {};
    if (query.vehicleId) filter.vehicleId = query.vehicleId;
    return transportRepository.listMaintenance(schoolId, filter);
  },

  async createMaintenance(schoolId, data) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const vehicleId = requireText(data.vehicleId, 'Vehicle');

    const record = await transportRepository.createMaintenance({
      schoolId,
      vehicleId,
      serviceDate: data.serviceDate ? new Date(data.serviceDate) : new Date(),
      serviceType: data.serviceType || 'GENERAL_SERVICE',
      cost: Number(data.cost) || 0,
      odometerReadingKm: Number(data.odometerReadingKm) || 0,
      nextServiceDueKm: data.nextServiceDueKm ? Number(data.nextServiceDueKm) : null,
      nextServiceDueDate: data.nextServiceDueDate ? new Date(data.nextServiceDueDate) : null,
      vendorWorkshop: data.vendorWorkshop || '',
      description: data.description || '',
      remarks: data.remarks || '',
    });

    return record;
  },

  // --- TRANSPORT INCIDENTS ---
  async listIncidents(schoolId, query = {}) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.vehicleId) filter.vehicleId = query.vehicleId;
    return transportRepository.listIncidents(schoolId, filter);
  },

  async createIncident(schoolId, data) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const title = requireText(data.title, 'Incident Title');
    const description = requireText(data.description, 'Description');

    const incident = await transportRepository.createIncident({
      schoolId,
      routeId: data.routeId || null,
      vehicleId: data.vehicleId || null,
      studentId: data.studentId || null,
      driverId: data.driverId || null,
      incidentType: data.incidentType || 'OTHER',
      incidentDate: data.incidentDate ? new Date(data.incidentDate) : new Date(),
      title,
      description,
      actionTaken: data.actionTaken || '',
      priority: data.priority || 'MEDIUM',
      status: 'REPORTED',
    });

    return incident;
  },

  async updateIncidentStatus(schoolId, id, data) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const updateData = {};
    if (data.status) updateData.status = data.status;
    if (data.actionTaken) updateData.actionTaken = data.actionTaken;

    const updated = await transportRepository.updateIncident(schoolId, id, updateData);
    if (!updated) throw new AppError('Incident not found', 404);
    return updated;
  },

  // --- ELIGIBLE ENTITIES ---
  async getEligibleEntities(schoolId) {
    if (!schoolId) throw new AppError('School ID is required', 400);

    const [students, staff, vehicles, routes] = await Promise.all([
      Student.find({ schoolId, status: 'ACTIVE' })
        .select('firstName lastName rollNumber admissionNumber className sectionName phone email')
        .sort({ firstName: 1 })
        .lean(),
      SchoolUser.find({ schoolId, status: 'ACTIVE' })
        .select('fullName email phone designation role')
        .sort({ fullName: 1 })
        .lean(),
      Vehicle.find({ schoolId, status: 'ACTIVE' })
        .select('vehicleNumber vehicleType capacity registrationNumber')
        .sort({ vehicleNumber: 1 })
        .lean(),
      TransportRoute.find({ schoolId, status: 'ACTIVE' })
        .select('routeName routeCode startPoint endPoint')
        .sort({ routeCode: 1 })
        .lean(),
    ]);

    // Grab stops grouped by route
    const routesWithStops = await Promise.all(
      routes.map(async (r) => {
        const stops = await RouteStop.find({ schoolId, routeId: r._id })
          .select('stopName sequenceOrder pickupTime dropTime monthlyFee')
          .sort({ sequenceOrder: 1 })
          .lean();
        return { ...r, stops };
      })
    );

    return { students, staff, vehicles, routes: routesWithStops };
  },
};

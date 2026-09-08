import mongoose from 'mongoose';
import { Trip } from '../models/Trip.js';
import { TransportRoute } from '../models/TransportRoute.js';
import { Vehicle } from '../models/Vehicle.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { TransportAlert } from '../models/TransportAlert.js';
import { TransportSOS, ACTIVE_SOS_STATUSES } from '../models/TransportSOS.js';
import { TERMINAL_TRIP_STATUSES } from '../models/Trip.js';
import { tripLite, vehicleLite } from '../serializers/transport.serializers.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const todayStr = () => new Date().toISOString().slice(0, 10);

class TransportDashboardService {
  async #todayTrip(ctx) {
    const base = { schoolId: oid(ctx.schoolId), date: todayStr() };
    if (!ctx.isManager) base.$or = [{ driverId: oid(ctx.staffId) }, { conductorId: oid(ctx.staffId) }];
    // prefer an in-flight trip, else the next scheduled, else the latest
    return (
      (await Trip.findOne({ ...base, status: { $in: ['STARTED', 'IN_PROGRESS', 'READY', 'INSPECTION_PENDING', 'SCHEDULED'] } })
        .sort({ status: 1, scheduledStart: 1, createdAt: 1 })) ||
      (await Trip.findOne(base).sort({ createdAt: -1 }))
    );
  }

  async dashboard(ctx) {
    const trip = await this.#todayTrip(ctx);
    const [openAlerts, activeSos] = await Promise.all([
      TransportAlert.countDocuments({ schoolId: oid(ctx.schoolId), status: { $ne: 'RESOLVED' } }),
      TransportSOS.findOne({ schoolId: oid(ctx.schoolId), status: { $in: ACTIVE_SOS_STATUSES } }).sort({ createdAt: -1 }),
    ]);

    let tripBlock = null;
    if (trip) {
      const [route, vehicle, driver, conductor] = await Promise.all([
        TransportRoute.findById(trip.routeId).select('routeName routeCode startPoint endPoint').lean(),
        Vehicle.findById(trip.vehicleId).lean(),
        trip.driverId ? SchoolUser.findById(trip.driverId).select('name phone').lean() : null,
        trip.conductorId ? SchoolUser.findById(trip.conductorId).select('name phone').lean() : null,
      ]);
      const nextStop = (trip.stops || []).find((s) => !s.arrivedAt) || null;
      tripBlock = {
        ...tripLite(trip),
        route: route ? { id: String(route._id), name: route.routeName, code: route.routeCode, startPoint: route.startPoint, endPoint: route.endPoint } : null,
        vehicle: vehicle ? { ...vehicleLite(vehicle), status: vehicle.status } : null,
        driver: driver ? { name: driver.name, phone: driver.phone || '' } : null,
        conductor: conductor ? { name: conductor.name, phone: conductor.phone || '' } : null,
        nextStop: nextStop
          ? { stopId: String(nextStop.stopId), stopName: nextStop.stopName, sequenceOrder: nextStop.sequenceOrder, expectedAt: nextStop.expectedAt }
          : null,
        inspectionStatus: trip.inspectionPassed ? 'PASSED' : trip.inspectionId ? 'FAILED' : 'PENDING',
        isTerminal: TERMINAL_TRIP_STATUSES.includes(trip.status),
      };
    }

    return {
      todaysTrip: tripBlock,
      counts: tripBlock?.counts || { studentsExpected: 0, boarded: 0, dropped: 0, absent: 0 },
      alertsOpen: openAlerts,
      activeSOS: activeSos ? { id: String(activeSos._id), status: activeSos.status, raisedAt: activeSos.raisedAt } : null,
      gpsEnabled: ctx.settings.gpsEnabled,
    };
  }

  async summary(ctx) {
    const trip = await this.#todayTrip(ctx);
    return {
      hasTripToday: Boolean(trip),
      tripStatus: trip?.status || null,
      tripId: trip ? String(trip._id) : null,
      counts: trip?.counts || { studentsExpected: 0, boarded: 0, dropped: 0, absent: 0 },
    };
  }
}

export const transportDashboardService = new TransportDashboardService();

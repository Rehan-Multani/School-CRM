import os from 'os';
import cron from 'node-cron';
import { acquireCronLock, releaseCronLock } from '../models/CronLock.js';
import { VehicleDocument } from '../models/VehicleDocument.js';
import { Vehicle } from '../models/Vehicle.js';
import { Trip } from '../models/Trip.js';
import { TransportSettings } from '../models/TransportSettings.js';
import { transportAlertService } from '../services/transportAlert.service.js';

const HOLDER = `${os.hostname()}:${process.pid}`;

async function withLock(jobName, ttlMs, fn) {
  const acquired = await acquireCronLock(jobName, ttlMs, HOLDER).catch(() => false);
  if (!acquired) return;
  try {
    await fn();
  } catch (err) {
    console.error(`[transport-cron] ${jobName} failed: ${err?.message}`);
  } finally {
    await releaseCronLock(jobName).catch(() => {});
  }
}

/** Vehicle documents expiring within the school's reminder window → DOCUMENT_EXPIRY alert (deduped). */
export async function runDocumentExpiryJob() {
  await withLock('transport-document-expiry', 55 * 60 * 1000, async () => {
    const settingsBySchool = new Map();
    const now = new Date();
    // widest lookahead any school could use — 90d — then filter per school
    const horizon = new Date(now.getTime() + 90 * 86400000);
    const docs = await VehicleDocument.find({ expiryDate: { $ne: null, $lte: horizon } }).lean();
    for (const doc of docs) {
      let settings = settingsBySchool.get(String(doc.schoolId));
      if (!settings) {
        settings = await TransportSettings.getOrDefault(doc.schoolId);
        settingsBySchool.set(String(doc.schoolId), settings);
      }
      const days = Math.ceil((new Date(doc.expiryDate).getTime() - now.getTime()) / 86400000);
      if (days > (settings.documentExpiryReminderDays || 30)) continue;
      const vehicle = await Vehicle.findById(doc.vehicleId).select('vehicleNumber').lean();
      await transportAlertService.raise({
        schoolId: doc.schoolId,
        type: 'DOCUMENT_EXPIRY',
        severity: days <= 0 ? 'HIGH' : 'MEDIUM',
        title: `${doc.docType} ${days <= 0 ? 'expired' : `expires in ${days}d`}`,
        body: `${vehicle?.vehicleNumber || 'A vehicle'} — ${doc.docType} (${doc.documentNumber || 'no number'}) ${days <= 0 ? 'has expired' : `expires on ${new Date(doc.expiryDate).toISOString().slice(0, 10)}`}.`,
        vehicleId: doc.vehicleId,
        refType: 'VehicleDocument',
        refId: String(doc._id),
        dedupeKey: `doc:${doc._id}`,
        cooldownMin: 24 * 60,
      });
    }
  });
}

/** Active trip whose last GPS ping is older than the school threshold → STALE_GPS alert (deduped). */
export async function runStaleGpsJob() {
  await withLock('transport-stale-gps', 4 * 60 * 1000, async () => {
    const trips = await Trip.find({ status: { $in: ['STARTED', 'IN_PROGRESS'] } })
      .select('schoolId routeId vehicleId lastLocation')
      .lean();
    for (const trip of trips) {
      const settings = await TransportSettings.getOrDefault(trip.schoolId);
      if (!settings.gpsEnabled) continue;
      const at = trip.lastLocation?.at ? new Date(trip.lastLocation.at).getTime() : 0;
      const staleMs = (settings.staleGpsMinutes || 5) * 60000;
      if (at && Date.now() - at > staleMs) {
        await transportAlertService.raise({
          schoolId: trip.schoolId,
          type: 'STALE_GPS',
          severity: 'MEDIUM',
          title: 'Bus location is stale',
          body: `No GPS update for over ${settings.staleGpsMinutes} minutes on an active trip.`,
          tripId: trip._id,
          routeId: trip.routeId,
          vehicleId: trip.vehicleId,
          dedupeKey: `stale:${trip._id}`,
          cooldownMin: 15,
        });
      }
    }
  });
}

/** IN_PROGRESS trip past a stop's expected time by more than the threshold → ROUTE_DELAY alert (deduped). */
export async function runTripDelayJob() {
  await withLock('transport-trip-delay', 4 * 60 * 1000, async () => {
    const trips = await Trip.find({ status: 'IN_PROGRESS' }).select('schoolId routeId stops tripType').lean();
    const now = Date.now();
    for (const trip of trips) {
      const settings = await TransportSettings.getOrDefault(trip.schoolId);
      const overdue = (trip.stops || []).filter(
        (s) => !s.arrivedAt && s.expectedAt && now - new Date(s.expectedAt).getTime() > (settings.delayThresholdMin || 10) * 60000
      );
      if (!overdue.length) continue;
      const worst = Math.max(...overdue.map((s) => Math.round((now - new Date(s.expectedAt).getTime()) / 60000)));
      const significant = worst >= (settings.significantDelayThresholdMin || 25);
      await transportAlertService.raise({
        schoolId: trip.schoolId,
        type: 'ROUTE_DELAY',
        severity: significant ? 'HIGH' : 'MEDIUM',
        title: `Trip running ${worst} min late`,
        body: `${overdue.length} stop(s) on the ${trip.tripType.toLowerCase().replace('_', ' ')} are behind schedule.`,
        tripId: trip._id,
        routeId: trip.routeId,
        dedupeKey: `delay:${trip._id}`,
        cooldownMin: 20,
      });
    }
  });
}

// Route-deviation detection is deferred (see docs/transport-apk-api.md). The
// seam: compare TripLocationPing to RouteStop lat/lng with
// settings.routeDeviationToleranceM + routeDeviationConsecutive, then raise a
// ROUTE_DEVIATION alert with a dedupeKey + cooldown.

export function startTransportCronJobs() {
  cron.schedule('0 4 * * *', () => runDocumentExpiryJob());
  cron.schedule('*/5 * * * *', () => runStaleGpsJob());
  cron.schedule('*/5 * * * *', () => runTripDelayJob());
  // eslint-disable-next-line no-console
  console.log('[cron] transport background jobs scheduled');
}

import { Vehicle } from '../models/Vehicle.js';
import { Driver } from '../models/Driver.js';
import { TransportRoute } from '../models/TransportRoute.js';
import { RouteStop } from '../models/RouteStop.js';
import { StudentTransportAssignment } from '../models/StudentTransportAssignment.js';
import { TransportDailyStatus } from '../models/TransportDailyStatus.js';

const MODELS = [Vehicle, Driver, TransportRoute, RouteStop, StudentTransportAssignment, TransportDailyStatus];

/**
 * The transport module was rebuilt with new schemas, but Mongoose never drops
 * an index, so a database that ran the old module still carries its unique
 * indexes — e.g. `{ schoolId, routeCode }` on routes. Today's documents have no
 * `routeCode`, so every route indexes as null and a school's SECOND route fails
 * with E11000.
 *
 * Drops any unique index keyed on a field the current schema no longer has.
 * Non-unique leftovers are harmless and left alone. Idempotent; safe on every boot.
 */
export async function dropLegacyTransportIndexes() {
  const dropped = [];
  for (const Model of MODELS) {
    // listIndexes throws on a collection that does not exist yet (fresh database).
    const indexes = await Model.collection.indexes().catch(() => []);
    for (const index of indexes) {
      const orphaned = Object.keys(index.key).some((field) => !Model.schema.path(field));
      if (!index.unique || !orphaned) continue;
      await Model.collection.dropIndex(index.name);
      dropped.push(`${Model.collection.collectionName}.${index.name}`);
    }
  }
  if (dropped.length) console.log(`[platform-service] Dropped legacy transport indexes: ${dropped.join(', ')}`);
  return dropped;
}

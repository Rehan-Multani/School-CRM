/**
 * A database that ran the old transport module keeps its unique indexes (Mongoose
 * never drops one), and `{ schoolId, routeCode }` then refuses every school's
 * second route. The boot-time cleanup has to remove exactly those.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connect, disconnect } from './helpers/setup.js';
import { TransportRoute } from '../src/models/TransportRoute.js';
import { Vehicle } from '../src/models/Vehicle.js';
import { dropLegacyTransportIndexes } from '../src/utils/legacyTransportIndexes.js';

const names = async (Model) => (await Model.collection.indexes()).map((i) => i.name);

beforeAll(async () => {
  await connect();
  await Promise.all([TransportRoute.init(), Vehicle.init()]);
}, 60000);
afterAll(disconnect);

describe('Legacy transport indexes', () => {
  it('a leftover unique index blocks a second route until it is dropped', async () => {
    await TransportRoute.collection.createIndex({ schoolId: 1, routeCode: 1 }, { unique: true });
    await Vehicle.collection.createIndex({ schoolId: 1, registrationNumber: 1 }); // old, but not unique

    const schoolId = new mongoose.Types.ObjectId();
    await TransportRoute.create({ schoolId, routeName: 'Route 1' });
    await expect(TransportRoute.create({ schoolId, routeName: 'Route 2' })).rejects.toMatchObject({ code: 11000 });

    expect(await dropLegacyTransportIndexes()).toEqual(['transportroutes.schoolId_1_routeCode_1']);
    await expect(TransportRoute.create({ schoolId, routeName: 'Route 2' })).resolves.toBeTruthy();

    // Today's own unique index is untouched and still does its job.
    expect(await names(TransportRoute)).toContain('schoolId_1_routeName_1');
    await expect(TransportRoute.create({ schoolId, routeName: 'Route 2' })).rejects.toMatchObject({ code: 11000 });
    // Harmless non-unique leftovers are left alone.
    expect(await names(Vehicle)).toContain('schoolId_1_registrationNumber_1');
  });

  it('is a no-op the second time', async () => {
    expect(await dropLegacyTransportIndexes()).toEqual([]);
  });
});

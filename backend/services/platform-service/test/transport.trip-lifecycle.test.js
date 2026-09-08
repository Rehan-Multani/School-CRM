import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const T = '/school-portal/transport-app';
const passAll = { items: [] }; // service defaults every checklist item to PASS

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Transport APK — trip lifecycle & state machine', () => {
  it('list/detail are scoped to the driver', async () => {
    const list = await request(app).get(`${T}/trips`).set(auth(ctx.a.transportToken));
    expect(list.status).toBe(200);
    expect(list.body.data.some((t) => t.id === ctx.a.tripId)).toBe(true);
    const detail = await request(app).get(`${T}/trips/${ctx.a.tripId}`).set(auth(ctx.a.transportToken));
    expect(detail.status).toBe(200);
    expect(detail.body.data.students.length).toBe(1);
  });

  it('POST /trips requires a manager (driver → 403)', async () => {
    const res = await request(app)
      .post(`${T}/trips`)
      .set(auth(ctx.a.transportToken))
      .send({ routeId: ctx.a.routeId, tripType: 'AFTERNOON_DROPOFF' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TRANSPORT_ROLE_REQUIRED');
  });

  it('cannot start before a passed inspection', async () => {
    const res = await request(app).post(`${T}/trips/${ctx.a.tripId}/start`).set(auth(ctx.a.transportToken));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INSPECTION_REQUIRED');
  });

  it('full happy path: inspection → start (idempotent) → arrive → depart → complete', async () => {
    const insp = await request(app).post(`${T}/trips/${ctx.a.tripId}/inspection`).set(auth(ctx.a.transportToken)).send(passAll);
    expect(insp.status).toBe(200);
    expect(insp.body.data.passed).toBe(true);
    expect(insp.body.data.trip.status).toBe('READY');

    const start1 = await request(app).post(`${T}/trips/${ctx.a.tripId}/start`).set(auth(ctx.a.transportToken));
    expect(start1.status).toBe(200);
    expect(start1.body.data.status).toBe('STARTED');
    const start2 = await request(app).post(`${T}/trips/${ctx.a.tripId}/start`).set(auth(ctx.a.transportToken));
    expect(start2.status).toBe(200); // idempotent
    expect(start2.body.data.status).toBe('STARTED');

    const arrive = await request(app).post(`${T}/trips/${ctx.a.tripId}/stops/${ctx.a.stopId}/arrive`).set(auth(ctx.a.transportToken)).send({ lat: 22.7196, lng: 75.8577 });
    expect(arrive.status).toBe(200);
    expect(arrive.body.data.status).toBe('IN_PROGRESS');
    expect(arrive.body.data.currentStopId).toBe(ctx.a.stopId);

    const depart = await request(app).post(`${T}/trips/${ctx.a.tripId}/stops/${ctx.a.stopId}/depart`).set(auth(ctx.a.transportToken));
    expect(depart.status).toBe(200);

    const complete = await request(app).post(`${T}/trips/${ctx.a.tripId}/complete`).set(auth(ctx.a.transportToken));
    expect(complete.status).toBe(200);
    expect(complete.body.data.status).toBe('COMPLETED');
  });

  it('an invalid transition (COMPLETED → start) is 409 INVALID_TRIP_TRANSITION', async () => {
    const res = await request(app).post(`${T}/trips/${ctx.a.tripId}/start`).set(auth(ctx.a.transportToken));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_TRIP_TRANSITION');
  });

  it('manager can create a fresh trip for another slot', async () => {
    const res = await request(app)
      .post(`${T}/trips`)
      .set(auth(ctx.a.transportManagerToken))
      .set('Idempotency-Key', 'trip-create-1')
      .send({ routeId: ctx.a.routeId, tripType: 'AFTERNOON_DROPOFF' });
    expect(res.status).toBe(201);
    expect(res.body.data.tripType).toBe('AFTERNOON_DROPOFF');
    expect(res.body.data.status).toBe('SCHEDULED');
  });
});

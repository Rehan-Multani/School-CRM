import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const T = '/school-portal/transport-app';

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  await request(app).post(`${T}/trips/${ctx.a.tripId}/inspection`).set(auth(ctx.a.transportToken)).send({ items: [] });
  await request(app).post(`${T}/trips/${ctx.a.tripId}/start`).set(auth(ctx.a.transportToken));
}, 60000);
afterAll(disconnect);

describe('Transport APK — GPS ingest & read', () => {
  it('accepts a valid ping from the assigned driver on an active trip', async () => {
    const res = await request(app)
      .post(`${T}/trips/${ctx.a.tripId}/location`)
      .set(auth(ctx.a.transportToken))
      .send({ latitude: 22.7196, longitude: 75.8577, accuracy: 8, speed: 30, heading: 90 });
    expect(res.status).toBe(200);
    expect(res.body.data.recorded).toBe(true);
  });

  it('GET /location returns the last point + staleSeconds', async () => {
    const res = await request(app).get(`${T}/trips/${ctx.a.tripId}/location`).set(auth(ctx.a.transportToken));
    expect(res.status).toBe(200);
    expect(res.body.data.location.lat).toBeCloseTo(22.7196, 3);
    expect(typeof res.body.data.staleSeconds).toBe('number');
  });

  it('rejects out-of-range coordinates (400 GPS_INVALID_COORDS)', async () => {
    const res = await request(app)
      .post(`${T}/trips/${ctx.a.tripId}/location`)
      .set(auth(ctx.a.transportToken))
      .send({ latitude: 999, longitude: 75 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('GPS_INVALID_COORDS');
  });

  it('rejects a stale timestamp (400 GPS_STALE_TIMESTAMP)', async () => {
    const res = await request(app)
      .post(`${T}/trips/${ctx.a.tripId}/location`)
      .set(auth(ctx.a.transportToken))
      .send({ latitude: 22.72, longitude: 75.86, timestamp: new Date(Date.now() - 3600_000).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('GPS_STALE_TIMESTAMP');
  });

  it('a non-assigned staff (School B driver) cannot ping School A trip', async () => {
    const res = await request(app)
      .post(`${T}/trips/${ctx.a.tripId}/location`)
      .set(auth(ctx.b.transportToken))
      .send({ latitude: 22.72, longitude: 75.86 });
    expect([403, 404]).toContain(res.status);
  });

  it('location history is bounded and returns pings', async () => {
    const res = await request(app).get(`${T}/trips/${ctx.a.tripId}/location/history`).set(auth(ctx.a.transportToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
  });
});

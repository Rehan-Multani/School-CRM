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
}, 60000);
afterAll(disconnect);

describe('Transport APK — SOS & alerts', () => {
  let sosId;

  it('a driver raises an SOS → ACTIVE + a CRITICAL EMERGENCY alert appears', async () => {
    const res = await request(app)
      .post(`${T}/sos`)
      .set(auth(ctx.a.transportToken))
      .set('Idempotency-Key', 'sos-1')
      .send({ tripId: ctx.a.tripId, description: 'Brake failure near main road', location: { lat: 22.72, lng: 75.86 } });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');
    sosId = res.body.data.id;

    const alerts = await request(app).get(`${T}/alerts?type=EMERGENCY`).set(auth(ctx.a.transportManagerToken));
    expect(alerts.body.data.some((a) => a.severity === 'CRITICAL' && a.type === 'EMERGENCY')).toBe(true);
  });

  it('a second SOS while one is ACTIVE for the trip → 409 SOS_ALREADY_ACTIVE', async () => {
    const res = await request(app)
      .post(`${T}/sos`)
      .set(auth(ctx.a.transportToken))
      .set('Idempotency-Key', 'sos-2')
      .send({ tripId: ctx.a.tripId, description: 'again' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SOS_ALREADY_ACTIVE');
  });

  it('a driver cannot acknowledge — only a manager', async () => {
    const drv = await request(app).patch(`${T}/sos/${sosId}`).set(auth(ctx.a.transportToken)).send({ action: 'acknowledge' });
    expect(drv.status).toBe(403);
    const mgr = await request(app).patch(`${T}/sos/${sosId}`).set(auth(ctx.a.transportManagerToken)).send({ action: 'acknowledge' });
    expect(mgr.status).toBe(200);
    expect(mgr.body.data.status).toBe('ACKNOWLEDGED');
  });

  it('manager resolves the SOS; then the trip can raise a new one', async () => {
    const resolve = await request(app).patch(`${T}/sos/${sosId}`).set(auth(ctx.a.transportManagerToken)).send({ action: 'resolve', note: 'Tow arranged' });
    expect(resolve.status).toBe(200);
    expect(resolve.body.data.status).toBe('RESOLVED');

    const fresh = await request(app)
      .post(`${T}/sos`)
      .set(auth(ctx.a.transportToken))
      .set('Idempotency-Key', 'sos-3')
      .send({ tripId: ctx.a.tripId, description: 'new incident' });
    expect(fresh.status).toBe(201);
  });

  it('reporting a CRITICAL vehicle issue creates an alert but does NOT complete the trip', async () => {
    const res = await request(app)
      .post(`${T}/trips/${ctx.a.tripId}/issues`)
      .set(auth(ctx.a.transportToken))
      .send({ type: 'ENGINE', severity: 'CRITICAL', description: 'Engine overheating', location: { lat: 22.72, lng: 75.86 } });
    expect(res.status).toBe(201);
    expect(res.body.data.incidentId).toBeTruthy();

    const trip = await request(app).get(`${T}/trips/${ctx.a.tripId}`).set(auth(ctx.a.transportToken));
    expect(trip.body.data.status).not.toBe('COMPLETED');
  });
});

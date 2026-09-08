import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp, badToken } from './helpers/setup.js';

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

describe('Transport APK — school isolation / RBAC / IDOR', () => {
  it('every /transport-app/* route needs a token (401)', async () => {
    for (const p of ['/me', '/dashboard', '/trips', '/alerts', '/notifications', '/profile']) {
      expect((await request(app).get(`${T}${p}`)).status, p).toBe(401);
    }
    expect((await request(app).get(`${T}/dashboard`).set({ Authorization: badToken })).status).toBe(401);
  });

  it('a teacher / student / parent token is rejected 403', async () => {
    expect((await request(app).get(`${T}/dashboard`).set(auth(ctx.a.token))).status).toBe(403);
    expect((await request(app).get(`${T}/dashboard`).set(auth(ctx.a.studentToken))).status).toBe(403);
    expect((await request(app).get(`${T}/dashboard`).set(auth(ctx.a.parentToken))).status).toBe(403);
  });

  it('School-A driver cannot touch School-B trip / route — cross-school resolves to 404 (never leaks existence)', async () => {
    const t = auth(ctx.a.transportToken);
    expect((await request(app).get(`${T}/trips/${ctx.b.tripId}`).set(t)).status).toBe(404);
    expect((await request(app).post(`${T}/trips/${ctx.b.tripId}/start`).set(t)).status).toBe(404);
    expect((await request(app).get(`${T}/trips/${ctx.b.tripId}/students`).set(t)).status).toBe(404);
    // route students: cross-school route → not assigned + not in school → 403 ROUTE_ACCESS_DENIED
    expect((await request(app).get(`${T}/routes/${ctx.b.routeId}/students`).set(t)).status).toBe(403);
  });

  it('a School-B manager also cannot see a School-A trip (cross-school → 404)', async () => {
    expect((await request(app).get(`${T}/trips/${ctx.a.tripId}`).set(auth(ctx.b.transportManagerToken))).status).toBe(404);
  });

  it('driver cannot create a trip or change settings (manager-only)', async () => {
    expect(
      (await request(app).post(`${T}/trips`).set(auth(ctx.a.transportToken)).send({ routeId: ctx.a.routeId, tripType: 'HOME_DROP' })).status
    ).toBe(403);
    expect(
      (await request(app).patch(`${T}/settings`).set(auth(ctx.a.transportToken)).send({ gpsEnabled: false })).status
    ).toBe(403);
  });

  it('a malformed tripId → 400 (validateObjectId)', async () => {
    expect((await request(app).get(`${T}/trips/not-an-id`).set(auth(ctx.a.transportToken))).status).toBe(400);
  });

  it('manager can change transport settings', async () => {
    const res = await request(app).patch(`${T}/settings`).set(auth(ctx.a.transportManagerToken)).send({ delayThresholdMin: 15, boardingNotify: false });
    expect(res.status).toBe(200);
    expect(res.body.data.delayThresholdMin).toBe(15);
    expect(res.body.data.boardingNotify).toBe(false);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp, badToken } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Transport APK — authentication', () => {
  it('logs in a transport driver → token + staff + assigned vehicle/route', async () => {
    const res = await request(app)
      .post('/school-portal/auth/transport-login')
      .send({ identifier: ctx.a.driverLoginEmail, password: ctx.a.driverPassword });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.staff.transportRole).toBe('DRIVER');
    expect(res.body.vehicle?.id).toBe(ctx.a.vehicleId);
    expect(res.body.route?.id).toBe(ctx.a.routeId);
  });

  it('wrong password and unknown id both return the same 401 INVALID_CREDENTIALS', async () => {
    const a = await request(app).post('/school-portal/auth/transport-login').send({ identifier: ctx.a.driverLoginEmail, password: 'nope' });
    const b = await request(app).post('/school-portal/auth/transport-login').send({ identifier: 'ghost@x.edu', password: 'nope' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /me needs a valid transport token and returns the assignment', async () => {
    expect((await request(app).get('/school-portal/transport-app/me')).status).toBe(401);
    expect((await request(app).get('/school-portal/transport-app/me').set({ Authorization: badToken })).status).toBe(401);
    const ok = await request(app).get('/school-portal/transport-app/me').set(auth(ctx.a.transportToken));
    expect(ok.status).toBe(200);
    expect(ok.body.data.staff.transportRole).toBe('DRIVER');
    expect(ok.body.data.vehicle?.id).toBe(ctx.a.vehicleId);
  });

  it('change password invalidates the old one', async () => {
    const login = await request(app).post('/school-portal/auth/transport-login').send({ identifier: ctx.b.driverLoginEmail, password: ctx.b.driverPassword });
    const change = await request(app)
      .patch('/school-portal/transport-app/change-password')
      .set(auth(login.body.token))
      .send({ currentPassword: ctx.b.driverPassword, newPassword: 'FreshPass@2' });
    expect(change.status).toBe(200);
    expect((await request(app).post('/school-portal/auth/transport-login').send({ identifier: ctx.b.driverLoginEmail, password: ctx.b.driverPassword })).status).toBe(401);
    expect((await request(app).post('/school-portal/auth/transport-login').send({ identifier: ctx.b.driverLoginEmail, password: 'FreshPass@2' })).status).toBe(200);
  });

  it('GET /dashboard returns today’s scheduled trip', async () => {
    const res = await request(app).get('/school-portal/transport-app/dashboard').set(auth(ctx.a.transportToken));
    expect(res.status).toBe(200);
    expect(res.body.data.todaysTrip?.id).toBe(ctx.a.tripId);
    expect(res.body.data.todaysTrip.status).toBe('SCHEDULED');
    expect(res.body.data.todaysTrip.inspectionStatus).toBe('PENDING');
  });
});

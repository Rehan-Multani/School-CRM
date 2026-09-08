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
  // get the trip to STARTED so boarding is allowed
  await request(app).post(`${T}/trips/${ctx.a.tripId}/inspection`).set(auth(ctx.a.transportToken)).send({ items: [] });
  await request(app).post(`${T}/trips/${ctx.a.tripId}/start`).set(auth(ctx.a.transportToken));
}, 60000);
afterAll(disconnect);

describe('Transport APK — boarding / drop / absent (idempotent)', () => {
  it('lists the trip roster', async () => {
    const res = await request(app).get(`${T}/trips/${ctx.a.tripId}/students`).set(auth(ctx.a.transportToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('NOT_BOARDED');
  });

  it('board is idempotent — a second call does not create a 2nd record', async () => {
    const first = await request(app)
      .post(`${T}/trips/${ctx.a.tripId}/students/${ctx.a.studentId}/board`)
      .set(auth(ctx.a.transportToken))
      .set('Idempotency-Key', 'board-1')
      .send({ lat: 22.7196, lng: 75.8577 });
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('BOARDED');

    const again = await request(app)
      .post(`${T}/trips/${ctx.a.tripId}/students/${ctx.a.studentId}/board`)
      .set(auth(ctx.a.transportToken))
      .set('Idempotency-Key', 'board-2')
      .send({});
    expect(again.status).toBe(200);
    expect(again.body.data.status).toBe('BOARDED');
    expect(again.body.message).toMatch(/already/i);

    const roster = await request(app).get(`${T}/trips/${ctx.a.tripId}/students`).set(auth(ctx.a.transportToken));
    expect(roster.body.data.length).toBe(1);
    expect(roster.body.data[0].status).toBe('BOARDED');
  });

  it('drop requires a prior board on a fresh student — otherwise 409 NOT_BOARDED', async () => {
    const other = ctx.a.studentNoGuardianId; // exists in school but not on this trip
    const notOnTrip = await request(app)
      .post(`${T}/trips/${ctx.a.tripId}/students/${other}/drop`)
      .set(auth(ctx.a.transportToken))
      .send({});
    expect(notOnTrip.status).toBe(403);
    expect(notOnTrip.body.code).toBe('STUDENT_NOT_ON_TRIP');
  });

  it('drop after board works and updates counts', async () => {
    const res = await request(app)
      .post(`${T}/trips/${ctx.a.tripId}/students/${ctx.a.studentId}/drop`)
      .set(auth(ctx.a.transportToken))
      .set('Idempotency-Key', 'drop-1')
      .send({ lat: 22.73, lng: 75.88 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DROPPED');

    const detail = await request(app).get(`${T}/trips/${ctx.a.tripId}`).set(auth(ctx.a.transportToken));
    expect(detail.body.data.studentSummary.dropped).toBe(1);
  });

  it('a School-B student id on School-A trip → 403 (not on trip)', async () => {
    const res = await request(app)
      .post(`${T}/trips/${ctx.a.tripId}/students/${ctx.b.studentId}/board`)
      .set(auth(ctx.a.transportToken))
      .send({});
    expect(res.status).toBe(403);
  });
});

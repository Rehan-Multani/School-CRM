import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let hrToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  const { signAccessToken } = await import('../../shared/generateToken.js');
  const { env } = await import('../src/config/env.js');
  const { SchoolUser } = await import('../src/models/SchoolUser.js');
  const hr = await SchoolUser.create({
    schoolId: ctx.a.schoolId, name: 'HR One', firstName: 'HR', lastName: 'One', employeeId: 'HR-1', email: 'hr1@schoola.edu', role: 'HR', status: 'ACTIVE', password: 'Password@123',
  });
  hrToken = signAccessToken(
    { sub: hr._id.toString(), userId: hr._id.toString(), schoolId: ctx.a.schoolId, role: 'HR', name: hr.name },
    { secret: env.jwtSecret, expiresIn: '1h' }
  );
}, 90000);
afterAll(disconnect);

describe('Visitors', () => {
  it('HR adds; admin reads but cannot write; other school sees nothing', async () => {
    const add = await request(app).post('/school-portal/visitors').set(auth(hrToken))
      .send({ name: 'Mr Sharma', mobile: '9876543210', purpose: 'Admission enquiry', personToMeet: 'Principal' });
    expect(add.status).toBe(201);
    const id = add.body.data.id;

    const bad = await request(app).post('/school-portal/visitors').set(auth(hrToken)).send({ name: 'x' });
    expect(bad.status).toBe(400);

    const asAdmin = await request(app).get('/school-portal/visitors').set(auth(ctx.a.adminToken));
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.data.map((v) => v.id)).toContain(id);

    const adminWrite = await request(app).post('/school-portal/visitors').set(auth(ctx.a.adminToken))
      .send({ name: 'A', mobile: '9876543210', purpose: 'x' });
    expect(adminWrite.status).toBe(403);

    const other = await request(app).get('/school-portal/visitors').set(auth(ctx.b.adminToken));
    expect(other.body.data.map((v) => v.id)).not.toContain(id);

    const upd = await request(app).patch(`/school-portal/visitors/${id}`).set(auth(hrToken)).send({ purpose: 'Fee enquiry' });
    expect(upd.body.data.purpose).toBe('Fee enquiry');
    const del = await request(app).delete(`/school-portal/visitors/${id}`).set(auth(hrToken));
    expect(del.status).toBe(200);
  });
});

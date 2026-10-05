import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

// Staff tokens (Principal / HR / Accountant / Librarian) last for days. A staff
// member who is deactivated or deleted must lose access at once, and nobody may
// remove the account they are signed in with.
let app;
let ctx;
let SchoolUser;
let clearStaffAccountCache;

const PASSWORD = 'Princ1pal!x';
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function makeStaff(role, email) {
  const user = await SchoolUser.create({
    schoolId: ctx.a.schoolId,
    employeeId: `REV-${role}-${Math.random().toString(36).slice(2, 7)}`,
    firstName: 'Rev',
    lastName: role,
    name: `Rev ${role}`,
    email,
    role,
    phone: '9811100033',
    status: 'ACTIVE',
    passwordHash: await bcrypt.hash(PASSWORD, 10),
  });
  return user;
}
const principalLogin = (email) => request(app).post('/school-portal/auth/principal-login').send({ email, password: PASSWORD });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ SchoolUser } = await import('../src/models/SchoolUser.js'));
  ({ clearStaffAccountCache } = await import('../src/middleware/staffAccount.js'));
}, 120000);

afterAll(disconnect);

describe('Staff account revocation', () => {
  it('a principal cannot delete or deactivate their own account', async () => {
    const user = await makeStaff('PRINCIPAL', 'rev.self@schoola.edu');
    const token = (await principalLogin('rev.self@schoola.edu')).body.token;
    expect(token).toBeTruthy();

    const del = await request(app).delete(`/school-portal/users/${user._id}`).set(auth(token));
    expect(del.status).toBe(400);
    const off = await request(app).patch(`/school-portal/users/${user._id}/status`).set(auth(token)).send({ status: 'INACTIVE' });
    expect(off.status).toBe(400);
    expect(await SchoolUser.exists({ _id: user._id, status: 'ACTIVE' })).toBeTruthy();
  });

  it('a deactivated principal is locked out immediately, and let back in when reactivated', async () => {
    const user = await makeStaff('PRINCIPAL', 'rev.off@schoola.edu');
    const token = (await principalLogin('rev.off@schoola.edu')).body.token;
    const get = () => request(app).get('/school-portal/students').query({ page: 1, limit: 1 }).set(auth(token));
    expect((await get()).status).toBe(200);

    // The School Admin deactivates them through the panel.
    const off = await request(app).patch(`/school-portal/users/${user._id}/status`).set(auth(ctx.a.adminToken)).send({ status: 'INACTIVE' });
    expect(off.status).toBe(200);
    expect((await get()).status).toBe(401);

    await request(app).patch(`/school-portal/users/${user._id}/status`).set(auth(ctx.a.adminToken)).send({ status: 'ACTIVE' });
    expect((await get()).status).toBe(200);
  });

  it('a deleted principal\'s token stops working on every staff guard', async () => {
    const user = await makeStaff('PRINCIPAL', 'rev.gone@schoola.edu');
    const token = (await principalLogin('rev.gone@schoola.edu')).body.token;
    expect((await request(app).get('/school-portal/academic/years').set(auth(token))).status).toBe(200);

    expect((await request(app).delete(`/school-portal/users/${user._id}`).set(auth(ctx.a.adminToken))).status).toBe(200);
    for (const path of ['/school-portal/students', '/school-portal/academic/years', '/school-portal/hr/employees']) {
      expect((await request(app).get(path).set(auth(token))).status, path).toBe(401);
    }
  });

  it('the School Admin is unaffected', async () => {
    clearStaffAccountCache();
    expect((await request(app).get('/school-portal/students').set(auth(ctx.a.adminToken))).status).toBe(200);
  });
});

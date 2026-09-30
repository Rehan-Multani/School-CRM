/**
 * "Delete account" + session revocation across all four mobile-app roles
 * (teacher, student, parent, driver). In-memory seed only.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

const ROLES = () => [
  { role: 'teacher', loginPath: '/school-portal/auth/teacher-login', body: { identifier: 'teacher@schoolb.edu', password: 'Passw0rd!' }, pw: 'Passw0rd!' },
  { role: 'student', loginPath: '/school-portal/auth/student-login', body: { identifier: ctx.b.studentLoginEmail, password: ctx.b.studentPassword }, pw: ctx.b.studentPassword },
  { role: 'parent', loginPath: '/school-portal/auth/parent-login', body: { identifier: ctx.b.parentLoginEmail, password: ctx.b.parentPassword }, pw: ctx.b.parentPassword },
  { role: 'driver', loginPath: '/school-portal/auth/driver-login', body: { mobile: ctx.b.driverMobile, password: ctx.b.driverPassword }, pw: ctx.b.driverPassword },
];
const tokenOf = (res) => res.body.token || res.body.data?.token;

describe.each(['teacher', 'student', 'parent', 'driver'])('%s app', (roleName) => {
  const cfg = () => ROLES().find((r) => r.role === roleName);
  const base = () => `/school-portal/${roleName}`;
  const login = () => request(app).post(cfg().loginPath).send(cfg().body);

  it('logout revokes the session', async () => {
    const t = tokenOf(await login());
    expect(t).toBeTruthy();
    expect((await request(app).get(`${base()}/me`).set('Authorization', `Bearer ${t}`)).status).toBe(200);
    expect((await request(app).post(`${base()}/auth/logout`).set('Authorization', `Bearer ${t}`)).status).toBe(200);
    expect((await request(app).get(`${base()}/me`).set('Authorization', `Bearer ${t}`)).status).toBe(401);
  });

  it('change-password returns a fresh token; the old one dies', async () => {
    const old = tokenOf(await login());
    const res = await request(app).patch(`${base()}/change-password`).set('Authorization', `Bearer ${old}`)
      .send({ currentPassword: cfg().pw, newPassword: 'Temp#Pass2026' });
    expect(res.status).toBe(200);
    const fresh = res.body.data.token;
    expect(fresh).toBeTruthy();
    expect((await request(app).get(`${base()}/me`).set('Authorization', `Bearer ${old}`)).status).toBe(401);
    expect((await request(app).get(`${base()}/me`).set('Authorization', `Bearer ${fresh}`)).status).toBe(200);
    const back = await request(app).patch(`${base()}/change-password`).set('Authorization', `Bearer ${fresh}`)
      .send({ currentPassword: 'Temp#Pass2026', newPassword: cfg().pw });
    expect(back.status).toBe(200);
  });

  it('delete account (app sends no password): login removed on every device; a wrong password is still refused', async () => {
    const t1 = tokenOf(await login());
    const t2 = tokenOf(await login());
    const wrong = await request(app).post(`${base()}/account/delete`).set('Authorization', `Bearer ${t1}`).send({ password: 'nope' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.code).toBe('CURRENT_PASSWORD_INVALID');
    const ok = await request(app).post(`${base()}/account/delete`).set('Authorization', `Bearer ${t1}`).send({});
    expect(ok.status).toBe(200);
    expect((await request(app).get(`${base()}/me`).set('Authorization', `Bearer ${t1}`)).status).toBe(401);
    expect((await request(app).get(`${base()}/me`).set('Authorization', `Bearer ${t2}`)).status).toBe(401);
    expect((await login()).status).toBeGreaterThanOrEqual(400);
  });
});

describe('Deleted accounts keep school data', () => {
  it('student / parent / driver records still exist after deletion', async () => {
    const { Student } = await import('../src/models/Student.js');
    const { Parent } = await import('../src/models/Parent.js');
    const { Driver } = await import('../src/models/Driver.js');
    const { ParentStudent } = await import('../src/models/ParentStudent.js');
    const s = await Student.findById(ctx.b.studentId).lean();
    expect(s.status).toBe('ACTIVE');
    expect(s.appAccountDeletedAt).toBeTruthy();
    expect((await Parent.findById(ctx.b.parentId).lean()).appAccountDeletedAt).toBeTruthy();
    expect(await ParentStudent.exists({ parentId: ctx.b.parentId })).toBeTruthy();
    const d = await Driver.findById(ctx.b.driverId).lean();
    expect(d.loginEnabled).toBe(false);
    expect(d.appAccountDeletedAt).toBeTruthy();
  });

  it('school A accounts are unaffected', async () => {
    // (no fresh login here — this file already spent the login rate-limit budget)
    for (const [path, t] of [['/school-portal/parent/me', ctx.a.parentToken], ['/school-portal/driver/me', ctx.a.driverToken], ['/school-portal/student/me', ctx.a.studentToken], ['/school-portal/teacher/me', ctx.a.token]]) {
      expect((await request(app).get(path).set('Authorization', `Bearer ${t}`)).status, path).toBe(200);
    }
  });
});

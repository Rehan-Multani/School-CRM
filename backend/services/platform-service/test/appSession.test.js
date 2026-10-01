/**
 * Mobile-app controls the Super Admin has: the version gate, and force logout
 * of app roles in one school or every school.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { signAccessToken } from '../../shared/generateToken.js';
import { env } from '../src/config/env.js';
import { DeviceToken } from '../src/models/DeviceToken.js';

let app;
let ctx;
let superToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const me = (role, token) => request(app).get(`/school-portal/${role}/me`).set(auth(token));
const notice = (role, schoolId) => request(app).get('/app-config/logout-notice').query({ role, schoolId });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  superToken = signAccessToken({ sub: 'superadmin123', role: 'SuperAdmin', email: 'sa@schoolcrm.com' }, { secret: env.jwtSecret, expiresIn: '1h' });
}, 60000);
afterAll(disconnect);

describe('App version gate', () => {
  const put = (body, token = superToken) => request(app).put('/app-config').set(auth(token)).send(body);

  it('is public, and empty until the Super Admin sets it', async () => {
    const res = await request(app).get('/app-config');
    expect(res.status).toBe(200);
    expect(res.body.data.appUpdate).toEqual({ latestVersion: '', minVersion: '', message: '' });

    const early = await request(app).post('/app-config/notify-update').set(auth(superToken));
    expect(early.status).toBe(400);
  });

  it('saves latest + minimum version and a message', async () => {
    const res = await put({ appLatestVersion: '1.2.0', appMinVersion: '1.1', appUpdateMessage: 'Bug fixes' });
    expect(res.status).toBe(200);
    expect(res.body.data.appUpdate).toEqual({ latestVersion: '1.2.0', minVersion: '1.1', message: 'Bug fixes' });

    const pub = await request(app).get('/app-config');
    expect(pub.body.data.appUpdate.minVersion).toBe('1.1');

    const push = await request(app).post('/app-config/notify-update').set(auth(superToken));
    expect(push.status).toBe(200);
  });

  it('refuses a minimum above the latest, a malformed version, and non-super-admins', async () => {
    expect((await put({ appMinVersion: '2.0.0' })).status).toBe(400);
    expect((await put({ appLatestVersion: 'v1.2' })).status).toBe(400);
    expect((await put({ appLatestVersion: '9.9.9' }, ctx.a.adminToken)).status).toBe(403);
    expect((await request(app).post('/app-config/notify-update').set(auth(ctx.a.adminToken))).status).toBe(403);
  });
});

describe('Force logout', () => {
  const forceLogout = (body, token = superToken) => request(app).post('/app-config/force-logout').set(auth(token)).send(body);

  it('signs out the teachers of one school only', async () => {
    await DeviceToken.create({ token: 'device-token-teacher-a-000000', role: 'teacher', schoolId: 'schoola', userId: ctx.a.teacherId });
    await DeviceToken.create({ token: 'device-token-teacher-b-000000', role: 'teacher', schoolId: 'schoolb', userId: ctx.b.teacherId });
    expect((await me('teacher', ctx.a.token)).status).toBe(200);

    const res = await forceLogout({ roles: ['TEACHER'], message: 'Please sign in again after the update.', schoolId: ctx.a.schoolId });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ schoolId: ctx.a.schoolId, schoolName: 'School A', roles: ['TEACHER'], affected: { TEACHER: 1 } });

    expect((await me('teacher', ctx.a.token)).status).toBe(401);
    expect((await me('student', ctx.a.studentToken)).status).toBe(200);
    expect((await me('teacher', ctx.b.token)).status).toBe(200);

    // The signed-out phones are forgotten; the other school's are not.
    expect(await DeviceToken.countDocuments({ token: 'device-token-teacher-a-000000' })).toBe(0);
    expect(await DeviceToken.countDocuments({ token: 'device-token-teacher-b-000000' })).toBe(1);
  });

  it('the app can read why — for that role and school only', async () => {
    const mine = await notice('TEACHER', ctx.a.schoolId);
    expect(mine.status).toBe(200);
    expect(mine.body.data.message).toBe('Please sign in again after the update.');

    expect((await notice('STUDENT', ctx.a.schoolId)).body.data).toBeNull();
    expect((await notice('TEACHER', ctx.b.schoolId)).body.data).toBeNull();
    expect((await notice('PRINCIPAL', ctx.a.schoolId)).body.data).toBeNull();
  });

  it('a fresh login works again straight away', async () => {
    const res = await request(app)
      .post('/school-portal/auth/teacher-login')
      .send({ identifier: 'teacher@schoola.edu', password: 'Passw0rd!' });
    expect(res.status).toBe(200);
    expect((await me('teacher', res.body.token)).status).toBe(200);
  });

  it('rejects an unknown role or school, and anyone who is not the Super Admin', async () => {
    expect((await forceLogout({ roles: ['PRINCIPAL'] })).status).toBe(400);
    expect((await forceLogout({})).status).toBe(400);
    expect((await forceLogout({ roles: 'ALL', schoolId: 'not-a-school' })).status).toBe(404);
    expect((await forceLogout({ roles: 'ALL' }, ctx.a.adminToken)).status).toBe(403);
    expect((await forceLogout({ roles: 'ALL' }, ctx.b.token)).status).toBe(403);
    expect((await request(app).post('/app-config/force-logout').send({ roles: 'ALL' })).status).toBe(401);
    expect((await request(app).get('/app-config/force-logout').set(auth(ctx.a.adminToken))).status).toBe(403);
    // The school admin panel has no force logout of its own.
    const school = await request(app).post('/school-portal/app-sessions/force-logout').set(auth(ctx.a.adminToken)).send({ roles: 'ALL' });
    expect(school.status).toBe(404);
  });

  it('signs out several roles of a school, then everyone everywhere', async () => {
    const one = await forceLogout({ roles: ['STUDENT', 'PARENT'], schoolId: ctx.a.schoolId });
    expect(one.status).toBe(200);
    expect((await me('student', ctx.a.studentToken)).status).toBe(401);
    expect((await me('parent', ctx.a.parentToken)).status).toBe(401);
    expect((await me('student', ctx.b.studentToken)).status).toBe(200);

    const all = await forceLogout({ roles: 'ALL' });
    expect(all.status).toBe(200);
    expect(all.body.data.schoolId).toBeNull();
    expect(all.body.data.roles).toEqual(['TEACHER', 'STUDENT', 'PARENT', 'TRANSPORT']);
    expect((await me('student', ctx.b.studentToken)).status).toBe(401);
    expect((await me('teacher', ctx.b.token)).status).toBe(401);
    expect((await notice('PARENT', ctx.b.schoolId)).body.data.message).toMatch(/signed out by the administrator/);

    expect((await request(app).get('/app-config/force-logout').set(auth(superToken))).body.data).toHaveLength(3);
  });
});

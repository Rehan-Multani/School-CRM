import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let env;
let LoginAsCode;
let AuditLog;
let superAdmin;

const bearer = (payload) => `Bearer ${jwt.sign(payload, env.jwtSecret, { expiresIn: '10m' })}`;
const codeFrom = (url) => new URLSearchParams(url.split('#')[1]).get('code');

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ env } = await import('../src/config/env.js'));
  ({ LoginAsCode } = await import('../src/models/LoginAsCode.js'));
  ({ AuditLog } = await import('../src/models/AuditLog.js'));
  superAdmin = bearer({ sub: 'sa-1', role: 'SuperAdmin', name: 'Rehan' });
}, 90000);
afterAll(disconnect);

describe('Super Admin → Login as school', () => {
  it('only a Super Admin can ask for a login link', async () => {
    const path = `/schools/${ctx.a.schoolId}/login-as`;
    expect((await request(app).post(path)).status).toBe(401);
    const schoolAdmin = bearer({ sub: String(ctx.a.schoolId), role: 'SchoolAdmin' });
    expect((await request(app).post(path).set('Authorization', schoolAdmin)).status).toBe(403);
  });

  it('gives a one-time link, never a session token', async () => {
    const res = await request(app).post(`/schools/${ctx.a.schoolId}/login-as`).set('Authorization', superAdmin);
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.url).toMatch(/\/school-admin\/login-as#code=[a-f0-9]{64}$/);
    expect(res.body.data.code).toBe(codeFrom(res.body.data.url));
    // Only the hash is stored.
    expect(await LoginAsCode.countDocuments({ codeHash: res.body.data.code })).toBe(0);
  });

  it('the code signs in as THAT school, works once, and is recorded in the school audit log', async () => {
    const link = await request(app).post(`/schools/${ctx.a.schoolId}/login-as`).set('Authorization', superAdmin);
    const { code } = link.body.data;

    const login = await request(app).post('/school-auth/login-as').send({ code });
    expect(login.status).toBe(200);
    expect(login.body.impersonation.by).toBe('Rehan');

    const claims = jwt.verify(login.body.token, env.jwtSecret);
    expect(claims.role).toBe('SchoolAdmin');
    expect(claims.sub).toBe(String(ctx.a.schoolId));
    expect(claims.imp).toBe('sa-1');
    // A support visit, not a 7-day login.
    expect(claims.exp - claims.iat).toBe(2 * 60 * 60);

    const me = await request(app).get('/school-portal/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);

    const again = await request(app).post('/school-auth/login-as').send({ code });
    expect(again.status).toBe(401);

    const audit = await AuditLog.findOne({ schoolId: ctx.a.schoolId, action: 'SUPER_ADMIN_LOGIN_AS' });
    expect(audit).toBeTruthy();
    expect(audit.actorName).toBe('Rehan');
  });

  it('rejects an expired code, a made-up code and a non-string code', async () => {
    const link = await request(app).post(`/schools/${ctx.b.schoolId}/login-as`).set('Authorization', superAdmin);
    await LoginAsCode.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).post('/school-auth/login-as').send({ code: link.body.data.code })).status).toBe(401);
    expect((await request(app).post('/school-auth/login-as').send({ code: 'a'.repeat(64) })).status).toBe(401);
    expect((await request(app).post('/school-auth/login-as').send({ code: { $ne: '' } })).status).toBe(401);
  });

  it('404s for a school that does not exist', async () => {
    const res = await request(app).post('/schools/64b000000000000000000000/login-as').set('Authorization', superAdmin);
    expect(res.status).toBe(404);
  });
});

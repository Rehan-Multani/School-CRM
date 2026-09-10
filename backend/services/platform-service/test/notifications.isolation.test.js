/**
 * Notification inbox + device registration: authentication and tenant scoping.
 *
 * Both routes used to be completely unauthenticated and took `role`, `schoolId`
 * and `userId` from the query string / body. That meant any anonymous caller
 * could read another school's notification inbox by supplying its id, and could
 * register a device token against any user — redirecting that user's push
 * notifications to an attacker's device.
 *
 * These tests pin the fix: a token is required, and client-supplied scope is
 * ignored in favour of the JWT's own claims.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp, badToken } from './helpers/setup.js';
import { signAccessToken } from '../../shared/generateToken.js';
import { env } from '../src/config/env.js';

let app;
let ctx;
let DeviceToken;

const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ DeviceToken } = await import('../src/models/DeviceToken.js'));
}, 90000);
afterAll(disconnect);

describe('GET /notifications/inbox', () => {
  it('rejects an anonymous request', async () => {
    const res = await request(app).get('/notifications/inbox').query({
      role: 'parent',
      schoolId: ctx.a.schoolId,
    });
    expect(res.status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const res = await request(app)
      .get('/notifications/inbox')
      .set({ Authorization: badToken });
    expect(res.status).toBe(401);
  });

  it('ignores a query schoolId pointing at another school', async () => {
    // School A's parent asks for School B's inbox. The response must be scoped
    // to A regardless of what the query says.
    const crossSchool = await request(app)
      .get('/notifications/inbox')
      .query({ role: 'parent', schoolId: ctx.b.schoolId, userId: ctx.b.parentId })
      .set(auth(ctx.a.parentToken));
    expect(crossSchool.status).toBe(200);

    const own = await request(app)
      .get('/notifications/inbox')
      .set(auth(ctx.a.parentToken));
    expect(own.status).toBe(200);

    // Same caller, same scope — the forged query changed nothing.
    expect(crossSchool.body.data).toEqual(own.body.data);
  });

  it('returns 200 and scoped inbox for school-admin token', async () => {
    const res = await request(app)
      .get('/notifications/inbox')
      .set(auth(ctx.a.adminToken));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 200 and platform inbox for super-admin token without 400 error', async () => {
    const superAdminToken = signAccessToken(
      { sub: 'superadmin123', role: 'SuperAdmin', email: 'superadmin@schoolcrm.com' },
      { secret: env.jwtSecret, expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/notifications/inbox')
      .set(auth(superAdminToken));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('POST /device-tokens', () => {
  it('rejects an anonymous registration', async () => {
    const res = await request(app)
      .post('/device-tokens')
      .send({ token: 'anon-token-1', role: 'parent', schoolId: ctx.a.schoolId, userId: ctx.a.parentId });
    expect(res.status).toBe(401);
    expect(await DeviceToken.findOne({ token: 'anon-token-1' })).toBeNull();
  });

  it('binds the device to the caller, not to the body', async () => {
    const res = await request(app)
      .post('/device-tokens')
      .set(auth(ctx.a.studentToken))
      .send({
        token: 'device-abc',
        // All of this is attacker-controlled and must be discarded.
        role: 'school-admin',
        schoolId: ctx.b.schoolId,
        userId: ctx.b.parentId,
      });
    expect(res.status).toBe(201);

    const saved = await DeviceToken.findOne({ token: 'device-abc' });
    expect(saved).toBeTruthy();
    expect(saved.role).toBe('student');
    expect(saved.userId).not.toBe(ctx.b.parentId);
    expect(saved.schoolId).not.toBe(ctx.b.schoolId);
  });

  it('registers device token for super-admin without error', async () => {
    const superAdminToken = signAccessToken(
      { sub: 'superadmin123', role: 'SuperAdmin', email: 'superadmin@schoolcrm.com' },
      { secret: env.jwtSecret, expiresIn: '1h' }
    );
    const res = await request(app)
      .post('/device-tokens')
      .set(auth(superAdminToken))
      .send({ token: 'device-superadmin-token' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const saved = await DeviceToken.findOne({ token: 'device-superadmin-token' });
    expect(saved).toBeTruthy();
    expect(saved.role).toBe('super-admin');
  });
});

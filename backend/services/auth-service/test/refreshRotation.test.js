/**
 * Refresh-token rotation, single-use enforcement and reuse detection.
 *
 * These are the properties a bare stateless refresh JWT cannot give you, so they
 * are the ones worth pinning down: rotating must retire the old token, replaying
 * a retired token must burn the whole family, and a password change must end
 * every session.
 */
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';

let app;
let SuperAdminUser;
let RefreshToken;

const EMAIL = 'rotation-test@example.com';
const PASSWORD = 'CorrectHorseBattery1';

let memoryServer = null;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-definitely-long-enough';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-also-long-enough';
  process.env.SUPERADMIN_PASSWORD = 'seed-only-not-used-here';

  let uri = process.env.MONGO_URI_TEST || '';
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }
  await mongoose.connect(uri);

  ({ default: app } = await import('../src/app.js'));
  ({ SuperAdminUser } = await import('../src/models/SuperAdminUser.js'));
  ({ RefreshToken } = await import('../src/models/RefreshToken.js'));

  await SuperAdminUser.deleteMany({ email: EMAIL });
  await SuperAdminUser.create({
    name: 'Rotation Test',
    email: EMAIL,
    passwordHash: await bcrypt.hash(PASSWORD, 10),
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
});

const login = () => request(app).post('/login').send({ email: EMAIL, password: PASSWORD });

describe('super admin refresh tokens', () => {
  it('issues a short-lived access token and a persisted refresh token', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();

    // The raw token must never be what we store.
    const stored = await RefreshToken.findOne({}).sort({ createdAt: -1 });
    expect(stored).toBeTruthy();
    expect(stored.tokenHash).not.toBe(res.body.refreshToken);
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rotates: refreshing returns a new pair and retires the presented token', async () => {
    const { body: first } = await login();

    const rotated = await request(app).post('/refresh').send({ refreshToken: first.refreshToken });
    expect(rotated.status).toBe(200);
    expect(rotated.body.refreshToken).toBeTruthy();
    expect(rotated.body.refreshToken).not.toBe(first.refreshToken);

    // The new token works...
    const again = await request(app)
      .post('/refresh')
      .send({ refreshToken: rotated.body.refreshToken });
    expect(again.status).toBe(200);
  });

  it('refuses a refresh token that was already used (single use)', async () => {
    const { body: first } = await login();

    const ok = await request(app).post('/refresh').send({ refreshToken: first.refreshToken });
    expect(ok.status).toBe(200);

    const replay = await request(app).post('/refresh').send({ refreshToken: first.refreshToken });
    expect(replay.status).toBe(401);
  });

  it('detects reuse and revokes the whole family, killing the live token too', async () => {
    const { body: first } = await login();

    const second = await request(app).post('/refresh').send({ refreshToken: first.refreshToken });
    expect(second.status).toBe(200);
    const liveToken = second.body.refreshToken;

    // Attacker replays the retired token.
    const replay = await request(app).post('/refresh').send({ refreshToken: first.refreshToken });
    expect(replay.status).toBe(401);

    // The victim's still-unused token must now be dead as well — that is the
    // whole point of family revocation.
    const victim = await request(app).post('/refresh').send({ refreshToken: liveToken });
    expect(victim.status).toBe(401);
  });

  it('rejects an access token presented as a refresh token', async () => {
    const { body } = await login();
    const res = await request(app).post('/refresh').send({ refreshToken: body.token });
    expect(res.status).toBe(401);
  });

  it('logout revokes every outstanding refresh token', async () => {
    const { body } = await login();

    const out = await request(app).post('/logout').set('Authorization', `Bearer ${body.token}`);
    expect(out.status).toBe(200);

    const res = await request(app).post('/refresh').send({ refreshToken: body.refreshToken });
    expect(res.status).toBe(401);
  });

  it('changing the password ends all other sessions', async () => {
    const { body: sessionA } = await login();
    const { body: sessionB } = await login();

    const changed = await request(app)
      .patch('/password')
      .set('Authorization', `Bearer ${sessionA.token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'AnotherStrongPass9' });
    expect(changed.status).toBe(200);

    const stale = await request(app).post('/refresh').send({ refreshToken: sessionB.refreshToken });
    expect(stale.status).toBe(401);

    // put it back so ordering between tests cannot matter
    await request(app)
      .patch('/password')
      .set('Authorization', `Bearer ${sessionA.token}`)
      .send({ currentPassword: 'AnotherStrongPass9', newPassword: PASSWORD });
  });
});

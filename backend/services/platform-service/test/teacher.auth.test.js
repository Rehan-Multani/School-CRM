import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp, badToken } from './helpers/setup.js';

let app;
let ctx;

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Teacher auth', () => {
  it('logs in with valid credentials and returns a TEACHER token', async () => {
    const res = await request(app)
      .post('/school-portal/auth/teacher-login')
      .send({ identifier: 'teacher@schoola.edu', password: 'Passw0rd!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
    const payload = JSON.parse(Buffer.from(res.body.token.split('.')[1], 'base64').toString());
    expect(payload.role).toBe('TEACHER');
  });

  it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/school-portal/auth/teacher-login')
      .send({ identifier: 'teacher@schoola.edu', password: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an inactive teacher', async () => {
    const { Teacher } = await import('../src/models/Teacher.js');
    await Teacher.updateOne({ _id: ctx.b.teacherId }, { $set: { status: 'INACTIVE' } });
    const res = await request(app)
      .post('/school-portal/auth/teacher-login')
      .send({ identifier: 'teacher@schoolb.edu', password: 'Passw0rd!' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TEACHER_INACTIVE');
    await Teacher.updateOne({ _id: ctx.b.teacherId }, { $set: { status: 'ACTIVE' } });
  });

  it('requires a token on protected routes', async () => {
    const res = await request(app).get('/school-portal/teacher/me');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const res = await request(app).get('/school-portal/teacher/me').set('Authorization', badToken);
    expect(res.status).toBe(401);
  });

  it('rejects a non-teacher (wrong role) token', async () => {
    const { signAccessToken } = await import('../../shared/generateToken.js');
    const { env } = await import('../src/config/env.js');
    const principalToken = signAccessToken(
      { sub: ctx.a.schoolId, role: 'PRINCIPAL', schoolId: ctx.a.schoolId },
      { secret: env.jwtSecret, expiresIn: '1h' }
    );
    const res = await request(app).get('/school-portal/teacher/me').set('Authorization', `Bearer ${principalToken}`);
    expect(res.status).toBe(403);
  });

  it('me returns the teacher profile', async () => {
    const res = await request(app).get('/school-portal/teacher/me').set('Authorization', `Bearer ${ctx.a.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.teacher.id).toBe(ctx.a.teacherId);
  });
});

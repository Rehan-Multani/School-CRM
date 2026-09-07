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

describe('Student APK — authentication', () => {
  it('logs in with email + password and returns token/student/school', async () => {
    const res = await request(app)
      .post('/school-portal/auth/student-login')
      .send({ identifier: ctx.a.studentLoginEmail, password: ctx.a.studentPassword });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.student.id).toBe(ctx.a.studentId);
    expect(res.body.student.className).toBeTruthy();
    expect(res.body.school.id).toBe(ctx.a.schoolId);
  });

  it('logs in with admission number as identifier', async () => {
    const login = await request(app)
      .post('/school-portal/auth/student-login')
      .send({ identifier: ctx.a.studentLoginEmail, password: ctx.a.studentPassword });
    const me = await request(app).get('/school-portal/student/me').set(auth(login.body.token));
    const admissionNumber = me.body.data.student.admissionNumber;
    const res = await request(app)
      .post('/school-auth/student-login')
      .send({ identifier: admissionNumber, password: ctx.a.studentPassword });
    expect(res.status).toBe(200);
    expect(res.body.student.id).toBe(ctx.a.studentId);
  });

  it('rejects a wrong password with a uniform 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/school-portal/auth/student-login')
      .send({ identifier: ctx.a.studentLoginEmail, password: 'nope-nope' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown identifier with the SAME 401 (no student-exists probing)', async () => {
    const res = await request(app)
      .post('/school-portal/auth/student-login')
      .send({ identifier: 'ghost@nowhere.edu', password: 'whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /me requires a valid bearer token', async () => {
    expect((await request(app).get('/school-portal/student/me')).status).toBe(401);
    expect((await request(app).get('/school-portal/student/me').set({ Authorization: badToken })).status).toBe(401);
    const ok = await request(app).get('/school-portal/student/me').set(auth(ctx.a.studentToken));
    expect(ok.status).toBe(200);
    expect(ok.body.data.student.id).toBe(ctx.a.studentId);
  });

  it('changes the password and invalidates the old one', async () => {
    const login = await request(app)
      .post('/school-portal/auth/student-login')
      .send({ identifier: ctx.b.studentLoginEmail, password: ctx.b.studentPassword });
    const token = login.body.token;
    const change = await request(app)
      .patch('/school-portal/student/change-password')
      .set(auth(token))
      .send({ currentPassword: ctx.b.studentPassword, newPassword: 'BrandNew@2' });
    expect(change.status).toBe(200);

    const old = await request(app)
      .post('/school-portal/auth/student-login')
      .send({ identifier: ctx.b.studentLoginEmail, password: ctx.b.studentPassword });
    expect(old.status).toBe(401);
    const fresh = await request(app)
      .post('/school-portal/auth/student-login')
      .send({ identifier: ctx.b.studentLoginEmail, password: 'BrandNew@2' });
    expect(fresh.status).toBe(200);
  });

  it('rejects a too-short new password', async () => {
    const res = await request(app)
      .patch('/school-portal/student/change-password')
      .set(auth(ctx.a.studentToken))
      .send({ currentPassword: ctx.a.studentPassword, newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PASSWORD_TOO_SHORT');
  });
});

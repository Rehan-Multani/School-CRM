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

describe('Parent APK — authentication', () => {
  it('logs in with email + password → token, parent, children[]', async () => {
    const res = await request(app)
      .post('/school-portal/auth/parent-login')
      .send({ identifier: ctx.a.parentLoginEmail, password: ctx.a.parentPassword });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.parent.id).toBe(ctx.a.parentId);
    expect(Array.isArray(res.body.children)).toBe(true);
    expect(res.body.children.length).toBe(1);
    expect(res.body.children[0].childId).toBe(ctx.a.studentId);
  });

  it('logs in with phone as identifier', async () => {
    const res = await request(app)
      .post('/school-auth/parent-login')
      .send({ identifier: ctx.a.parentPhone, password: ctx.a.parentPassword });
    expect(res.status).toBe(200);
    expect(res.body.parent.id).toBe(ctx.a.parentId);
  });

  it('wrong password and unknown id both return the same 401 INVALID_CREDENTIALS', async () => {
    const a = await request(app).post('/school-portal/auth/parent-login').send({ identifier: ctx.a.parentLoginEmail, password: 'nope' });
    const b = await request(app).post('/school-portal/auth/parent-login').send({ identifier: 'ghost@nowhere.edu', password: 'nope-nope' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.code).toBe('INVALID_CREDENTIALS');
    expect(b.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /me needs a valid parent token and returns children[]', async () => {
    expect((await request(app).get('/school-portal/parent/me')).status).toBe(401);
    expect((await request(app).get('/school-portal/parent/me').set({ Authorization: badToken })).status).toBe(401);
    const ok = await request(app).get('/school-portal/parent/me').set(auth(ctx.a.parentToken));
    expect(ok.status).toBe(200);
    expect(ok.body.data.parent.id).toBe(ctx.a.parentId);
    expect(ok.body.data.children[0].childId).toBe(ctx.a.studentId);
  });

  it('changes password and invalidates the old one', async () => {
    const login = await request(app)
      .post('/school-portal/auth/parent-login')
      .send({ identifier: ctx.b.parentLoginEmail, password: ctx.b.parentPassword });
    const change = await request(app)
      .patch('/school-portal/parent/change-password')
      .set(auth(login.body.token))
      .send({ currentPassword: ctx.b.parentPassword, newPassword: 'BrandNew@2' });
    expect(change.status).toBe(200);
    expect((await request(app).post('/school-portal/auth/parent-login').send({ identifier: ctx.b.parentLoginEmail, password: ctx.b.parentPassword })).status).toBe(401);
    expect((await request(app).post('/school-portal/auth/parent-login').send({ identifier: ctx.b.parentLoginEmail, password: 'BrandNew@2' })).status).toBe(200);
  });
});

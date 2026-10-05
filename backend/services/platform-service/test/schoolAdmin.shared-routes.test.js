import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;

const auth = (token) => ({ Authorization: `Bearer ${token}` });

// Routes the School Admin panel shares with the Principal panel. They sit behind
// requirePrincipal, which must let a School Admin token through as well.
const SHARED = [
  '/school-portal/dashboard/summary',
  '/school-portal/students',
  '/school-portal/users',
  '/school-portal/exams',
  '/school-portal/timetable',
  '/school-portal/notifications',
  '/school-portal/events',
  '/school-portal/homework',
];

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);

afterAll(disconnect);

describe('Routes shared by School Admin and Principal', () => {
  it('a School Admin token is accepted', async () => {
    for (const path of SHARED) {
      const res = await request(app).get(path).set(auth(ctx.a.adminToken));
      expect(res.status, path).toBe(200);
    }
  });

  it('the School Admin only sees their own school', async () => {
    const res = await request(app).get('/school-portal/students').set(auth(ctx.a.adminToken));
    const body = JSON.stringify(res.body);
    expect(body).toContain(ctx.a.studentId);
    expect(body).not.toContain(ctx.b.studentId);
  });

  it('other roles are still refused', async () => {
    for (const token of [ctx.a.token, ctx.a.studentToken, ctx.a.parentToken]) {
      const res = await request(app).get('/school-portal/students').set(auth(token));
      expect(res.status).toBe(403);
    }
  });
});

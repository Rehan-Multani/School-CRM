import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let logo;
const APP = { 'X-Brand-Assets': 'url' };
const login = () => ({ identifier: ctx.a.studentLoginEmail, password: ctx.a.studentPassword });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  const png = await sharp({ create: { width: 600, height: 300, channels: 4, background: '#1D4ED8' } }).png().toBuffer();
  logo = `data:image/png;base64,${png.toString('base64')}`;
  const { School } = await import('../src/models/School.js');
  await School.updateOne({ _id: ctx.a.schoolId }, { $set: { 'settings.portalBranding.logo': logo, 'settings.portalBranding.favicon': logo } });
}, 60000);
afterAll(disconnect);

describe('School logo as a link (X-Brand-Assets: url)', () => {
  it('web panels (no header) still receive the inline data URI', async () => {
    const res = await request(app).post('/school-portal/auth/student-login').send(login());
    expect(res.status).toBe(200);
    expect(res.body.school.branding.logo).toBe(logo);
    const theme = await request(app).get(`/school-theme/${ctx.a.schoolId}`);
    expect(theme.body.data.branding.logo).toBe(logo);
  });

  it('the app gets a logo link in login, me and theme — never the bytes', async () => {
    const res = await request(app).post('/school-portal/auth/student-login').set(APP).send(login());
    expect(res.status).toBe(200);
    const link = res.body.school.branding.logo;
    expect(link).toMatch(new RegExp(`^/school-theme/${ctx.a.schoolId}/logo\\?v=[0-9a-f]{12}$`));
    expect(res.body.school.branding.favicon).toBe('');

    const me = await request(app)
      .get('/school-portal/student/me')
      .set({ ...APP, Authorization: `Bearer ${res.body.token}` });
    expect(me.body.data.school.branding.logo).toBe(link);

    const theme = await request(app).get(`/school-theme/${ctx.a.schoolId}`).set(APP);
    expect(theme.body.data.branding.logo).toMatch(/^\/school-theme\/.+\/logo\?v=[0-9a-f]{12}$/);
    expect(JSON.stringify(theme.body)).not.toContain('base64');
  });

  it('serves the logo as a small, long-cached PNG and answers 304 on revalidation', async () => {
    const theme = await request(app).get(`/school-theme/${ctx.a.schoolId}`).set(APP);
    const res = await request(app).get(theme.body.data.branding.logo);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toContain('immutable');
    const meta = await sharp(res.body).metadata();
    expect(meta.width).toBe(256);
    expect(meta.height).toBe(128);

    const again = await request(app).get(theme.body.data.branding.logo).set('If-None-Match', res.headers.etag);
    expect(again.status).toBe(304);

    // A stale / missing version still works, but is only cached briefly.
    const unversioned = await request(app).get(`/school-theme/${ctx.a.schoolId}/logo`);
    expect(unversioned.status).toBe(200);
    expect(unversioned.headers['cache-control']).toBe('public, max-age=300');
  });

  it('404s when the school has no uploaded logo', async () => {
    const res = await request(app).get(`/school-theme/${ctx.b.schoolId}/logo`);
    expect(res.status).toBe(404);
  });
});

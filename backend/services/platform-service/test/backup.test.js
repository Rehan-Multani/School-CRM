import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { EJSON } from 'bson';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

// A school's backup must contain only that school's rows (and no credentials);
// the Super Admin's backup is the whole database.
let app;
let ctx;
let superToken;

const binary = (res, cb) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

const download = async (path, token) => {
  const res = await request(app).get(path).set('Authorization', `Bearer ${token}`).buffer(true).parse(binary);
  return res;
};
const parse = (res) => EJSON.parse(res.body.toString('utf8'), { relaxed: false });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  const { signAccessToken } = await import('../../shared/generateToken.js');
  const { env } = await import('../src/config/env.js');
  superToken = signAccessToken(
    { sub: 'superadmin123', role: 'SuperAdmin', email: 'sa@schoolcrm.com' },
    { secret: env.jwtSecret, expiresIn: '1h' }
  );
}, 120000);

afterAll(disconnect);

describe('School backup', () => {
  it("contains only the caller's school and no credentials", async () => {
    const res = await download('/school-portal/backup/download', ctx.a.adminToken);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/school-backup-.*\.json\"/);

    const doc = parse(res);
    expect(doc.meta.type).toBe('SCHOOL_BACKUP');
    expect(doc.meta.schoolId).toBe(ctx.a.schoolId);

    // every exported row belongs to school A
    for (const [name, rows] of Object.entries(doc.collections)) {
      for (const row of rows) {
        if (name === 'schools') expect(String(row._id)).toBe(ctx.a.schoolId);
        else if (name === 'invoices') expect(String(row.school)).toBe(ctx.a.schoolId);
        else expect(String(row.schoolId)).toBe(ctx.a.schoolId);
      }
    }
    expect(doc.collections.students?.length).toBeGreaterThan(0);

    // no secrets anywhere in the file
    const text = JSON.stringify(doc.collections);
    expect(text).not.toMatch(/passwordHash/);
    expect(text).not.toMatch(/"tokenVersion"/);
  });

  it("school B's backup never includes school A's rows", async () => {
    // wait out the per-school cooldown is per school; B is a different key
    const res = await download('/school-portal/backup/download', ctx.b.adminToken);
    expect(res.status).toBe(200);
    const doc = parse(res);
    const ids = new Set(Object.values(doc.collections).flat().map((r) => String(r._id)));
    expect(ids.has(ctx.a.studentId)).toBe(false);
    expect(ids.has(ctx.b.studentId)).toBe(true);
  });

  it('a second backup right away is rate limited', async () => {
    const res = await request(app).get('/school-portal/backup/download').set('Authorization', `Bearer ${ctx.a.adminToken}`);
    expect(res.status).toBe(429);
  });

  it('is closed to non-admins', async () => {
    expect((await request(app).get('/school-portal/backup/download').set('Authorization', `Bearer ${ctx.a.studentToken}`)).status).toBeGreaterThanOrEqual(401);
    expect((await request(app).get('/school-portal/backup/download')).status).toBe(401);
  });

  it('summary lists record counts for this school only', async () => {
    const res = await request(app).get('/school-portal/backup/summary').set('Authorization', `Bearer ${ctx.a.adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.scope).toBe('SCHOOL');
    expect(res.body.data.totalRecords).toBeGreaterThan(0);
  });
});

describe('Full backup', () => {
  it('Super Admin gets every school; a school admin is refused', async () => {
    const denied = await request(app).get('/superadmin/backup/download').set('Authorization', `Bearer ${ctx.a.adminToken}`);
    expect(denied.status).toBeGreaterThanOrEqual(401);

    const res = await download('/superadmin/backup/download', superToken);
    expect(res.status).toBe(200);
    const doc = parse(res);
    expect(doc.meta.type).toBe('FULL_BACKUP');
    const ids = new Set(Object.values(doc.collections).flat().map((r) => String(r._id)));
    expect(ids.has(ctx.a.studentId)).toBe(true);
    expect(ids.has(ctx.b.studentId)).toBe(true);
  });
});

describe('Principal backup access', () => {
  let principalToken;
  beforeAll(async () => {
    const { signAccessToken } = await import('../../shared/generateToken.js');
    const { env } = await import('../src/config/env.js');
    const { SchoolUser } = await import('../src/models/SchoolUser.js');
    const p = await SchoolUser.create({
      schoolId: ctx.a.schoolId, name: 'Prin Cipal', firstName: 'Prin', lastName: 'Cipal', employeeId: 'PR-1',
      email: 'prin1@schoola.edu', role: 'PRINCIPAL', status: 'ACTIVE', password: 'Password@123',
    });
    principalToken = signAccessToken(
      { sub: p._id.toString(), userId: p._id.toString(), schoolId: ctx.a.schoolId, role: 'PRINCIPAL', name: p.name },
      { secret: env.jwtSecret, expiresIn: '1h' }
    );
  });
  const get = (path, token) => request(app).get(path).set('Authorization', `Bearer ${token}`);

  it('is blocked until the School Admin switches it on, then works, then blocks again', async () => {
    expect((await get('/school-portal/principal/backup/access', principalToken)).body.data.enabled).toBe(false);
    expect((await get('/school-portal/principal/backup/summary', principalToken)).status).toBe(403);

    const on = await request(app).put('/school-portal/backup/principal-access').set('Authorization', `Bearer ${ctx.a.adminToken}`).send({ enabled: true });
    expect(on.status).toBe(200);
    expect((await get('/school-portal/principal/backup/access', principalToken)).body.data.enabled).toBe(true);
    const sum = await get('/school-portal/principal/backup/summary', principalToken);
    expect(sum.status).toBe(200);
    expect(sum.body.data.scope).toBe('SCHOOL');

    await request(app).put('/school-portal/backup/principal-access').set('Authorization', `Bearer ${ctx.a.adminToken}`).send({ enabled: false });
    expect((await get('/school-portal/principal/backup/summary', principalToken)).status).toBe(403);
  });
});

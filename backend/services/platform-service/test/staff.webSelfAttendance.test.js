/**
 * Accountant / HR / Librarian mark their own attendance from the web panel,
 * only inside the radius the School Admin set. No fingerprint on web.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { SchoolUser } from '../src/models/SchoolUser.js';
import { School } from '../src/models/School.js';
import { StaffAttendance } from '../src/models/StaffAttendance.js';
import { PlatformNotification } from '../src/models/PlatformNotification.js';
import { signAccessToken } from '../../shared/generateToken.js';
import { env } from '../src/config/env.js';

let app;
let ctx;
let slug;
const tokens = {};
const auth = (t) => ({ Authorization: `Bearer ${t}` });

const SCHOOL = { latitude: 23.2599, longitude: 77.4126 };
const INSIDE = { ...SCHOOL, accuracy: 20 };
const OUTSIDE = { latitude: SCHOOL.latitude + 0.01, longitude: SCHOOL.longitude, accuracy: 20 };

const PANELS = [
  { key: 'accountant', role: 'ACCOUNTANT', path: '/school-portal/accountant/self-attendance', label: 'Accountant' },
  { key: 'hr', role: 'HR', path: '/school-portal/hr/self-attendance', label: 'HR' },
  { key: 'librarian', role: 'LIBRARIAN', path: '/school-portal/library/self-attendance', label: 'Librarian' },
];

async function makeStaff(panel, n) {
  const user = await SchoolUser.create({
    schoolId: ctx.a.schoolId, employeeId: `WEB-${n}`, firstName: panel.label, lastName: 'Staff', name: `${panel.label} Staff`,
    email: `${panel.key}.web@schoola.edu`, role: panel.role, phone: `98112000${n}0`, status: 'ACTIVE',
    passwordHash: 'x'.repeat(60),
  });
  tokens[panel.key] = signAccessToken(
    { sub: user._id.toString(), userId: user._id.toString(), role: panel.role, schoolId: ctx.a.schoolId, name: user.name, tv: user.tokenVersion || 0 },
    { secret: env.jwtSecret, expiresIn: '1h' },
  );
  return user;
}

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  slug = (await School.findById(ctx.a.schoolId).select('schoolId').lean()).schoolId;
  for (const [i, panel] of PANELS.entries()) await makeStaff(panel, i + 1);
}, 60000);
afterAll(disconnect);

describe('Web staff self attendance', () => {
  it('is not enabled until the School Admin sets the radius', async () => {
    const res = await request(app).get(`${PANELS[0].path}/today`).set(auth(tokens.accountant));
    expect(res.status).toBe(200);
    expect(res.body.data.config.enabled).toBe(false);

    const mark = await request(app).post(`${PANELS[0].path}/check-in`).set(auth(tokens.accountant)).send(INSIDE);
    expect(mark.status).toBe(409);
    expect(mark.body.code).toBe('GEOFENCE_NOT_CONFIGURED');
  });

  it('School Admin turns it on (with the fingerprint requirement left on)', async () => {
    const res = await request(app)
      .put('/school-portal/settings/attendance-geofence')
      .set(auth(ctx.a.adminToken))
      .send({ enabled: true, ...SCHOOL, radiusMeters: 120, requireBiometric: true });
    expect(res.status).toBe(200);
  });

  for (const panel of PANELS) {
    it(`${panel.label}: refused outside the radius, accepted inside (no fingerprint needed on web)`, async () => {
      const far = await request(app).post(`${panel.path}/check-in`).set(auth(tokens[panel.key])).send(OUTSIDE);
      expect(far.status).toBe(403);
      expect(far.body.code).toBe('OUTSIDE_GEOFENCE');

      const mocked = await request(app).post(`${panel.path}/check-in`).set(auth(tokens[panel.key])).send({ ...INSIDE, mocked: true });
      expect(mocked.status).toBe(403);

      const ok = await request(app).post(`${panel.path}/check-in`).set(auth(tokens[panel.key])).send(INSIDE);
      expect(ok.status).toBe(200);
      expect(ok.body.data.record).toMatchObject({ status: 'PRESENT', checkedIn: true, method: 'APP_GEOFENCE' });

      const again = await request(app).post(`${panel.path}/check-in`).set(auth(tokens[panel.key])).send(INSIDE);
      expect(again.body.data.alreadyDone).toBe(true);

      const row = await StaffAttendance.find({ schoolId: ctx.a.schoolId, employeeName: `${panel.label} Staff` });
      expect(row).toHaveLength(1);
      expect(row[0].employeeType).toBe('STAFF');
      expect(row[0].employeeRole).toBe(panel.label);
    });
  }

  it('notifies the principal + school admin once per person', async () => {
    const notes = await PlatformNotification.find({ schoolId: slug, audiences: 'principal', title: /present · .*Staff/ }).lean();
    expect(notes).toHaveLength(3);
    expect(notes.map((n) => n.title).join(' ')).toMatch(/Accountant present/);
  });

  it('a School Admin token cannot mark "own" attendance through a staff panel route', async () => {
    const res = await request(app).post(`${PANELS[1].path}/check-in`).set(auth(ctx.a.adminToken)).send(INSIDE);
    expect(res.status).toBe(403);
  });

  it('one staff role cannot use another panel\'s route', async () => {
    const res = await request(app).post(`${PANELS[2].path}/check-in`).set(auth(tokens.hr)).send(INSIDE);
    expect([401, 403]).toContain(res.status);
  });
});

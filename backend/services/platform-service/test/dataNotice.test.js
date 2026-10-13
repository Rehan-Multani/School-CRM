/**
 * Data-cleanup notice: shown on the School Admin / Principal dashboard only
 * when the school's stored data crosses the Super Admin's MB threshold, and it
 * never carries numbers or plan wording.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { signAccessToken } from '../../shared/generateToken.js';
import { env } from '../src/config/env.js';

let ctx;
let app;
let platformSettingService;
let clearDataUsageCache;
let principalToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ platformSettingService } = await import('../src/services/platformSetting.service.js'));
  ({ clearDataUsageCache } = await import('../src/services/dataUsage.service.js'));
  const { SchoolUser } = await import('../src/models/SchoolUser.js');
  const principal = await SchoolUser.create({
    schoolId: ctx.a.schoolId, employeeId: 'PR-DN', firstName: 'Pri', lastName: 'Ncipal', name: 'Pri Ncipal',
    email: 'principal.dn@schoola.edu', role: 'PRINCIPAL', phone: '9811300077', status: 'ACTIVE', passwordHash: 'x'.repeat(60),
  });
  principalToken = signAccessToken(
    { sub: principal._id.toString(), userId: principal._id.toString(), role: 'PRINCIPAL', schoolId: ctx.a.schoolId, name: principal.name, tv: principal.tokenVersion || 0 },
    { secret: env.jwtSecret, expiresIn: '1h' },
  );
}, 120000);
afterAll(disconnect);
beforeEach(() => clearDataUsageCache());

const getNotice = () => request(app).get('/school-portal/data-notice').set(auth(principalToken));

describe('data cleanup notice', () => {
  it('is off while the Super Admin limit is 0', async () => {
    await platformSettingService.updateSettings({ dataWarningMb: 0 }, 'test');
    const res = await getNotice();
    expect(res.status).toBe(200);
    expect(res.body.data.show).toBe(false);
  });

  it('shows once the school data reaches the limit, with no numbers or plan wording', async () => {
    await platformSettingService.updateSettings({ dataWarningMb: 0.01 }, 'test'); // ~10 KB
    const res = await getNotice();
    expect(res.body.data.show).toBe(true);
    const text = JSON.stringify(res.body.data).toLowerCase();
    expect(text).not.toMatch(/upgrade|plan|limit|\bmb\b/);
    expect(Object.keys(res.body.data).sort()).toEqual(['message', 'show', 'title']);
  });

  it('stays hidden while under the limit', async () => {
    await platformSettingService.updateSettings({ dataWarningMb: 5000 }, 'test');
    const res = await getNotice();
    expect(res.body.data.show).toBe(false);
  });

  it('keeps the limit out of the public app-config', async () => {
    await platformSettingService.updateSettings({ dataWarningMb: 123 }, 'test');
    const res = await request(app).get('/app-config');
    expect(JSON.stringify(res.body)).not.toContain('dataWarningMb');
    expect(await platformSettingService.getDataWarningMb()).toBe(123);
  });
});

import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { smsService } from '../src/services/sms.service.js';
import { env } from '../src/config/env.js';

/**
 * Demo accounts: ONLY the numbers listed in LOGIN_DEMO_NUMBERS sign in with the
 * fixed demo OTP (and get no SMS). Every other number gets a random OTP by SMS,
 * and the fixed 123456 must NOT work for them — not even on a non-production
 * host. Runs with the runner's static pin lifted so the real (random) rules apply.
 */
let app;
let ctx;
const GUARDIAN_MOBILE = '9876500000'; // a student's parentPhone (guardian), not a demo number

const requestOtp = (body) => request(app).post('/school-portal/auth/otp-login/request').send(body);
const verify = (body) => request(app).post('/school-portal/auth/otp-login/verify').send(body);

let saved;
beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);
beforeEach(async () => {
  // no login session left over from the previous test (resend cooldown / hourly SMS cap)
  const { LoginOtp } = await import('../src/models/LoginOtp.js');
  await LoginOtp.deleteMany({});
  saved = { mode: env.loginOtp.otpMode, demoNumbers: env.loginOtp.demoNumbers, demoOtp: env.loginOtp.demoOtp };
  env.loginOtp.otpMode = 'random'; // production-like OTP rules
  env.loginOtp.demoNumbers = [ctx.a.parentPhone];
  env.loginOtp.demoOtp = '123456';
});
afterEach(() => {
  env.loginOtp.otpMode = saved.mode;
  env.loginOtp.demoNumbers = saved.demoNumbers;
  env.loginOtp.demoOtp = saved.demoOtp;
  vi.restoreAllMocks();
});

const spySms = () => vi.spyOn(smsService, 'sendSms').mockResolvedValue({ delivered: true, provider: 'test' });

describe('Demo number sign-in (fixed OTP, no SMS)', () => {
  it('a listed demo number signs in with 123456, receives no SMS, and the response never echoes an OTP', async () => {
    const sms = spySms();
    const res = await requestOtp({ role: 'PARENT', mobile: ctx.a.parentPhone });
    expect(res.status).toBe(200);
    expect(sms).not.toHaveBeenCalled();
    expect(res.body.data).not.toHaveProperty('otp');

    const ok = await verify({ role: 'PARENT', mobile: ctx.a.parentPhone, otp: '123456' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.parent.id).toBe(ctx.a.parentId);
  });

  it('a wrong code is still rejected for a demo number', async () => {
    spySms();
    await requestOtp({ role: 'PARENT', mobile: ctx.a.parentPhone });
    const bad = await verify({ role: 'PARENT', mobile: ctx.a.parentPhone, otp: '654321' });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('OTP_INVALID');
  });

  it('the demo OTP is configurable', async () => {
    env.loginOtp.demoOtp = '424242';
    spySms();
    await requestOtp({ role: 'PARENT', mobile: ctx.a.parentPhone });
    expect((await verify({ role: 'PARENT', mobile: ctx.a.parentPhone, otp: '123456' })).status).toBe(400);
    const ok = await verify({ role: 'PARENT', mobile: ctx.a.parentPhone, otp: '424242' });
    expect(ok.status).toBe(200);
  });
});

describe('Every other number stays dynamic', () => {
  it('a non-demo number gets a random OTP by SMS and 123456 does NOT work', async () => {
    const sms = spySms();
    const res = await requestOtp({ role: 'PARENT', mobile: GUARDIAN_MOBILE });
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('otp');
    expect(sms).toHaveBeenCalledTimes(1);
    const sent = sms.mock.calls[0][0].otp;
    expect(sent).toMatch(/^\d{6}$/);

    if (sent !== '123456') {
      const fixed = await verify({ role: 'PARENT', mobile: GUARDIAN_MOBILE, otp: '123456' });
      expect(fixed.status).toBe(400);
      expect(fixed.body.code).toBe('OTP_INVALID');
    }
    const real = await verify({ role: 'PARENT', mobile: GUARDIAN_MOBILE, otp: sent });
    expect(real.status).toBe(200);
  });

  it('with the demo list empty, 123456 works for nobody (feature off by default)', async () => {
    env.loginOtp.demoNumbers = [];
    const sms = spySms();
    await requestOtp({ role: 'PARENT', mobile: ctx.a.parentPhone });
    expect(sms).toHaveBeenCalledTimes(1);
    const sent = sms.mock.calls[0][0].otp;
    if (sent !== '123456') {
      expect((await verify({ role: 'PARENT', mobile: ctx.a.parentPhone, otp: '123456' })).status).toBe(400);
    }
  });

  it('a demo number does not unlock other numbers in the list (exact match only)', async () => {
    env.loginOtp.demoNumbers = ['9000011111'];
    const sms = spySms();
    await requestOtp({ role: 'PARENT', mobile: ctx.a.parentPhone });
    expect(sms).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { smsService } from '../src/services/sms.service.js';

let app;
let ctx;

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);
afterEach(() => vi.restoreAllMocks());

/** Spy on the SMS provider and return the OTP from the last message it was handed. */
function captureSms() {
  const spy = vi.spyOn(smsService, 'sendSms').mockResolvedValue({ delivered: true, provider: 'test' });
  return {
    spy,
    lastOtp: () => spy.mock.calls.at(-1)?.[0]?.message.match(/^(\d{6})/)?.[1],
    lastPhone: () => spy.mock.calls.at(-1)?.[0]?.phone,
  };
}

const forgot = (body) => request(app).post('/school-portal/auth/forgot-password').send(body);
const verify = (body) => request(app).post('/school-portal/auth/verify-reset-otp').send(body);
const reset = (body) => request(app).post('/school-portal/auth/reset-password').send(body);

async function fullReset(role, identifier, newPassword) {
  const sms = captureSms();
  const f = await forgot({ role, identifier });
  expect(f.status).toBe(200);
  const otp = sms.lastOtp();
  expect(otp).toMatch(/^\d{6}$/);
  const v = await verify({ role, identifier, otp });
  expect(v.status).toBe(200);
  const r = await reset({ resetToken: v.body.data.resetToken, newPassword });
  expect(r.status).toBe(200);
  return { sms, resetToken: v.body.data.resetToken };
}

describe('App forgot-password (mobile OTP)', () => {
  it('teacher: OTP → verify → reset, then logs in with the new password', async () => {
    const { sms, resetToken } = await fullReset('TEACHER', 'teacher@schoola.edu', 'NewTeach@123');
    expect(sms.lastPhone()).toBe('9999999999');

    const login = await request(app)
      .post('/school-portal/auth/teacher-login')
      .send({ identifier: 'teacher@schoola.edu', password: 'NewTeach@123' });
    expect(login.status).toBe(200);

    // The reset token is single-use.
    const again = await reset({ resetToken, newPassword: 'Another@123' });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('RESET_TOKEN_INVALID');
  });

  it('student without own phone gets the OTP on the guardian mobile', async () => {
    const { sms } = await fullReset('STUDENT', ctx.a.studentLoginEmail, 'NewStud@123');
    expect(sms.lastPhone()).toBe('9876500000');
    const login = await request(app)
      .post('/school-portal/auth/student-login')
      .send({ identifier: ctx.a.studentLoginEmail, password: 'NewStud@123' });
    expect(login.status).toBe(200);
  });

  it('parent resets by phone number', async () => {
    await fullReset('PARENT', ctx.a.parentPhone, 'NewParent@123');
    const login = await request(app)
      .post('/school-portal/auth/parent-login')
      .send({ identifier: ctx.a.parentPhone, password: 'NewParent@123' });
    expect(login.status).toBe(200);
  });

  it('driver resets by mobile (with +91 prefix)', async () => {
    const { sms } = await fullReset('DRIVER', `+91 ${ctx.a.driverMobile}`, 'NewDriver@123');
    expect(sms.lastPhone()).toBe(ctx.a.driverMobile);
    const login = await request(app)
      .post('/school-portal/auth/driver-login')
      .send({ mobile: ctx.a.driverMobile, password: 'NewDriver@123' });
    expect(login.status).toBe(200);
  });

  it('unknown account gets the same generic 200 and no SMS', async () => {
    const sms = captureSms();
    const res = await forgot({ role: 'TEACHER', identifier: 'nobody@nowhere.edu' });
    expect(res.status).toBe(200);
    expect(res.body.data.otpLength).toBe(6);
    expect(sms.spy).not.toHaveBeenCalled();

    const v = await verify({ role: 'TEACHER', identifier: 'nobody@nowhere.edu', otp: '123456' });
    expect(v.status).toBe(400);
    expect(v.body.code).toBe('OTP_INVALID');
  });

  it('rejects a bad role', async () => {
    const res = await forgot({ role: 'ACCOUNTANT', identifier: 'x' });
    expect(res.status).toBe(400);
  });

  it('resend within cooldown sends no second SMS', async () => {
    const sms = captureSms();
    await forgot({ role: 'PARENT', identifier: ctx.b.parentLoginEmail });
    await forgot({ role: 'PARENT', identifier: ctx.b.parentLoginEmail });
    expect(sms.spy).toHaveBeenCalledTimes(1);
  });

  it('locks the OTP after 5 wrong attempts', async () => {
    const sms = captureSms();
    await forgot({ role: 'DRIVER', identifier: ctx.b.driverMobile });
    const otp = sms.lastOtp();
    const wrong = otp === '000000' ? '111111' : '000000';

    let res;
    for (let i = 0; i < 5; i += 1) res = await verify({ role: 'DRIVER', identifier: ctx.b.driverMobile, otp: wrong });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('OTP_LOCKED');

    // Even the right code is dead now.
    const right = await verify({ role: 'DRIVER', identifier: ctx.b.driverMobile, otp });
    expect(right.status).toBe(400);
  });

  it('rejects a short new password', async () => {
    const sms = captureSms();
    await forgot({ role: 'STUDENT', identifier: ctx.b.studentLoginEmail });
    const v = await verify({ role: 'STUDENT', identifier: ctx.b.studentLoginEmail, otp: sms.lastOtp() });
    const res = await reset({ resetToken: v.body.data.resetToken, newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PASSWORD_TOO_SHORT');
  });
});

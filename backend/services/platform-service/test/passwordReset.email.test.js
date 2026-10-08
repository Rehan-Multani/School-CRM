/**
 * Forgot-password OTP by EMAIL for teacher / principal / transport manager
 * (student and parent stay on SMS — see passwordReset.test.js). The mailer is
 * mocked: no real email is sent. Kept in its own file because the reset
 * endpoints are rate limited per IP (30/hour) and each test file gets its own
 * limiter instance.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { smsService } from '../src/services/sms.service.js';
import { sendPasswordResetOtpEmail } from '../src/config/mailer.js';

vi.mock('../src/config/mailer.js', async (importOriginal) => ({
  ...(await importOriginal()),
  sendPasswordResetOtpEmail: vi.fn(async () => true),
}));

let app;
let ctx;

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);
afterEach(() => {
  vi.restoreAllMocks();
  sendPasswordResetOtpEmail.mockClear();
});

function captureSms() {
  const spy = vi.spyOn(smsService, 'sendSms').mockResolvedValue({ delivered: true, provider: 'test' });
  return { spy };
}

/** The OTP / recipient of the last reset email. */
const lastEmail = () => sendPasswordResetOtpEmail.mock.calls.at(-1)?.[0];

const forgot = (body) => request(app).post('/school-portal/auth/forgot-password').send(body);
const verify = (body) => request(app).post('/school-portal/auth/verify-reset-otp').send(body);
const reset = (body) => request(app).post('/school-portal/auth/reset-password').send(body);

async function fullEmailReset(role, identifier, newPassword) {
  const sms = captureSms();
  const f = await forgot({ role, identifier });
  expect(f.status).toBe(200);
  expect(f.body.data.channel).toBe('EMAIL');
  expect(f.body.data.message).toMatch(/registered email address/);
  const mail = lastEmail();
  expect(mail?.otp).toMatch(/^\d{6}$/);
  expect(sms.spy).not.toHaveBeenCalled(); // email roles never get an SMS
  const v = await verify({ role, identifier, otp: mail.otp });
  expect(v.status).toBe(200);
  const r = await reset({ resetToken: v.body.data.resetToken, newPassword });
  expect(r.status).toBe(200);
  return { mail, resetToken: v.body.data.resetToken };
}

async function makeStaff(role, email, extra = {}) {
  const { SchoolUser } = await import('../src/models/SchoolUser.js');
  return SchoolUser.create({
    schoolId: ctx.a.schoolId,
    employeeId: `RST-${role}-${Math.random().toString(36).slice(2, 7)}`,
    firstName: 'Reset',
    lastName: role,
    name: `Reset ${role}`,
    email,
    role,
    phone: '9811100077',
    status: 'ACTIVE',
    passwordHash: await bcrypt.hash('OldPass@123', 10),
    ...extra,
  });
}

describe('Forgot-password by EMAIL (teacher, principal, transport manager)', () => {
  it('teacher: OTP arrives by EMAIL (not SMS) → verify → reset, then logs in with the new password', async () => {
    const { mail, resetToken } = await fullEmailReset('TEACHER', 'teacher@schoola.edu', 'NewTeach@123');
    expect(mail.to).toBe('teacher@schoola.edu');

    const login = await request(app)
      .post('/school-portal/auth/teacher-login')
      .send({ identifier: 'teacher@schoola.edu', password: 'NewTeach@123' });
    expect(login.status).toBe(200);

    // The reset token is single-use.
    const again = await reset({ resetToken, newPassword: 'Another@123' });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('RESET_TOKEN_INVALID');
  });

  it('principal and transport manager reset by EMAIL too, and can sign in with the new password', async () => {
    await makeStaff('PRINCIPAL', 'principal.reset@schoola.edu');
    const p = await fullEmailReset('PRINCIPAL', 'principal.reset@schoola.edu', 'NewPrinc@123');
    expect(p.mail.to).toBe('principal.reset@schoola.edu');
    const pl = await request(app).post('/school-portal/auth/principal-login').send({ email: 'principal.reset@schoola.edu', password: 'NewPrinc@123' });
    expect(pl.status).toBe(200);

    await makeStaff('TRANSPORT', 'transport.reset@schoola.edu');
    const t = await fullEmailReset('TRANSPORT', 'transport.reset@schoola.edu', 'NewTrans@123');
    expect(t.mail.to).toBe('transport.reset@schoola.edu');
    const tl = await request(app).post('/school-portal/auth/transport-login').send({ email: 'transport.reset@schoola.edu', password: 'NewTrans@123' });
    expect(tl.status).toBe(200);
  });

  it('student and parent still get SMS, never email', async () => {
    const sms = captureSms();
    const s = await forgot({ role: 'STUDENT', identifier: ctx.a.studentLoginEmail });
    expect(s.body.data.channel).toBe('SMS');
    expect(s.body.data.message).toMatch(/registered mobile number/);
    const p = await forgot({ role: 'PARENT', identifier: ctx.a.parentPhone });
    expect(p.body.data.channel).toBe('SMS');
    expect(sms.spy).toHaveBeenCalledTimes(2);
    expect(sendPasswordResetOtpEmail).not.toHaveBeenCalled();
    // leave no live reset session behind (it would put the next test in the resend cooldown)
    const { PasswordResetOtp } = await import('../src/models/PasswordResetOtp.js');
    await PasswordResetOtp.deleteMany({});
  });

  it('an email-role account with no usable email gets the same generic answer and nothing is sent', async () => {
    const sms = captureSms();
    await makeStaff('PRINCIPAL', 'no-valid-mail', { email: 'not-an-email' });
    // a principal found by employee id whose stored email is not a valid address
    const { SchoolUser } = await import('../src/models/SchoolUser.js');
    const doc = await SchoolUser.findOne({ role: 'PRINCIPAL', email: 'not-an-email' }).lean();
    const res = await forgot({ role: 'PRINCIPAL', identifier: doc.employeeId });
    expect(res.status).toBe(200);
    expect(res.body.data.channel).toBe('EMAIL');
    expect(res.body.data.otpLength).toBe(6);
    expect(sendPasswordResetOtpEmail).not.toHaveBeenCalled();
    expect(sms.spy).not.toHaveBeenCalled();
  });

  it('a mail-server failure still returns the generic answer (nothing about the account leaks)', async () => {
    sendPasswordResetOtpEmail.mockRejectedValueOnce(new Error('SMTP down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await forgot({ role: 'TEACHER', identifier: 'teacher@schoola.edu' });
    spy.mockRestore();
    expect(res.status).toBe(200);
    expect(res.body.data.channel).toBe('EMAIL');
  });

  it('the email resend cooldown applies (second request within 30s sends no second email)', async () => {
    await forgot({ role: 'TEACHER', identifier: ctx.b.teacherLoginEmail || 'teacher@schoolb.edu' });
    await forgot({ role: 'TEACHER', identifier: ctx.b.teacherLoginEmail || 'teacher@schoolb.edu' });
    expect(sendPasswordResetOtpEmail.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

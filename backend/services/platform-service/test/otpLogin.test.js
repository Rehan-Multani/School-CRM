import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { smsService } from '../src/services/sms.service.js';
import { Student } from '../src/models/Student.js';
import { Parent } from '../src/models/Parent.js';

let app;
let ctx;

const STUDENT_MOBILE = '9811100001';
const SIBLING_MOBILE = '9811100002';
const GUARDIAN_MOBILE = '9876500000'; // fixture `parentPhone` of a student in BOTH schools

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  await Student.updateOne({ _id: ctx.a.studentId }, { $set: { phone: STUDENT_MOBILE } });
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

const requestOtp = (body) => request(app).post('/school-portal/auth/otp-login/request').send(body);
const verify = (body) => request(app).post('/school-portal/auth/otp-login/verify').send(body);
const select = (body) => request(app).post('/school-portal/auth/otp-login/select').send(body);
const me = (role, token) =>
  request(app).get(`/school-portal/${role}/me`).set('Authorization', `Bearer ${token}`);

async function otpFor(role, mobile) {
  const sms = captureSms();
  const res = await requestOtp({ role, mobile });
  expect(res.status).toBe(200);
  return { sms, otp: sms.lastOtp() };
}

describe('Student / parent sign-in by mobile OTP', () => {
  it('student signs in with their own mobile, and the OTP works only once', async () => {
    const { sms, otp } = await otpFor('STUDENT', `+91 ${STUDENT_MOBILE}`);
    expect(otp).toMatch(/^\d{6}$/);
    expect(sms.lastPhone()).toBe(STUDENT_MOBILE);

    const res = await verify({ role: 'STUDENT', mobile: STUDENT_MOBILE, otp });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('STUDENT');
    expect(res.body.data.school.id).toBe(ctx.a.schoolId);

    const profile = await me('student', res.body.data.token);
    expect(profile.status).toBe(200);

    const again = await verify({ role: 'STUDENT', mobile: STUDENT_MOBILE, otp });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('OTP_INVALID');
  });

  it('parent with a Parent record signs in by its phone', async () => {
    const { otp } = await otpFor('PARENT', ctx.a.parentPhone);
    const res = await verify({ role: 'PARENT', mobile: ctx.a.parentPhone, otp });
    expect(res.status).toBe(200);
    expect(res.body.data.parent.id).toBe(ctx.a.parentId);
    expect(res.body.data.children).toHaveLength(1);
  });

  it('guardian number from admission: parent is created, linked, and picks the school', async () => {
    expect(await Parent.countDocuments({ phone: GUARDIAN_MOBILE })).toBe(0);
    const { otp } = await otpFor('PARENT', GUARDIAN_MOBILE);
    const res = await verify({ role: 'PARENT', mobile: GUARDIAN_MOBILE, otp });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.needsSelection).toBe(true);
    expect(res.body.data.accounts).toHaveLength(2);
    expect(res.body.data.accounts.map((a) => a.schoolName).sort()).toEqual(['School A', 'School B']);

    // An account id that is not one of this number's accounts is refused.
    const foreign = await select({ selectionToken: res.body.data.selectionToken, accountId: ctx.a.parentId });
    expect(foreign.status).toBe(400);

    const created = await Parent.findOne({ phone: GUARDIAN_MOBILE, schoolId: ctx.b.schoolId });
    const chosen = await select({ selectionToken: res.body.data.selectionToken, accountId: created._id.toString() });
    expect(chosen.status).toBe(200);
    expect(chosen.body.data.school.id).toBe(ctx.b.schoolId);
    expect(chosen.body.data.parent.name).toBe('Sam Parent');
    expect(chosen.body.data.children.map((c) => c.childId)).toContain(ctx.b.studentId);

    const profile = await me('parent', chosen.body.data.token);
    expect(profile.status).toBe(200);

    // The selection token is single-use.
    const reuse = await select({ selectionToken: res.body.data.selectionToken, accountId: created._id.toString() });
    expect(reuse.status).toBe(400);
    expect(reuse.body.code).toBe('SELECTION_INVALID');
  });

  it('an unregistered number gets the same generic 200 and no SMS', async () => {
    const sms = captureSms();
    const res = await requestOtp({ role: 'STUDENT', mobile: '9000000001' });
    expect(res.status).toBe(200);
    expect(res.body.data.otpLength).toBe(6);
    expect(sms.spy).not.toHaveBeenCalled();

    const v = await verify({ role: 'STUDENT', mobile: '9000000001', otp: '123456' });
    expect(v.status).toBe(400);
    expect(v.body.code).toBe('OTP_INVALID');
  });

  it('rejects a malformed mobile and a role that does not use OTP login', async () => {
    const bad = await requestOtp({ role: 'STUDENT', mobile: '12345' });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVALID_MOBILE');

    const teacher = await requestOtp({ role: 'TEACHER', mobile: '9999999999' });
    expect(teacher.status).toBe(400);
    const driver = await requestOtp({ role: 'DRIVER', mobile: ctx.a.driverMobile });
    expect(driver.status).toBe(400);
  });

  it('a login the school switched off gets no OTP', async () => {
    await Student.create({
      schoolId: ctx.a.schoolId, admissionNumber: 'ADM-OFF-1', firstName: 'Off', lastName: 'Student', status: 'ACTIVE',
      phone: SIBLING_MOBILE, parentName: 'X', parentPhone: '9000000009', account: { accountStatus: 'INACTIVE' },
    });
    const sms = captureSms();
    const res = await requestOtp({ role: 'STUDENT', mobile: SIBLING_MOBILE });
    expect(res.status).toBe(200);
    expect(sms.spy).not.toHaveBeenCalled();
  });

  it('locks the OTP after 5 wrong attempts', async () => {
    const { otp } = await otpFor('PARENT', ctx.b.parentPhone);
    const wrong = otp === '000000' ? '111111' : '000000';

    let res;
    for (let i = 0; i < 5; i += 1) res = await verify({ role: 'PARENT', mobile: ctx.b.parentPhone, otp: wrong });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('OTP_LOCKED');

    // Even the right code is dead now.
    const right = await verify({ role: 'PARENT', mobile: ctx.b.parentPhone, otp });
    expect(right.status).toBe(400);
  });

  it('resend within cooldown sends no second SMS', async () => {
    const sms = captureSms();
    await requestOtp({ role: 'PARENT', mobile: ctx.a.parentPhone });
    await requestOtp({ role: 'PARENT', mobile: ctx.a.parentPhone });
    expect(sms.spy).toHaveBeenCalledTimes(1);
  });

  it('forgot password finds the student by mobile and sets a first password', async () => {
    await Student.updateOne({ _id: ctx.b.studentId }, { $set: { phone: '9811100003', passwordHash: '' } });
    const sms = captureSms();
    const body = { role: 'STUDENT', identifier: '9811100003' };
    await request(app).post('/school-portal/auth/forgot-password').send(body);
    expect(sms.lastPhone()).toBe('9811100003');
    const v = await request(app).post('/school-portal/auth/verify-reset-otp').send({ ...body, otp: sms.lastOtp() });
    expect(v.status).toBe(200);
    const r = await request(app)
      .post('/school-portal/auth/reset-password')
      .send({ resetToken: v.body.data.resetToken, newPassword: 'FirstPass@1' });
    expect(r.status).toBe(200);
  });
});

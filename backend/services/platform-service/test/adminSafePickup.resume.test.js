import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

/**
 * School-admin / principal web safe pickup: when a pickup is already in progress
 * the API answers 409 with everything needed to RESUME it, and the admin can
 * resend the OTP or cancel the pickup.
 */
let app;
let ctx;
let StudentPickupSession;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const admin = () => auth(ctx.a.adminToken);

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ StudentPickupSession } = await import('../src/models/StudentPickupSession.js'));
}, 120000);
afterAll(disconnect);
beforeEach(async () => {
  await StudentPickupSession.deleteMany({});
});

const send = (studentId = ctx.a.studentId) => request(app).post('/school-portal/safe-pickup/send-otp').set(admin()).send({ studentId });
const resend = (sessionId) => request(app).post('/school-portal/safe-pickup/resend-otp').set(admin()).send({ sessionId });
const cancel = (sessionId) => request(app).post('/school-portal/safe-pickup/cancel').set(admin()).send({ sessionId });

describe('Pickup already in progress', () => {
  it('a second send-otp answers 409 with the session details the page needs to resume it', async () => {
    const first = await send();
    expect(first.status).toBe(201);
    const id = first.body.data.id;

    const again = await send();
    expect(again.status).toBe(409);
    expect(again.body.success).toBe(false);
    expect(again.body.code).toBe('PICKUP_ALREADY_ACTIVE');
    expect(again.body.message).toMatch(/already in progress/i);
    const d = again.body.data;
    expect(d.sessionId).toBe(id);
    expect(d.status).toBe('OTP_SENT');
    expect(d.maskedMobile).toMatch(/\*+\d{4}$/);
    expect(d.otpSecondsRemaining).toBeGreaterThan(0);
    expect(typeof d.resendsLeft).toBe('number');
    expect(typeof d.resendCooldownSeconds).toBe('number');
    expect(JSON.stringify(again.body)).not.toMatch(/otpHash|otpCipher|guardianMobile/);
  });

  it('the OTP of the resumed session still verifies', async () => {
    const first = await send();
    const id = first.body.data.id;
    // the parent (app) sees the live OTP; the admin types it
    const parent = await request(app).get(`/school-portal/parent/children/${ctx.a.studentId}/pickup`).set(auth(ctx.a.parentToken));
    const otp = parent.body.active.otp;
    const again = await send();
    expect(again.body.data.sessionId).toBe(id);
    const verify = await request(app).post('/school-portal/safe-pickup/verify-otp').set(admin()).send({ sessionId: id, otp });
    expect(verify.status).toBe(200);
  });
});

describe('Resend OTP (admin / principal)', () => {
  it('respects the cooldown, then issues a fresh OTP and replaces the old one', async () => {
    const first = await send();
    const id = first.body.data.id;

    const tooSoon = await resend(id);
    expect(tooSoon.status).toBe(429);
    expect(tooSoon.body.message).toMatch(/wait/i);

    await StudentPickupSession.updateOne({ _id: id }, { $set: { lastOtpSentAt: new Date(Date.now() - 120000) } });
    const before = await StudentPickupSession.findById(id).select('+otpCipher +otpHash').lean();
    const ok = await resend(id);
    expect(ok.status).toBe(200);
    expect(ok.body.message).toMatch(/new OTP/i);
    expect(ok.body.data.resendsLeft).toBeLessThan(before.maxResends ?? 99);
    const after = await StudentPickupSession.findById(id).select('+otpCipher +otpHash').lean();
    expect(after.resendCount).toBe(1);
    expect(after.otpCipher).not.toBe(before.otpCipher);
    expect(after.status).toBe('OTP_SENT');
  });

  it('stops at the resend limit', async () => {
    const first = await send();
    const id = first.body.data.id;
    await StudentPickupSession.updateOne({ _id: id }, { $set: { resendCount: 99, lastOtpSentAt: new Date(Date.now() - 120000) } });
    const res = await resend(id);
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/limit/i);
  });

  it('refuses sessions that are finished, unknown, or from another school; principal route works too', async () => {
    const first = await send();
    const id = first.body.data.id;
    await cancel(id);
    expect((await resend(id)).status).toBe(409);
    expect((await resend('64b64b64b64b64b64b64b64b'.slice(0, 24))).status).toBe(404);
    const bad = await request(app).post('/school-portal/safe-pickup/resend-otp').set(admin()).send({ sessionId: 'nope' });
    expect(bad.status).toBe(400);
    // a session of school B is invisible to school A's admin
    const other = await request(app).post('/school-portal/safe-pickup/send-otp').set(auth(ctx.b.adminToken)).send({ studentId: ctx.b.studentId });
    if (other.status === 201) {
      await StudentPickupSession.updateOne({ _id: other.body.data.id }, { $set: { lastOtpSentAt: new Date(Date.now() - 120000) } });
      expect((await resend(other.body.data.id)).status).toBe(404);
      expect((await cancel(other.body.data.id)).status).toBe(404);
    }
  });
});

describe('Cancel pickup (admin / principal)', () => {
  it('cancels, clears the OTP, and lets a new pickup start', async () => {
    const first = await send();
    const id = first.body.data.id;
    const c = await cancel(id);
    expect(c.status).toBe(200);
    expect(c.body.data.status).toBe('CANCELLED');
    const doc = await StudentPickupSession.findById(id).select('+otpCipher +otpHash').lean();
    expect(doc.otpHash).toBe('');
    expect(doc.otpCipher).toBe('');
    expect((await cancel(id)).status).toBe(409); // already cancelled

    const fresh = await send();
    expect(fresh.status).toBe(201);
    expect(fresh.body.data.id).not.toBe(id);
  });
});

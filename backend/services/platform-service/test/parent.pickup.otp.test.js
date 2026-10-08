import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

/**
 * The guardian's OTP is sent by SMS AND shown in the PARENT app. It is visible
 * only to a parent linked to that child, only while it is live, and never to
 * the teacher / admin side.
 */
let app;
let ctx;
let StudentPickupSession;
let safePickupOtpService;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const kid = () => `/school-portal/parent/children/${ctx.a.studentId}`;

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ StudentPickupSession } = await import('../src/models/StudentPickupSession.js'));
  ({ safePickupOtpService } = await import('../src/services/safePickupOtp.service.js'));
}, 120000);
afterAll(disconnect);
beforeEach(async () => {
  await StudentPickupSession.deleteMany({});
});

const initiate = () => request(app).post('/school-portal/teacher/pickups/initiate').set(auth(ctx.a.token)).send({ studentId: ctx.a.studentId });
const parentList = (token = ctx.a.parentToken) => request(app).get(`${kid()}/pickup`).set(auth(token));

describe('OTP cipher', () => {
  it('round-trips, is randomised per call, and rejects tampering / wrong input', () => {
    const a = safePickupOtpService.encryptOtp('482913');
    const b = safePickupOtpService.encryptOtp('482913');
    expect(a).not.toBe(b);
    expect(a).not.toContain('482913');
    expect(safePickupOtpService.decryptOtp(a)).toBe('482913');
    const parts = a.split('.');
    parts[3] = Buffer.from('tampered').toString('base64url');
    expect(safePickupOtpService.decryptOtp(parts.join('.'))).toBeNull();
    expect(safePickupOtpService.decryptOtp('')).toBeNull();
    expect(safePickupOtpService.decryptOtp('garbage')).toBeNull();
  });
});

describe('Parent sees the live pickup OTP', () => {
  it('after a teacher starts a pickup, the parent app gets the same OTP the guardian is texted', async () => {
    const init = await initiate();
    expect(init.status).toBe(201);

    const res = await parentList();
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('no-store');
    const active = res.body.active;
    expect(active.status).toBe('OTP_SENT');
    expect(active.otp).toMatch(/^\d{6}$/);
    expect(active.maskedMobile).toBeTruthy();

    // that code really verifies the pickup (it is THE otp, not a copy of something else)
    const verify = await request(app)
      .post(`/school-portal/teacher/pickups/${init.body.data.id}/verify`)
      .set(auth(ctx.a.token))
      .send({ otp: active.otp });
    expect(verify.status).toBe(200);
  });

  it('the history rows and the teacher/admin responses never carry the OTP; the DB never stores it in clear', async () => {
    const init = await initiate();
    expect(init.body.data).not.toHaveProperty('otp');
    expect(JSON.stringify(init.body)).not.toMatch(/otpCipher|otpHash/);

    const res = await parentList();
    expect(res.body.data.every((row) => !('otp' in row))).toBe(true);

    const doc = await StudentPickupSession.findById(init.body.data.id).select('+otpCipher +otpHash').lean();
    expect(doc.otpCipher).toMatch(/^v1\./);
    expect(doc.otpCipher).not.toContain(res.body.active.otp);
    expect(doc.otpHash).not.toBe(res.body.active.otp);
  });

  it('detail endpoint shows it while live; resend replaces it; verify removes it', async () => {
    const init = await initiate();
    const id = init.body.data.id;
    const detail = await request(app).get(`${kid()}/pickup/${id}`).set(auth(ctx.a.parentToken));
    expect(detail.body.data.otp).toMatch(/^\d{6}$/);

    // resend (after the cooldown) stores a fresh cipher
    await StudentPickupSession.updateOne({ _id: id }, { $set: { lastOtpSentAt: new Date(Date.now() - 120000) } });
    const before = (await StudentPickupSession.findById(id).select('+otpCipher').lean()).otpCipher;
    const rs = await request(app).post(`/school-portal/teacher/pickups/${id}/resend-otp`).set(auth(ctx.a.token)).send({});
    expect(rs.status).toBe(200);
    const after = (await StudentPickupSession.findById(id).select('+otpCipher').lean()).otpCipher;
    expect(after).not.toBe(before);

    const live = (await parentList()).body.active;
    const ok = await request(app).post(`/school-portal/teacher/pickups/${id}/verify`).set(auth(ctx.a.token)).send({ otp: live.otp });
    expect(ok.status).toBe(200);

    const gone = await request(app).get(`${kid()}/pickup/${id}`).set(auth(ctx.a.parentToken));
    expect(gone.body.data).not.toHaveProperty('otp');
    const stored = await StudentPickupSession.findById(id).select('+otpCipher +otpHash').lean();
    expect(stored.otpCipher).toBe('');
    expect(stored.otpHash).toBe('');
    expect((await parentList()).body.active?.otp).toBeUndefined();
  });

  it('an expired OTP is hidden even if a stale cipher is still stored', async () => {
    const init = await initiate();
    await StudentPickupSession.updateOne({ _id: init.body.data.id }, { $set: { otpExpiresAt: new Date(Date.now() - 1000) } });
    const res = await parentList();
    expect(res.body.active?.otp).toBeUndefined();
  });

  it('a cancelled pickup stops showing the OTP', async () => {
    const init = await initiate();
    const cancel = await request(app).post(`/school-portal/teacher/pickups/${init.body.data.id}/cancel`).set(auth(ctx.a.token)).send({ reason: 'test' });
    expect([200, 201]).toContain(cancel.status);
    const res = await parentList();
    expect(res.body.active).toBeNull();
    const doc = await StudentPickupSession.findById(init.body.data.id).select('+otpCipher').lean();
    expect(doc.otpCipher).toBe('');
  });

  it('only a parent linked to the child can read it (other school → 403)', async () => {
    await initiate();
    const other = await request(app).get(`${kid()}/pickup`).set(auth(ctx.b.parentToken));
    expect(other.status).toBe(403);
    const noAuth = await request(app).get(`${kid()}/pickup`);
    expect(noAuth.status).toBe(401);
    const teacher = await request(app).get(`${kid()}/pickup`).set(auth(ctx.a.token));
    expect(teacher.status).toBe(403);
  });
});

describe('Live pickups across ALL children of the parent (Home banner)', () => {
  it('returns the live pickup with its OTP and childId; empty when none; only that parent children', async () => {
    const none = await request(app).get('/school-portal/parent/pickup/active').set(auth(ctx.a.parentToken));
    expect(none.status).toBe(200);
    expect(none.body.data).toEqual([]);

    const init = await initiate();
    expect(init.status).toBe(201);
    const res = await request(app).get('/school-portal/parent/pickup/active').set(auth(ctx.a.parentToken));
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.body.data).toHaveLength(1);
    const row = res.body.data[0];
    expect(row.childId).toBe(ctx.a.studentId);
    expect(row.studentName).toBeTruthy();
    expect(row.status).toBe('OTP_SENT');
    expect(row.otp).toMatch(/^\d{6}$/);
    expect(JSON.stringify(res.body)).not.toMatch(/otpCipher|otpHash|guardianMobile/);

    // another school's parent sees nothing of it
    const other = await request(app).get('/school-portal/parent/pickup/active').set(auth(ctx.b.parentToken));
    expect(other.status).toBe(200);
    expect(other.body.data).toEqual([]);

    // an expired OTP is listed (the pickup is still open) but without the code
    await StudentPickupSession.updateOne({ _id: init.body.data.id }, { $set: { otpExpiresAt: new Date(Date.now() - 1000) } });
    const expired = await request(app).get('/school-portal/parent/pickup/active').set(auth(ctx.a.parentToken));
    expect(expired.body.data.every((r) => !('otp' in r))).toBe(true);

    expect((await request(app).get('/school-portal/parent/pickup/active')).status).toBe(401);
    expect((await request(app).get('/school-portal/parent/pickup/active').set(auth(ctx.a.token))).status).toBe(403);
  });
});

describe('The OTP in the parent app is exactly the OTP that was texted', () => {
  let smsSpy;
  let genSpy;
  let smsService;
  const codes = ['482913', '730154', '915276'];
  let n = 0;

  beforeAll(async () => {
    ({ smsService } = await import('../src/services/sms.service.js'));
  });
  beforeEach(() => {
    n = 0;
    smsSpy = vi.spyOn(smsService, 'sendSms').mockResolvedValue({ delivered: true, provider: 'test' });
    // a different, non-static code per generation, like production's random mode
    genSpy = vi.spyOn(safePickupOtpService, 'generateOtp').mockImplementation(() => codes[n++ % codes.length]);
  });
  afterEach(() => {
    smsSpy.mockRestore();
    genSpy.mockRestore();
  });

  const parentOtp = async () => (await parentList()).body.active?.otp;
  const smsOtps = () => smsSpy.mock.calls.map((c) => c[0].otp);

  it('teacher start and resend: SMS code === app code, and the old code is replaced', async () => {
    const init = await initiate();
    expect(init.status).toBe(201);
    expect(smsOtps()).toEqual(['482913']);
    expect(await parentOtp()).toBe('482913');

    await StudentPickupSession.updateOne({ _id: init.body.data.id }, { $set: { lastOtpSentAt: new Date(Date.now() - 120000) } });
    const rs = await request(app).post(`/school-portal/teacher/pickups/${init.body.data.id}/resend-otp`).set(auth(ctx.a.token)).send({});
    expect(rs.status).toBe(200);
    expect(smsOtps()).toEqual(['482913', '730154']);
    expect(await parentOtp()).toBe('730154'); // the app moved to the new code together with the SMS
  });

  it('school admin start and resend: SMS code === app code', async () => {
    const init = await request(app).post('/school-portal/safe-pickup/send-otp').set(auth(ctx.a.adminToken)).send({ studentId: ctx.a.studentId });
    expect(init.status).toBe(201);
    expect(smsOtps()).toEqual(['482913']);
    expect(await parentOtp()).toBe('482913');

    await StudentPickupSession.updateOne({ _id: init.body.data.id }, { $set: { lastOtpSentAt: new Date(Date.now() - 120000) } });
    const rs = await request(app).post('/school-portal/safe-pickup/resend-otp').set(auth(ctx.a.adminToken)).send({ sessionId: init.body.data.id });
    expect(rs.status).toBe(200);
    expect(smsOtps()).toEqual(['482913', '730154']);
    expect(await parentOtp()).toBe('730154');
  });

  it('the code shown in the app is the one the teacher can verify with (the SMS code verifies; the old one does not)', async () => {
    const init = await initiate();
    const id = init.body.data.id;
    await StudentPickupSession.updateOne({ _id: id }, { $set: { lastOtpSentAt: new Date(Date.now() - 120000) } });
    await request(app).post(`/school-portal/teacher/pickups/${id}/resend-otp`).set(auth(ctx.a.token)).send({});
    const stale = await request(app).post(`/school-portal/teacher/pickups/${id}/verify`).set(auth(ctx.a.token)).send({ otp: '482913' });
    expect(stale.status).toBe(400);
    const good = await request(app).post(`/school-portal/teacher/pickups/${id}/verify`).set(auth(ctx.a.token)).send({ otp: await parentOtp() });
    expect(good.status).toBe(200);
  });
});

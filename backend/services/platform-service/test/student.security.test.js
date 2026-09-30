import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const S = '/school-portal/student';

async function login(password) {
  const res = await request(app)
    .post('/school-portal/auth/student-login')
    .send({ identifier: ctx.a.studentLoginEmail, password: password || ctx.a.studentPassword });
  return res.body.token;
}

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Student session revocation', () => {
  it('logout revokes the token that was used', async () => {
    const token = await login();
    expect((await request(app).get(`${S}/me`).set(auth(token))).status).toBe(200);
    expect((await request(app).post(`${S}/auth/logout`).set(auth(token))).status).toBe(200);
    expect((await request(app).get(`${S}/me`).set(auth(token))).status).toBe(401);
  });

  it('change-password returns a fresh token and revokes the old one', async () => {
    const oldToken = await login();
    const res = await request(app)
      .patch(`${S}/change-password`)
      .set(auth(oldToken))
      .send({ currentPassword: ctx.a.studentPassword, newPassword: 'NewStud3nt!' });
    expect(res.status).toBe(200);
    const fresh = res.body.data.token;
    expect(fresh).toBeTruthy();
    expect((await request(app).get(`${S}/me`).set(auth(oldToken))).status).toBe(401);
    expect((await request(app).get(`${S}/me`).set(auth(fresh))).status).toBe(200);
    const back = await request(app)
      .patch(`${S}/change-password`)
      .set(auth(fresh))
      .send({ currentPassword: 'NewStud3nt!', newPassword: ctx.a.studentPassword });
    expect(back.status).toBe(200);
  });

  it('rejects reusing the current password as the new one', async () => {
    const token = await login();
    const res = await request(app)
      .patch(`${S}/change-password`)
      .set(auth(token))
      .send({ currentPassword: ctx.a.studentPassword, newPassword: ctx.a.studentPassword });
    expect(res.status).toBe(400);
  });

  it('a deactivated student is locked out immediately, even with a live token', async () => {
    const token = await login();
    const { Student } = await import('../src/models/Student.js');
    await Student.updateOne({ _id: ctx.a.studentId }, { $set: { 'account.accountStatus': 'INACTIVE' } });
    const res = await request(app).get(`${S}/profile`).set(auth(token));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('STUDENT_INACTIVE');
    await Student.updateOne({ _id: ctx.a.studentId }, { $set: { 'account.accountStatus': 'ACTIVE' } });
  });
});

describe('Student inbox scoping', () => {
  it('the notices category filter cannot widen to teacher-only notices', async () => {
    const { Announcement } = await import('../src/models/Communication.js');
    const staff = await Announcement.create({
      schoolId: ctx.a.schoolId, title: 'Staff only', body: 'Salary', audiences: ['TEACHERS'],
      status: 'PUBLISHED', publishedByName: 'Office', publishAt: new Date(Date.now() - 1000),
    });
    const token = await login();
    const res = await request(app).get(`${S}/notices`).query({ category: 'TEACHERS' }).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.map((n) => n.id)).not.toContain(staff._id.toString());
    const read = await request(app).patch(`${S}/notices/${staff._id}/read`).set(auth(token));
    expect(read.status).toBe(404);
  });

  it('cannot mark a notification outside its own inbox as read', async () => {
    const token = await login();
    const res = await request(app).patch(`${S}/notifications/${ctx.b.noticeId}/read`).set(auth(token));
    expect(res.status).toBe(404);
  });
});

describe('Student input hardening', () => {
  it('a one-day leave works, overlaps are refused and javascript: links are dropped', async () => {
    const token = await login();
    const first = await request(app)
      .post(`${S}/leaves`)
      .set(auth(token))
      .send({ leaveType: 'MEDICAL', startDate: '2031-02-10', endDate: '2031-02-10', reason: 'Fever', documentUrl: 'javascript:alert(1)' });
    expect(first.status).toBeLessThan(300);
    expect(first.body.data.totalDays).toBe(1);
    expect(first.body.data.documentUrl).toBe('');
    const overlap = await request(app)
      .post(`${S}/leaves`)
      .set(auth(token))
      .send({ leaveType: 'CASUAL', startDate: '2031-02-09', endDate: '2031-02-11', reason: 'Trip' });
    expect(overlap.status).toBe(409);
    expect(overlap.body.code).toBe('LEAVE_OVERLAP');
    // editing the same leave is not an overlap with itself
    const edit = await request(app)
      .patch(`${S}/leaves/${first.body.data.id}`)
      .set(auth(token))
      .send({ reason: 'High fever' });
    expect(edit.status).toBe(200);
  });

  it('refuses a leave longer than a year', async () => {
    const token = await login();
    const res = await request(app)
      .post(`${S}/leaves`)
      .set(auth(token))
      .send({ leaveType: 'OTHER', startDate: '2032-01-01', endDate: '2033-06-01', reason: 'Too long' });
    expect(res.status).toBe(400);
  });

  it('self profile rejects document uploads and bad phone numbers', async () => {
    const token = await login();
    const bad = await request(app).patch(`${S}/profile`).set(auth(token)).send({ phone: 'call me maybe' });
    expect(bad.status).toBe(400);
    const obj = await request(app).patch(`${S}/profile`).set(auth(token)).send({ phone: { $gt: '' } });
    expect(obj.status).toBe(400);
    const doc = await request(app)
      .patch(`${S}/profile`)
      .set(auth(token))
      .attach('aadhaarDocuments', Buffer.from('fake'), { filename: 'a.png', contentType: 'image/png' });
    expect(doc.status).toBeGreaterThanOrEqual(400);
    const ok = await request(app).patch(`${S}/profile`).set(auth(token)).send({ phone: '+91 98765 43210', address: 'Lane 4' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.phone).toBe('+91 98765 43210');
  });

  it('a retried homework submission with the same Idempotency-Key is replayed, not re-run', async () => {
    const token = await login();
    const send = () =>
      request(app)
        .post(`${S}/homework/${ctx.a.homeworkId}/submission`)
        .set(auth(token))
        .set('Idempotency-Key', 'student-retry-key-1')
        .field('remarks', 'Done, see attached')
        .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'answer.pdf', contentType: 'application/pdf' });
    const first = await send();
    expect(first.status).toBe(200);
    const again = await send();
    expect(again.status).toBe(200);
    expect(again.headers['idempotency-replayed']).toBe('true');
    const { Homework } = await import('../src/models/Homework.js');
    const hw = await Homework.findById(ctx.a.homeworkId).lean();
    expect(hw.submittedCount).toBe(1);
  });

  it('refuses a homework upload whose bytes do not match its extension', async () => {
    const token = await login();
    const res = await request(app)
      .post(`${S}/homework/${ctx.a.homeworkId}/submission`)
      .set(auth(token))
      .attach('file', Buffer.from('MZ-not-a-pdf'), { filename: 'evil.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UPLOAD_REJECTED');
  });

  it('ignores malformed material date filters instead of erroring', async () => {
    const token = await login();
    const res = await request(app).get(`${S}/materials`).query({ from: 'yesterday', to: '2031-13-99x' }).set(auth(token));
    expect(res.status).toBe(200);
  });
});

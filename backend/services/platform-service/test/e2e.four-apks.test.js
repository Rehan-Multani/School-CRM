/**
 * End-to-end happy-path walk for all four role APKs against a real (in-memory)
 * Mongo — proves login → every tab → the key write operations connect for
 * Teacher, Student, Parent and Driver in one run.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const today = () => new Date().toISOString().slice(0, 10);
const month = () => new Date().toISOString().slice(0, 7);

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

/* ============================== TEACHER ============================== */
describe('E2E · Teacher APK', () => {
  let token;
  it('login → me', async () => {
    const login = await request(app)
      .post('/school-portal/auth/teacher-login')
      .send({ identifier: `teacher@${ctx.a.schoolId ? 'schoola' : 'schoola'}.edu`, password: 'Passw0rd!' });
    expect(login.status).toBe(200);
    token = login.body.token;
    expect((await request(app).get('/school-portal/teacher/me').set(auth(token))).status).toBe(200);
  });
  it('dashboard · classes · roster · timetable', async () => {
    for (const p of ['/dashboard', '/today-schedule', '/classes', '/timetable']) {
      expect((await request(app).get(`/school-portal/teacher${p}`).set(auth(token))).status, p).toBe(200);
    }
    const cls = await request(app).get('/school-portal/teacher/classes').set(auth(token));
    const classId = cls.body.data[0]?.id;
    expect(classId).toBeTruthy();
    const secs = await request(app).get(`/school-portal/teacher/classes/${classId}/sections`).set(auth(token));
    const sectionId = secs.body.data[0]?.id;
    const roster = await request(app).get(`/school-portal/teacher/sections/${sectionId}/students`).set(auth(token));
    expect(roster.status).toBe(200);
  });
  it('submit attendance (idempotent) · create + list homework', async () => {
    const submit = await request(app)
      .post('/school-portal/teacher/attendance')
      .set(auth(token))
      .set('Idempotency-Key', 'e2e-attn-1')
      .send({ sectionId: ctx.a.sectionId, date: today(), records: [{ studentId: ctx.a.studentId, status: 'PRESENT' }] });
    expect(submit.status).toBe(200);
    const replay = await request(app)
      .post('/school-portal/teacher/attendance')
      .set(auth(token))
      .set('Idempotency-Key', 'e2e-attn-1')
      .send({ sectionId: ctx.a.sectionId, date: today(), records: [{ studentId: ctx.a.studentId, status: 'PRESENT' }] });
    expect(replay.status).toBe(200);

    const hw = await request(app)
      .post('/school-portal/teacher/homework')
      .set(auth(token))
      .send({ sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, title: 'E2E HW', dueDate: new Date(Date.now() + 3 * 864e5).toISOString() });
    expect([200, 201]).toContain(hw.status);
    expect((await request(app).get('/school-portal/teacher/homework').set(auth(token))).status).toBe(200);
  });
  it('notifications · announcements · leave', async () => {
    expect((await request(app).get('/school-portal/teacher/notifications').set(auth(token))).status).toBe(200);
    expect((await request(app).get('/school-portal/teacher/announcements').set(auth(token))).status).toBe(200);
    const leave = await request(app)
      .post('/school-portal/teacher/leaves')
      .set(auth(token))
      .send({ leaveType: 'CASUAL', startDate: '2026-12-01', endDate: '2026-12-01', reason: 'e2e' });
    expect([200, 201]).toContain(leave.status);
  });
});

/* ============================== STUDENT ============================== */
describe('E2E · Student APK', () => {
  let token;
  it('login → me → dashboard/today/upcoming', async () => {
    const login = await request(app)
      .post('/school-portal/auth/student-login')
      .send({ identifier: ctx.a.studentLoginEmail, password: ctx.a.studentPassword });
    expect(login.status).toBe(200);
    token = login.body.token;
    for (const p of ['/me', '/dashboard', '/today', '/upcoming']) {
      expect((await request(app).get(`/school-portal/student${p}`).set(auth(token))).status, p).toBe(200);
    }
  });
  it('academics: timetable · homework (+submit) · classwork · materials · exams · results · report-card', async () => {
    expect((await request(app).get('/school-portal/student/timetable').set(auth(token))).status).toBe(200);
    const hw = await request(app).get('/school-portal/student/homework').set(auth(token));
    expect(hw.status).toBe(200);
    const submit = await request(app)
      .post(`/school-portal/student/homework/${ctx.a.homeworkId}/submission`)
      .set(auth(token))
      .set('Idempotency-Key', 'e2e-stu-sub')
      .field('remarks', 'done');
    expect(submit.status).toBe(200);
    for (const p of ['/classwork', '/materials', '/exams', '/results', '/report-card']) {
      expect((await request(app).get(`/school-portal/student${p}`).set(auth(token))).status, p).toBe(200);
    }
    const r = await request(app).get(`/school-portal/student/results/${ctx.a.examId}`).set(auth(token));
    expect(r.status).toBe(200);
    expect(r.body.data.percentage).toBe(82);
  });
  it('attendance · fees · notices · notifications · settings · profile', async () => {
    for (const p of [
      '/attendance/summary', '/attendance/daily', `/attendance/monthly?month=${month()}`,
      '/fees/summary', '/fees/invoices', '/notices', '/notifications', '/notifications/unread-count',
      '/settings', '/profile', '/academic-info', '/documents',
    ]) {
      expect((await request(app).get(`/school-portal/student${p}`).set(auth(token))).status, p).toBe(200);
    }
  });
  it('leave create → update → cancel', async () => {
    const create = await request(app)
      .post('/school-portal/student/leaves')
      .set(auth(token))
      .send({ leaveType: 'MEDICAL', startDate: '2026-11-10', endDate: '2026-11-11', reason: 'e2e fever' });
    expect(create.status).toBe(201);
    const id = create.body.data.id;
    expect((await request(app).patch(`/school-portal/student/leaves/${id}`).set(auth(token)).send({ reason: 'e2e updated' })).status).toBe(200);
    expect((await request(app).post(`/school-portal/student/leaves/${id}/cancel`).set(auth(token))).status).toBe(200);
  });
});

/* ============================== PARENT ============================== */
describe('E2E · Parent APK', () => {
  let token;
  let childId;
  it('login → children → me', async () => {
    const login = await request(app)
      .post('/school-portal/auth/parent-login')
      .send({ identifier: ctx.a.parentLoginEmail, password: ctx.a.parentPassword });
    expect(login.status).toBe(200);
    token = login.body.token;
    childId = login.body.children[0].childId;
    expect(childId).toBe(ctx.a.studentId);
    expect((await request(app).get('/school-portal/parent/me').set(auth(token))).status).toBe(200);
    expect((await request(app).get('/school-portal/parent/children').set(auth(token))).status).toBe(200);
  });
  it('dashboard(childId) · overview', async () => {
    expect((await request(app).get(`/school-portal/parent/dashboard?childId=${childId}`).set(auth(token))).status).toBe(200);
    expect((await request(app).get('/school-portal/parent/dashboard/overview').set(auth(token))).status).toBe(200);
  });
  it('child academics · attendance · fees · notices', async () => {
    const C = `/school-portal/parent/children/${childId}`;
    for (const p of [
      `${C}/homework`, `${C}/timetable`, `${C}/classwork`, `${C}/materials`, `${C}/exams`, `${C}/results`, `${C}/report-card`,
      `${C}/attendance/summary`, `${C}/attendance/daily`,
      `${C}/fees/summary`, `${C}/fees/invoices`, `${C}/fees/history`, `${C}/pickup`,
      '/school-portal/parent/notices', '/school-portal/parent/notifications', '/school-portal/parent/settings', '/school-portal/parent/profile',
    ]) {
      const url = p.startsWith('/school-portal') ? p : p;
      expect((await request(app).get(url).set(auth(token))).status, p).toBe(200);
    }
  });
  it('pay-order pre-checks (no network) + cross-parent guard', async () => {
    const bad = await request(app)
      .post(`/school-portal/parent/children/${childId}/fees/invoices/${ctx.a.invoiceId}/pay-order`)
      .set(auth(token))
      .set('Idempotency-Key', 'e2e-pay-badamt')
      .send({ amount: 9_999_999 });
    expect(bad.status).toBe(400);
    const cross = await request(app).get(`/school-portal/parent/children/${ctx.b.studentId}/homework`).set(auth(token));
    expect(cross.status).toBe(403);
  });
});

/* =============================== DRIVER =============================== */
describe('E2E · Driver API', () => {
  let token;
  const D = '/school-portal/driver';

  it('login → me → my route', async () => {
    const login = await request(app)
      .post('/school-portal/auth/driver-login')
      .send({ mobile: ctx.a.driverMobile, password: ctx.a.driverPassword });
    expect(login.status).toBe(200);
    token = login.body.data.token;

    const me = await request(app).get(`${D}/me`).set(auth(token));
    expect(me.status).toBe(200);
    expect(me.body.data.driver.route.id).toBe(ctx.a.routeId);
    expect(me.body.data.driver.vehicle.id).toBe(ctx.a.vehicleId);

    const route = await request(app).get(`${D}/route`).set(auth(token));
    expect(route.status).toBe(200);
    expect(route.body.data.stops.map((s) => s.sequenceOrder)).toEqual([1, 2]);
    expect(route.body.data.stops[0].pickupTime).toBe('07:30 AM');
  });

  it('student list inherits each rider timing from their stop', async () => {
    const list = await request(app).get(`${D}/students?date=${today()}`).set(auth(token));
    expect(list.status).toBe(200);
    expect(list.body.data.students).toHaveLength(1);
    const [rider] = list.body.data.students;
    expect(rider.studentId).toBe(ctx.a.studentId);
    expect(rider.stop.stopName).toBe('Teen Imli');
    expect(rider.pickupTime).toBe('07:30 AM');
    expect(rider.dropTime).toBe('04:00 PM');
    expect(rider.pickupStatus).toBe('PENDING');
    expect(rider.dropStatus).toBe('PENDING');
  });

  it('drop before pickup is refused; pickup then drop, both idempotent', async () => {
    const early = await request(app).post(`${D}/students/${ctx.a.studentId}/drop`).set(auth(token));
    expect(early.status).toBe(409);

    const pickup = await request(app).post(`${D}/students/${ctx.a.studentId}/pickup`).set(auth(token));
    expect(pickup.status).toBe(200);
    expect(pickup.body.data.pickupStatus).toBe('PICKED_UP');
    const repeat = await request(app).post(`${D}/students/${ctx.a.studentId}/pickup`).set(auth(token));
    expect(repeat.body.message).toMatch(/Already/i);

    const drop = await request(app).post(`${D}/students/${ctx.a.studentId}/drop`).set(auth(token));
    expect(drop.body.data.dropStatus).toBe('DROPPED');

    const list = await request(app).get(`${D}/students`).set(auth(token));
    expect(list.body.data.pickedUpCount).toBe(1);
    expect(list.body.data.droppedCount).toBe(1);
  });

  it('rejects a future date and another school\'s student', async () => {
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const ahead = await request(app)
      .post(`${D}/students/${ctx.a.studentId}/pickup`)
      .set(auth(token))
      .send({ date: future });
    expect(ahead.status).toBe(400);

    const cross = await request(app).post(`${D}/students/${ctx.b.studentId}/pickup`).set(auth(token));
    expect(cross.status).toBe(404);
  });
});

/**
 * End-to-end happy-path walk for all four role APKs against a real (in-memory)
 * Mongo — proves login → every tab → the key write operations connect for
 * Teacher, Student, Parent and Transport in one run.
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

/* ============================== TRANSPORT ============================== */
describe('E2E · Transport APK', () => {
  let token;
  let mgr;
  let tripId;
  const T = '/school-portal/transport-app';
  it('login → me → dashboard', async () => {
    const login = await request(app)
      .post('/school-portal/auth/transport-login')
      .send({ identifier: ctx.a.driverLoginEmail, password: ctx.a.driverPassword });
    expect(login.status).toBe(200);
    token = login.body.token;
    mgr = ctx.a.transportManagerToken;
    const dash = await request(app).get(`${T}/dashboard`).set(auth(token));
    expect(dash.status).toBe(200);
    tripId = dash.body.data.todaysTrip.id;
    expect(tripId).toBe(ctx.a.tripId);
  });
  it('morning-pickup flow: inspection → start → arrive → board → depart → complete', async () => {
    expect((await request(app).post(`${T}/trips/${tripId}/inspection`).set(auth(token)).send({ items: [] })).body.data.passed).toBe(true);
    expect((await request(app).post(`${T}/trips/${tripId}/start`).set(auth(token))).body.data.status).toBe('STARTED');
    expect((await request(app).post(`${T}/trips/${tripId}/stops/${ctx.a.stopId}/arrive`).set(auth(token)).send({ lat: 22.7196, lng: 75.8577 })).body.data.status).toBe('IN_PROGRESS');

    const board = await request(app)
      .post(`${T}/trips/${tripId}/students/${ctx.a.studentId}/board`)
      .set(auth(token))
      .set('Idempotency-Key', 'e2e-trp-board')
      .send({ lat: 22.7196, lng: 75.8577 });
    expect(board.body.data.status).toBe('BOARDED');

    expect((await request(app).post(`${T}/trips/${tripId}/stops/${ctx.a.stopId}/depart`).set(auth(token))).status).toBe(200);
    expect((await request(app).post(`${T}/trips/${tripId}/complete`).set(auth(token))).body.data.status).toBe('COMPLETED');
  });
  it('GPS ping + read, alerts feed, SOS raise→ack→resolve', async () => {
    // start a fresh AFTERNOON trip via the manager to have an active trip for GPS/SOS
    const create = await request(app)
      .post(`${T}/trips`)
      .set(auth(mgr))
      .set('Idempotency-Key', 'e2e-trp-create')
      .send({ routeId: ctx.a.routeId, tripType: 'AFTERNOON_DROPOFF' });
    expect(create.status).toBe(201);
    const t2 = create.body.data.id;
    await request(app).post(`${T}/trips/${t2}/inspection`).set(auth(token)).send({ items: [] });
    await request(app).post(`${T}/trips/${t2}/start`).set(auth(token));

    const ping = await request(app).post(`${T}/trips/${t2}/location`).set(auth(token)).send({ latitude: 22.72, longitude: 75.86, accuracy: 6, speed: 25 });
    expect(ping.body.data.recorded).toBe(true);
    expect((await request(app).get(`${T}/trips/${t2}/location`).set(auth(token))).body.data.location.lat).toBeCloseTo(22.72, 2);

    const sos = await request(app).post(`${T}/sos`).set(auth(token)).set('Idempotency-Key', 'e2e-trp-sos').send({ tripId: t2, description: 'e2e emergency', location: { lat: 22.72, lng: 75.86 } });
    expect(sos.status).toBe(201);
    const alerts = await request(app).get(`${T}/alerts?type=EMERGENCY`).set(auth(mgr));
    expect(alerts.body.data.some((a) => a.severity === 'CRITICAL')).toBe(true);
    expect((await request(app).patch(`${T}/sos/${sos.body.data.id}`).set(auth(mgr)).send({ action: 'acknowledge' })).body.data.status).toBe('ACKNOWLEDGED');
    expect((await request(app).patch(`${T}/sos/${sos.body.data.id}`).set(auth(mgr)).send({ action: 'resolve', note: 'done' })).body.data.status).toBe('RESOLVED');
  });
  it('profile · vehicle · documents · route · settings', async () => {
    for (const p of ['/profile', '/vehicle', '/vehicle/documents', '/vehicle/inspection-history', '/route', '/settings', '/notifications']) {
      expect((await request(app).get(`${T}${p}`).set(auth(token))).status, p).toBe(200);
    }
    expect((await request(app).patch(`${T}/settings`).set(auth(mgr)).send({ delayThresholdMin: 14 })).body.data.delayThresholdMin).toBe(14);
  });
});

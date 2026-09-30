/**
 * End-to-end walk through the Teacher mobile app (app/src/app/teacher/**),
 * screen by screen, with the SAME requests + payloads the app sends
 * (app/src/api/teacher.js). Each `it` is one screen/flow of
 * docs/flutter-apps/01-teacher-app-flow.md. Runs against the in-memory seed,
 * never the dev database.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let token;
const P = '/school-portal/teacher';
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const ymdOffset = (days) => {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const get = (path, query) => request(app).get(P + path).query(query || {}).set('Authorization', `Bearer ${token}`);
const send = (method, path, body, headers = {}) =>
  request(app)[method](P + path).set({ Authorization: `Bearer ${token}`, ...headers }).send(body);

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();

  const models = {
    TimetableEntry: (await import('../src/models/TimetableEntry.js')).TimetableEntry,
    Announcement: (await import('../src/models/Communication.js')).Announcement,
    SchoolMessage: (await import('../src/models/Communication.js')).SchoolMessage,
    Event: (await import('../src/models/Event.js')).Event,
    ExamSubject: (await import('../src/models/ExamSubject.js')).ExamSubject,
    Exam: (await import('../src/models/Exam.js')).Exam,
  };
  const a = ctx.a;
  const dayCode = [null, 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date().getDay()] || 'MON';
  await models.TimetableEntry.create({
    schoolId: a.schoolId, academicYearId: a.yearId, classId: a.classId, className: 'Class 10', sectionId: a.sectionId,
    sectionName: 'A', subjectId: a.subjectId, subjectName: 'English', teacherId: a.teacherId, teacherName: 'Test Teacher',
    dayOfWeek: dayCode, periodNumber: 1, startTime: '09:00', endTime: '09:45', room: '101', status: 'ACTIVE',
  });
  await models.Announcement.create({
    schoolId: a.schoolId, title: 'Staff meeting', body: 'At 3pm', audiences: ['TEACHERS'], status: 'PUBLISHED',
    publishedByName: 'Principal', publishAt: new Date(Date.now() - 3600000),
  });
  // A notice for students only — must never reach the teacher app.
  await models.Announcement.create({
    schoolId: a.schoolId, title: 'Students only', body: 'x', audiences: ['STUDENTS'], status: 'PUBLISHED',
    publishAt: new Date(Date.now() - 3600000),
  });
  await models.Event.create({
    schoolId: a.schoolId, title: 'Sports Day', startAt: new Date(Date.now() + 5 * 86400000),
    endAt: new Date(Date.now() + 5 * 86400000 + 3600000), audiences: ['ALL'], location: 'Ground',
  });
  await models.SchoolMessage.create({
    schoolId: a.schoolId, threadKey: `teacher:${a.teacherId}`, fromName: 'Office', fromRole: 'ADMIN', direction: 'OUT', body: 'Hello teacher',
  });
  const open = await models.Exam.create({
    schoolId: a.schoolId, academicYearId: a.yearId, name: 'Mid Term', examType: 'UNIT_TEST', startDate: new Date(),
    endDate: new Date(), classIds: [a.classId], status: 'IN_PROGRESS',
  });
  await models.ExamSubject.create({
    schoolId: a.schoolId, examId: open._id, classId: a.classId, subjectId: a.subjectId, subjectName: 'English', maxMarks: 50, passingMarks: 17,
  });
  ctx.openExamId = open._id.toString();
}, 60000);
afterAll(disconnect);

describe('Teacher app — full flow', () => {
  it('Login → me (session + school theme + features)', async () => {
    const res = await request(app).post('/school-portal/auth/teacher-login').send({ identifier: 'teacher@schoola.edu', password: 'Passw0rd!' });
    expect(res.status).toBe(200);
    token = res.body.token;
    expect(res.body.user.role).toBe('TEACHER');
    expect(res.body.school.primaryColor).toBeTruthy();
    const me = await get('/me');
    expect(me.body.data.user.isClassTeacher).toBe(true);
    expect(me.body.data.user.classTeacherSections[0]).toMatchObject({ sectionId: ctx.a.sectionId, className: 'Class 10', sectionName: 'A' });
    expect(me.body.data.school.features.safePickup).toBe(true);
  });

  it('Home: dashboard stats, today periods, schedule detail, unread badge', async () => {
    const dash = await get('/dashboard');
    expect(dash.status).toBe(200);
    expect(dash.body.data.stats.students).toBe(2);
    const t = await get('/today-schedule');
    if (new Date().getDay() !== 0) {
      expect(t.body.data.periods).toHaveLength(1);
      const entry = await get(`/schedule/${t.body.data.periods[0].id}`);
      expect(entry.body.data).toMatchObject({ sectionId: ctx.a.sectionId, subjectName: 'English' });
    }
    const unread = await get('/notifications/unread-count');
    expect(typeof unread.body.data.unread).toBe('number');
  });

  it('Classes → sections → roster (search / sort / paging) → student detail', async () => {
    const classes = await get('/classes');
    expect(classes.body.data).toEqual([expect.objectContaining({ id: ctx.a.classId, sectionCount: 1, studentCount: 2 })]);
    const sections = await get(`/classes/${ctx.a.classId}/sections`);
    expect(sections.body.data[0]).toMatchObject({ id: ctx.a.sectionId, isClassTeacher: true, studentCount: 2 });
    const roster = await get(`/sections/${ctx.a.sectionId}/students`, { page: 1, limit: 30, sort: 'rollNumber' });
    expect(roster.body.data.map((s) => s.rollNumber)).toEqual(['1', '2']);
    expect(roster.body.pagination).toMatchObject({ page: 1, total: 2 });
    const search = await get(`/sections/${ctx.a.sectionId}/students`, { page: 1, limit: 30, q: 'nomo', sort: 'name' });
    expect(search.body.data).toHaveLength(1);
    const student = await get(`/students/${ctx.a.studentId}`);
    expect(student.body.data).toMatchObject({ id: ctx.a.studentId, parentPhone: '9876500000' });
    const log = await get(`/attendance/student/${ctx.a.studentId}`);
    expect(log.status).toBe(200);
  });

  it('Attendance: sheet → save (idempotent) → patch changed rows → finalize → locked', async () => {
    const sheet = await get('/attendance/today', { sectionId: ctx.a.sectionId, date: today() });
    expect(sheet.body.data.attendanceId).toBeNull();
    expect(sheet.body.data.entries).toHaveLength(2);
    const records = sheet.body.data.entries.map((e) => ({ studentId: e.studentId, status: 'PRESENT', note: '' }));
    records[1].status = 'ABSENT';

    const key = 'app-flow-attn-1';
    const first = await send('post', '/attendance', { sectionId: ctx.a.sectionId, date: today(), records }, { 'Idempotency-Key': key });
    expect(first.status).toBe(200);
    const replay = await send('post', '/attendance', { sectionId: ctx.a.sectionId, date: today(), records }, { 'Idempotency-Key': key });
    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body.data.id).toBe(first.body.data.id);

    const again = await get('/attendance/today', { sectionId: ctx.a.sectionId, date: today() });
    const attendanceId = again.body.data.attendanceId;
    expect(attendanceId).toBe(first.body.data.id);
    expect(again.body.data.entries.find((e) => e.status === 'ABSENT')).toBeTruthy();

    const patched = await send('patch', `/attendance/${attendanceId}`, { records: [{ studentId: records[1].studentId, status: 'LATE', note: 'Bus late' }] });
    expect(patched.body.data.summary).toMatchObject({ PRESENT: 1, LATE: 1 });

    const fin = await send('post', `/attendance/${attendanceId}/finalize`);
    expect(fin.body.data.locked).toBe(true);
    const locked = await get('/attendance/today', { sectionId: ctx.a.sectionId, date: today() });
    expect(locked.body.data.locked).toBe(true);
    const blocked = await send('patch', `/attendance/${attendanceId}`, { records: [{ studentId: records[1].studentId, status: 'PRESENT' }] });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('ATTENDANCE_FINALIZED');
  });

  it('Attendance edge cases: future date, bad status, missing section', async () => {
    const future = await get('/attendance/today', { sectionId: ctx.a.sectionId, date: ymdOffset(2) });
    expect(future.status).toBe(400);
    const bad = await send('post', '/attendance', {
      sectionId: ctx.a.sectionId, date: ymdOffset(-1), records: [{ studentId: ctx.a.studentId, status: 'SLEEPING' }],
    });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVALID_ATTENDANCE_STATUS');
    const noSection = await get('/attendance/today');
    expect(noSection.status).toBe(400);
  });

  it('Attendance history + monthly summary', async () => {
    const hist = await get('/attendance/history', { page: 1, sectionId: ctx.a.sectionId });
    expect(hist.body.data.length).toBeGreaterThanOrEqual(2);
    expect(hist.body.data[0]).toHaveProperty('summary.PRESENT');
    const sum = await get('/attendance/summary', { sectionId: ctx.a.sectionId, month: today().slice(0, 7) });
    expect(sum.body.data.daysMarked).toBeGreaterThanOrEqual(1);
  });

  it('Homework: slots → create → list (status filter) → detail → submissions → edit → close → delete', async () => {
    const slots = await get('/teaching-slots');
    const slot = slots.body.data[0];
    const created = await send('post', '/homework', {
      title: 'Essay', description: 'Write 200 words', sectionId: slot.sectionId, subjectId: slot.subjectId,
      assignedDate: today(), dueDate: ymdOffset(3), attachments: [{ name: 'Link', url: 'https://example.com/x' }],
    });
    expect(created.status).toBeLessThan(300);
    const id = created.body.data.id;
    const list = await get('/homework', { page: 1, limit: 20, status: 'ALL' });
    expect(list.body.data.some((h) => h.id === id)).toBe(true);
    const closedOnly = await get('/homework', { page: 1, limit: 20, status: 'CLOSED' });
    expect(closedOnly.body.data.some((h) => h.id === id)).toBe(false);
    const detail = await get(`/homework/${id}`);
    expect(detail.body.data).toMatchObject({ sectionId: slot.sectionId, subjectId: slot.subjectId, description: 'Write 200 words' });
    const subs = await get(`/homework/${id}/submissions`);
    expect(subs.body.data.summary).toMatchObject({ total: 2, submitted: 0 });
    // app's edit form resends section/subject + dates
    const edit = await send('patch', `/homework/${id}`, {
      title: 'Essay v2', description: 'x', sectionId: slot.sectionId, subjectId: slot.subjectId, assignedDate: today(), dueDate: ymdOffset(4), attachments: [],
    });
    expect(edit.body.data.title).toBe('Essay v2');
    const closed = await send('patch', `/homework/${id}`, { status: 'CLOSED' });
    expect(closed.body.data.status).toBe('CLOSED');
    const badDates = await send('post', '/homework', {
      title: 'x', sectionId: slot.sectionId, subjectId: slot.subjectId, assignedDate: today(), dueDate: ymdOffset(-2),
    });
    expect(badDates.status).toBe(400);
    expect((await send('delete', `/homework/${id}`)).status).toBe(200);
    expect((await get(`/homework/${id}`)).status).toBe(404);
  });

  it('Assignments: create DRAFT → publish → student submits → grade (bounds) → counts', async () => {
    const created = await send('post', '/assignments', {
      title: 'Project', description: 'd', instructions: 'i', sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId,
      assignedDate: today(), dueDate: ymdOffset(5), maxMarks: 20, status: 'DRAFT', attachments: [],
    });
    expect(created.status).toBeLessThan(300);
    const id = created.body.data.id;
    const pub = await send('patch', `/assignments/${id}`, { status: 'PUBLISHED' });
    expect(pub.body.data.status).toBe('PUBLISHED');

    const { AssignmentSubmission } = await import('../src/models/AssignmentSubmission.js');
    await AssignmentSubmission.create({ schoolId: ctx.a.schoolId, assignmentId: id, studentId: ctx.a.studentId, status: 'SUBMITTED', submittedAt: new Date() });
    const subs = await get(`/assignments/${id}/submissions`);
    const row = subs.body.data.submissions.find((s) => s.studentId === ctx.a.studentId);
    expect(row.submissionId).toBeTruthy();
    const tooHigh = await send('patch', `/assignments/${id}/submissions/${row.submissionId}/grade`, { marksObtained: 25, feedback: '' });
    expect(tooHigh.status).toBe(400);
    expect(tooHigh.body.code).toBe('INVALID_MARKS');
    const ok = await send('patch', `/assignments/${id}/submissions/${row.submissionId}/grade`, { marksObtained: 18, feedback: 'Good' });
    expect(ok.status).toBe(200);
    const after = await get(`/assignments/${id}/submissions`);
    expect(after.body.data.summary).toMatchObject({ submitted: 1, graded: 1 });
    const list = await get('/assignments', { page: 1, limit: 20, status: 'PUBLISHED' });
    expect(list.body.data.find((x) => x.id === id)).toMatchObject({ maxMarks: 20 });
  });

  it('Materials: upload (real PDF bytes) → list → delete; renamed file rejected', async () => {
    const pdf = Buffer.from('%PDF-1.4\n%fake\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
    const up = await request(app)
      .post(`${P}/materials`)
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Notes')
      .field('description', '')
      .field('sectionId', ctx.a.sectionId)
      .field('subjectId', ctx.a.subjectId)
      .field('visibility', 'SECTION')
      .attach('file', pdf, { filename: 'notes.pdf', contentType: 'application/pdf' });
    expect(up.status).toBeLessThan(300);
    const list = await get('/materials', { page: 1, limit: 20 });
    expect(list.body.data[0]).toMatchObject({ title: 'Notes', fileType: expect.any(String) });
    expect(list.body.data[0].url).toMatch(/^\/uploads\//);

    const fake = await request(app)
      .post(`${P}/materials`)
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Fake')
      .field('sectionId', ctx.a.sectionId)
      .field('subjectId', ctx.a.subjectId)
      .attach('file', Buffer.from('MZ-not-a-pdf'), { filename: 'virus.pdf', contentType: 'application/pdf' });
    expect(fake.status).toBe(400);
    expect(fake.body.code).toBe('UPLOAD_REJECTED');
    expect((await send('delete', `/materials/${up.body.data.id}`)).status).toBe(200);
  });

  it('Exams → my subjects (with my sections) → marks sheet → save all (idempotent) → locked exam read-only', async () => {
    const exams = await get('/exams');
    expect(exams.body.data.map((e) => e.name)).toContain('Mid Term');
    const subjects = await get(`/exams/${ctx.openExamId}/subjects`);
    const sub = subjects.body.data[0];
    expect(sub.sections).toEqual([{ id: ctx.a.sectionId, name: 'A' }]);
    const q = { classId: sub.classId, sectionId: ctx.a.sectionId, subjectId: sub.subjectId };
    const sheet = await get(`/exams/${ctx.openExamId}/marks`, q);
    expect(sheet.body.data.locked).toBe(false);
    expect(sheet.body.data.examSubject.maxMarks).toBe(50);
    const marksList = sheet.body.data.students.map((s, i) => ({
      studentId: s.studentId, attendanceStatus: i === 0 ? 'PRESENT' : 'ABSENT', marksObtained: i === 0 ? 44 : null, remarks: '',
    }));
    const saved = await send('post', `/exams/${ctx.openExamId}/marks`, { ...q, marksList }, { 'Idempotency-Key': 'marks-1' });
    expect(saved.status).toBe(200);
    const reread = await get(`/exams/${ctx.openExamId}/marks`, q);
    expect(reread.body.data.students.find((s) => s.studentId === marksList[0].studentId).marksObtained).toBe(44);
    expect(reread.body.data.students.find((s) => s.studentId === marksList[1].studentId).attendanceStatus).toBe('ABSENT');

    const over = await send('post', `/exams/${ctx.openExamId}/marks`, { ...q, marksList: [{ ...marksList[0], marksObtained: 51 }] });
    expect(over.body.code).toBe('INVALID_MARKS');

    // seeded "Unit Test 1" is PUBLISHED → read-only
    const published = exams.body.data.find((e) => e.status === 'PUBLISHED');
    const lockedSheet = await get(`/exams/${published.id}/marks`, q);
    expect(lockedSheet.body.data.locked).toBe(true);
    const write = await send('post', `/exams/${published.id}/marks`, { ...q, marksList });
    expect(write.body.code).toBe('EXAM_FINALIZED');
  });

  it('Leave: apply → list → cancel → cannot cancel twice', async () => {
    const applied = await send('post', '/leaves', { leaveType: 'MEDICAL', startDate: ymdOffset(10), endDate: ymdOffset(11), reason: 'Fever' });
    expect(applied.status).toBeLessThan(300);
    expect(applied.body.data.totalDays).toBe(2);
    const list = await get('/leaves', { page: 1, limit: 20 });
    expect(list.body.data[0]).toMatchObject({ status: 'PENDING', leaveType: 'MEDICAL' });
    expect((await send('post', `/leaves/${applied.body.data.id}/cancel`)).status).toBe(200);
    const twice = await send('post', `/leaves/${applied.body.data.id}/cancel`);
    expect(twice.body.code).toBe('LEAVE_NOT_CANCELLABLE');
    const bad = await send('post', '/leaves', { leaveType: 'CASUAL', startDate: ymdOffset(5), endDate: ymdOffset(3), reason: 'x' });
    expect(bad.status).toBe(400);
  });

  it('Inbox: notices (audience-filtered, open marks read, read-all), events scopes, chat', async () => {
    const notices = await get('/notices', { page: 1, limit: 20 });
    const titles = notices.body.data.map((n) => n.title);
    expect(titles).toContain('Staff meeting');
    expect(titles).not.toContain('Students only');
    const n = notices.body.data.find((x) => x.title === 'Staff meeting');
    expect(n.isRead).toBe(false);
    expect((await get(`/notices/${n.id}`)).status).toBe(200);
    await send('patch', `/notices/${n.id}/read`);
    expect((await get('/notices')).body.data.find((x) => x.id === n.id).isRead).toBe(true);
    expect((await send('patch', '/notices/read-all')).status).toBe(200);

    const upcoming = await get('/events', { page: 1, limit: 20, scope: 'upcoming' });
    expect(upcoming.body.data.map((e) => e.title)).toContain('Sports Day');
    const past = await get('/events', { page: 1, limit: 20, scope: 'past' });
    expect(past.body.data.map((e) => e.title)).not.toContain('Sports Day');

    const convs = await get('/conversations');
    const conv = convs.body.data[0];
    expect(conv.unread).toBe(1);
    const msgs = await get(`/conversations/${encodeURIComponent(conv.id)}/messages`, { page: 1, limit: 100 });
    expect(msgs.body.data[0].body).toBe('Hello teacher');
    const sent = await send('post', `/conversations/${encodeURIComponent(conv.id)}/messages`, { body: 'Hi office' });
    expect(sent.body.data.direction).toBe('IN');
    expect((await get('/conversations')).body.data[0].unread).toBe(0);
    const tooLong = await send('post', `/conversations/${encodeURIComponent(conv.id)}/messages`, { body: 'x'.repeat(4001) });
    expect(tooLong.status).toBe(400);
    const other = await get(`/conversations/${encodeURIComponent('teacher:000000000000000000000000')}/messages`);
    expect(other.status).toBe(404);
  });

  it('Notifications: list + read-all; settings toggle round-trip', async () => {
    expect((await get('/notifications', { page: 1, limit: 20 })).status).toBe(200);
    expect((await send('patch', '/notifications/read-all')).status).toBe(200);
    expect((await get('/notifications/unread-count')).body.data.unread).toBe(0);
    const s = await send('patch', '/settings', { notificationPrefs: { homework: false } });
    expect(s.body.data.notificationPrefs.homework).toBe(false);
    expect((await get('/settings')).body.data.notificationPrefs).toMatchObject({ homework: false, notice: true });
  });

  it('Profile: read, edit allowed fields + address, protected fields refused', async () => {
    const p = await get('/profile');
    expect(p.body.data.payroll).toBeDefined();
    const edit = await send('patch', '/profile', {
      firstName: 'Testy', middleName: '', lastName: 'Teacher', phone: '9876543210', mobileNumber: '9876543210', alternateMobile: '',
      bloodGroup: 'O+', maritalStatus: '', nationality: 'Indian', emergencyContactName: 'Mom', emergencyContactNumber: '9876500001',
      emergencyContactRelationship: 'Mother', address: { addressLine: '1 Road', city: 'Indore', state: 'MP', pincode: '452001' },
    });
    expect(edit.status).toBe(200);
    expect(edit.body.data).toMatchObject({ name: 'Testy Teacher', bloodGroup: 'O+' });
    expect(edit.body.data.address).toMatchObject({ city: 'Indore', pincode: '452001' });
    const esc = await send('patch', '/profile', { status: 'ACTIVE', employeeId: 'HACK' });
    expect(esc.status).toBe(400);
    expect((await get('/me')).body.data.user.name).toBe('Testy Teacher');
  });

  it('Timetable week + day', async () => {
    const week = await get('/timetable');
    expect(week.body.data.days).toContain('MON');
    const day = await get('/timetable/day/mon');
    expect(day.body.data.day).toBe('MON');
    expect((await get('/timetable/day/SUNDAY')).status).toBe(400);
  });

  it('Safe pickup: eligible → initiate (OTP to guardian) → wrong OTP → cancel', async () => {
    const list = await get('/pickups/eligible-students', { page: 1, limit: 30 });
    const sam = list.body.data.find((s) => s.id === ctx.a.studentId);
    expect(sam).toMatchObject({ pickupEnabled: true, hasGuardianMobile: true });
    const noGuardian = list.body.data.find((s) => s.id === ctx.a.studentNoGuardianId);
    expect(noGuardian.hasGuardianMobile).toBe(false);
    const started = await send('post', '/pickups/initiate', { studentId: ctx.a.studentId }, { 'Idempotency-Key': 'pk-1' });
    expect(started.status).toBe(201);
    const sid = started.body.data.id;
    expect(started.body.data.maskedMobile).not.toContain('9876500000');
    const wrong = await send('post', `/pickups/${sid}/verify`, { otp: '000000' });
    expect(wrong.status).toBe(400);
    const cancelled = await send('post', `/pickups/${sid}/cancel`);
    expect(cancelled.body.data.status).toBe('CANCELLED');
  });

  it('Change password keeps this device signed in; logout ends the session', async () => {
    const res = await send('patch', '/change-password', { currentPassword: 'Passw0rd!', newPassword: 'Newpass#2026' });
    expect(res.status).toBe(200);
    token = res.body.data.token; // app: setToken(res.data.token)
    expect((await get('/me')).status).toBe(200);
    expect((await send('post', '/auth/logout')).status).toBe(200);
    expect((await get('/me')).status).toBe(401);
  });
});

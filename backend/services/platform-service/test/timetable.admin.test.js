import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const slot = (dayOfWeek, periodNumber, extra = {}) => ({
  dayOfWeek,
  periodNumber,
  startTime: `${String(8 + periodNumber).padStart(2, '0')}:00`,
  endTime: `${String(8 + periodNumber).padStart(2, '0')}:45`,
  ...extra,
});

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);

afterAll(disconnect);

describe('School Admin timetable grid', () => {
  let secondSectionId;

  it('saves a whole grid for a section', async () => {
    const res = await request(app)
      .put(`/school-portal/timetable/sections/${ctx.a.sectionId}`)
      .set(auth(ctx.a.adminToken))
      .send({
        academicYearId: ctx.a.yearId,
        periods: [
          slot('MON', 1, { subjectId: ctx.a.subjectId, teacherId: ctx.a.teacherId }),
          slot('MON', 2, { subjectId: ctx.a.subjectId, teacherId: ctx.a.teacherId }),
          slot('TUE', 1, { subjectId: ctx.a.subjectId }),
        ],
      });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0]).toMatchObject({
      sectionId: ctx.a.sectionId,
      subjectId: ctx.a.subjectId,
      dayOfWeek: 'MON',
      periodNumber: 1,
      startTime: '09:00',
      endTime: '09:45',
    });
    expect(res.body.data[0].subjectName).toBe('English');
  });

  it('reads the grid back and a re-save replaces it', async () => {
    const list = await request(app)
      .get('/school-portal/timetable')
      .query({ sectionId: ctx.a.sectionId })
      .set(auth(ctx.a.adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(3);

    const res = await request(app)
      .put(`/school-portal/timetable/sections/${ctx.a.sectionId}`)
      .set(auth(ctx.a.adminToken))
      .send({ periods: [slot('WED', 3, { subjectId: ctx.a.subjectId, teacherId: ctx.a.teacherId })] });
    expect(res.status).toBe(200);

    const again = await request(app)
      .get('/school-portal/timetable')
      .query({ sectionId: ctx.a.sectionId })
      .set(auth(ctx.a.adminToken));
    expect(again.body.data).toHaveLength(1);
    expect(again.body.data[0]).toMatchObject({ dayOfWeek: 'WED', periodNumber: 3 });
  });

  it('rejects a grid that puts a teacher in two sections at once (409, names the other section)', async () => {
    const { Section } = await import('../src/models/Section.js');
    const created = await Section.create({
      schoolId: ctx.a.schoolId, academicYearId: ctx.a.yearId, classId: ctx.a.classId, name: 'B', capacity: 40,
    });
    secondSectionId = created._id.toString();

    const res = await request(app)
      .put(`/school-portal/timetable/sections/${secondSectionId}`)
      .set(auth(ctx.a.adminToken))
      .send({ periods: [slot('WED', 3, { subjectId: ctx.a.subjectId, teacherId: ctx.a.teacherId })] });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('TIMETABLE_CLASH');
    expect(res.body.message).toMatch(/Class 10 A on WED P3/);

    // Nothing was written for section B.
    const list = await request(app)
      .get('/school-portal/timetable')
      .query({ sectionId: secondSectionId })
      .set(auth(ctx.a.adminToken));
    expect(list.body.data).toHaveLength(0);
  });

  it('a different period for the same teacher is fine', async () => {
    const res = await request(app)
      .put(`/school-portal/timetable/sections/${secondSectionId}`)
      .set(auth(ctx.a.adminToken))
      .send({ periods: [slot('WED', 4, { subjectId: ctx.a.subjectId, teacherId: ctx.a.teacherId })] });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
  });

  it('validates slots before touching the grid', async () => {
    const bad = await request(app)
      .put(`/school-portal/timetable/sections/${ctx.a.sectionId}`)
      .set(auth(ctx.a.adminToken))
      .send({ periods: [{ dayOfWeek: 'SUN', periodNumber: 1, startTime: '09:00', endTime: '09:45', subjectId: ctx.a.subjectId }] });
    expect(bad.status).toBe(400);

    const dup = await request(app)
      .put(`/school-portal/timetable/sections/${ctx.a.sectionId}`)
      .set(auth(ctx.a.adminToken))
      .send({ periods: [slot('MON', 1, { subjectId: ctx.a.subjectId }), slot('MON', 1, { subjectId: ctx.a.subjectId })] });
    expect(dup.status).toBe(400);

    const list = await request(app)
      .get('/school-portal/timetable')
      .query({ sectionId: ctx.a.sectionId })
      .set(auth(ctx.a.adminToken));
    expect(list.body.data).toHaveLength(1);
  });

  it('other schools cannot write this section', async () => {
    const res = await request(app)
      .put(`/school-portal/timetable/sections/${ctx.a.sectionId}`)
      .set(auth(ctx.b.adminToken))
      .send({ periods: [] });
    expect(res.status).toBe(404);
  });
});

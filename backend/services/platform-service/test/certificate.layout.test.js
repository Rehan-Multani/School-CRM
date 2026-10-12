import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 90000);
afterAll(disconnect);

const body = (over = {}) => ({
  name: `Layout ${Math.random().toString(36).slice(2, 7)}`,
  title: 'Class Timetable',
  type: 'TIMETABLE',
  text: 'Class timetable',
  applicableTo: 'STUDENT',
  status: 'PUBLISHED',
  design: {
    layout: {
      page: { size: 'A4', orientation: 'landscape', background: '#ffffff' },
      elements: [
        { id: 'a', type: 'text', x: 10, y: 10, w: 100, h: 10, text: 'Hello {{schoolName}}', fontFamily: 'nope', fontSize: 9999, color: 'red' },
        { id: 'b', type: 'script', x: 0, y: 0, w: 10, h: 10 },
        { id: 'c', type: 'image', x: 0, y: 0, w: 10, h: 10, src: 'javascript:alert(1)' },
        { id: 'd', type: 'timetable', x: 5, y: 30, w: 250, h: 100 },
      ],
    },
  },
  ...over,
});

describe('Certificate designer layouts', () => {
  it('stores a sanitised layout and refuses to issue a class document to people', async () => {
    const res = await request(app).post('/school-portal/certificates/templates').set(auth(ctx.a.adminToken)).send(body());
    expect(res.status).toBe(201);
    const layout = res.body.data.design.layout;
    expect(layout.page.w).toBe(297);
    expect(layout.page.h).toBe(210);
    // unknown element dropped, unsafe image blanked, text clamped to safe values
    expect(layout.elements.map((e) => e.type)).toEqual(['text', 'image', 'timetable']);
    expect(layout.elements[0].fontFamily).toBe('serif');
    expect(layout.elements[0].fontSize).toBe(120);
    expect(layout.elements[0].color).toBe('#1f2937');
    expect(layout.elements[1].src).toBe('');

    const issue = await request(app)
      .post('/school-portal/certificates/issue')
      .set(auth(ctx.a.adminToken))
      .send({ templateId: res.body.data.id, recipientIds: [ctx.a.studentId], issueDate: '2026-10-12' });
    expect(issue.status).toBe(400);
  });

  it('serves timetable and fee-structure data for a section / class of this school only', async () => {
    const t = await request(app).get('/school-portal/certificates/data/timetable').query({ sectionId: ctx.a.sectionId }).set(auth(ctx.a.adminToken));
    expect(t.status).toBe(200);
    expect(Array.isArray(t.body.data.days)).toBe(true);
    const other = await request(app).get('/school-portal/certificates/data/timetable').query({ sectionId: ctx.a.sectionId }).set(auth(ctx.b.adminToken));
    expect(other.status).toBe(404);

    const f = await request(app).get('/school-portal/certificates/data/fee-structure').query({ classId: ctx.a.classId }).set(auth(ctx.a.adminToken));
    expect(f.status).toBe(200);
    expect(f.body.data.items).toEqual([]);
    const bad = await request(app).get('/school-portal/certificates/data/fee-structure').set(auth(ctx.a.adminToken));
    expect(bad.status).toBe(400);
  });
});

describe('Starter templates', () => {
  it('are built, valid, and seeded once per school', async () => {
    const { buildDefaultTemplates } = await import('../src/utils/certificateStarterTemplates.js');
    const rows = buildDefaultTemplates();
    expect(rows.length).toBeGreaterThanOrEqual(10);
    for (const t of rows) {
      expect(t.design.layout.elements.length).toBeGreaterThan(3);
      expect(t.design.layout.page.w).toBeGreaterThan(100);
    }
    const { certificateService } = await import('../src/services/certificate.service.js');
    const first = await certificateService.seedDefaults(ctx.b.schoolId);
    expect(first.created).toBe(rows.length);
    const again = await certificateService.seedDefaults(ctx.b.schoolId);
    expect(again.created).toBe(0);
    const list = await request(app).get('/school-portal/certificates/templates').set(auth(ctx.b.adminToken));
    expect(list.body.data.length).toBe(rows.length);
    expect(list.body.data.every((t) => t.status === 'PUBLISHED')).toBe(true);
  });
});

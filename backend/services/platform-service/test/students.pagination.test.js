import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

// GET /school-portal/students is paged only when the caller sends `page`;
// screens that still expect the whole list keep getting it.
let app;
let ctx;
let Student;

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const list = (query = {}) => request(app).get('/school-portal/students').query(query).set(auth(ctx.a.adminToken));

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ Student } = await import('../src/models/Student.js'));
  // 7 extra students in school A (no enrollment), one of them inactive.
  for (let i = 1; i <= 7; i += 1) {
    await Student.create({
      schoolId: ctx.a.schoolId,
      admissionNumber: `PAGE-${i}`,
      firstName: `Paging${i}`,
      lastName: 'Sample',
      status: i === 7 ? 'INACTIVE' : 'ACTIVE',
    });
  }
}, 120000);

afterAll(disconnect);

describe('Students list paging', () => {
  it('returns the whole list when no page is asked for', async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeUndefined();
    expect(res.body.data.length).toBe(await Student.countDocuments({ schoolId: ctx.a.schoolId }));
  });

  it('returns one page, the total and the card counts', async () => {
    const all = await Student.countDocuments({ schoolId: ctx.a.schoolId });
    const first = await list({ page: 1, limit: 3 });
    expect(first.status).toBe(200);
    expect(first.body.data).toHaveLength(3);
    expect(first.body.pagination).toEqual({ page: 1, limit: 3, total: all, totalPages: Math.ceil(all / 3) });
    expect(first.body.stats.total).toBe(all);
    expect(first.body.stats.inactive).toBe(1);
    expect(first.body.stats.active).toBe(all - 1);

    const second = await list({ page: 2, limit: 3 });
    const ids = new Set([...first.body.data, ...second.body.data].map((s) => s.id));
    expect(ids.size).toBe(first.body.data.length + second.body.data.length); // no overlap between pages
  });

  it('searches on the server, including a full name', async () => {
    const byWord = await list({ page: 1, limit: 20, search: 'Paging' });
    expect(byWord.body.pagination.total).toBe(7);

    const byFullName = await list({ page: 1, limit: 20, search: 'Paging3 Sample' });
    expect(byFullName.body.data.map((s) => s.admissionNumber)).toEqual(['PAGE-3']);

    const none = await list({ page: 1, limit: 20, search: 'zz-no-such-student' });
    expect(none.body.data).toEqual([]);
    expect(none.body.pagination.total).toBe(0);
    expect(none.body.stats.total).toBeGreaterThan(0); // the cards ignore the search box
  });

  it('applies the status and class filters to the page', async () => {
    const inactive = await list({ page: 1, limit: 20, status: 'INACTIVE' });
    expect(inactive.body.data.map((s) => s.admissionNumber)).toEqual(['PAGE-7']);

    const inClass = await list({ page: 1, limit: 20, classId: ctx.a.classId });
    expect(inClass.body.pagination.total).toBeGreaterThan(0);
    expect(inClass.body.data.every((s) => s.enrollment?.class?.id === ctx.a.classId)).toBe(true);
    expect(inClass.body.data.some((s) => s.admissionNumber.startsWith('PAGE-'))).toBe(false);
  });

  it('never leaks another school', async () => {
    const res = await list({ page: 1, limit: 100 });
    expect(JSON.stringify(res.body)).not.toContain(ctx.b.studentId);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

// Exam types are a per-school CRUD list; an exam may only use one of them.
let app;
let ctx;

const api = (method, path, body, token) => {
  const req = request(app)[method](path).set({ Authorization: `Bearer ${token || ctx.a.adminToken}` });
  return body === undefined ? req : req.send(body);
};

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 120000);

afterAll(disconnect);

const exam = (over = {}) => ({
  name: `ET Exam ${Math.random().toString(36).slice(2, 8)}`,
  academicYearId: ctx.a.yearId,
  startDate: '2026-11-01',
  endDate: '2026-11-05',
  classIds: [ctx.a.classId],
  ...over,
});

describe('Exam types CRUD', () => {
  let typeId;

  it('starts with the six default types', async () => {
    const res = await api('get', '/school-portal/exam-types');
    expect(res.status).toBe(200);
    const codes = res.body.data.map((t) => t.code);
    expect(codes).toEqual(
      expect.arrayContaining(['UNIT_TEST', 'MONTHLY_TEST', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'PRE_BOARD'])
    );
  });

  it('creates a type and derives its code; duplicates are refused', async () => {
    const created = await api('post', '/school-portal/exam-types', { name: 'Practical Exam', description: 'Labs' });
    expect(created.status).toBe(201);
    expect(created.body.data.code).toBe('PRACTICAL_EXAM');
    typeId = created.body.data.id;

    expect((await api('post', '/school-portal/exam-types', { name: 'practical exam' })).status).toBe(409);
    expect((await api('post', '/school-portal/exam-types', { name: '  ' })).status).toBe(400);
  });

  it('renames a type but keeps its code', async () => {
    const res = await api('patch', `/school-portal/exam-types/${typeId}`, { name: 'Practical Examination' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Practical Examination');
    expect(res.body.data.code).toBe('PRACTICAL_EXAM');
  });

  it('an exam can use a custom type, but not an unknown one', async () => {
    const ok = await api('post', '/school-portal/exams', exam({ examType: 'PRACTICAL_EXAM' }));
    expect(ok.status).toBe(201);
    expect(ok.body.data.examType).toBe('PRACTICAL_EXAM');

    const bad = await api('post', '/school-portal/exams', exam({ examType: 'NOPE' }));
    expect(bad.status).toBe(400);
  });

  it('a type in use cannot be deleted; deactivating hides it from new exams', async () => {
    const del = await api('delete', `/school-portal/exam-types/${typeId}`);
    expect(del.status).toBe(409);

    expect((await api('patch', `/school-portal/exam-types/${typeId}`, { isActive: false })).status).toBe(200);
    const active = await api('get', '/school-portal/exam-types');
    expect(active.body.data.find((t) => t.id === typeId)).toBeUndefined();
    const all = await api('get', '/school-portal/exam-types?includeInactive=true');
    expect(all.body.data.find((t) => t.id === typeId)?.examCount).toBe(1);

    const blocked = await api('post', '/school-portal/exams', exam({ examType: 'PRACTICAL_EXAM' }));
    expect(blocked.status).toBe(400);
  });

  it('an unused type can be deleted', async () => {
    const created = await api('post', '/school-portal/exam-types', { name: 'Throwaway Test' });
    const del = await api('delete', `/school-portal/exam-types/${created.body.data.id}`);
    expect(del.status).toBe(200);
  });

  it('is isolated per school', async () => {
    const other = await api('get', '/school-portal/exam-types', undefined, ctx.b?.adminToken);
    if (ctx.b?.adminToken) {
      expect(other.body.data.find((t) => t.code === 'PRACTICAL_EXAM')).toBeUndefined();
    }
  });
});

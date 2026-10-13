/**
 * Plans are sold per number of students: the plan's student count caps how
 * many ACTIVE students a school (admin, principal, any staff) can have.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { signAccessToken } from '../../shared/generateToken.js';
import { env } from '../src/config/env.js';

let ctx;
let app;
let subscriptionService;
let studentService;
let studentLifecycleService;
let SubscriptionPlan;
let SchoolSubscription;
let Student;
let SchoolUser;
let principalToken;

const auth = (t) => ({ Authorization: `Bearer ${t}` });
const payload = (n, extra = {}) => ({
  academicYearId: ctx.a.yearId,
  classId: ctx.a.classId,
  sectionId: ctx.a.sectionId,
  admissionNumber: `SW-${n}`,
  firstName: `Seat${n}`,
  dateOfBirth: '2012-05-10',
  parentName: 'Parent',
  parentPhone: `98760000${String(n).padStart(2, '0')}`,
  ...extra,
});

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ subscriptionService } = await import('../src/services/subscription.service.js'));
  ({ studentService } = await import('../src/services/student.service.js'));
  ({ studentLifecycleService } = await import('../src/services/studentLifecycle.service.js'));
  ({ SubscriptionPlan } = await import('../src/models/SubscriptionPlan.js'));
  ({ SchoolSubscription } = await import('../src/models/SchoolSubscription.js'));
  ({ Student } = await import('../src/models/Student.js'));
  ({ SchoolUser } = await import('../src/models/SchoolUser.js'));

  const principal = await SchoolUser.create({
    schoolId: ctx.a.schoolId, employeeId: 'PR-1', firstName: 'Pri', lastName: 'Ncipal', name: 'Pri Ncipal',
    email: 'principal.sw@schoola.edu', role: 'PRINCIPAL', phone: '9811300001', status: 'ACTIVE', passwordHash: 'x'.repeat(60),
  });
  principalToken = signAccessToken(
    { sub: principal._id.toString(), userId: principal._id.toString(), role: 'PRINCIPAL', schoolId: ctx.a.schoolId, name: principal.name, tv: principal.tokenVersion || 0 },
    { secret: env.jwtSecret, expiresIn: '1h' },
  );
}, 120000);
afterAll(disconnect);

describe('Student-wise plan (Super Admin)', () => {
  it('needs a student count', async () => {
    const base = { name: 'No Count Plan', price: 500, planType: 'Monthly', makeRecurring: false };
    await expect(subscriptionService.createPlan(base, 'test')).rejects.toMatchObject({ statusCode: 400 });
    await expect(subscriptionService.createPlan({ ...base, limits: {} }, 'test')).rejects.toMatchObject({ statusCode: 400 });
    await expect(subscriptionService.createPlan({ ...base, limits: { students: 0 } }, 'test')).rejects.toMatchObject({ statusCode: 400 });
    await expect(subscriptionService.createPlan({ ...base, limits: { students: 2.5 } }, 'test')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('stores the student count on the plan', async () => {
    const plan = await subscriptionService.createPlan(
      { name: 'Seat Plan 2', price: 500, planType: 'Monthly', makeRecurring: false, limits: { students: 2 } },
      'test',
    );
    expect(plan.limits.students).toBe(2);
  });
});

describe('Seats are enforced for everyone who adds students', () => {
  it('stops at the plan count, counting only ACTIVE students', async () => {
    const plan = await SubscriptionPlan.findOne({ name: 'Seat Plan 2' });
    await SchoolSubscription.deleteMany({ schoolId: ctx.a.schoolId });
    await SchoolSubscription.create({ schoolId: ctx.a.schoolId, planId: plan._id, status: 'active' });
    await Student.deleteMany({ schoolId: ctx.a.schoolId });

    await studentService.createStudent(ctx.a.schoolId, payload(1));
    await studentService.createStudent(ctx.a.schoolId, payload(2));
    await expect(studentService.createStudent(ctx.a.schoolId, payload(3))).rejects.toMatchObject({
      statusCode: 403,
      code: 'PLAN_LIMIT_REACHED',
    });
  });

  it('refuses the add through the principal / admin API too', async () => {
    for (const token of [principalToken, ctx.a.adminToken]) {
      const res = await request(app).post('/school-portal/students').set(auth(token)).send(payload(9));
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PLAN_LIMIT_REACHED');
    }
  });

  it('an INACTIVE student does not use a seat, but reactivating one does', async () => {
    const [first] = await Student.find({ schoolId: ctx.a.schoolId }).sort({ createdAt: 1 });
    await request(app).patch(`/school-portal/students/${first._id}/status`).set(auth(principalToken)).send({ status: 'INACTIVE' });

    // one seat is free now -> adding works, as an INACTIVE record or as a new active student
    const added = await studentService.createStudent(ctx.a.schoolId, payload(4));
    expect(added.status).toBe('ACTIVE');

    // the school is full again, so bringing the inactive student back must be refused
    const back = await request(app).patch(`/school-portal/students/${first._id}/status`).set(auth(principalToken)).send({ status: 'ACTIVE' });
    expect(back.status).toBe(403);
    expect(back.body.code).toBe('PLAN_LIMIT_REACHED');

    await expect(studentLifecycleService.reactivate(ctx.a.schoolId, first._id.toString())).rejects.toMatchObject({
      code: 'PLAN_LIMIT_REACHED',
    });
    const stillInactive = await Student.findById(first._id).lean();
    expect(stillInactive.status).toBe('INACTIVE');
  });

  it('principal and admin can read the seat usage', async () => {
    for (const token of [principalToken, ctx.a.adminToken]) {
      const res = await request(app).get('/school-portal/plan-usage').set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.students).toEqual({ used: 2, limit: 2 });
    }
  });
});

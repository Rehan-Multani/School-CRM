import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connect, disconnect, seed } from './helpers/setup.js';

// Plan limits (students/teachers/staff) + GST on locally generated subscription
// invoices + the Super Admin override actions.
let ctx;
let SubscriptionPlan;
let SchoolSubscription;
let School;
let Student;
let studentService;
let planLimits;
let billingService;
let platformSettingService;
let schoolSubscriptionService;

beforeAll(async () => {
  await connect();
  ctx = await seed();
  ({ SubscriptionPlan } = await import('../src/models/SubscriptionPlan.js'));
  ({ SchoolSubscription } = await import('../src/models/SchoolSubscription.js'));
  ({ School } = await import('../src/models/School.js'));
  ({ Student } = await import('../src/models/Student.js'));
  ({ studentService } = await import('../src/services/student.service.js'));
  planLimits = await import('../src/services/planLimits.service.js');
  ({ billingService } = await import('../src/services/billing.service.js'));
  ({ platformSettingService } = await import('../src/services/platformSetting.service.js'));
  ({ schoolSubscriptionService } = await import('../src/services/schoolSubscription.service.js'));
}, 120000);

afterAll(disconnect);

function studentPayload(n) {
  return {
    academicYearId: ctx.a.yearId,
    classId: ctx.a.classId,
    sectionId: ctx.a.sectionId,
    admissionNumber: `LIM-${n}`,
    firstName: `Limit${n}`,
    parentName: 'Parent',
    parentPhone: `98765432${String(n).padStart(2, '0')}`,
  };
}

describe('Plan limits', () => {
  it('blocks the second student when the active plan allows 1', async () => {
    const plan = await SubscriptionPlan.create({
      name: 'Tiny Plan', price: 100, planType: 'Monthly', limits: { students: 1 },
    });
    await SchoolSubscription.deleteMany({ schoolId: ctx.a.schoolId });
    await SchoolSubscription.create({ schoolId: ctx.a.schoolId, planId: plan._id, status: 'active' });
    await Student.deleteMany({ schoolId: ctx.a.schoolId });

    await studentService.createStudent(ctx.a.schoolId, studentPayload(1));
    await expect(studentService.createStudent(ctx.a.schoolId, studentPayload(2))).rejects.toMatchObject({
      statusCode: 403,
      code: 'PLAN_LIMIT_REACHED',
    });

    const usage = await planLimits.getPlanUsage(ctx.a.schoolId);
    expect(usage.students).toEqual({ used: 1, limit: 1 });
    expect(usage.teachers.limit).toBeNull();
  });

  it('treats a missing limit as unlimited and falls back to the manual plan by name', async () => {
    await SchoolSubscription.deleteMany({ schoolId: ctx.a.schoolId });
    await SubscriptionPlan.create({ name: 'Named Plan', price: 100, planType: 'Monthly', limits: { students: 5 } });
    await School.updateOne({ _id: ctx.a.schoolId }, { subscriptionPlan: 'Named Plan' });
    const limits = await planLimits.resolvePlanLimits(ctx.a.schoolId);
    expect(limits.students).toBe(5);
    await expect(planLimits.assertCanAdd(ctx.a.schoolId, 'students', 4)).resolves.toBeUndefined();
    await expect(planLimits.assertCanAdd(ctx.a.schoolId, 'students', 5)).rejects.toMatchObject({ code: 'PLAN_LIMIT_REACHED' });
  });
});

describe('GST on subscription invoices', () => {
  it('uses the platform taxPercent (default 18) and a plan override', async () => {
    const settings = await platformSettingService.getSettings();
    expect(settings.taxPercent).toBe(18);

    const invoice = await billingService.createInvoice(
      { schoolId: ctx.a.schoolId, planName: 'Named Plan', dueAt: new Date(Date.now() + 86400000).toISOString() },
      'test'
    );
    expect(invoice.subtotal).toBe(100);
    expect(invoice.taxPercent).toBe(18);
    expect(invoice.tax).toBe(18);
    expect(invoice.totalAmount).toBe(118);

    await platformSettingService.updateSettings({ taxPercent: 0 }, 'test');
    await SubscriptionPlan.create({ name: 'Taxed Plan', price: 200, planType: 'Monthly', taxPercent: 5 });
    const second = await billingService.createInvoice(
      { schoolId: ctx.b.schoolId, planName: 'Taxed Plan', dueAt: new Date(Date.now() + 86400000).toISOString() },
      'test'
    );
    expect(second.tax).toBe(10);
    expect(second.totalAmount).toBe(210);

    const zero = await billingService.createInvoice(
      { schoolId: ctx.b.schoolId, planName: 'Named Plan', dueAt: new Date(Date.now() + 86400000).toISOString() },
      'test'
    );
    expect(zero.taxPercent).toBe(0);
    expect(zero.totalAmount).toBe(100);
  });
});

describe('Super Admin subscription override', () => {
  it('supports extend (days) and force_status', async () => {
    const plan = await SubscriptionPlan.findOne({ name: 'Tiny Plan' });
    const sub = await SchoolSubscription.create({
      schoolId: ctx.b.schoolId, planId: plan._id, status: 'halted', currentPeriodEnd: new Date('2030-01-01'),
    });
    const extended = await schoolSubscriptionService.adminOverride(sub._id.toString(), { action: 'extend', days: 10 }, {});
    expect(new Date(extended.currentPeriodEnd).getTime()).toBe(new Date('2030-01-11').getTime());
    expect(extended.status).toBe('active');

    const forced = await schoolSubscriptionService.adminOverride(sub._id.toString(), { action: 'force_status', status: 'paused' }, {});
    expect(forced.status).toBe('paused');

    await expect(schoolSubscriptionService.adminOverride(sub._id.toString(), { action: 'force_status' }, {})).rejects.toMatchObject({ statusCode: 400 });
  });
});

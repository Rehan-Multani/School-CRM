import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connect, disconnect, seed } from './helpers/setup.js';

let ctx;
beforeAll(async () => {
  await connect();
  ctx = await seed();
}, 90000);
afterAll(disconnect);

describe('Birthday wishes', () => {
  it('wishes people whose birthday is today once, with an in-app notification', async () => {
    const { Student } = await import('../src/models/Student.js');
    const { Teacher } = await import('../src/models/Teacher.js');
    const { PlatformNotification } = await import('../src/models/PlatformNotification.js');
    const { birthdayService, __istToday } = await import('../src/services/birthday.service.js');
    const now = new Date();
    const t = __istToday(now);
    const dob = new Date(Date.UTC(2012, t.month - 1, t.day));
    await Student.updateOne({ _id: ctx.a.studentId }, { $set: { dateOfBirth: dob, status: 'ACTIVE' } });
    await Teacher.updateOne({ _id: ctx.a.teacherId }, { $set: { dateOfBirth: new Date(Date.UTC(1990, t.month - 1, t.day)), status: 'ACTIVE' } });
    await PlatformNotification.deleteMany({ 'link.type': 'birthday' });

    const r1 = await birthdayService.runForToday(now);
    expect(r1.sent).toBeGreaterThanOrEqual(2);
    const sn = await PlatformNotification.findOne({ 'link.type': 'birthday', recipientRefIds: String(ctx.a.studentId) }).lean();
    expect(sn.title).toMatch(/Happy Birthday/);
    expect(sn.audiences).toEqual(['student']);
    const tn = await PlatformNotification.findOne({ 'link.type': 'birthday', recipientRefIds: String(ctx.a.teacherId) }).lean();
    expect(tn.audiences).toEqual(['teacher']);

    const r2 = await birthdayService.runForToday(now); // same day again → nobody wished twice
    expect(r2.sent).toBe(0);
  });
});

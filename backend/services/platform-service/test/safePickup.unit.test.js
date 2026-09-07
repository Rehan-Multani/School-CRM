import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connect, disconnect, seed } from './helpers/setup.js';

let ctx;
beforeAll(async () => {
  await connect();
  ctx = await seed();
}, 90000);
afterAll(disconnect);

describe('safePickupOtpService', () => {
  it('static mode returns the configured OTP; hash/verify round-trips', async () => {
    const { safePickupOtpService } = await import('../src/services/safePickupOtp.service.js');
    const otp = safePickupOtpService.generateOtp();
    expect(otp).toBe('123456');
    const hash = await safePickupOtpService.hashOtp(otp);
    expect(await safePickupOtpService.verifyOtp('123456', hash)).toBe(true);
    expect(await safePickupOtpService.verifyOtp('000000', hash)).toBe(false);
    expect(await safePickupOtpService.verifyOtp('123456', '')).toBe(false);
  });

  it('expiry / attempts / cooldown helpers', async () => {
    const { safePickupOtpService } = await import('../src/services/safePickupOtp.service.js');
    expect(safePickupOtpService.isExpired({ otpExpiresAt: new Date(Date.now() - 1000) })).toBe(true);
    expect(safePickupOtpService.isExpired({ otpExpiresAt: new Date(Date.now() + 60000) })).toBe(false);
    expect(safePickupOtpService.attemptsLeft({ otpAttempts: 4, maxOtpAttempts: 5 })).toBe(1);
    expect(safePickupOtpService.resendCooldownLeft({ lastOtpSentAt: new Date() })).toBeGreaterThan(0);
    expect(safePickupOtpService.resendCooldownLeft({ lastOtpSentAt: new Date(Date.now() - 60000) })).toBe(0);
  });
});

describe('safePickupService.resolveGuardian', () => {
  it('returns name+mobile when present', async () => {
    const { safePickupService } = await import('../src/services/safePickup.service.js');
    expect(safePickupService.resolveGuardian({ parentName: 'A', parentPhone: '9876500000' })).toEqual({
      name: 'A',
      mobile: '9876500000',
    });
  });
  it('throws PARENT_MOBILE_NOT_FOUND when no mobile', async () => {
    const { safePickupService } = await import('../src/services/safePickup.service.js');
    expect(() => safePickupService.resolveGuardian({ parentPhone: '' })).toThrow(/no registered/i);
    try {
      safePickupService.resolveGuardian({ parentPhone: '' });
    } catch (e) {
      expect(e.code).toBe('PARENT_MOBILE_NOT_FOUND');
    }
  });
  it('throws PARENT_MOBILE_INVALID for a too-short number', async () => {
    const { safePickupService } = await import('../src/services/safePickup.service.js');
    try {
      safePickupService.resolveGuardian({ parentPhone: '123' });
    } catch (e) {
      expect(e.code).toBe('PARENT_MOBILE_INVALID');
    }
  });
});

describe('safePickupService.isStudentPickupEnabled', () => {
  it('true when school + class both on', async () => {
    const { safePickupService } = await import('../src/services/safePickup.service.js');
    const r = await safePickupService.isStudentPickupEnabled(ctx.a.schoolId, ctx.a.studentId);
    expect(r.enabled).toBe(true);
    expect(r.classId).toBe(ctx.a.classId);
  });
  it('false when class off', async () => {
    const { SchoolClass } = await import('../src/models/SchoolClass.js');
    const { safePickupService } = await import('../src/services/safePickup.service.js');
    await SchoolClass.updateOne({ _id: ctx.a.classId }, { $set: { safePickupEnabled: false } });
    const r = await safePickupService.isStudentPickupEnabled(ctx.a.schoolId, ctx.a.studentId);
    expect(r.enabled).toBe(false);
    expect(r.schoolEnabled).toBe(true);
    expect(r.classEnabled).toBe(false);
    await SchoolClass.updateOne({ _id: ctx.a.classId }, { $set: { safePickupEnabled: true } });
  });
  it('false when school off', async () => {
    const { School } = await import('../src/models/School.js');
    const { safePickupService } = await import('../src/services/safePickup.service.js');
    await School.updateOne({ _id: ctx.a.schoolId }, { $set: { 'settings.safePickupEnabled': false } });
    const r = await safePickupService.isStudentPickupEnabled(ctx.a.schoolId, ctx.a.studentId);
    expect(r.enabled).toBe(false);
    await School.updateOne({ _id: ctx.a.schoolId }, { $set: { 'settings.safePickupEnabled': true } });
  });
});

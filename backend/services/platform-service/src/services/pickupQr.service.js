import crypto from 'crypto';
import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { env } from '../config/env.js';
import { PickupQrToken } from '../models/PickupQrToken.js';
import { Student } from '../models/Student.js';
import { StudentAttendance } from '../models/StudentAttendance.js';
import { safePickupRepository } from '../repositories/safePickup.repository.js';
import { safePickupService, SAFE_PICKUP_ERRORS as E } from './safePickup.service.js';
import { auditLogService } from './auditLog.service.js';
import { pushEvents } from './pushEvents.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const TTL_MS = 5 * 60 * 1000;
const REUSE_MIN_MS = 30 * 1000; // a QR with less than this left is replaced on the next fetch
const PREFIX = 'spq1';
const QR_ERR = { INVALID: 'PICKUP_QR_INVALID', EXPIRED: 'PICKUP_QR_EXPIRED' };

const todayStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const key = () =>
  crypto.createHash('sha256').update(`safe-pickup-qr|${process.env.SAFE_PICKUP_QR_KEY || env.jwtSecret}`).digest();
const sign = (schoolId, studentId, nonce, exp) =>
  crypto.createHmac('sha256', key()).update(`${schoolId}.${studentId}.${nonce}.${exp}`).digest('base64url');
const encode = (schoolId, studentId, nonce, exp) =>
  [PREFIX, schoolId, studentId, nonce, exp, sign(schoolId, studentId, nonce, exp)].join('.');

function decode(raw) {
  const bad = () => new AppError('This is not a valid pickup QR code', 400, QR_ERR.INVALID);
  const parts = String(raw || '').trim().split('.');
  if (parts.length !== 6 || parts[0] !== PREFIX) throw bad();
  const [, schoolId, studentId, nonce, exp, sig] = parts;
  if (!mongoose.isValidObjectId(schoolId) || !mongoose.isValidObjectId(studentId)) throw bad();
  const want = Buffer.from(sign(schoolId, studentId, nonce, exp));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) throw bad();
  return { schoolId, studentId, nonce, exp: Number(exp) };
}

class PickupQrService {
  /** Parent app: the child's current QR (reused while it has >30s left, else rotated). */
  async issueForChild(childCtx) {
    const state = await safePickupService.isStudentPickupEnabled(childCtx.schoolId, childCtx.studentId);
    if (!state.enabled) {
      return { enabled: false, reason: !state.schoolEnabled ? 'SCHOOL_DISABLED' : 'CLASS_DISABLED' };
    }
    const now = Date.now();
    const filter = { schoolId: oid(childCtx.schoolId), studentId: oid(childCtx.studentId) };
    let row = await PickupQrToken.findOne(filter).lean();
    if (!row || new Date(row.expiresAt).getTime() - now < REUSE_MIN_MS) {
      const rotate = () =>
        PickupQrToken.findOneAndUpdate(
          filter,
          {
            $set: {
              ...filter,
              nonce: crypto.randomBytes(12).toString('base64url'),
              issuedAt: new Date(now),
              expiresAt: new Date(now + TTL_MS),
            },
          },
          { upsert: true, new: true, lean: true }
        );
      try {
        row = await rotate();
      } catch (error) {
        // Two requests (parent's two phones, or a focus + a resume) raced to create
        // the first row: the loser hits the unique index. Use the winner's row.
        if (error?.code !== 11000) throw error;
        row = await PickupQrToken.findOne(filter).lean();
        if (!row) row = await rotate();
      }
    }
    const student = await Student.findOne(filter).select('firstName lastName').lean();
    const exp = new Date(row.expiresAt).getTime();
    return {
      enabled: true,
      token: encode(String(row.schoolId), String(row.studentId), row.nonce, exp),
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
      ttlSeconds: Math.max(0, Math.round((exp - now) / 1000)),
      studentName: [student?.firstName, student?.lastName].filter(Boolean).join(' ').trim(),
      className: state.className,
      sectionName: state.sectionName,
    };
  }

  /**
   * Teacher / principal scan. actor = { schoolId, userId, name, classTeacherSectionIds?: Set, completeNow }.
   * Teacher (completeNow=false): session is VERIFIED, the handover confirm follows.
   * Principal (completeNow=true): session is COMPLETED, like the principal OTP flow.
   */
  async scan(actor, rawToken, req) {
    const t = decode(rawToken);
    if (t.schoolId !== String(actor.schoolId)) {
      throw new AppError('This QR code is not for your school', 403, QR_ERR.INVALID);
    }
    if (t.exp <= Date.now()) {
      throw new AppError('This QR code has expired. Ask the parent to refresh it.', 410, QR_ERR.EXPIRED);
    }

    const live = await PickupQrToken.findOne({ schoolId: oid(t.schoolId), studentId: oid(t.studentId), nonce: t.nonce }).lean();
    if (!live || new Date(live.expiresAt).getTime() <= Date.now()) {
      throw new AppError('This QR code is no longer valid. Ask the parent to show the latest one.', 410, QR_ERR.EXPIRED);
    }

    const state = await safePickupService.isStudentPickupEnabled(t.schoolId, t.studentId);
    safePickupService.assertEnabled(state);
    if (actor.classTeacherSectionIds && !(state.sectionId && actor.classTeacherSectionIds.has(String(state.sectionId)))) {
      throw new AppError('This student is not in your class. Only the class teacher can release them.', 403, E.NOT_CLASS_TEACHER);
    }

    const student = await Student.findOne({ schoolId: oid(t.schoolId), _id: oid(t.studentId) }).lean();
    if (!student) throw new AppError('Student not found', 404, E.NOT_FOUND);
    if (student.status !== 'ACTIVE') throw new AppError('This student is not active', 409, E.VALIDATION);

    const done = await safePickupRepository.completedTodayStudentIds(oid(t.schoolId), [t.studentId]);
    if (done.has(String(t.studentId))) {
      throw new AppError('This student has already been picked up today', 409, E.ALREADY_PICKED_UP);
    }

    if (state.sectionId) {
      const att = await StudentAttendance.findOne({ schoolId: oid(t.schoolId), sectionId: oid(state.sectionId), date: todayStr() })
        .select('entries')
        .lean();
      const entry = (att?.entries || []).find((e) => String(e.studentId) === String(t.studentId));
      if (entry && ['ABSENT', 'LEAVE'].includes(entry.status)) {
        throw new AppError("This student is marked absent today, so the pickup can't be started.", 409, E.STUDENT_ABSENT);
      }
    }

    // Single-use: whoever deletes the row first wins the scan.
    const claimed = await PickupQrToken.findOneAndDelete({ _id: live._id, nonce: t.nonce });
    if (!claimed) throw new AppError('This QR code was already used.', 410, QR_ERR.EXPIRED);

    // A QR scan supersedes an OTP session that is still open for this student.
    const existing = await safePickupRepository.activeForStudent(oid(t.schoolId), t.studentId);
    if (existing) {
      existing.status = 'CANCELLED';
      existing.cancelledAt = new Date();
      existing.cancelledBy = oid(actor.userId);
      existing.otpHash = '';
      await existing.save();
    }

    const now = new Date();
    const session = await safePickupRepository.create({
      schoolId: oid(t.schoolId),
      studentId: oid(t.studentId),
      studentName: [student.firstName, student.lastName].filter(Boolean).join(' ').trim(),
      classId: state.classId ? oid(state.classId) : null,
      className: state.className,
      sectionId: state.sectionId ? oid(state.sectionId) : null,
      sectionName: state.sectionName,
      teacherId: oid(actor.userId),
      teacherName: actor.name || '',
      guardianName: (student.parentName || '').trim() || 'Parent / Guardian',
      guardianMobile: (student.parentPhone || '').trim(),
      status: actor.completeNow ? 'COMPLETED' : 'VERIFIED',
      verificationMethod: 'PARENT_QR',
      initiatedAt: now,
      initiatedBy: oid(actor.userId),
      verifiedAt: now,
      verifiedBy: oid(actor.userId),
      ...(actor.completeNow ? { completedAt: now, completedBy: oid(actor.userId), handoverConfirmed: true } : {}),
    });

    auditLogService.record(req, {
      module: 'SAFE_PICKUP',
      action: actor.completeNow ? 'PICKUP_COMPLETED' : 'PICKUP_QR_VERIFIED',
      entityType: 'StudentPickupSession',
      entityId: String(session._id),
      summary: `Parent QR scanned — ${session.studentName} (${session.className} ${session.sectionName})${actor.completeNow ? ', handover completed' : ''}`,
    });
    pushEvents.pickup(session.schoolId, session, actor.completeNow ? 'COMPLETED' : 'VERIFIED', actor.name).catch(() => {});

    return session.toPublicJSON();
  }
}

export const pickupQrService = new PickupQrService();
export { QR_ERR as PICKUP_QR_ERRORS };

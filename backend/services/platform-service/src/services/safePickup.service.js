import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination, escapeRegex } from '../../../shared/sanitize.js';
import { StudentPickupSession } from '../models/StudentPickupSession.js';
import { Student } from '../models/Student.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { School } from '../models/School.js';
import { StudentAttendance } from '../models/StudentAttendance.js';
import { safePickupRepository } from '../repositories/safePickup.repository.js';
import { safePickupOtpService } from './safePickupOtp.service.js';
import { smsService } from './sms.service.js';
import { teacherAccessService } from './teacherAccess.service.js';
import { auditLogService } from './auditLog.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const oids = (arr) => [...arr].map(oid);
const E = {
  FEATURE_DISABLED: 'PICKUP_FEATURE_DISABLED',
  CLASS_DISABLED: 'CLASS_PICKUP_DISABLED',
  UNAUTHORIZED_STUDENT: 'UNAUTHORIZED_STUDENT',
  PARENT_MOBILE_NOT_FOUND: 'PARENT_MOBILE_NOT_FOUND',
  PARENT_MOBILE_INVALID: 'PARENT_MOBILE_INVALID',
  NOT_FOUND: 'PICKUP_SESSION_NOT_FOUND',
  EXPIRED: 'PICKUP_SESSION_EXPIRED',
  CANCELLED: 'PICKUP_SESSION_CANCELLED',
  ALREADY_ACTIVE: 'PICKUP_ALREADY_ACTIVE',
  ALREADY_COMPLETED: 'PICKUP_ALREADY_COMPLETED',
  NOT_VERIFIED: 'PICKUP_NOT_VERIFIED',
  HANDOVER_NOT_CONFIRMED: 'HANDOVER_NOT_CONFIRMED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_ATTEMPTS_EXCEEDED: 'OTP_ATTEMPTS_EXCEEDED',
  OTP_RATE_LIMITED: 'OTP_RATE_LIMITED',
  OTP_SEND_FAILED: 'OTP_SEND_FAILED',
  ALREADY_PICKED_UP: 'STUDENT_ALREADY_PICKED_UP',
  STUDENT_ABSENT: 'STUDENT_ABSENT',
  NOT_CLASS_TEACHER: 'NOT_CLASS_TEACHER',
  VALIDATION: 'VALIDATION_ERROR',
};
const RELATIONSHIPS = ['Parent', 'Guardian', 'Relative', 'Family Friend', 'Authorized Person', 'Other'];
const todayStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

function audit(req, action, session, extra = {}) {
  auditLogService.record(req, {
    module: 'SAFE_PICKUP',
    action,
    entityType: 'StudentPickupSession',
    entityId: session?._id ? String(session._id) : extra.entityId || '',
    summary:
      extra.summary ||
      `${action} — ${session?.studentName || 'student'} (${session?.className || ''} ${session?.sectionName || ''}), guardian ${StudentPickupSession.maskMobile(session?.guardianMobile)}`,
  });
}

class SafePickupService {
  /* ============================ SETTINGS ============================ */
  async getSettings(schoolId) {
    const [school, classes, sections, academicYears, yearClassLinks] = await Promise.all([
      safePickupRepository.schoolFlag(schoolId),
      safePickupRepository.classesWithFlag(schoolId),
      safePickupRepository.sectionsForSchool(schoolId),
      safePickupRepository.academicYearsForSchool(schoolId),
      safePickupRepository.yearClassLinksForSchool(schoolId),
    ]);
    const secByClass = new Map();
    for (const s of sections) {
      const k = String(s.classId);
      if (!secByClass.has(k)) secByClass.set(k, []);
      secByClass.get(k).push({ id: String(s._id), name: s.name });
    }
    const yearsByClass = new Map();
    for (const link of yearClassLinks) {
      const k = String(link.classId);
      if (!yearsByClass.has(k)) yearsByClass.set(k, []);
      yearsByClass.get(k).push(String(link.academicYearId));
    }
    return {
      schoolEnabled: Boolean(school?.settings?.safePickupEnabled),
      classes: classes.map((c) => ({
        id: String(c._id),
        name: c.name,
        code: c.code,
        numericOrder: c.numericOrder ?? 0,
        status: c.status,
        sections: (secByClass.get(String(c._id)) || []).sort((a, b) => a.name.localeCompare(b.name)),
        safePickupEnabled: Boolean(c.safePickupEnabled),
        // Academic years this class is linked to, via AcademicYearClass — lets the
        // frontend cascade Academic Year -> Class without an extra round trip.
        academicYearIds: yearsByClass.get(String(c._id)) || [],
      })),
      academicYears: academicYears.map((y) => ({
        id: String(y._id),
        name: y.name,
        code: y.code,
        status: y.status,
        isCurrent: Boolean(y.isCurrent),
      })),
    };
  }

  // NOTE: the school-level master switch is Super Admin–only — it is written by
  // schoolService.updateFeatures() (PATCH /platform/schools/:id/features), not here.
  // School admins only manage the per-class toggles below.

  async setClassEnabled(schoolId, classId, enabled, req) {
    if (typeof enabled !== 'boolean') throw new AppError('safePickupEnabled must be a boolean', 400, E.VALIDATION);
    const cls = await safePickupRepository.setClassFlag(schoolId, classId, enabled);
    if (!cls) throw new AppError('Class not found', 404, E.NOT_FOUND);
    auditLogService.record(req, {
      module: 'SAFE_PICKUP',
      action: 'CLASS_PICKUP_UPDATED',
      entityType: 'SchoolClass',
      entityId: String(classId),
      summary: `Safe pickup ${enabled ? 'enabled' : 'disabled'} for class ${cls.name}`,
    });
    return { classId: String(cls._id), name: cls.name, safePickupEnabled: Boolean(cls.safePickupEnabled) };
  }

  /* ===================== ENABLEMENT RESOLVER ===================== */
  /** School flag AND the student's CURRENT class flag. */
  async isStudentPickupEnabled(schoolId, studentId) {
    const [school, enrollment] = await Promise.all([
      School.findById(oid(schoolId)).select('settings.safePickupEnabled').lean(),
      StudentEnrollment.findOne({ schoolId: oid(schoolId), studentId: oid(studentId), status: 'ACTIVE' })
        .sort({ enrollmentDate: -1 })
        .select('classId sectionId')
        .lean(),
    ]);
    const schoolEnabled = Boolean(school?.settings?.safePickupEnabled);
    let classEnabled = false;
    let className = '';
    let sectionName = '';
    if (enrollment?.classId) {
      const [cls, section] = await Promise.all([
        SchoolClass.findOne({ schoolId: oid(schoolId), _id: enrollment.classId }).select('name safePickupEnabled').lean(),
        enrollment.sectionId
          ? Section.findOne({ schoolId: oid(schoolId), _id: enrollment.sectionId }).select('name').lean()
          : null,
      ]);
      classEnabled = Boolean(cls?.safePickupEnabled);
      className = cls?.name || '';
      sectionName = section?.name || '';
    }
    return {
      enabled: schoolEnabled && classEnabled,
      schoolEnabled,
      classEnabled,
      classId: enrollment?.classId ? String(enrollment.classId) : null,
      className,
      sectionId: enrollment?.sectionId ? String(enrollment.sectionId) : null,
      sectionName,
    };
  }

  assertEnabled(state) {
    if (!state.schoolEnabled) {
      throw new AppError('Student pickup verification is disabled for this school', 403, E.FEATURE_DISABLED);
    }
    if (!state.classEnabled) {
      throw new AppError("Student pickup verification is disabled for this student's class", 403, E.CLASS_DISABLED);
    }
  }

  /* ========================= GUARDIAN ========================= */
  resolveGuardian(student) {
    const name = (student.parentName || '').trim();
    const mobile = (student.parentPhone || '').trim();
    if (!mobile) {
      throw new AppError(
        'Pickup verification cannot be started because no registered parent/guardian mobile number is available for this student.',
        422,
        E.PARENT_MOBILE_NOT_FOUND
      );
    }
    if (String(mobile).replace(/\D/g, '').length < 8) {
      throw new AppError('The registered parent/guardian mobile number is invalid.', 422, E.PARENT_MOBILE_INVALID);
    }
    return { name: name || 'Parent / Guardian', mobile };
  }

  /* ===================== ELIGIBLE STUDENTS ===================== */
  async eligibleStudents(ctx, query = {}) {
    await safePickupRepository.sweepExpired(ctx.schoolId);

    // Pickup is a CLASS-TEACHER responsibility only. A subject teacher of a
    // section (but not its class teacher) sees nothing here — the Flutter app
    // hides the whole Pickup tab when `me().isClassTeacher` is false.
    const classTeacherSections = [...ctx.classTeacherSectionIds];
    let sectionIds;
    if (query.sectionId) {
      const sid = String(query.sectionId);
      if (!ctx.classTeacherSectionIds.has(sid)) {
        throw new AppError('You are not the class teacher of this section', 403, E.NOT_CLASS_TEACHER);
      }
      sectionIds = [sid];
    } else {
      sectionIds = classTeacherSections;
    }
    if (query.classId) {
      teacherAccessService.assertClass(ctx, query.classId);
    }
    if (!sectionIds.length) {
      return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
    }

    const enrollments = await StudentEnrollment.find({
      schoolId: oid(ctx.schoolId),
      sectionId: { $in: oids(sectionIds) },
      status: 'ACTIVE',
      ...(query.classId ? { classId: oid(query.classId) } : {}),
    })
      .select('studentId classId sectionId rollNumber admissionNumber')
      .lean();
    if (!enrollments.length) {
      return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
    }

    const studentIds = enrollments.map((e) => e.studentId);
    const classIds = [...new Set(enrollments.map((e) => String(e.classId)))];
    const secIds = [...new Set(enrollments.map((e) => String(e.sectionId)))];

    const [students, classes, sections, attendanceDocs, activeSessions, completedToday] = await Promise.all([
      Student.find({ schoolId: oid(ctx.schoolId), _id: { $in: studentIds } })
        .select('firstName lastName admissionNumber photo status parentPhone')
        .lean(),
      SchoolClass.find({ schoolId: oid(ctx.schoolId), _id: { $in: oids(classIds) } })
        .select('name safePickupEnabled')
        .lean(),
      Section.find({ schoolId: oid(ctx.schoolId), _id: { $in: oids(secIds) } })
        .select('name')
        .lean(),
      StudentAttendance.find({ schoolId: oid(ctx.schoolId), sectionId: { $in: oids(secIds) }, date: todayStr() })
        .select('sectionId entries')
        .lean(),
      safePickupRepository.activeIdsForStudents(ctx.schoolId, studentIds),
      safePickupRepository.completedTodayStudentIds(ctx.schoolId, studentIds),
    ]);

    const schoolFlag = (await School.findById(oid(ctx.schoolId)).select('settings.safePickupEnabled').lean())?.settings
      ?.safePickupEnabled;
    const classMap = new Map(classes.map((c) => [String(c._id), c]));
    const sectionMap = new Map(sections.map((s) => [String(s._id), s.name]));
    const studentMap = new Map(students.map((s) => [String(s._id), s]));
    const attStatus = new Map(); // studentId -> status
    for (const doc of attendanceDocs) {
      for (const e of doc.entries || []) attStatus.set(String(e.studentId), e.status);
    }
    const activeSessionByStudent = new Map(activeSessions.map((s) => [String(s.studentId), String(s._id)]));

    let rows = enrollments.map((en) => {
      const s = studentMap.get(String(en.studentId)) || {};
      const cls = classMap.get(String(en.classId));
      const classEnabled = Boolean(cls?.safePickupEnabled);
      return {
        id: String(en.studentId),
        name: [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || 'Student',
        rollNumber: en.rollNumber || '',
        admissionNumber: s.admissionNumber || en.admissionNumber || '',
        photo: s.photo || '',
        classId: String(en.classId),
        className: cls?.name || '',
        sectionId: String(en.sectionId),
        sectionName: sectionMap.get(String(en.sectionId)) || '',
        attendanceStatus: attStatus.get(String(en.studentId)) || 'UNMARKED',
        hasGuardianMobile: Boolean((s.parentPhone || '').trim()),
        pickupEnabled: Boolean(schoolFlag) && classEnabled,
        alreadyPickedUpToday: completedToday.has(String(en.studentId)),
        activeSessionId: activeSessionByStudent.get(String(en.studentId)) || null,
      };
    });

    if (query.q?.trim()) {
      const rx = new RegExp(escapeRegex(query.q.trim()), 'i');
      rows = rows.filter((r) => rx.test(r.name) || rx.test(r.admissionNumber) || rx.test(r.rollNumber));
    }
    rows.sort((a, b) => {
      const ra = parseInt(a.rollNumber, 10);
      const rb = parseInt(b.rollNumber, 10);
      if (Number.isFinite(ra) && Number.isFinite(rb)) return ra - rb;
      return a.name.localeCompare(b.name);
    });

    const { page, limit } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const start = (page - 1) * limit;
    return {
      data: rows.slice(start, start + limit),
      pagination: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) || 1 },
    };
  }

  /* ========================= INITIATE ========================= */
  async initiate(ctx, { studentId, idempotencyKey }, req) {
    if (!studentId || !mongoose.isValidObjectId(String(studentId))) {
      throw new AppError('A valid studentId is required', 400, E.VALIDATION);
    }

    if (idempotencyKey) {
      const prior = await safePickupRepository.byIdempotencyKey(ctx.teacherId, idempotencyKey);
      if (prior) return this.#publicWithMeta(prior);
    }

    await teacherAccessService.assertStudent(ctx, studentId); // student in teacher's section
    const state = await this.isStudentPickupEnabled(ctx.schoolId, studentId);
    this.assertEnabled(state);

    // Only the student's class teacher can release them.
    if (!state.sectionId || !ctx.classTeacherSectionIds.has(String(state.sectionId))) {
      throw new AppError('Only the class teacher can start a pickup for this student', 403, E.NOT_CLASS_TEACHER);
    }

    const student = await Student.findOne({ schoolId: oid(ctx.schoolId), _id: oid(studentId) }).lean();
    if (!student) throw new AppError('Student not found', 404, E.NOT_FOUND);
    if (student.status !== 'ACTIVE') {
      throw new AppError('This student is not active', 409, E.VALIDATION);
    }

    // Already handed over today?
    const doneToday = await safePickupRepository.completedTodayStudentIds(ctx.schoolId, [studentId]);
    if (doneToday.has(String(studentId))) {
      throw new AppError('This student has already been picked up today', 409, E.ALREADY_PICKED_UP);
    }

    // Do not run the normal pickup flow for a student marked absent / on leave today.
    if (state.sectionId) {
      const attDoc = await StudentAttendance.findOne({
        schoolId: oid(ctx.schoolId),
        sectionId: oid(state.sectionId),
        date: todayStr(),
      })
        .select('entries')
        .lean();
      const entry = (attDoc?.entries || []).find((e) => String(e.studentId) === String(studentId));
      if (entry && ['ABSENT', 'LEAVE'].includes(entry.status)) {
        throw new AppError(
          "This student is marked absent today, so the pickup flow can't be started.",
          409,
          E.STUDENT_ABSENT
        );
      }
    }

    // One active session per student (also DB-enforced by a partial-unique index).
    const existing = await safePickupRepository.activeForStudent(ctx.schoolId, studentId);
    if (existing) {
      throw new AppError('A pickup verification is already in progress for this student', 409, E.ALREADY_ACTIVE);
    }

    const guardian = this.resolveGuardian(student);

    const otp = safePickupOtpService.generateOtp();
    const otpHash = await safePickupOtpService.hashOtp(otp);
    const now = new Date();

    let session;
    try {
      session = await safePickupRepository.create({
        schoolId: oid(ctx.schoolId),
        studentId: oid(studentId),
        studentName: [student.firstName, student.lastName].filter(Boolean).join(' ').trim(),
        classId: state.classId ? oid(state.classId) : null,
        className: state.className,
        sectionId: state.sectionId ? oid(state.sectionId) : null,
        sectionName: state.sectionName,
        teacherId: oid(ctx.teacherId),
        teacherName: ctx.teacher?.name || req.user?.name || '',
        guardianName: guardian.name,
        guardianMobile: guardian.mobile,
        status: 'PENDING',
        otpHash,
        otpExpiresAt: safePickupOtpService.expiryDate(now),
        maxOtpAttempts: safePickupOtpService.config.maxAttempts,
        maxResends: safePickupOtpService.config.maxResends,
        lastOtpSentAt: now,
        initiatedAt: now,
        initiatedBy: oid(ctx.teacherId),
        idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
      });
    } catch (err) {
      if (err?.code === 11000) {
        // race: another request already created the active / idempotent session
        const dupe =
          (idempotencyKey && (await safePickupRepository.byIdempotencyKey(ctx.teacherId, idempotencyKey))) ||
          (await safePickupRepository.activeForStudent(ctx.schoolId, studentId));
        if (dupe) return this.#publicWithMeta(dupe);
        throw new AppError('A pickup verification is already in progress for this student', 409, E.ALREADY_ACTIVE);
      }
      throw err;
    }

    audit(req, 'PICKUP_INITIATED', session);

    // Send the OTP; only advance to OTP_SENT on confirmed delivery.
    try {
      await smsService.sendSms({
        phone: guardian.mobile,
        template: 'SAFE_PICKUP_OTP',
        message: `Pickup request for ${session.studentName} at your school has been initiated. Verification OTP: ${otp}. Do not share except with the school staff collecting your child.`,
      });
      session.status = 'OTP_SENT';
      await session.save();
      safePickupOtpService.debugLogStagingOtp(session._id, otp);
      audit(req, 'PICKUP_OTP_SENT', session);
    } catch (err) {
      audit(req, 'PICKUP_FAILED', session, { summary: `OTP dispatch failed: ${err.code || err.message}` });
      throw new AppError('Could not send the OTP to the registered guardian. Please try again.', 502, E.OTP_SEND_FAILED);
    }

    return this.#publicWithMeta(session);
  }

  /* ===================== GET / VERIFY / RESEND ===================== */
  async getSession(ctx, id) {
    await safePickupRepository.sweepExpired(ctx.schoolId);
    const session = await safePickupRepository.byId(ctx.schoolId, id);
    this.#assertOwn(ctx, session);
    return this.#publicWithMeta(session);
  }

  async verify(ctx, id, otp, req) {
    const session = await safePickupRepository.byId(ctx.schoolId, id);
    this.#assertOwn(ctx, session);
    this.#assertActive(session);

    if (safePickupOtpService.isExpired(session)) {
      session.status = 'EXPIRED';
      session.expiredAt = new Date();
      session.otpHash = '';
      await session.save();
      audit(req, 'PICKUP_EXPIRED', session);
      throw new AppError('This pickup verification session has expired.', 410, E.EXPIRED);
    }
    if (safePickupOtpService.attemptsLeft(session) <= 0) {
      throw new AppError('Too many incorrect attempts. Start a new verification.', 429, E.OTP_ATTEMPTS_EXCEEDED);
    }

    const ok = await safePickupOtpService.verifyOtp(otp, session.otpHash);
    if (!ok) {
      session.otpAttempts += 1;
      const exhausted = safePickupOtpService.attemptsLeft(session) <= 0;
      if (exhausted) {
        session.status = 'FAILED';
        session.failedAt = new Date();
        session.otpHash = '';
      }
      await session.save();
      audit(req, 'PICKUP_OTP_VERIFICATION_FAILED', session, {
        summary: `Wrong OTP (${session.otpAttempts}/${session.maxOtpAttempts})${exhausted ? ' — session FAILED' : ''}`,
      });
      if (exhausted) {
        throw new AppError('Too many incorrect attempts. Start a new verification.', 429, E.OTP_ATTEMPTS_EXCEEDED);
      }
      throw new AppError('Incorrect OTP.', 400, E.OTP_INVALID);
    }

    session.status = 'VERIFIED';
    session.verifiedAt = new Date();
    session.verifiedBy = oid(ctx.teacherId);
    session.otpHash = ''; // one-time use — invalidate immediately
    await session.save();
    audit(req, 'PICKUP_OTP_VERIFIED', session);
    return this.#publicWithMeta(session);
  }

  async resend(ctx, id, req) {
    const session = await safePickupRepository.byId(ctx.schoolId, id);
    this.#assertOwn(ctx, session);
    if (session.status === 'VERIFIED') {
      throw new AppError('OTP already verified for this session', 409, E.VALIDATION);
    }
    this.#assertActive(session);

    const cooldown = safePickupOtpService.resendCooldownLeft(session);
    if (cooldown > 0) {
      throw new AppError(`Please wait ${cooldown}s before requesting another OTP.`, 429, E.OTP_RATE_LIMITED);
    }
    if (safePickupOtpService.resendsLeft(session) <= 0) {
      throw new AppError('Resend limit reached. Start a new verification.', 429, E.OTP_RATE_LIMITED);
    }

    const otp = safePickupOtpService.generateOtp();
    session.otpHash = await safePickupOtpService.hashOtp(otp);
    session.otpExpiresAt = safePickupOtpService.expiryDate();
    session.otpAttempts = 0;
    session.resendCount += 1;
    session.lastOtpSentAt = new Date();
    session.status = 'OTP_SENT';

    try {
      await smsService.sendSms({
        phone: session.guardianMobile,
        template: 'SAFE_PICKUP_OTP',
        message: `New pickup verification OTP for ${session.studentName}: ${otp}.`,
      });
    } catch (err) {
      throw new AppError('Could not resend the OTP. Please try again.', 502, E.OTP_SEND_FAILED);
    }
    await session.save();
    safePickupOtpService.debugLogStagingOtp(session._id, otp);
    audit(req, 'PICKUP_RESENT', session, { summary: `OTP resent (${session.resendCount}/${session.maxResends})` });
    return this.#publicWithMeta(session);
  }

  /* ===================== COMPLETE / CANCEL ===================== */
  async complete(ctx, id, payload = {}, req) {
    const session = await safePickupRepository.byId(ctx.schoolId, id);
    this.#assertOwn(ctx, session);

    if (session.status === 'COMPLETED') {
      throw new AppError('This pickup is already completed', 409, E.ALREADY_COMPLETED);
    }
    if (session.status !== 'VERIFIED') {
      throw new AppError('Parent OTP must be verified before completing the handover', 409, E.NOT_VERIFIED);
    }
    if (payload.handoverConfirmed !== true) {
      throw new AppError('You must confirm the student has been handed over', 400, E.HANDOVER_NOT_CONFIRMED);
    }

    const rel = String(payload.pickupPersonRelationship || '').trim();
    if (rel && !RELATIONSHIPS.includes(rel)) {
      throw new AppError(`pickupPersonRelationship must be one of: ${RELATIONSHIPS.join(', ')}`, 400, E.VALIDATION);
    }

    session.status = 'COMPLETED';
    session.completedAt = new Date();
    session.completedBy = oid(ctx.teacherId);
    session.handoverConfirmed = true;
    session.pickupPersonName = String(payload.pickupPersonName || '').trim().slice(0, 120);
    session.pickupPersonRelationship = rel;
    session.otpHash = '';
    await session.save();
    audit(req, 'PICKUP_COMPLETED', session, {
      summary: `Handover completed — ${session.studentName} to ${session.pickupPersonName || 'guardian'} (${rel || 'Parent'})`,
    });
    return this.#publicWithMeta(session);
  }

  async cancel(ctx, id, req) {
    const session = await safePickupRepository.byId(ctx.schoolId, id);
    this.#assertOwn(ctx, session);
    if (['COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(session.status)) {
      throw new AppError(`A ${session.status.toLowerCase()} session cannot be cancelled`, 409, E.VALIDATION);
    }
    session.status = 'CANCELLED';
    session.cancelledAt = new Date();
    session.cancelledBy = oid(ctx.teacherId);
    session.otpHash = '';
    await session.save();
    audit(req, 'PICKUP_CANCELLED', session);
    return this.#publicWithMeta(session);
  }

  /* ===================== SCHOOL-ADMIN HISTORY ===================== */
  async history(schoolId, query = {}) {
    await safePickupRepository.sweepExpired(schoolId);
    const { items, total, page, limit } = await safePickupRepository.history(schoolId, query);
    return {
      data: items.map((s) => ({
        id: String(s._id),
        date: s.createdAt,
        studentId: String(s.studentId),
        studentName: s.studentName || '',
        className: s.className || '',
        sectionName: s.sectionName || '',
        teacherId: String(s.teacherId),
        teacherName: s.teacherName || '',
        status: s.status,
        maskedMobile: StudentPickupSession.maskMobile(s.guardianMobile),
        pickupPersonName: s.pickupPersonName || '',
        pickupPersonRelationship: s.pickupPersonRelationship || '',
        initiatedAt: s.initiatedAt,
        verifiedAt: s.verifiedAt,
        completedAt: s.completedAt,
        cancelledAt: s.cancelledAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /* ============================ helpers ============================ */
  #assertOwn(ctx, session) {
    if (!session || String(session.schoolId) !== String(ctx.schoolId)) {
      throw new AppError('Pickup session not found', 404, E.NOT_FOUND);
    }
    if (String(session.teacherId) !== String(ctx.teacherId)) {
      throw new AppError('Pickup session not found', 404, E.NOT_FOUND); // no cross-teacher leak
    }
  }

  #assertActive(session) {
    if (session.status === 'COMPLETED') throw new AppError('This pickup is already completed', 409, E.ALREADY_COMPLETED);
    if (session.status === 'CANCELLED') throw new AppError('This pickup session was cancelled', 409, E.CANCELLED);
    if (session.status === 'EXPIRED') throw new AppError('This pickup verification session has expired.', 410, E.EXPIRED);
    if (session.status === 'FAILED') {
      throw new AppError('This session is locked after too many attempts. Start a new one.', 409, E.OTP_ATTEMPTS_EXCEEDED);
    }
  }

  #publicWithMeta(session) {
    const j = session.toPublicJSON();
    j.resendCooldownSeconds = safePickupOtpService.resendCooldownLeft(session);
    return j;
  }
}

export const safePickupService = new SafePickupService();
export { E as SAFE_PICKUP_ERRORS, RELATIONSHIPS as PICKUP_RELATIONSHIPS };

import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination, escapeRegex } from '../../../shared/sanitize.js';
import { Student } from '../models/Student.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { School } from '../models/School.js';
import { StudentAttendance } from '../models/StudentAttendance.js';
import { StudentPickupSession } from '../models/StudentPickupSession.js';
import { safePickupRepository } from '../repositories/safePickup.repository.js';
import { safePickupOtpService } from '../services/safePickupOtp.service.js';
import { smsService } from '../services/sms.service.js';
import { auditLogService } from '../services/auditLog.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const oids = (arr) => [...arr].map(oid);

const E = {
  FEATURE_DISABLED: 'PICKUP_FEATURE_DISABLED',
  CLASS_DISABLED: 'CLASS_PICKUP_DISABLED',
  UNAUTHORIZED_STUDENT: 'UNAUTHORIZED_STUDENT',
  PARENT_MOBILE_NOT_FOUND: 'PARENT_MOBILE_NOT_FOUND',
  PARENT_MOBILE_INVALID: 'PARENT_MOBILE_INVALID',
  NOT_FOUND: 'PICKUP_SESSION_NOT_FOUND',
  OTP_INVALID: 'OTP_INVALID',
  OTP_ATTEMPTS_EXCEEDED: 'OTP_ATTEMPTS_EXCEEDED',
  OTP_RATE_LIMITED: 'OTP_RATE_LIMITED',
  ALREADY_PICKED_UP: 'STUDENT_ALREADY_PICKED_UP',
  VALIDATION: 'VALIDATION_ERROR',
};

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

export async function listSafePickupStudents(req, res, next) {
  try {
    const schoolId = req.schoolId || req.user?.schoolId;
    if (!schoolId || !mongoose.isValidObjectId(String(schoolId))) {
      throw new AppError('Invalid school context', 400, E.VALIDATION);
    }

    await safePickupRepository.sweepExpired(oid(schoolId));

    // Build filter
    const filter = { schoolId: oid(schoolId), status: 'ACTIVE' };
    if (req.query.classId) {
      if (!mongoose.isValidObjectId(String(req.query.classId))) {
        throw new AppError('Invalid classId', 400, E.VALIDATION);
      }
      filter.classId = oid(req.query.classId);
    }
    if (req.query.sectionId) {
      if (!mongoose.isValidObjectId(String(req.query.sectionId))) {
        throw new AppError('Invalid sectionId', 400, E.VALIDATION);
      }
      filter.sectionId = oid(req.query.sectionId);
    }
    if (req.query.academicYearId) {
      if (!mongoose.isValidObjectId(String(req.query.academicYearId))) {
        throw new AppError('Invalid academicYearId', 400, E.VALIDATION);
      }
      filter.academicYearId = oid(req.query.academicYearId);
    }

    // Get enrollments
    const enrollments = await StudentEnrollment.find(filter)
      .select('studentId classId sectionId rollNumber admissionNumber academicYearId')
      .lean();

    if (!enrollments.length) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      });
    }

    const studentIds = enrollments.map((e) => e.studentId);
    const classIds = [...new Set(enrollments.map((e) => String(e.classId)))];
    const secIds = [...new Set(enrollments.map((e) => String(e.sectionId)))];

    // Load data
    const [students, classes, sections, attendanceDocs, activeSessions, completedToday] = await Promise.all([
      Student.find({ schoolId: oid(schoolId), _id: { $in: studentIds } })
        .select('firstName lastName admissionNumber photo status parentPhone')
        .lean(),
      SchoolClass.find({ schoolId: oid(schoolId), _id: { $in: oids(classIds) } })
        .select('name safePickupEnabled')
        .lean(),
      Section.find({ schoolId: oid(schoolId), _id: { $in: oids(secIds) } })
        .select('name')
        .lean(),
      StudentAttendance.find({ schoolId: oid(schoolId), sectionId: { $in: oids(secIds) }, date: todayStr() })
        .select('sectionId entries')
        .lean(),
      safePickupRepository.activeIdsForStudents(oid(schoolId), studentIds),
      safePickupRepository.completedTodayStudentIds(oid(schoolId), studentIds),
    ]);

    const schoolFlag = (await School.findById(oid(schoolId)).select('settings.safePickupEnabled').lean())?.settings
      ?.safePickupEnabled;
    const classMap = new Map(classes.map((c) => [String(c._id), c]));
    const sectionMap = new Map(sections.map((s) => [String(s._id), s.name]));
    const studentMap = new Map(students.map((s) => [String(s._id), s]));
    const attStatus = new Map();
    for (const doc of attendanceDocs) {
      for (const e of doc.entries || []) attStatus.set(String(e.studentId), e.status);
    }
    const activeSessionByStudent = new Map(activeSessions.map((s) => [String(s.studentId), String(s._id)]));

    // Build rows
    let rows = enrollments.map((en) => {
      const s = studentMap.get(String(en.studentId)) || {};
      const cls = classMap.get(String(en.classId));
      const classEnabled = Boolean(cls?.safePickupEnabled);
      const fullName = [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || 'Student';
      return {
        id: String(en.studentId),
        name: fullName,
        admissionNumber: s.admissionNumber || en.admissionNumber || '',
        classId: String(en.classId),
        className: cls?.name || '',
        sectionId: String(en.sectionId),
        sectionName: sectionMap.get(String(en.sectionId)) || '',
        parentPhone: (s.parentPhone || '').trim(),
        maskedParentPhone: StudentPickupSession.maskMobile(s.parentPhone),
        pickupEnabled: Boolean(schoolFlag) && classEnabled,
        alreadyPickedUpToday: completedToday.has(String(en.studentId)),
        activeSessionId: activeSessionByStudent.get(String(en.studentId)) || null,
      };
    });

    // Search
    if (req.query.q?.trim()) {
      const rx = new RegExp(escapeRegex(req.query.q.trim()), 'i');
      rows = rows.filter((r) => rx.test(r.name) || rx.test(r.admissionNumber));
    }

    // Sort
    rows.sort((a, b) => a.name.localeCompare(b.name));

    // Paginate
    const { page, limit } = sanitizePagination({
      page: req.query.page,
      limit: req.query.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const start = (page - 1) * limit;

    res.json({
      success: true,
      data: rows.slice(start, start + limit),
      pagination: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) || 1 },
    });
  } catch (error) {
    next(error);
  }
}

export async function sendSafePickupOtp(req, res, next) {
  try {
    const schoolId = req.schoolId || req.user?.schoolId;
    const userId = req.user?.userId || req.user?.sub;
    const userRole = req.user?.role;

    if (!schoolId || !mongoose.isValidObjectId(String(schoolId))) {
      throw new AppError('Invalid school context', 400, E.VALIDATION);
    }

    const { studentId } = req.body || {};
    if (!studentId || !mongoose.isValidObjectId(String(studentId))) {
      throw new AppError('A valid studentId is required', 400, E.VALIDATION);
    }

    // Verify student belongs to this school
    const student = await Student.findOne({ schoolId: oid(schoolId), _id: oid(studentId) }).lean();
    if (!student) {
      throw new AppError('Student not found', 404, E.NOT_FOUND);
    }
    if (student.status !== 'ACTIVE') {
      throw new AppError('This student is not active', 409, E.VALIDATION);
    }

    // Check if already picked up today
    const doneToday = await safePickupRepository.completedTodayStudentIds(oid(schoolId), [studentId]);
    if (doneToday.has(String(studentId))) {
      throw new AppError('Student has already been picked up', 409, E.ALREADY_PICKED_UP);
    }

    // Get student enrollment for class/section
    const enrollment = await StudentEnrollment.findOne({ schoolId: oid(schoolId), studentId: oid(studentId), status: 'ACTIVE' })
      .sort({ enrollmentDate: -1 })
      .select('classId sectionId academicYearId')
      .lean();

    if (!enrollment) {
      throw new AppError('Student enrollment not found', 404, E.NOT_FOUND);
    }

    // Check if feature is enabled
    const [schoolFlag, cls] = await Promise.all([
      School.findById(oid(schoolId)).select('settings.safePickupEnabled').lean(),
      SchoolClass.findOne({ schoolId: oid(schoolId), _id: oid(enrollment.classId) })
        .select('name safePickupEnabled')
        .lean(),
    ]);

    if (!schoolFlag?.settings?.safePickupEnabled) {
      throw new AppError('Safe pickup is disabled for this school', 403, E.FEATURE_DISABLED);
    }
    if (!cls?.safePickupEnabled) {
      throw new AppError('Safe pickup is disabled for this class', 403, E.CLASS_DISABLED);
    }

    // Validate parent mobile
    const guardianMobile = (student.parentPhone || '').trim();
    if (!guardianMobile) {
      throw new AppError('No parent mobile number registered for this student', 422, E.PARENT_MOBILE_NOT_FOUND);
    }
    if (String(guardianMobile).replace(/\D/g, '').length < 8) {
      throw new AppError('Registered parent mobile number is invalid', 422, E.PARENT_MOBILE_INVALID);
    }

    // Check active session
    const existing = await safePickupRepository.activeForStudent(oid(schoolId), studentId);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A pickup verification is already in progress for this student',
        data: { sessionId: String(existing._id) },
      });
    }

    // Generate OTP
    const otp = safePickupOtpService.generateOtp();
    const otpHash = await safePickupOtpService.hashOtp(otp);
    const now = new Date();

    // Get section info
    const section = enrollment.sectionId
      ? await Section.findOne({ schoolId: oid(schoolId), _id: oid(enrollment.sectionId) }).select('name').lean()
      : null;

    // Create session
    let session;
    try {
      session = await safePickupRepository.create({
        schoolId: oid(schoolId),
        studentId: oid(studentId),
        studentName: [student.firstName, student.lastName].filter(Boolean).join(' ').trim(),
        classId: oid(enrollment.classId),
        className: cls?.name || '',
        sectionId: enrollment.sectionId ? oid(enrollment.sectionId) : null,
        sectionName: section?.name || '',
        teacherId: oid(userId), // Use admin/principal ID as initiator
        teacherName: req.user?.name || '',
        guardianName: (student.parentName || '').trim() || 'Parent / Guardian',
        guardianMobile,
        status: 'PENDING',
        otpHash,
        otpExpiresAt: safePickupOtpService.expiryDate(now),
        maxOtpAttempts: safePickupOtpService.config.maxAttempts,
        maxResends: safePickupOtpService.config.maxResends,
        lastOtpSentAt: now,
        initiatedAt: now,
        initiatedBy: oid(userId),
      });
    } catch (err) {
      if (err?.code === 11000) {
        const dupe = await safePickupRepository.activeForStudent(oid(schoolId), studentId);
        if (dupe) {
          return res.status(409).json({
            success: false,
            message: 'A pickup verification is already in progress',
            data: { sessionId: String(dupe._id) },
          });
        }
      }
      throw err;
    }

    audit(req, 'PICKUP_INITIATED', session);

    // Send OTP
    try {
      await smsService.sendSms({
        phone: guardianMobile,
        template: 'SAFE_PICKUP_OTP',
        otp,
        vars: { student: session.studentName },
        message: `Pickup request for ${session.studentName} has been initiated. Verification OTP: ${otp}. Do not share with anyone except school staff.`,
      });
      session.status = 'OTP_SENT';
      await session.save();
      safePickupOtpService.debugLogStagingOtp(session._id, otp);
      audit(req, 'PICKUP_OTP_SENT', session);
    } catch (err) {
      audit(req, 'PICKUP_FAILED', session, { summary: `OTP dispatch failed: ${err.message}` });
      throw new AppError('Could not send OTP to guardian. Please try again', 502, 'OTP_SEND_FAILED');
    }

    const result = session.toPublicJSON();
    result.resendCooldownSeconds = safePickupOtpService.resendCooldownLeft(session);

    res.status(201).json({
      success: true,
      message: 'Pickup initiated. OTP sent to registered guardian.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifySafePickupOtp(req, res, next) {
  try {
    const schoolId = req.schoolId || req.user?.schoolId;
    const userId = req.user?.userId || req.user?.sub;

    if (!schoolId || !mongoose.isValidObjectId(String(schoolId))) {
      throw new AppError('Invalid school context', 400, E.VALIDATION);
    }

    const { sessionId, otp } = req.body || {};
    if (!sessionId || !mongoose.isValidObjectId(String(sessionId))) {
      throw new AppError('A valid sessionId is required', 400, E.VALIDATION);
    }
    if (!otp) {
      throw new AppError('OTP is required', 400, E.VALIDATION);
    }

    // Get session
    const session = await safePickupRepository.byId(oid(schoolId), sessionId);
    if (!session) {
      throw new AppError('Pickup session not found', 404, E.NOT_FOUND);
    }

    // Check expiry
    if (safePickupOtpService.isExpired(session)) {
      session.status = 'EXPIRED';
      session.expiredAt = new Date();
      session.otpHash = '';
      await session.save();
      audit(req, 'PICKUP_EXPIRED', session);
      throw new AppError('OTP has expired', 410, 'OTP_EXPIRED');
    }

    // Check attempts
    if (safePickupOtpService.attemptsLeft(session) <= 0) {
      throw new AppError('Too many incorrect attempts', 429, E.OTP_ATTEMPTS_EXCEEDED);
    }

    // Verify OTP
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
        throw new AppError('Too many incorrect attempts', 429, E.OTP_ATTEMPTS_EXCEEDED);
      }
      throw new AppError('Incorrect OTP', 400, E.OTP_INVALID);
    }

    // Mark as verified and complete
    session.status = 'COMPLETED';
    session.verifiedAt = new Date();
    session.verifiedBy = oid(userId);
    session.completedAt = new Date();
    session.completedBy = oid(userId);
    session.handoverConfirmed = true;
    session.otpHash = '';
    await session.save();

    audit(req, 'PICKUP_COMPLETED', session);

    const result = session.toPublicJSON();
    res.json({
      success: true,
      message: 'Safe pickup completed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSafePickupHistory(req, res, next) {
  try {
    const schoolId = req.schoolId || req.user?.schoolId;

    if (!schoolId || !mongoose.isValidObjectId(String(schoolId))) {
      throw new AppError('Invalid school context', 400, E.VALIDATION);
    }

    await safePickupRepository.sweepExpired(oid(schoolId));

    // Build filter
    const filter = {
      schoolId: oid(schoolId),
      status: 'COMPLETED',
    };

    if (req.query.classId && mongoose.isValidObjectId(String(req.query.classId))) {
      filter.classId = oid(req.query.classId);
    }
    if (req.query.sectionId && mongoose.isValidObjectId(String(req.query.sectionId))) {
      filter.sectionId = oid(req.query.sectionId);
    }
    if (req.query.studentId && mongoose.isValidObjectId(String(req.query.studentId))) {
      filter.studentId = oid(req.query.studentId);
    }

    // Date range
    if (req.query.from || req.query.to) {
      filter.completedAt = {};
      if (req.query.from) filter.completedAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const to = new Date(req.query.to);
        to.setHours(23, 59, 59, 999);
        filter.completedAt.$lte = to;
      }
    }

    // Pagination
    const { page, limit, skip } = sanitizePagination({
      page: req.query.page,
      limit: req.query.limit,
      defaultLimit: 25,
      maxLimit: 100,
    });

    // Query
    const [items, total] = await Promise.all([
      StudentPickupSession.find(filter)
        .select('+guardianMobile')
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StudentPickupSession.countDocuments(filter),
    ]);

    // Format response
    const data = items.map((s) => ({
      id: String(s._id),
      studentId: String(s.studentId),
      studentName: s.studentName || '',
      admissionNumber: '', // Would need to fetch from Student separately if needed
      className: s.className || '',
      sectionName: s.sectionName || '',
      guardianName: s.guardianName || '',
      maskedMobile: StudentPickupSession.maskMobile(s.guardianMobile),
      pickupDate: s.completedAt,
      verifiedBy: s.completedBy ? String(s.completedBy) : '',
      verifiedByName: s.teacherName || '',
      verifiedByRole: 'ADMIN_OR_PRINCIPAL',
      verificationMethod: 'OTP',
      status: 'COMPLETED',
    }));

    res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    next(error);
  }
}

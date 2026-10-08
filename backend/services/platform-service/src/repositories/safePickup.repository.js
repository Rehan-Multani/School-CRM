import mongoose from 'mongoose';
import { StudentPickupSession, ACTIVE_PICKUP_STATUSES } from '../models/StudentPickupSession.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { School } from '../models/School.js';
import { AcademicYear } from '../models/AcademicYear.js';
import { AcademicYearClass } from '../models/AcademicYearClass.js';
import { sanitizePagination } from '../../../shared/sanitize.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

class SafePickupRepository {
  /* -------------------------- settings -------------------------- */
  schoolFlag(schoolId) {
    return School.findById(oid(schoolId)).select('settings.safePickupEnabled name').lean();
  }

  setSchoolFlag(schoolId, enabled) {
    return School.findByIdAndUpdate(
      oid(schoolId),
      { $set: { 'settings.safePickupEnabled': !!enabled } },
      { new: true }
    ).lean();
  }

  classesWithFlag(schoolId) {
    return SchoolClass.find({ schoolId: oid(schoolId) })
      .select('name code numericOrder safePickupEnabled status')
      .sort({ numericOrder: 1, name: 1 })
      .lean();
  }

  sectionsForSchool(schoolId) {
    return Section.find({ schoolId: oid(schoolId) }).select('name classId status').lean();
  }

  academicYearsForSchool(schoolId) {
    return AcademicYear.find({ schoolId: oid(schoolId) })
      .select('name code status isCurrent')
      .sort({ isCurrent: -1, name: -1 })
      .lean();
  }

  yearClassLinksForSchool(schoolId) {
    return AcademicYearClass.find({ schoolId: oid(schoolId), status: 'ACTIVE' })
      .select('academicYearId classId')
      .lean();
  }

  classById(schoolId, classId) {
    return SchoolClass.findOne({ schoolId: oid(schoolId), _id: oid(classId) });
  }

  setClassFlag(schoolId, classId, enabled) {
    return SchoolClass.findOneAndUpdate(
      { schoolId: oid(schoolId), _id: oid(classId) },
      { $set: { safePickupEnabled: !!enabled } },
      { new: true }
    );
  }

  /* -------------------------- sessions -------------------------- */
  activeForStudent(schoolId, studentId) {
    return StudentPickupSession.findOne({
      schoolId: oid(schoolId),
      studentId: oid(studentId),
      status: { $in: ACTIVE_PICKUP_STATUSES },
    }).select('+otpHash +guardianMobile');
  }

  activeIdsForStudents(schoolId, studentIds = []) {
    if (!studentIds.length) return Promise.resolve([]);
    return StudentPickupSession.find({
      schoolId: oid(schoolId),
      studentId: { $in: studentIds.map(oid) },
      status: { $in: ACTIVE_PICKUP_STATUSES },
    })
      .select('studentId status')
      .lean();
  }

  byId(schoolId, id) {
    return StudentPickupSession.findOne({ schoolId: oid(schoolId), _id: oid(id) }).select(
      '+otpHash +guardianMobile'
    );
  }

  byIdempotencyKey(teacherId, key) {
    return StudentPickupSession.findOne({ teacherId: oid(teacherId), idempotencyKey: String(key) }).select(
      '+otpHash +guardianMobile'
    );
  }

  create(payload) {
    return StudentPickupSession.create(payload);
  }

  /** Lazy sweep: flip stale active sessions whose OTP window has elapsed. */
  async sweepExpired(schoolId) {
    const now = new Date();
    await StudentPickupSession.updateMany(
      {
        schoolId: oid(schoolId),
        status: { $in: ['PENDING', 'OTP_SENT'] },
        otpExpiresAt: { $lte: now },
      },
      { $set: { status: 'EXPIRED', expiredAt: now, otpHash: '', otpCipher: '' } }
    );
  }

  async completedTodayStudentIds(schoolId, studentIds = []) {
    if (!studentIds.length) return new Set();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const rows = await StudentPickupSession.find({
      schoolId: oid(schoolId),
      studentId: { $in: studentIds.map(oid) },
      status: 'COMPLETED',
      completedAt: { $gte: start },
    })
      .select('studentId')
      .lean();
    return new Set(rows.map((r) => String(r.studentId)));
  }

  async history(schoolId, query = {}) {
    const filter = { schoolId: oid(schoolId) };
    if (query.classId) filter.classId = oid(query.classId);
    if (query.sectionId) filter.sectionId = oid(query.sectionId);
    if (query.studentId) filter.studentId = oid(query.studentId);
    if (query.teacherId) filter.teacherId = oid(query.teacherId);
    if (query.status && query.status !== 'ALL') filter.status = String(query.status).toUpperCase();
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(query.from);
      if (query.to) {
        const to = new Date(query.to);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }
    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 25,
      maxLimit: 100,
    });
    const [items, total] = await Promise.all([
      StudentPickupSession.find(filter)
        .select('+guardianMobile') // service masks it before returning; never sent raw
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StudentPickupSession.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}

export const safePickupRepository = new SafePickupRepository();

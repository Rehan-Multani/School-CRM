import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { Student } from '../models/Student.js';
import { Section } from '../models/Section.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { AcademicYear } from '../models/AcademicYear.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';
import { schoolId as tenantSchoolId, studentId as tenantStudentId } from '../utils/tenant.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

/**
 * The authorization core for every Student APK endpoint.
 *
 * A student can only ever touch:
 *   - their own Student document / enrollment / results / fees / leave / documents
 *   - data scoped to the section (and class) of their CURRENT active enrollment
 *   - school-wide content addressed to students (audiences ∋ ALL|STUDENTS)
 *
 * Identity (`schoolId`, `studentId`) is always taken from the verified JWT via
 * utils/tenant.js — never from the request body/query/params. `buildContext`
 * does ONE batched load; controllers cache it on the request (`loadContext`) so
 * a single request never re-queries the enrollment graph.
 */
class StudentAccessService {
  async buildContext(schoolId, studentId) {
    const school = oid(schoolId);
    const student = await Student.findOne({ _id: studentId, schoolId: school }).lean();
    if (!student) throw new AppError('Student not found', 404, STUDENT_ERR.STUDENT_NOT_FOUND);
    if (student.status && student.status !== 'ACTIVE') {
      throw new AppError('This student account is not active', 403, STUDENT_ERR.STUDENT_INACTIVE);
    }

    const currentYear = await AcademicYear.findOne({ schoolId: school, isCurrent: true })
      .select('_id name')
      .lean();

    let enrollment = null;
    if (currentYear) {
      enrollment = await StudentEnrollment.findOne({
        schoolId: school,
        studentId: oid(studentId),
        academicYearId: currentYear._id,
        status: 'ACTIVE',
      }).lean();
    }
    // Fall back to the most recent active enrollment if no current-year one exists.
    if (!enrollment) {
      enrollment = await StudentEnrollment.findOne({
        schoolId: school,
        studentId: oid(studentId),
        status: 'ACTIVE',
      })
        .sort({ enrollmentDate: -1, createdAt: -1 })
        .lean();
    }

    let className = '';
    let sectionName = '';
    if (enrollment) {
      const [cls, section] = await Promise.all([
        SchoolClass.findById(enrollment.classId).select('name').lean(),
        Section.findById(enrollment.sectionId).select('name').lean(),
      ]);
      className = cls?.name || '';
      sectionName = section?.name || '';
    }

    return {
      schoolId: String(schoolId),
      studentId: String(studentId),
      student,
      currentYearId: currentYear ? String(currentYear._id) : null,
      academicYearName: currentYear?.name || '',
      enrollmentId: enrollment ? String(enrollment._id) : null,
      classId: enrollment ? String(enrollment.classId) : null,
      sectionId: enrollment ? String(enrollment.sectionId) : null,
      className,
      sectionName,
      rollNumber: enrollment?.rollNumber || '',
      admissionNumber: student.admissionNumber || enrollment?.admissionNumber || '',
      hasEnrollment: Boolean(enrollment),
    };
  }

  /** Per-request cache — every student controller calls this first. */
  async loadContext(req) {
    if (!req._studentCtx) {
      req._studentCtx = await this.buildContext(tenantSchoolId(req), tenantStudentId(req));
    }
    return req._studentCtx;
  }

  requireEnrollment(ctx) {
    if (!ctx.hasEnrollment || !ctx.sectionId) {
      throw new AppError(
        'You have no active class enrollment for the current academic year',
        409,
        STUDENT_ERR.NO_ACTIVE_ENROLLMENT
      );
    }
    return ctx;
  }

  requireCurrentYear(ctx) {
    if (!ctx.currentYearId) {
      throw new AppError('No active academic year is set for this school', 409, STUDENT_ERR.NO_ACTIVE_YEAR);
    }
    return ctx.currentYearId;
  }

  /** A resource is visible if it is in my school AND (mine | my section | my class | student-audienced). */
  assertVisible(ctx, doc, { audienceKeys = ['ALL', 'STUDENTS'] } = {}) {
    if (!doc) throw new AppError('Resource not found', 404, STUDENT_ERR.NOT_FOUND);
    if (String(doc.schoolId) !== String(ctx.schoolId)) {
      throw new AppError('Resource not found', 404, STUDENT_ERR.NOT_FOUND);
    }
    const mine =
      (doc.studentId && String(doc.studentId) === ctx.studentId) ||
      (doc.sectionId && ctx.sectionId && String(doc.sectionId) === ctx.sectionId) ||
      (doc.classId && ctx.classId && String(doc.classId) === ctx.classId) ||
      (Array.isArray(doc.audiences) && doc.audiences.some((a) => audienceKeys.includes(a)));
    if (!mine) {
      throw new AppError('You do not have access to this resource', 403, STUDENT_ERR.RESOURCE_FORBIDDEN);
    }
    return doc;
  }

  assertSelf(ctx, id) {
    if (!id || String(id) !== ctx.studentId) {
      throw new AppError('You can only access your own records', 403, STUDENT_ERR.RESOURCE_FORBIDDEN);
    }
    return ctx.studentId;
  }

  /** Section-scoped Mongo filter shared by timetable / homework / classwork / materials. */
  sectionScope(ctx) {
    return { schoolId: oid(ctx.schoolId), sectionId: oid(ctx.sectionId) };
  }

  classScope(ctx) {
    return { schoolId: oid(ctx.schoolId), classId: oid(ctx.classId) };
  }
}

export const studentAccessService = new StudentAccessService();

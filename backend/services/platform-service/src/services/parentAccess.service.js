import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { Parent } from '../models/Parent.js';
import { ParentStudent } from '../models/ParentStudent.js';
import { Student } from '../models/Student.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { AcademicYear } from '../models/AcademicYear.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { PARENT_ERR } from '../constants/parentErrorCodes.js';
import { schoolId as tenantSchoolId, parentId as tenantParentId } from '../utils/tenant.js';
import { studentAccessService } from './studentAccess.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

/**
 * The authorization core for every Parent APK endpoint — the single IDOR
 * chokepoint. A parent may ONLY touch data for children reachable through an
 * ACTIVE `ParentStudent` link in the parent's own school. Identity
 * (`schoolId`, `parentId`) is always taken from the verified JWT.
 *
 * `resolveChild()` re-uses `studentAccessService.buildContext()` so every
 * child-scoped read runs through the exact same enrollment/class/section
 * resolution as the Student APK — and the existing `student*.service.js` read
 * methods can be called unchanged with the returned ctx.
 */
class ParentAccessService {
  async buildContext(schoolId, parentId) {
    const school = oid(schoolId);
    const parent = await Parent.findOne({ _id: parentId, schoolId: school }).lean();
    if (!parent) throw new AppError('Parent not found', 404, PARENT_ERR.PARENT_NOT_FOUND);
    if (parent.status && parent.status !== 'ACTIVE') {
      throw new AppError('This parent account is not active', 403, PARENT_ERR.PARENT_INACTIVE);
    }

    const links = await ParentStudent.find({ schoolId: school, parentId: oid(parentId), status: 'ACTIVE' }).lean();
    const studentIds = links.map((l) => l.studentId);

    const [students, currentYear] = await Promise.all([
      studentIds.length ? Student.find({ _id: { $in: studentIds }, schoolId: school }).lean() : [],
      AcademicYear.findOne({ schoolId: school, isCurrent: true }).select('_id name').lean(),
    ]);
    const studentById = new Map(students.map((s) => [String(s._id), s]));

    let enrollments = [];
    if (studentIds.length) {
      enrollments = await StudentEnrollment.find({
        schoolId: school,
        studentId: { $in: studentIds },
        status: 'ACTIVE',
        ...(currentYear ? { academicYearId: currentYear._id } : {}),
      }).lean();
      // fallback: latest active enrollment for any child without a current-year one
      const covered = new Set(enrollments.map((e) => String(e.studentId)));
      const missing = studentIds.filter((id) => !covered.has(String(id)));
      if (missing.length) {
        const extra = await StudentEnrollment.find({ schoolId: school, studentId: { $in: missing }, status: 'ACTIVE' })
          .sort({ enrollmentDate: -1, createdAt: -1 })
          .lean();
        const seen = new Set();
        for (const e of extra) {
          if (seen.has(String(e.studentId))) continue;
          seen.add(String(e.studentId));
          enrollments.push(e);
        }
      }
    }
    const enrByStudent = new Map(enrollments.map((e) => [String(e.studentId), e]));

    const classIds = [...new Set(enrollments.map((e) => String(e.classId)))];
    const sectionIds = [...new Set(enrollments.map((e) => String(e.sectionId)))];
    const [classes, sections] = await Promise.all([
      classIds.length ? SchoolClass.find({ _id: { $in: classIds.map(oid) } }).select('name').lean() : [],
      sectionIds.length ? Section.find({ _id: { $in: sectionIds.map(oid) } }).select('name').lean() : [],
    ]);
    const classNameById = new Map(classes.map((c) => [String(c._id), c.name]));
    const sectionNameById = new Map(sections.map((s) => [String(s._id), s.name]));

    const children = links
      .map((link) => {
        const s = studentById.get(String(link.studentId));
        if (!s) return null;
        const enr = enrByStudent.get(String(link.studentId)) || null;
        return {
          link,
          student: s,
          studentId: String(link.studentId),
          relationship: link.relationship || 'GUARDIAN',
          isPrimary: Boolean(link.isPrimary),
          name: [s.firstName, s.lastName].filter(Boolean).join(' ').trim(),
          photo: s.photo || '',
          admissionNumber: s.admissionNumber || '',
          classId: enr ? String(enr.classId) : null,
          sectionId: enr ? String(enr.sectionId) : null,
          className: enr ? classNameById.get(String(enr.classId)) || '' : '',
          sectionName: enr ? sectionNameById.get(String(enr.sectionId)) || '' : '',
          rollNumber: enr?.rollNumber || '',
          academicYearName: currentYear?.name || '',
          hasEnrollment: Boolean(enr),
        };
      })
      .filter(Boolean);

    return {
      schoolId: String(schoolId),
      parentId: String(parentId),
      parent,
      currentYearId: currentYear ? String(currentYear._id) : null,
      children,
    };
  }

  /** Per-request cache — every parent controller calls this first. */
  async loadContext(req) {
    if (!req._parentCtx) {
      req._parentCtx = await this.buildContext(tenantSchoolId(req), tenantParentId(req));
    }
    return req._parentCtx;
  }

  requireChildren(ctx) {
    if (!ctx.children.length) {
      throw new AppError('No children are linked to this parent account', 409, PARENT_ERR.NO_LINKED_CHILDREN);
    }
    return ctx;
  }

  childRow(ctx, childId) {
    if (!childId || !mongoose.isValidObjectId(String(childId))) {
      throw new AppError('Invalid child id', 400, PARENT_ERR.VALIDATION_ERROR);
    }
    const row = ctx.children.find((c) => c.studentId === String(childId));
    if (!row) {
      // Not linked to THIS parent (or wrong school / inactive link) — never leak which.
      throw new AppError('You are not linked to this child', 403, PARENT_ERR.CHILD_ACCESS_DENIED);
    }
    return row;
  }

  /**
   * The ONLY way to get child data. Verifies the link, then returns a
   * student-shaped ctx (identical to studentAccessService.buildContext output)
   * so `student*.service.js` read methods run unchanged.
   */
  async resolveChild(req, childId) {
    const ctx = await this.loadContext(req);
    const row = this.childRow(ctx, childId);
    req._childCtx = req._childCtx || {};
    if (!req._childCtx[row.studentId]) {
      req._childCtx[row.studentId] = await studentAccessService.buildContext(ctx.schoolId, row.studentId);
    }
    return req._childCtx[row.studentId];
  }

  requireEnrollment(childCtx) {
    if (!childCtx.hasEnrollment || !childCtx.sectionId) {
      throw new AppError(
        'This child has no active class enrollment for the current academic year',
        409,
        PARENT_ERR.NO_ACTIVE_ENROLLMENT
      );
    }
    return childCtx;
  }
}

export const parentAccessService = new ParentAccessService();

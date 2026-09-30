import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { Teacher } from '../models/Teacher.js';
import { Section } from '../models/Section.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { SectionSubject } from '../models/SectionSubject.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { AcademicYear } from '../models/AcademicYear.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';
import { schoolId as tenantSchoolId, teacherId as tenantTeacherId } from '../utils/tenant.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

/**
 * The authorization core for every Teacher APK endpoint.
 *
 * A teacher may only touch resources reachable through their academic
 * assignment graph:
 *   - sections where they are the class teacher  (Section.classTeacherId)
 *   - sections where they teach a subject        (SectionSubject.teacherId)
 * ...and, transitively, the classes/subjects/students inside those sections,
 * plus resources they personally authored (doc.teacherId === them).
 *
 * `buildContext` does ONE batched load; controllers cache it on the request
 * (`loadContext`) so a single request never re-queries the assignment graph.
 */
class TeacherAccessService {
  async buildContext(schoolId, teacherId) {
    const school = oid(schoolId);
    // One round-trip: the assignment-graph reads don't depend on the teacher
    // row, so they run alongside it; the checks below still gate the result.
    const [teacher, currentYear, classTeacherSections, taught] = await Promise.all([
      Teacher.findOne({ _id: teacherId, schoolId: school }).lean(),
      AcademicYear.findOne({ schoolId: school, isCurrent: true }).select('_id').lean(),
      Section.find({ schoolId: school, classTeacherId: oid(teacherId), status: 'ACTIVE' })
        .select('_id classId')
        .lean(),
      SectionSubject.find({ schoolId: school, teacherId: oid(teacherId), status: 'ACTIVE' })
        .select('sectionId classId subjectId')
        .lean(),
    ]);
    if (!teacher) throw new AppError('Teacher not found', 404, TEACHER_ERR.TEACHER_NOT_FOUND);
    if (teacher.status !== 'ACTIVE') {
      throw new AppError('Teacher account is not active', 403, TEACHER_ERR.TEACHER_INACTIVE);
    }

    const sectionIds = new Set();
    const classIds = new Set();
    const classTeacherSectionIds = new Set();
    const sectionSubjectPairs = new Set();
    const classSubjectPairs = new Set();
    const sectionClassIds = new Map(); // sectionId -> classId

    for (const s of classTeacherSections) {
      sectionIds.add(String(s._id));
      classTeacherSectionIds.add(String(s._id));
      if (s.classId) {
        classIds.add(String(s.classId));
        sectionClassIds.set(String(s._id), String(s.classId));
      }
    }
    for (const ss of taught) {
      if (ss.sectionId) sectionIds.add(String(ss.sectionId));
      if (ss.classId) classIds.add(String(ss.classId));
      if (ss.sectionId && ss.classId) sectionClassIds.set(String(ss.sectionId), String(ss.classId));
      if (ss.sectionId && ss.subjectId) sectionSubjectPairs.add(`${ss.sectionId}:${ss.subjectId}`);
      if (ss.classId && ss.subjectId) classSubjectPairs.add(`${ss.classId}:${ss.subjectId}`);
    }

    return {
      schoolId: String(schoolId),
      teacherId: String(teacherId),
      teacher,
      currentYearId: currentYear ? String(currentYear._id) : null,
      sectionIds,
      classIds,
      classTeacherSectionIds,
      sectionSubjectPairs,
      classSubjectPairs,
      sectionClassIds,
    };
  }

  /**
   * The sections this teacher is the CLASS TEACHER of, with class/section names.
   * Drives the APK "am I a class teacher?" check that shows/hides the Pickup tab.
   */
  async classTeacherSummary(schoolId, teacherId) {
    const school = oid(schoolId);
    const sections = await Section.find({ schoolId: school, classTeacherId: oid(teacherId), status: 'ACTIVE' })
      .select('name classId')
      .lean();
    if (!sections.length) return { isClassTeacher: false, classTeacherSections: [] };
    const classes = await SchoolClass.find({
      schoolId: school,
      _id: { $in: [...new Set(sections.map((s) => String(s.classId)))].map(oid) },
    })
      .select('name')
      .lean();
    const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
    return {
      isClassTeacher: true,
      classTeacherSections: sections.map((s) => ({
        sectionId: String(s._id),
        classId: s.classId ? String(s.classId) : null,
        className: classMap.get(String(s.classId)) || '',
        sectionName: s.name || '',
      })),
    };
  }

  /** Per-request cache — every teacher controller calls this first. */
  async loadContext(req) {
    if (!req._teacherCtx) {
      req._teacherCtx = await this.buildContext(tenantSchoolId(req), tenantTeacherId(req));
    }
    return req._teacherCtx;
  }

  requireCurrentYear(ctx) {
    if (!ctx.currentYearId) {
      throw new AppError('No active academic year is set for this school', 409, TEACHER_ERR.NO_ACTIVE_YEAR);
    }
    return ctx.currentYearId;
  }

  assertSection(ctx, sectionId) {
    if (!sectionId || !ctx.sectionIds.has(String(sectionId))) {
      throw new AppError('You are not assigned to this section', 403, TEACHER_ERR.SECTION_ACCESS_DENIED);
    }
    return String(sectionId);
  }

  assertClass(ctx, classId) {
    if (!classId || !ctx.classIds.has(String(classId))) {
      throw new AppError('You are not assigned to this class', 403, TEACHER_ERR.CLASS_ACCESS_DENIED);
    }
    return String(classId);
  }

  assertSubjectInSection(ctx, sectionId, subjectId) {
    if (!sectionId || !subjectId || !ctx.sectionSubjectPairs.has(`${sectionId}:${subjectId}`)) {
      throw new AppError('You do not teach this subject in this section', 403, TEACHER_ERR.SUBJECT_ACCESS_DENIED);
    }
  }

  isClassTeacherOf(ctx, sectionId) {
    return ctx.classTeacherSectionIds.has(String(sectionId));
  }

  async assertStudent(ctx, studentId) {
    if (!studentId || !mongoose.isValidObjectId(String(studentId))) {
      throw new AppError('Invalid student id', 400, TEACHER_ERR.VALIDATION_ERROR);
    }
    const enrolled = await StudentEnrollment.exists({
      schoolId: oid(ctx.schoolId),
      studentId: oid(studentId),
      sectionId: { $in: [...ctx.sectionIds].map(oid) },
      status: 'ACTIVE',
    });
    if (!enrolled) {
      throw new AppError('You are not assigned to this student', 403, TEACHER_ERR.STUDENT_ACCESS_DENIED);
    }
  }

  /** Ownership check for teacher-authored resources (homework/assignment/material). */
  assertOwnedBy(doc, teacherId) {
    if (!doc) throw new AppError('Resource not found', 404, TEACHER_ERR.NOT_FOUND);
    if (String(doc.teacherId) !== String(teacherId)) {
      throw new AppError('You can only modify resources you created', 403, TEACHER_ERR.RESOURCE_FORBIDDEN);
    }
  }
}

export const teacherAccessService = new TeacherAccessService();

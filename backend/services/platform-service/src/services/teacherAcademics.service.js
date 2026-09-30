import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { teacherAccessService } from './teacherAccess.service.js';
import { teacherAcademicsRepository } from '../repositories/teacherAcademics.repository.js';
import { classLite, sectionLite, studentLite } from '../serializers/teacher.serializers.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

class TeacherAcademicsService {
  async myClasses(ctx) {
    const classIds = [...ctx.classIds];
    const [classes, counts] = await Promise.all([
      teacherAcademicsRepository.classesByIds(ctx.schoolId, classIds),
      teacherAcademicsRepository.sectionStudentCounts(ctx.schoolId, [...ctx.sectionIds]),
    ]);
    const sections = await teacherAcademicsRepository.sectionsByIds(ctx.schoolId, [...ctx.sectionIds]);
    const sectionsByClass = new Map();
    for (const s of sections) {
      const k = String(s.classId);
      if (!sectionsByClass.has(k)) sectionsByClass.set(k, []);
      sectionsByClass.get(k).push(s);
    }
    return classes.map((c) => {
      const secs = sectionsByClass.get(String(c._id)) || [];
      const studentCount = secs.reduce((n, s) => n + (counts.get(String(s._id)) || 0), 0);
      return { ...classLite(c), sectionCount: secs.length, studentCount };
    });
  }

  /**
   * Every (class, section, subject) this teacher teaches — the only combos the
   * homework / assignment / material / marks endpoints accept. Drives the
   * app's Section + Subject pickers so the user can't pick a forbidden pair.
   */
  async teachingSlots(ctx) {
    const pairs = [...ctx.sectionSubjectPairs].map((p) => {
      const [sectionId, subjectId] = p.split(':');
      return { sectionId, subjectId };
    });
    if (!pairs.length) return [];
    const [sections, subjects] = await Promise.all([
      teacherAcademicsRepository.sectionsByIds(ctx.schoolId, [...new Set(pairs.map((p) => p.sectionId))]),
      teacherAcademicsRepository.subjectsByIds(ctx.schoolId, [...new Set(pairs.map((p) => p.subjectId))]),
    ]);
    const secMap = new Map(sections.map((s) => [String(s._id), s]));
    const subMap = new Map(subjects.map((s) => [String(s._id), s]));
    return pairs
      .filter((p) => secMap.has(p.sectionId) && subMap.has(p.subjectId))
      .map((p) => {
        const sec = secMap.get(p.sectionId);
        return {
          classId: sec.classId ? String(sec.classId) : null,
          className: sec.className || '',
          sectionId: p.sectionId,
          sectionName: sec.name || '',
          subjectId: p.subjectId,
          subjectName: subMap.get(p.subjectId).name || '',
          isClassTeacher: teacherAccessService.isClassTeacherOf(ctx, p.sectionId),
        };
      })
      .sort((a, b) =>
        `${a.className} ${a.sectionName} ${a.subjectName}`.localeCompare(`${b.className} ${b.sectionName} ${b.subjectName}`)
      );
  }

  async classDetail(ctx, classId) {
    teacherAccessService.assertClass(ctx, classId);
    const [classes, sections, counts] = await Promise.all([
      teacherAcademicsRepository.classesByIds(ctx.schoolId, [classId]),
      teacherAcademicsRepository.sectionsByIds(ctx.schoolId, [...ctx.sectionIds], classId),
      teacherAcademicsRepository.sectionStudentCounts(ctx.schoolId, [...ctx.sectionIds]),
    ]);
    if (!classes.length) throw new AppError('Class not found', 404, TEACHER_ERR.NOT_FOUND);
    return {
      ...classLite(classes[0]),
      sections: sections.map((s) =>
        sectionLite(s, {
          className: s.className,
          isClassTeacher: teacherAccessService.isClassTeacherOf(ctx, s._id),
          studentCount: counts.get(String(s._id)) || 0,
        })
      ),
    };
  }

  async classSections(ctx, classId) {
    teacherAccessService.assertClass(ctx, classId);
    const [sections, counts] = await Promise.all([
      teacherAcademicsRepository.sectionsByIds(ctx.schoolId, [...ctx.sectionIds], classId),
      teacherAcademicsRepository.sectionStudentCounts(ctx.schoolId, [...ctx.sectionIds]),
    ]);
    return sections.map((s) =>
      sectionLite(s, {
        className: s.className,
        isClassTeacher: teacherAccessService.isClassTeacherOf(ctx, s._id),
        studentCount: counts.get(String(s._id)) || 0,
      })
    );
  }

  async sectionStudents(ctx, sectionId, query = {}) {
    teacherAccessService.assertSection(ctx, sectionId);
    const { page, limit } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const sort = query.sort === 'name' ? 'name' : 'rollNumber';
    const { items, total } = await teacherAcademicsRepository.sectionRoster(ctx.schoolId, sectionId, {
      q: query.q || '',
      page,
      limit,
      sort,
    });
    return {
      data: items.map((s) => studentLite(s, s._enroll || {})),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async studentDetail(ctx, studentId) {
    await teacherAccessService.assertStudent(ctx, studentId);
    const found = await teacherAcademicsRepository.studentDetail(ctx.schoolId, studentId);
    if (!found) throw new AppError('Student not found', 404, TEACHER_ERR.NOT_FOUND);
    const { student, enrollment } = found;
    const attendancePercent = await teacherAcademicsRepository.studentAttendancePercent(
      ctx.schoolId,
      studentId,
      [...ctx.sectionIds]
    );
    return {
      ...studentLite(student, enrollment || {}),
      gender: student.gender || '',
      dateOfBirth: student.dateOfBirth || null,
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      enrollment: enrollment
        ? {
            classId: String(enrollment.classId),
            sectionId: String(enrollment.sectionId),
            rollNumber: enrollment.rollNumber || '',
            academicYearId: String(enrollment.academicYearId),
          }
        : null,
      attendancePercent,
    };
  }
}

export const teacherAcademicsService = new TeacherAcademicsService();

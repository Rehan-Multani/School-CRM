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

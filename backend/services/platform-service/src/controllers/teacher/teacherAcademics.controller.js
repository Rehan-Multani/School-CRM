import { teacherAccessService } from '../../services/teacherAccess.service.js';
import { teacherAcademicsService } from '../../services/teacherAcademics.service.js';

export async function listTeacherClasses(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherAcademicsService.myClasses(ctx);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherClass(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherAcademicsService.classDetail(ctx, req.params.classId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherClassSections(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherAcademicsService.classSections(ctx, req.params.classId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherSectionStudents(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const result = await teacherAcademicsService.sectionStudents(ctx, req.params.sectionId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherStudent(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherAcademicsService.studentDetail(ctx, req.params.studentId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
